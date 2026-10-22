package com.shield.dto;

import com.shield.domain.*;
import java.time.Instant;
import java.util.List;

/**
 * DTO classes for the REST API layer.
 * All DTOs are immutable records.
 */
public class NetworkDto {

    public record NetworkStateResponse(
        List<SegmentDto> segments,
        List<RelayDto> relays,
        BackupFeederDto backupFeeder,
        List<LoadDto> loads,
        SimulationStatusDto simulationStatus
    ) {}

    public record SegmentDto(
        Long id,
        String name,
        String displayLabel,
        double lengthKm,
        double resistancePerKm,
        double totalResistanceOhm,
        int sequenceOrder,
        String status,
        Long isolationRelayId,
        Double lastVoltageV,
        Double lastCurrentA,
        Double normalVoltageV,
        Double normalCurrentA,
        Instant lastUpdated
    ) {
        public static SegmentDto from(CableSegment s) {
            return new SegmentDto(
                s.getId(), s.getName(), s.getDisplayLabel(),
                s.getLengthKm(), s.getResistancePerKm(), s.totalResistanceOhm(),
                s.getSequenceOrder(), s.getStatus().name(),
                s.getIsolationRelayId(), s.getLastVoltageV(), s.getLastCurrentA(),
                s.getNormalVoltageV(), s.getNormalCurrentA(), s.getLastUpdated()
            );
        }
    }

    public record RelayDto(
        Long id,
        String name,
        String type,
        String state,
        Long segmentId,
        boolean manualOverride,
        Instant lastOperatedAt,
        String lastOperatedBy
    ) {
        public static RelayDto from(Relay r) {
            return new RelayDto(
                r.getId(), r.getName(), r.getType().name(), r.getState().name(),
                r.getSegmentId(), r.isManualOverride(),
                r.getLastOperatedAt(), r.getLastOperatedBy()
            );
        }
    }

    public record BackupFeederDto(
        Long id,
        String name,
        boolean available,
        double capacityAmperes,
        double sourceVoltageV,
        boolean active,
        Long relayId
    ) {
        public static BackupFeederDto from(BackupFeeder f) {
            return new BackupFeederDto(
                f.getId(), f.getName(), f.isAvailable(),
                f.getCapacityAmperes(), f.getSourceVoltageV(),
                f.isActive(), f.getRelayId()
            );
        }
    }

    public record LoadDto(
        Long id,
        String name,
        Long segmentId,
        double powerDemandW,
        double ratedVoltageV,
        boolean supplied
    ) {
        public static LoadDto from(ElectricalLoad l) {
            return new LoadDto(
                l.getId(), l.getName(), l.getSegmentId(),
                l.getPowerDemandW(), l.getRatedVoltageV(), l.isSupplied()
            );
        }
    }

    public record SimulationStatusDto(
        boolean running,
        String phase,
        Long sessionId,
        ActiveFaultDto activeFault,
        long healthySegments,
        long activeSegments,
        long isolatedSegments,
        double totalCableLengthKm,
        double referenceVoltageV
    ) {}

    public record ActiveFaultDto(
        Long segmentId,
        String segmentName,
        String faultType,
        Double actualDistanceKm,
        Long faultRecordId
    ) {}

    // ── Request DTOs ─────────────────────────────────────────────────────────────────────────

    public record InjectFaultRequest(
        Long segmentId,
        String faultType,  // OPEN_CIRCUIT | SHORT_CIRCUIT | GROUND_FAULT
        Double distanceKm  // optional; defaults to segment midpoint
    ) {}

    public record RelayOperationRequest(
        String targetState,  // OPEN | CLOSED
        String operatedBy
    ) {}

    public record ConfigurationUpdateRequest(
        Double totalCableLengthKm,
        Double referenceVoltageV,
        Double voltageDropThresholdPercent,
        Double overcurrentThresholdMultiplier,
        Double undercurrentThresholdPercent,
        Integer faultConfirmationSamples,
        Double sensorNoisePercent,
        Boolean autoIsolation
    ) {}

    public record BackupFeederUpdateRequest(
        Boolean available,
        Double capacityAmperes
    ) {}
}
