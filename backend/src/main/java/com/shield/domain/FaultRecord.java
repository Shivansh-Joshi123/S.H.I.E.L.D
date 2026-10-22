package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Records a fault injection event and its lifecycle.
 */
@Entity
@Table(name = "fault_records")
public class FaultRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private Long sessionId;

    @Column(nullable = false)
    private Long segmentId;

    @Column(nullable = false)
    private String segmentName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultType faultType;

    @Column(nullable = false)
    private Instant injectedAt;

    @Column
    private Instant detectedAt;

    @Column
    private Instant localizedAt;

    @Column
    private Instant isolatedAt;

    @Column
    private Instant clearedAt;

    /**
     * Actual injected fault distance from source (km).
     * This is the ground-truth location known to the simulation.
     * It is stored separately from the estimated distance to allow
     * localization error to be calculated and displayed.
     */
    @Column
    private Double actualFaultDistanceKm;

    /**
     * Estimated fault distance from source (km), calculated by the
     * Report-Based Voltage Ratio formula: Df = (Vf / VT) * LT
     */
    @Column
    private Double estimatedFaultDistanceKm;

    /**
     * Localization error in kilometres: |estimated - actual|
     */
    @Column
    private Double localizationErrorKm;

    /** Voltage measured at the sensing point during the fault (V) */
    @Column
    private Double faultVoltageV;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SimulationPhase phase = SimulationPhase.FAULT_SUSPECTED;

    @Column
    private boolean isolated = false;

    @Column
    private boolean rerouteAttempted = false;

    @Column
    private boolean rerouteSuccessful = false;

    @Column
    private String rerouteFailureReason;

    public FaultRecord() {
        this.injectedAt = Instant.now();
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getSegmentId() { return segmentId; }
    public void setSegmentId(Long segmentId) { this.segmentId = segmentId; }
    public String getSegmentName() { return segmentName; }
    public void setSegmentName(String segmentName) { this.segmentName = segmentName; }
    public FaultType getFaultType() { return faultType; }
    public void setFaultType(FaultType faultType) { this.faultType = faultType; }
    public Instant getInjectedAt() { return injectedAt; }
    public void setInjectedAt(Instant injectedAt) { this.injectedAt = injectedAt; }
    public Instant getDetectedAt() { return detectedAt; }
    public void setDetectedAt(Instant detectedAt) { this.detectedAt = detectedAt; }
    public Instant getLocalizedAt() { return localizedAt; }
    public void setLocalizedAt(Instant localizedAt) { this.localizedAt = localizedAt; }
    public Instant getIsolatedAt() { return isolatedAt; }
    public void setIsolatedAt(Instant isolatedAt) { this.isolatedAt = isolatedAt; }
    public Instant getClearedAt() { return clearedAt; }
    public void setClearedAt(Instant clearedAt) { this.clearedAt = clearedAt; }
    public Double getActualFaultDistanceKm() { return actualFaultDistanceKm; }
    public void setActualFaultDistanceKm(Double actualFaultDistanceKm) { this.actualFaultDistanceKm = actualFaultDistanceKm; }
    public Double getEstimatedFaultDistanceKm() { return estimatedFaultDistanceKm; }
    public void setEstimatedFaultDistanceKm(Double estimatedFaultDistanceKm) { this.estimatedFaultDistanceKm = estimatedFaultDistanceKm; }
    public Double getLocalizationErrorKm() { return localizationErrorKm; }
    public void setLocalizationErrorKm(Double localizationErrorKm) { this.localizationErrorKm = localizationErrorKm; }
    public Double getFaultVoltageV() { return faultVoltageV; }
    public void setFaultVoltageV(Double faultVoltageV) { this.faultVoltageV = faultVoltageV; }
    public SimulationPhase getPhase() { return phase; }
    public void setPhase(SimulationPhase phase) { this.phase = phase; }
    public boolean isIsolated() { return isolated; }
    public void setIsolated(boolean isolated) { this.isolated = isolated; }
    public boolean isRerouteAttempted() { return rerouteAttempted; }
    public void setRerouteAttempted(boolean rerouteAttempted) { this.rerouteAttempted = rerouteAttempted; }
    public boolean isRerouteSuccessful() { return rerouteSuccessful; }
    public void setRerouteSuccessful(boolean rerouteSuccessful) { this.rerouteSuccessful = rerouteSuccessful; }
    public String getRerouteFailureReason() { return rerouteFailureReason; }
    public void setRerouteFailureReason(String rerouteFailureReason) { this.rerouteFailureReason = rerouteFailureReason; }
}
