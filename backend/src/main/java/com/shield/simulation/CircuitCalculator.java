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
 * Models the cable network as a series resistor circuit:
 *   [Source VT] ─── [R1] ─── [R2] ─── [R3] ─── [R4] ─── [R_load]
 *
 * All calculations are deterministic given the same input state.
 * Gaussian noise is added separately via addNoise().
 *
 * SIMPLIFIED MODEL ASSUMPTIONS (documented for academic transparency):
 *   1. Uniform resistance per kilometre (constant temperature assumed).
 *   2. Purely resistive circuit — no inductance or capacitance modelled.
 *   3. Single-phase equivalent — three-phase effects not modelled.
 *   4. Lossless ground return path assumed for normal operation.
 *   5. Voltage source is ideal (zero internal resistance).
 *   6. Short-circuit fault resistance approximated as 0.01 Ω (not zero,
 *      to avoid division by zero and represent arc resistance).
 *   7. Ground fault modelled as a parallel resistance to earth (R_ground).
 *
 * These assumptions are appropriate for an academic simulation but would
 * not satisfy protection engineering requirements for real infrastructure.
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

        // Build effective resistance array
        double[] R = new double[n];
        for (int i = 0; i < n; i++) {
            CableSegment seg = segments.get(i);
            if (seg.getStatus() == SegmentStatus.ISOLATED
                    || seg.getStatus() == SegmentStatus.DE_ENERGIZED) {
                R[i] = Double.MAX_VALUE / 2; // open circuit
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
                switch (activeFault.getFaultType()) {
                    case OPEN_CIRCUIT:
                        R[faultSegIdx] = Double.MAX_VALUE / 2; // very high resistance
                        break;
                    case SHORT_CIRCUIT:
                        parallelGroundR = SHORT_CIRCUIT_FAULT_RESISTANCE_OHM;
                        break;
                    case GROUND_FAULT:
                        parallelGroundR = GROUND_FAULT_RESISTANCE_OHM;
                        // Resistance remains normal; ground path adds parallel branch
                        break;
                }
            }
        }

        // Calculate load resistance (sum of all loads, simplified as one equivalent)
        double rLoad = calculateLoadResistance(segments);

        // Solve circuit: I = VT / (R_total + R_load)
        // For ground fault: treat fault node as voltage divider with ground
        double[] voltages = new double[n + 1];
        voltages[0] = vSource;

        if (parallelGroundR < Double.MAX_VALUE / 2 && faultSegIdx >= 0) {
            // Ground fault: calculate voltage at fault node, then ground current leaks
            voltages = solveWithGroundFault(vSource, R, rLoad, faultSegIdx, parallelGroundR, n);
        } else {
            // Normal or open/short circuit: series circuit
            voltages = solveSeries(vSource, R, rLoad, n);
        }

        // Calculate current through each segment
        double[] currents = new double[n];
        for (int i = 0; i < n; i++) {
            if (R[i] >= Double.MAX_VALUE / 4) {
                currents[i] = 0.0; // open circuit or isolated
            } else {
                double vDrop = voltages[i] - voltages[i + 1];
                currents[i] = vDrop / R[i];
            }
        }

        // Package results
        for (int i = 0; i < n; i++) {
            double v = voltages[i];
            double c = currents[i];

            if (addNoise) {
                v = addNoise(v, props.getSensorNoisePercent());
                c = addNoise(c, props.getSensorNoisePercent());
            }

            // Clamp to physical bounds
            v = Math.max(0.0, v);
            c = Math.max(0.0, c);

            results[i] = new MeasurementResult(segments.get(i).getId(), v, c);
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
            double drop = (R[i] < Double.MAX_VALUE / 4) ? I * R[i] : voltages[i]; // all voltage drops here
            voltages[i + 1] = Math.max(0, voltages[i] - drop);
        }

        return voltages;
    }

    /**
     * Solves circuit with ground fault at segment faultIdx.
     * Ground fault creates a parallel path: R_cable || R_ground.
     * Voltage at fault node = VT * R_parallel / (R_upstream + R_parallel)
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
     * Parallel combination: 1/R_eq = sum(1/R_i)
     */
    private double calculateLoadResistance(List<CableSegment> segments) {
        // Use a fixed load resistance for now (can be made dynamic)
        // R_load = V^2/P = 11000^2/1500000 = ~80.67 Ω
        return (11000.0 * 11000.0) / 1_500_000.0;
    }

    /** Adds Gaussian noise to a measurement value */
    private double addNoise(double value, double noisePercent) {
        double sigma = value * noisePercent / 100.0;
        return value + random.nextGaussian() * sigma;
    }

    /**
     * Immutable result of a single segment calculation.
     */
    public record MeasurementResult(Long segmentId, double voltageV, double currentA) {
        public double powerW() { return voltageV * currentA; }
    }
}
