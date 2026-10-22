package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Records a single simulated sensor reading at a specific time and segment.
 *
 * DISCLAIMER: All values are SIMULATED. They are calculated from the simplified
 * resistor circuit model and do not represent real electrical measurements.
 * Sensor noise is added as a configurable Gaussian perturbation.
 */
@Entity
@Table(name = "sensor_measurements")
public class SensorMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long segmentId;

    @Column(nullable = false)
    private String segmentName;

    @Column
    private Long sessionId;

    @Column(nullable = false)
    private Instant timestamp;

    /** Simulated voltage at the start of this segment (V) */
    @Column(nullable = false)
    private double voltageV;

    /** Simulated current through this segment (A) */
    @Column(nullable = false)
    private double currentA;

    /** Calculated power at this segment (W) = V * I */
    @Column(nullable = false)
    private double powerW;

    @Enumerated(EnumType.STRING)
    @Column
    private SegmentStatus segmentStatusAtTime;

    /** True if a fault was active in the network at the time of this reading */
    @Column(nullable = false)
    private boolean faultActive;

    public SensorMeasurement() {
        this.timestamp = Instant.now();
    }

    public SensorMeasurement(Long segmentId, String segmentName, Long sessionId,
                              double voltageV, double currentA, SegmentStatus status,
                              boolean faultActive) {
        this();
        this.segmentId = segmentId;
        this.segmentName = segmentName;
        this.sessionId = sessionId;
        this.voltageV = voltageV;
        this.currentA = currentA;
        this.powerW = voltageV * currentA;
        this.segmentStatusAtTime = status;
        this.faultActive = faultActive;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSegmentId() { return segmentId; }
    public void setSegmentId(Long segmentId) { this.segmentId = segmentId; }
    public String getSegmentName() { return segmentName; }
    public void setSegmentName(String segmentName) { this.segmentName = segmentName; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public double getVoltageV() { return voltageV; }
    public void setVoltageV(double voltageV) { this.voltageV = voltageV; }
    public double getCurrentA() { return currentA; }
    public void setCurrentA(double currentA) { this.currentA = currentA; }
    public double getPowerW() { return powerW; }
    public void setPowerW(double powerW) { this.powerW = powerW; }
    public SegmentStatus getSegmentStatusAtTime() { return segmentStatusAtTime; }
    public void setSegmentStatusAtTime(SegmentStatus segmentStatusAtTime) { this.segmentStatusAtTime = segmentStatusAtTime; }
    public boolean isFaultActive() { return faultActive; }
    public void setFaultActive(boolean faultActive) { this.faultActive = faultActive; }
}
