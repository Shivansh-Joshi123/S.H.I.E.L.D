package com.shield.repository;

import com.shield.domain.Notification;
import com.shield.domain.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReadFalseOrderByCreatedAtDesc();
    long countByReadFalse();
    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Notification> findByTypeOrderByCreatedAtDesc(NotificationType type, Pageable pageable);
    Page<Notification> findByReadOrderByCreatedAtDesc(boolean read, Pageable pageable);
}
