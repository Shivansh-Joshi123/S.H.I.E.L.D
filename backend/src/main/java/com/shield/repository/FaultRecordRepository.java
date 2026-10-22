package com.shield.repository;

import com.shield.domain.FaultRecord;
import com.shield.domain.FaultType;
import com.shield.domain.SimulationPhase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface FaultRecordRepository extends JpaRepository<FaultRecord, Long> {

    List<FaultRecord> findBySessionId(Long sessionId);

    Optional<FaultRecord> findFirstByPhaseNotInOrderByInjectedAtDesc(
        List<SimulationPhase> excludedPhases);

    Page<FaultRecord> findBySegmentIdAndFaultTypeAndInjectedAtBetween(
        Long segmentId, FaultType faultType, Instant from, Instant to, Pageable pageable);

    List<FaultRecord> findAllByOrderByInjectedAtDesc();

    @Query("SELECT f FROM FaultRecord f WHERE f.clearedAt IS NULL AND f.phase NOT IN ('FAULT_CLEARED', 'SYSTEM_RESET')")
    List<FaultRecord> findActiveFaults();
}
