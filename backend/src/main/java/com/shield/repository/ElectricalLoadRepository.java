package com.shield.repository;

import com.shield.domain.ElectricalLoad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ElectricalLoadRepository extends JpaRepository<ElectricalLoad, Long> {
    List<ElectricalLoad> findBySegmentId(Long segmentId);
}
