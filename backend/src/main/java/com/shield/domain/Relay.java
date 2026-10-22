package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Represents an electrically-operated relay in the cable network.
 *
 * IMPORTANT: This relay state is simulated. It does NOT represent
 * the state of any physical relay connected to real infrastructure.
 * Integration with real relays requires hardware-level isolation,
 * protection engineering review, and qualified electrical supervision.
 */
@Entity
@Table(name = "relays")
public class Relay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RelayType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RelayState state = RelayState.CLOSED;

    /** ID of the cable segment this relay controls (null for backup relay) */
    @Column
    private Long segmentId;

    @Column(nullable = false)
    private boolean manualOverride = false;

    @Column
    private Instant lastOperatedAt;

    @Column
    private String lastOperatedBy;  // "AUTOMATIC" or user identifier

    public Relay() {}

    public Relay(String name, RelayType type, Long segmentId) {
        this.name = name;
        this.type = type;
        this.segmentId = segmentId;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public RelayType getType() { return type; }
    public void setType(RelayType type) { this.type = type; }
    public RelayState getState() { return state; }
    public void setState(RelayState state) { this.state = state; }
    public Long getSegmentId() { return segmentId; }
    public void setSegmentId(Long segmentId) { this.segmentId = segmentId; }
    public boolean isManualOverride() { return manualOverride; }
    public void setManualOverride(boolean manualOverride) { this.manualOverride = manualOverride; }
    public Instant getLastOperatedAt() { return lastOperatedAt; }
    public void setLastOperatedAt(Instant lastOperatedAt) { this.lastOperatedAt = lastOperatedAt; }
    public String getLastOperatedBy() { return lastOperatedBy; }
    public void setLastOperatedBy(String lastOperatedBy) { this.lastOperatedBy = lastOperatedBy; }
}
