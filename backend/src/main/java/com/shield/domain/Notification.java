package com.shield.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * An in-application maintenance notification.
 *
 * IMPORTANT: These are in-application notifications only.
 * No SMS, email, or push notification is sent unless a real
 * external provider is configured and the operation succeeds.
 * Simulated notifications are clearly labelled as such.
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Long sessionId;

    @Column
    private Long faultRecordId;

    @Column
    private String affectedSegment;

    /** Severity level: INFO, WARNING, CRITICAL */
    @Column(nullable = false)
    private String severity;

    public Notification() {
        this.createdAt = Instant.now();
    }

    public Notification(NotificationType type, String title, String message, String severity) {
        this();
        this.type = type;
        this.title = title;
        this.message = message;
        this.severity = severity;
    }

    // ── Getters and Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getFaultRecordId() { return faultRecordId; }
    public void setFaultRecordId(Long faultRecordId) { this.faultRecordId = faultRecordId; }
    public String getAffectedSegment() { return affectedSegment; }
    public void setAffectedSegment(String affectedSegment) { this.affectedSegment = affectedSegment; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
}
