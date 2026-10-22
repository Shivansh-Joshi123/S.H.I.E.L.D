package com.shield.dto;

import com.shield.domain.FaultEvent;
import com.shield.domain.Notification;
import java.time.Instant;

/**
 * DTOs for events and notifications.
 */
public class EventDto {

    public record FaultEventDto(
        Long id,
        Long sessionId,
        Long faultRecordId,
        Long segmentId,
        String segmentName,
        String eventType,
        Instant timestamp,
        String description,
        String detailJson
    ) {
        public static FaultEventDto from(FaultEvent e) {
            return new FaultEventDto(
                e.getId(), e.getSessionId(), e.getFaultRecordId(),
                e.getSegmentId(), e.getSegmentName(),
                e.getEventType().name(),
                e.getTimestamp(), e.getDescription(), e.getDetailJson()
            );
        }
    }

    public record NotificationDto(
        Long id,
        String type,
        String title,
        String message,
        boolean read,
        Instant createdAt,
        Long sessionId,
        Long faultRecordId,
        String affectedSegment,
        String severity
    ) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(
                n.getId(), n.getType().name(), n.getTitle(),
                n.getMessage(), n.isRead(), n.getCreatedAt(),
                n.getSessionId(), n.getFaultRecordId(),
                n.getAffectedSegment(), n.getSeverity()
            );
        }
    }
}
