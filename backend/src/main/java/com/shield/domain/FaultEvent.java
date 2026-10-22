package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * An immutable record of a significant system event.
 * Events are the permanent audit trail of all actions taken during simulation.
 */
@Entity
@Table(name = "fault_events")
public class FaultEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private Long sessionId;

    @Column
    private Long faultRecordId;

    @Column
    private Long segmentId;

    @Column
    private String segmentName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Structured detail payload (JSON string) for rich inspection */
    @Column(columnDefinition = "TEXT")
    private String detailJson;

    public FaultEvent() {
        this.timestamp = Instant.now();
    }

    public FaultEvent(EventType eventType, String description) {
        this();
        this.eventType = eventType;
        this.description = description;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getFaultRecordId() { return faultRecordId; }
    public void setFaultRecordId(Long faultRecordId) { this.faultRecordId = faultRecordId; }
    public Long getSegmentId() { return segmentId; }
    public void setSegmentId(Long segmentId) { this.segmentId = segmentId; }
    public String getSegmentName() { return segmentName; }
    public void setSegmentName(String segmentName) { this.segmentName = segmentName; }
    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDetailJson() { return detailJson; }
    public void setDetailJson(String detailJson) { this.detailJson = detailJson; }
}
