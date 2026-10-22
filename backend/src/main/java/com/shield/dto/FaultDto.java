package com.shield.dto;

import com.shield.domain.FaultRecord;
import java.time.Instant;

/**
 * DTOs for fault records and localization results.
 */
public class FaultDto {

    public record FaultRecordDto(
        Long id,
        Long sessionId,
        Long segmentId,
        String segmentName,
        String faultType,
        Instant injectedAt,
        Instant detectedAt,
        Instant localizedAt,
        Instant isolatedAt,
        Instant clearedAt,
        Double actualFaultDistanceKm,
        Double estimatedFaultDistanceKm,
        Double localizationErrorKm,
        Double faultVoltageV,
        String phase,
        boolean isolated,
        boolean rerouteAttempted,
        boolean rerouteSuccessful,
        String rerouteFailureReason
    ) {
        public static FaultRecordDto from(FaultRecord r) {
            return new FaultRecordDto(
                r.getId(), r.getSessionId(), r.getSegmentId(), r.getSegmentName(),
                r.getFaultType().name(),
                r.getInjectedAt(), r.getDetectedAt(), r.getLocalizedAt(),
                r.getIsolatedAt(), r.getClearedAt(),
                r.getActualFaultDistanceKm(), r.getEstimatedFaultDistanceKm(),
                r.getLocalizationErrorKm(), r.getFaultVoltageV(),
                r.getPhase().name(),
                r.isIsolated(), r.isRerouteAttempted(),
                r.isRerouteSuccessful(), r.getRerouteFailureReason()
            );
        }
    }

    public record LocalizationResultDto(
        String method,
        Double estimatedDistanceKm,
        Double actualDistanceKm,
        Double errorKm,
        double faultVoltageV,
        double referenceVoltageV,
        double totalLengthKm,
        boolean valid,
        String errorMessage,
        String warning,
        String formulaDescription
    ) {}

    public record LocalizationRequest(
        double faultVoltageV,
        double referenceVoltageV,
        double totalLengthKm,
        Double actualDistanceKm
    ) {}
}
