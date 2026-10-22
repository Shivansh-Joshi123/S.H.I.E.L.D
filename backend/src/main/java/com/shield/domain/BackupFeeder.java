package com.shield.domain;

import jakarta.persistence.*;

/**
 * Represents the alternate backup power feeder path.
 *
 * When the primary cable path is interrupted by a fault and isolated,
 * the backup feeder can supply power via an alternate route if:
 *   1. The feeder is configured as available.
 *   2. The connected backup relay is CLOSED.
 *   3. The downstream load demand does not exceed the feeder's capacity.
 */
@Entity
@Table(name = "backup_feeders")
public class BackupFeeder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Whether this feeder is available for use */
    @Column(nullable = false)
    private boolean available = true;

    /** Maximum current capacity in Amperes */
    @Column(nullable = false)
    private double capacityAmperes;

    /** Feeder source voltage in Volts */
    @Column(nullable = false)
    private double sourceVoltageV;

    /** Whether the backup is currently active and supplying power */
    @Column(nullable = false)
    private boolean active = false;

    /** ID of the relay controlling this backup feeder */
    @Column
    private Long relayId;

    public BackupFeeder() {}

    public BackupFeeder(String name, double capacityAmperes, double sourceVoltageV) {
        this.name = name;
        this.capacityAmperes = capacityAmperes;
        this.sourceVoltageV = sourceVoltageV;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public double getCapacityAmperes() { return capacityAmperes; }
    public void setCapacityAmperes(double capacityAmperes) { this.capacityAmperes = capacityAmperes; }
    public double getSourceVoltageV() { return sourceVoltageV; }
    public void setSourceVoltageV(double sourceVoltageV) { this.sourceVoltageV = sourceVoltageV; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Long getRelayId() { return relayId; }
    public void setRelayId(Long relayId) { this.relayId = relayId; }
}
