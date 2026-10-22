package com.shield.repository;

import com.shield.domain.FaultEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaultEventRepository extends JpaRepository<FaultEvent, Long> {
    List<FaultEvent> findBySessionIdOrderByTimestampDesc(Long sessionId);
    Page<FaultEvent> findAllByOrderByTimestampDesc(Pageable pageable);
    List<FaultEvent> findTop50ByOrderByTimestampDesc();
}
