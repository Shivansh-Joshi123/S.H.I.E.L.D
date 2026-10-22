package com.shield.domain;

import jakarta.persistence.*;

/**
 * Represents a downstream electrical load connected to the cable network.
 *
 * In the simplified resistor model, the load is represented as a resistance:
 *   R_load = V_rated^2 / P_demand
 *
 * The load is considered "supplied" if the segment feeding it is healthy
 * or supplied via the backup feeder.
 */
@Entity
@Table(name = "electrical_loads")
public class ElectricalLoad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** ID of the cable segment this load is connected to */
    @Column(nullable = false)
    private Long segmentId;

    /** Active power demand in Watts */
    @Column(nullable = false)
    private double powerDemandW;

    /** Rated voltage in Volts */
    @Column(nullable = false)
    private double ratedVoltageV;

    /** Whether this load is currently receiving power */
    @Column(nullable = false)
    private boolean supplied = true;

    public ElectricalLoad() {}

    public ElectricalLoad(String name, Long segmentId, double powerDemandW, double ratedVoltageV) {
        this.name = name;
        this.segmentId = segmentId;
        this.powerDemandW = powerDemandW;
        this.ratedVoltageV = ratedVoltageV;
    }

    /** Equivalent load resistance: R_load = V^2 / P */
    public double equivalentResistanceOhm() {
        if (powerDemandW <= 0) return Double.MAX_VALUE;
        return (ratedVoltageV * ratedVoltageV) / powerDemandW;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getSegmentId() { return segmentId; }
    public void setSegmentId(Long segmentId) { this.segmentId = segmentId; }
    public double getPowerDemandW() { return powerDemandW; }
    public void setPowerDemandW(double powerDemandW) { this.powerDemandW = powerDemandW; }
    public double getRatedVoltageV() { return ratedVoltageV; }
    public void setRatedVoltageV(double ratedVoltageV) { this.ratedVoltageV = ratedVoltageV; }
    public boolean isSupplied() { return supplied; }
    public void setSupplied(boolean supplied) { this.supplied = supplied; }
}
