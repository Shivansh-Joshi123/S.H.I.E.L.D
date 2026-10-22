package com.shield.simulation;

import com.shield.domain.FaultType;

/**
 * Represents an active injected fault in the simulation.
 * This is a transient (non-persisted) state object used by the simulation engine.
 * Persistence is handled via FaultRecord.
 */
public class ActiveFaultState {

    private final Long segmentId;
    private final String segmentName;
    private final FaultType faultType;

    /**
     * The actual injected fault distance from the source (km).
     * This is the ground-truth simulation value, known only to the engine.
     * It is stored separately from the estimated distance so that localization
     * accuracy can be calculated and displayed without bias.
     */
    private final double actualDistanceKm;

    private final Long faultRecordId;

    public ActiveFaultState(Long segmentId, String segmentName, FaultType faultType,
                             double actualDistanceKm, Long faultRecordId) {
        this.segmentId = segmentId;
        this.segmentName = segmentName;
        this.faultType = faultType;
        this.actualDistanceKm = actualDistanceKm;
        this.faultRecordId = faultRecordId;
    }

    public Long getSegmentId() { return segmentId; }
    public String getSegmentName() { return segmentName; }
    public FaultType getFaultType() { return faultType; }
    public double getActualDistanceKm() { return actualDistanceKm; }
    public Long getFaultRecordId() { return faultRecordId; }

    @Override
    public String toString() {
        return String.format("ActiveFaultState{segment='%s', type=%s, actualDist=%.2fkm}",
            segmentName, faultType, actualDistanceKm);
    }
}
