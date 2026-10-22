package com.shield.repository;

import com.shield.domain.BackupFeeder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BackupFeederRepository extends JpaRepository<BackupFeeder, Long> {
    Optional<BackupFeeder> findFirstByAvailableTrue();
}
