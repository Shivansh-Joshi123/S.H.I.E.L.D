package com.shield.controller;

import com.shield.config.SimulationProperties;
import com.shield.dto.FaultDto;
import com.shield.dto.FaultDto.*;
import com.shield.simulation.FaultLocalizer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoint for explicit localization calculations.
 * Allows the frontend to call the localization formula directly
 * with user-supplied inputs (e.g. for the Fault Localization Analysis page).
 */
@RestController
@RequestMapping("/api/localization")
public class LocalizationController {

    private final FaultLocalizer localizer;
    private final SimulationProperties props;

    public LocalizationController(FaultLocalizer localizer, SimulationProperties props) {
        this.localizer = localizer;
        this.props = props;
    }

    /**
     * Calculates fault distance using the Report-Based Voltage Ratio method.
     *
     * Formula: Df = (Vf / VT) × LT
     */
    @PostMapping("/report-based")
    public ResponseEntity<LocalizationResultDto> reportBased(@RequestBody LocalizationRequest req) {
        FaultLocalizer.LocalizationResult result = localizer.localizeReportBased(
            req.faultVoltageV(),
            req.referenceVoltageV() > 0 ? req.referenceVoltageV() : props.getReferenceVoltageV(),
            req.totalLengthKm() > 0 ? req.totalLengthKm() : props.getTotalCableLengthKm()
        );

        Double error = localizer.calculateError(
            result.getEstimatedDistanceKm(), req.actualDistanceKm());

        return ResponseEntity.ok(new LocalizationResultDto(
            result.getMethod(),
            result.getEstimatedDistanceKm(),
            req.actualDistanceKm(),
            error,
            result.getFaultVoltageV(),
            result.getReferenceVoltageV(),
            result.getTotalLengthKm(),
            result.isValid(),
            result.getErrorMessage(),
            result.getWarning(),
            "Df = (Vf / VT) × LT — Report-Based Voltage Ratio Method"
        ));
    }
}
