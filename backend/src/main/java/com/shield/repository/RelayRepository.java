package com.shield.repository;

import com.shield.domain.Relay;
import com.shield.domain.RelayType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RelayRepository extends JpaRepository<Relay, Long> {
    Optional<Relay> findBySegmentId(Long segmentId);
    List<Relay> findByType(RelayType type);
    Optional<Relay> findByName(String name);
}
