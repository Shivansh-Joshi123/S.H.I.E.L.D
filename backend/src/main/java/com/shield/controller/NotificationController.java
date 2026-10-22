package com.shield.controller;

import com.shield.dto.EventDto;
import com.shield.dto.EventDto.*;
import com.shield.exception.ShieldException;
import com.shield.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for the notification centre.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepo;

    public NotificationController(NotificationRepository notificationRepo) {
        this.notificationRepo = notificationRepo;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "50") int limit) {
        if (unreadOnly) {
            return ResponseEntity.ok(
                notificationRepo.findByReadFalseOrderByCreatedAtDesc().stream()
                    .limit(limit).map(NotificationDto::from).toList());
        }
        return ResponseEntity.ok(
            notificationRepo.findAllByOrderByCreatedAtDesc(
                PageRequest.of(0, limit, Sort.by("createdAt").descending())
            ).stream().map(NotificationDto::from).toList());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationRepo.countByReadFalse()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markRead(@PathVariable Long id) {
        com.shield.domain.Notification n = notificationRepo.findById(id)
            .orElseThrow(() -> ShieldException.notFound("Notification", id));
        n.setRead(true);
        notificationRepo.save(n);
        return ResponseEntity.ok(NotificationDto.from(n));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        List<com.shield.domain.Notification> unread = notificationRepo.findByReadFalseOrderByCreatedAtDesc();
        unread.forEach(n -> n.setRead(true));
        notificationRepo.saveAll(unread);
        return ResponseEntity.ok(Map.of("marked", unread.size()));
    }
}
