package com.shield.simulation;

import com.shield.domain.*;
import com.shield.repository.*;
import com.shield.config.SimulationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

/**
 * The core electrical network calculator.
 *
 * Models the cable network as a series resistor circuit with per-node parallel backup bypass:
 *   [Source VT] ─── [Stage 1] ─── [Stage 2] ─── [Stage 3] ─── [Stage 4] ─── [R_load]
 *   Each Stage i has primary segment S_i and parallel backup node B_i.
 *   If S_i is isolated and B_i is engaged, current flows through B_i with zero disruption to downstream.
 */
@Component
public class CircuitCalculator {

    private static final Logger log = LoggerFactory.getLogger(CircuitCalculator.class);

    /** Fault resistance for short-circuit model (Ω) — represents arc resistance */
    public static final double SHORT_CIRCUIT_FAULT_RESISTANCE_OHM = 0.01;

    /** Ground resistance for ground fault model (Ω) */
    public static final double GROUND_FAULT_RESISTANCE_OHM = 10.0;

    private final Random random = new Random(42); // seeded for reproducibility

    private final SimulationProperties props;

    public CircuitCalculator(SimulationProperties props) {
        this.props = props;
    }

    /**
     * Calculates voltage and current at each segment for the given network state.
     *
     * @param segments  Ordered list of cable segments (index 0 = closest to source)
     * @param activeFault The active fault, or null for healthy network
     * @param addNoise  Whether to add simulated sensor noise
     * @return Array of MeasurementResult, one per segment
     */
    public MeasurementResult[] calculate(List<CableSegment> segments,
                                          ActiveFaultState activeFault,
                                          boolean addNoise) {
        double vSource = props.getReferenceVoltageV();
        int n = segments.size();
        MeasurementResult[] results = new MeasurementResult[n];

        // Build effective resistance array for each stage
        double[] R = new double[n];
        for (int i = 0; i < n; i++) {
            CableSegment seg = segments.get(i);
            if (seg.isBackupActive()) {
                // Current bypassed through backup node B_i (healthy 1.0 Ω branch)
                R[i] = seg.totalResistanceOhm();
            } else if (seg.getStatus() == SegmentStatus.ISOLATED
                    || seg.getStatus() == SegmentStatus.DE_ENERGIZED) {
                // Primary is isolated and backup has not been engaged -> circuit is broken
                R[i] = Double.MAX_VALUE / 2;
            } else {
                R[i] = seg.totalResistanceOhm();
            }
        }

        // Apply fault modification to resistances
        double parallelGroundR = Double.MAX_VALUE; // no ground path by default
        int faultSegIdx = -1;

        if (activeFault != null && activeFault.getFaultType() != null) {
            // Find fault segment index
            for (int i = 0; i < n; i++) {
                if (segments.get(i).getId().equals(activeFault.getSegmentId())) {
                    faultSegIdx = i;
                    break;
                }
            }

            if (faultSegIdx >= 0) {
                CableSegment faultSeg = segments.get(faultSegIdx);
                // Fault only affects grid if the segment is still connected and not bypassed!
                if (!faultSeg.isBackupActive() && faultSeg.getStatus() != SegmentStatus.ISOLATED) {
                    switch (activeFault.getFaultType()) {
                        case OPEN_CIRCUIT:
                            R[faultSegIdx] = Double.MAX_VALUE / 2; // very high resistance
                            break;
                        case SHORT_CIRCUIT:
                            parallelGroundR = SHORT_CIRCUIT_FAULT_RESISTANCE_OHM;
                            break;
                        case GROUND_FAULT:
                            parallelGroundR = GROUND_FAULT_RESISTANCE_OHM;
                            break;
                    }
                }
            }
        }

        // Calculate load resistance (sum of all loads, simplified as one equivalent)
        double rLoad = calculateLoadResistance(segments);

        // Solve circuit voltages
        double[] voltages = new double[n + 1];
        voltages[0] = vSource;

        if (parallelGroundR < Double.MAX_VALUE / 2 && faultSegIdx >= 0) {
            // Ground fault: calculate voltage at fault node, then ground current leaks
            voltages = solveWithGroundFault(vSource, R, rLoad, faultSegIdx, parallelGroundR, n);
        } else {
            // Normal or open/short circuit: series circuit
            voltages = solveSeries(vSource, R, rLoad, n);
        }

        // Calculate current through each stage
        double[] currents = new double[n];
        for (int i = 0; i < n; i++) {
            if (R[i] >= Double.MAX_VALUE / 4) {
                currents[i] = 0.0; // open circuit or isolated
            } else {
                double vDrop = voltages[i] - voltages[i + 1];
                currents[i] = vDrop / R[i];
            }
        }

        // Package results for both primary and backup paths
        for (int i = 0; i < n; i++) {
            CableSegment seg = segments.get(i);
            double vPrimary, cPrimary;
            double vBackup, cBackup;

            if (seg.isBackupActive()) {
                // Power flows through the backup node
                vPrimary = 0.0;
                cPrimary = 0.0;
                vBackup = voltages[i];
                cBackup = currents[i];
                if (addNoise) {
                    vBackup = addNoise(vBackup, props.getSensorNoisePercent());
                    cBackup = addNoise(cBackup, props.getSensorNoisePercent());
                }
            } else if (seg.getStatus() == SegmentStatus.ISOLATED || seg.getStatus() == SegmentStatus.DE_ENERGIZED) {
                // Completely isolated
                vPrimary = 0.0;
                cPrimary = 0.0;
                vBackup = 0.0;
                cBackup = 0.0;
            } else {
                // Power flows normally through primary
                vPrimary = voltages[i];
                cPrimary = currents[i];
                vBackup = 0.0;
                cBackup = 0.0;
                if (addNoise) {
                    vPrimary = addNoise(vPrimary, props.getSensorNoisePercent());
                    cPrimary = addNoise(cPrimary, props.getSensorNoisePercent());
                }
            }

            // Physical clamps
            vPrimary = Math.max(0.0, vPrimary);
            cPrimary = Math.max(0.0, cPrimary);
            vBackup = Math.max(0.0, vBackup);
            cBackup = Math.max(0.0, cBackup);

            results[i] = new MeasurementResult(seg.getId(), vPrimary, cPrimary, vBackup, cBackup);
        }

        return results;
    }

    /**
     * Solves series circuit V[i] = V[i-1] - I * R[i]
     * where I = V_source / (sum(R) + R_load)
     */
    private double[] solveSeries(double vSource, double[] R, double rLoad, int n) {
        double[] voltages = new double[n + 1];
        voltages[0] = vSource;

        double rTotalCable = 0;
        for (int i = 0; i < n; i++) {
            if (R[i] < Double.MAX_VALUE / 4) rTotalCable += R[i];
            else rTotalCable += 1e9; // treat as very high resistance
        }

        double rTotalCircuit = rTotalCable + rLoad;
        double I = (rTotalCircuit > 0) ? vSource / rTotalCircuit : 0;

        for (int i = 0; i < n; i++) {
            double drop = (R[i] < Double.MAX_VALUE / 4) ? I * R[i] : voltages[i];
            voltages[i + 1] = Math.max(0, voltages[i] - drop);
        }

        return voltages;
    }

    /**
     * Solves circuit with ground fault at segment faultIdx.
     */
    private double[] solveWithGroundFault(double vSource, double[] R, double rLoad,
                                           int faultIdx, double rGround, int n) {
        double[] voltages = new double[n + 1];
        voltages[0] = vSource;

        // Resistance upstream of fault node
        double rUpstream = 0;
        for (int i = 0; i <= faultIdx; i++) {
            rUpstream += (R[i] < Double.MAX_VALUE / 4) ? R[i] : 1e9;
        }

        // Downstream resistance
        double rDownstream = rLoad;
        for (int i = faultIdx + 1; i < n; i++) {
            rDownstream += (R[i] < Double.MAX_VALUE / 4) ? R[i] : 1e9;
        }

        // Parallel combination of downstream path and ground path
        double rParallel = (rDownstream * rGround) / (rDownstream + rGround);

        // Voltage at fault node
        double vFaultNode = vSource * rParallel / (rUpstream + rParallel);

        // Build voltage profile upstream
        double I_main = vSource / (rUpstream + rParallel);
        for (int i = 0; i <= faultIdx; i++) {
            double r = (R[i] < Double.MAX_VALUE / 4) ? R[i] : 1e9;
            voltages[i + 1] = Math.max(0, voltages[i] - I_main * r);
        }

        // Ground current leaks at fault node; downstream current is reduced
        double I_downstream = (rDownstream > 0) ? vFaultNode / rDownstream : 0;
        for (int i = faultIdx + 1; i < n; i++) {
            double r = (R[i] < Double.MAX_VALUE / 4) ? R[i] : 1e9;
            voltages[i + 1] = Math.max(0, voltages[i] - I_downstream * r);
        }

        return voltages;
    }

    /**
     * Calculates equivalent load resistance from all loads.
     */
    private double calculateLoadResistance(List<CableSegment> segments) {
        return (11000.0 * 11000.0) / 1_500_000.0;
    }

    /** Adds Gaussian noise to a measurement value */
    private double addNoise(double value, double noisePercent) {
        double sigma = value * noisePercent / 100.0;
        return value + random.nextGaussian() * sigma;
    }

    /**
     * Immutable result of a single segment calculation, including both primary and backup branches.
     */
    public record MeasurementResult(Long segmentId,
                                  double voltageV,
                                  double currentA,
                                  double backupVoltageV,
                                  double backupCurrentA) {
        public double powerW() {
            return (voltageV * currentA) + (backupVoltageV * backupCurrentA);
        }
    }
}
