package com.shield.simulation;

import com.shield.config.SimulationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Implements fault localization using the Report-Based Voltage Ratio method.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * REPORT-BASED FORMULA (Primary Localization Method)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *   Df = (Vf / VT) × LT
 *
 * Where:
 *   Df  = Estimated fault distance from source (km)
 *   Vf  = Measured voltage at the sensing point when fault occurs (V)
 *   VT  = Total reference (no-fault) supply voltage (V)  [configurable]
 *   LT  = Total cable length (km)  [configurable]
 *
 * ASSUMPTIONS AND LIMITATIONS (from project report):
 *   1. Linear voltage distribution along the cable is assumed.
 *      This holds approximately for uniform resistance-per-km under
 *      steady-state DC or low-frequency AC conditions.
 *   2. The sensing point is assumed to be at the source end.
 *   3. The formula treats the cable as a simple voltage divider.
 *   4. No load current correction is applied — load current causes a
 *      voltage drop even in the healthy network, which introduces a
 *      systematic offset into the estimate.
 *   5. The formula is not physically consistent for open-circuit faults,
 *      where the voltage upstream may be close to VT (not reduced).
 *      A warning is generated in such cases.
 *   6. The formula is not calibrated for real cables with distributed
 *      inductance, capacitance, or sheath effects.
 *   7. Accuracy is reduced for faults beyond the midpoint of the cable.
 *
 * This method is preserved exactly as described in the project report.
 * A separate model-based method is provided for comparison.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * MODEL-BASED FORMULA (Secondary/Comparison Method)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * For a series resistor circuit, the voltage at distance x from source is:
 *   V(x) = VT × [R_total(x_to_end) + R_load] / [R_total_cable + R_load]
 *
 * Inverting for distance (given uniform resistance ρ Ω/km):
 *   Df_model = LT - [(V_fault × (R_cable + R_load) / VT - R_load) / ρ]
 *
 * This method explicitly accounts for the load current voltage drop
 * and is derived directly from the circuit equations, making it more
 * physically accurate than the report-based voltage ratio alone.
 */
@Component
public class FaultLocalizer {

    private static final Logger log = LoggerFactory.getLogger(FaultLocalizer.class);

    private final SimulationProperties props;

    public FaultLocalizer(SimulationProperties props) {
        this.props = props;
    }

    /**
     * Runs the Report-Based Voltage Ratio localization.
     *
     * @param faultVoltageV   Measured voltage at sensing point during fault (V)
     * @param referenceVoltageV Total reference voltage VT (V) — must be > 0
     * @param totalLengthKm   Total cable length LT (km) — must be > 0
     * @return LocalizationResult with estimate, validity flag, and warnings
     */
    public LocalizationResult localizeReportBased(double faultVoltageV,
                                                   double referenceVoltageV,
                                                   double totalLengthKm) {
        // Input validation
        if (referenceVoltageV <= 0) {
            return LocalizationResult.invalid(
                "REPORT_BASED",
                "Reference voltage VT must be greater than zero. " +
                "Division by zero would occur. Check configuration.");
        }
        if (totalLengthKm <= 0) {
            return LocalizationResult.invalid(
                "REPORT_BASED",
                "Total cable length LT must be greater than zero.");
        }
        if (faultVoltageV < 0) {
            return LocalizationResult.invalid(
                "REPORT_BASED",
                "Fault voltage Vf cannot be negative. Check sensor readings.");
        }

        // Clamp voltage ratio to [0, 1] — values > 1 indicate measurement error
        double ratio = faultVoltageV / referenceVoltageV;
        String warning = null;

        if (ratio > 1.0) {
            warning = String.format(
                "WARNING: Measured fault voltage (%.1f V) exceeds reference voltage (%.1f V). " +
                "Ratio clamped to 1.0. This may indicate an open-circuit fault where upstream " +
                "voltage is near nominal, or a measurement error.",
                faultVoltageV, referenceVoltageV);
            ratio = 1.0;
        }

        if (ratio > 0.95) {
            warning = (warning != null ? warning + " " : "") +
                "NOTE: High voltage ratio suggests fault is near the source end or an " +
                "open-circuit condition where this formula has limited accuracy.";
        }

        double estimatedDistanceKm = ratio * totalLengthKm;

        log.debug("Report-based localization: Vf={} V, VT={} V, LT={} km → Df={} km",
            faultVoltageV, referenceVoltageV, totalLengthKm, estimatedDistanceKm);

        return new LocalizationResult(
            "REPORT_BASED",
            estimatedDistanceKm,
            faultVoltageV,
            referenceVoltageV,
            totalLengthKm,
            true,
            null,
            warning
        );
    }

    /**
     * Runs the Model-Based localization (derived from circuit equations).
     * This method is provided for comparison only and is clearly labelled.
     *
     * @param faultVoltageV  Voltage at source during fault (V)
     * @param rCableTotal    Total cable resistance (Ω)
     * @param rLoad          Equivalent load resistance (Ω)
     * @param rhoOhmPerKm    Cable resistance per km (Ω/km)
     * @param totalLengthKm  Total cable length (km)
     */
    public LocalizationResult localizeModelBased(double faultVoltageV,
                                                  double referenceVoltageV,
                                                  double rCableTotal,
                                                  double rLoad,
                                                  double rhoOhmPerKm,
                                                  double totalLengthKm) {
        if (referenceVoltageV <= 0 || rhoOhmPerKm <= 0 || totalLengthKm <= 0) {
            return LocalizationResult.invalid(
                "MODEL_BASED",
                "Model-based localization requires VT > 0, ρ > 0, LT > 0.");
        }

        // V_fault = VT × (R_downstream + R_load) / (R_cable + R_load)
        // R_downstream = V_fault * (R_cable + R_load) / VT - R_load
        double rDownstream = faultVoltageV * (rCableTotal + rLoad) / referenceVoltageV - rLoad;

        // Df = LT - (R_downstream / ρ)
        double estimatedDistanceKm = totalLengthKm - (rDownstream / rhoOhmPerKm);

        // Clamp to cable bounds
        estimatedDistanceKm = Math.max(0, Math.min(totalLengthKm, estimatedDistanceKm));

        String warning = null;
        if (rDownstream < 0) {
            warning = "Model-based: calculated downstream resistance is negative. " +
                "This suggests load voltage drop dominates; estimate clamped to 0 km.";
        }

        return new LocalizationResult(
            "MODEL_BASED",
            estimatedDistanceKm,
            faultVoltageV,
            referenceVoltageV,
            totalLengthKm,
            true,
            null,
            warning
        );
    }

    /**
     * Calculates localization error when the actual distance is known.
     * @param estimated Estimated fault distance (km)
     * @param actual    Actual injected fault distance (km)
     * @return Absolute error in km, or null if actual is unknown
     */
    public Double calculateError(Double estimated, Double actual) {
        if (estimated == null || actual == null) return null;
        return Math.abs(estimated - actual);
    }

    /**
     * Immutable result of a localization calculation.
     */
    public static class LocalizationResult {

        private final String method;
        private final Double estimatedDistanceKm;
        private final double faultVoltageV;
        private final double referenceVoltageV;
        private final double totalLengthKm;
        private final boolean valid;
        private final String errorMessage;
        private final String warning;

        public LocalizationResult(String method, Double estimatedDistanceKm,
                                   double faultVoltageV, double referenceVoltageV,
                                   double totalLengthKm, boolean valid,
                                   String errorMessage, String warning) {
            this.method = method;
            this.estimatedDistanceKm = estimatedDistanceKm;
            this.faultVoltageV = faultVoltageV;
            this.referenceVoltageV = referenceVoltageV;
            this.totalLengthKm = totalLengthKm;
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.warning = warning;
        }

        public static LocalizationResult invalid(String method, String error) {
            return new LocalizationResult(method, null, 0, 0, 0, false, error, null);
        }

        public String getMethod() { return method; }
        public Double getEstimatedDistanceKm() { return estimatedDistanceKm; }
        public double getFaultVoltageV() { return faultVoltageV; }
        public double getReferenceVoltageV() { return referenceVoltageV; }
        public double getTotalLengthKm() { return totalLengthKm; }
        public boolean isValid() { return valid; }
        public String getErrorMessage() { return errorMessage; }
        public String getWarning() { return warning; }
    }
}
