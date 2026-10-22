package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Represents a simulation run. A session is created when the simulation is started
 * and closed when it is stopped or reset.
 */
@Entity
@Table(name = "simulation_sessions")
public class SimulationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant startedAt;

    @Column
    private Instant endedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SimulationPhase currentPhase = SimulationPhase.NORMAL_MONITORING;

    /** JSON snapshot of the network configuration at session start */
    @Column(columnDefinition = "TEXT")
    private String configSnapshot;

    @Column(nullable = false)
    private boolean active = true;

    public SimulationSession() {
        this.startedAt = Instant.now();
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
    public SimulationPhase getCurrentPhase() { return currentPhase; }
    public void setCurrentPhase(SimulationPhase currentPhase) { this.currentPhase = currentPhase; }
    public String getConfigSnapshot() { return configSnapshot; }
    public void setConfigSnapshot(String configSnapshot) { this.configSnapshot = configSnapshot; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
