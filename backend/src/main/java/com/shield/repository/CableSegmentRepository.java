package com.shield.repository;

import com.shield.domain.CableSegment;
import com.shield.domain.SegmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CableSegmentRepository extends JpaRepository<CableSegment, Long> {
    List<CableSegment> findAllByOrderBySequenceOrderAsc();
    Optional<CableSegment> findByName(String name);
    List<CableSegment> findByStatus(SegmentStatus status);
    long countByStatus(SegmentStatus status);
}
