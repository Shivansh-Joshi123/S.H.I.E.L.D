package com.shield.repository;

import com.shield.domain.SimulationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SimulationSessionRepository extends JpaRepository<SimulationSession, Long> {
    Optional<SimulationSession> findFirstByActiveTrueOrderByStartedAtDesc();
}
