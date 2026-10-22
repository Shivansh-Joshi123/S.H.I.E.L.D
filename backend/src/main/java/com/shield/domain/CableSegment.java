package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Represents a single physical cable segment in the underground network.
 *
 * Each segment is modelled as a lumped resistor with:
 *   R_total = resistancePerKm * lengthKm  (Ω)
 *
 * The simplified model assumes uniform resistance distribution along the length.
 * Real cables also exhibit inductance, capacitance, and sheath effects, which
 * are not modelled here.
 */
@Entity
@Table(name = "cable_segments")
public class CableSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;          // e.g. "S1", "S2"

    @Column(nullable = false)
    private String displayLabel;  // e.g. "Segment 1 — Substation to Node A"

    /** Cable length in kilometres */
    @Column(nullable = false)
    private double lengthKm;

    /** Resistance per kilometre in Ohms/km */
    @Column(nullable = false)
    private double resistancePerKm;

    /** Order of this segment from source (1 = closest to supply) */
    @Column(nullable = false)
    private int sequenceOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SegmentStatus status = SegmentStatus.HEALTHY;

    /** ID of the isolation relay controlling this segment */
    @Column
    private Long isolationRelayId;

    /** Last measured voltage at the sending end of this segment (V) */
    @Column
    private Double lastVoltageV;

    /** Last measured current through this segment (A) */
    @Column
    private Double lastCurrentA;

    /** Normal (healthy) operating voltage at segment start (V) */
    @Column
    private Double normalVoltageV;

    /** Normal (healthy) operating current (A) */
    @Column
    private Double normalCurrentA;

    @Column
    private Instant lastUpdated;

    /** Number of consecutive abnormal samples — used for fault confirmation */
    @Transient
    private int abnormalSampleCount = 0;

    public CableSegment() {}

    public CableSegment(String name, String displayLabel, double lengthKm,
                        double resistancePerKm, int sequenceOrder) {
        this.name = name;
        this.displayLabel = displayLabel;
        this.lengthKm = lengthKm;
        this.resistancePerKm = resistancePerKm;
        this.sequenceOrder = sequenceOrder;
    }

    /** Calculates total resistance of this segment: R = ρ × L */
    public double totalResistanceOhm() {
        return resistancePerKm * lengthKm;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDisplayLabel() { return displayLabel; }
    public void setDisplayLabel(String displayLabel) { this.displayLabel = displayLabel; }
    public double getLengthKm() { return lengthKm; }
    public void setLengthKm(double lengthKm) { this.lengthKm = lengthKm; }
    public double getResistancePerKm() { return resistancePerKm; }
    public void setResistancePerKm(double resistancePerKm) { this.resistancePerKm = resistancePerKm; }
    public int getSequenceOrder() { return sequenceOrder; }
    public void setSequenceOrder(int sequenceOrder) { this.sequenceOrder = sequenceOrder; }
    public SegmentStatus getStatus() { return status; }
    public void setStatus(SegmentStatus status) { this.status = status; }
    public Long getIsolationRelayId() { return isolationRelayId; }
    public void setIsolationRelayId(Long isolationRelayId) { this.isolationRelayId = isolationRelayId; }
    public Double getLastVoltageV() { return lastVoltageV; }
    public void setLastVoltageV(Double lastVoltageV) { this.lastVoltageV = lastVoltageV; }
    public Double getLastCurrentA() { return lastCurrentA; }
    public void setLastCurrentA(Double lastCurrentA) { this.lastCurrentA = lastCurrentA; }
    public Double getNormalVoltageV() { return normalVoltageV; }
    public void setNormalVoltageV(Double normalVoltageV) { this.normalVoltageV = normalVoltageV; }
    public Double getNormalCurrentA() { return normalCurrentA; }
    public void setNormalCurrentA(Double normalCurrentA) { this.normalCurrentA = normalCurrentA; }
    public Instant getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Instant lastUpdated) { this.lastUpdated = lastUpdated; }
    public int getAbnormalSampleCount() { return abnormalSampleCount; }
    public void setAbnormalSampleCount(int abnormalSampleCount) { this.abnormalSampleCount = abnormalSampleCount; }
    public void incrementAbnormalCount() { this.abnormalSampleCount++; }
    public void resetAbnormalCount() { this.abnormalSampleCount = 0; }
}
