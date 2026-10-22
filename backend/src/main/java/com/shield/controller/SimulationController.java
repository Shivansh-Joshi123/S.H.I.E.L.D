package com.shield.controller;

import com.shield.domain.FaultRecord;
import com.shield.domain.FaultType;
import com.shield.domain.RelayState;
import com.shield.dto.FaultDto;
import com.shield.dto.FaultDto.*;
import com.shield.dto.NetworkDto.*;
import com.shield.exception.ShieldException;
import com.shield.repository.FaultRecordRepository;
import com.shield.simulation.SimulationEngine;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for simulation control and fault management.
 */
@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

    private final SimulationEngine engine;
    private final FaultRecordRepository faultRecordRepo;

    public SimulationController(SimulationEngine engine,
                                 FaultRecordRepository faultRecordRepo) {
        this.engine = engine;
        this.faultRecordRepo = faultRecordRepo;
    }

    @PostMapping("/start")
    public ResponseEntity<?> start() {
        engine.startSimulation();
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Simulation started",
            "sessionId", engine.getCurrentSessionId()
        ));
    }

    @PostMapping("/stop")
    public ResponseEntity<?> stop() {
        engine.stopSimulation();
        return ResponseEntity.ok(java.util.Map.of("message", "Simulation stopped"));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset() {
        engine.resetSimulation();
        return ResponseEntity.ok(java.util.Map.of(
            "message", "Simulation reset to normal state. Historical records preserved."));
    }

    @PostMapping("/faults")
    public ResponseEntity<FaultRecordDto> injectFault(@RequestBody InjectFaultRequest req) {
        if (req.segmentId() == null) {
            throw ShieldException.validationError("segmentId is required");
        }
        if (req.faultType() == null) {
            throw ShieldException.validationError("faultType is required: OPEN_CIRCUIT, SHORT_CIRCUIT, or GROUND_FAULT");
        }

        FaultType type;
        try {
            type = FaultType.valueOf(req.faultType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ShieldException.validationError("Invalid faultType: " + req.faultType());
        }

        FaultRecord record = engine.injectFault(req.segmentId(), type, req.distanceKm());
        return ResponseEntity.status(HttpStatus.CREATED).body(FaultRecordDto.from(record));
    }

    @GetMapping("/faults")
    public ResponseEntity<List<FaultRecordDto>> getFaults() {
        return ResponseEntity.ok(
            faultRecordRepo.findAllByOrderByInjectedAtDesc().stream()
                .map(FaultRecordDto::from).toList());
    }

    @GetMapping("/faults/active")
    public ResponseEntity<List<FaultRecordDto>> getActiveFaults() {
        return ResponseEntity.ok(
            faultRecordRepo.findActiveFaults().stream()
                .map(FaultRecordDto::from).toList());
    }

    @GetMapping("/faults/{id}")
    public ResponseEntity<FaultRecordDto> getFault(@PathVariable Long id) {
        return ResponseEntity.ok(
            FaultRecordDto.from(faultRecordRepo.findById(id)
                .orElseThrow(() -> ShieldException.notFound("FaultRecord", id))));
    }

    @PostMapping("/faults/{id}/clear")
    public ResponseEntity<FaultRecordDto> clearFault(@PathVariable Long id) {
        FaultRecord record = engine.clearFault(id);
        return ResponseEntity.ok(FaultRecordDto.from(record));
    }

    @PostMapping("/segments/{id}/reroute")
    public ResponseEntity<SegmentDto> rerouteViaBackup(@PathVariable Long id) {
        com.shield.domain.CableSegment segment = engine.engageBackupNode(id, "MANAGER_MANUAL");
        return ResponseEntity.ok(SegmentDto.from(segment));
    }

    @PostMapping("/segments/{id}/restore")
    public ResponseEntity<SegmentDto> restorePrimaryRoute(@PathVariable Long id) {
        com.shield.domain.CableSegment segment = engine.restorePrimaryRoute(id, "MANAGER_MANUAL");
        return ResponseEntity.ok(SegmentDto.from(segment));
    }

    @PostMapping("/isolate")
    public ResponseEntity<?> triggerIsolation() {
        engine.isolateFault(null);
        return ResponseEntity.ok(java.util.Map.of("message", "Fault isolation triggered manually"));
    }
}
