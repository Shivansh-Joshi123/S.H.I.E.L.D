package com.shield.repository;

import com.shield.domain.SensorMeasurement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SensorMeasurementRepository extends JpaRepository<SensorMeasurement, Long> {
    List<SensorMeasurement> findBySegmentIdOrderByTimestampDesc(Long segmentId);
    Page<SensorMeasurement> findBySegmentIdAndTimestampBetween(
        Long segmentId, Instant from, Instant to, Pageable pageable);
    List<SensorMeasurement> findTop100BySessionIdOrderByTimestampDesc(Long sessionId);
    List<SensorMeasurement> findBySessionIdOrderByTimestampAsc(Long sessionId);
}
