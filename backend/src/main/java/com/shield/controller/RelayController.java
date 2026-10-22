package com.shield.controller;

import com.shield.domain.Relay;
import com.shield.domain.RelayState;
import com.shield.dto.NetworkDto;
import com.shield.dto.NetworkDto.*;
import com.shield.exception.ShieldException;
import com.shield.repository.RelayRepository;
import com.shield.simulation.SimulationEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for relay control.
 */
@RestController
@RequestMapping("/api/relays")
public class RelayController {

    private final RelayRepository relayRepo;
    private final SimulationEngine engine;

    public RelayController(RelayRepository relayRepo, SimulationEngine engine) {
        this.relayRepo = relayRepo;
        this.engine = engine;
    }

    @GetMapping
    public ResponseEntity<List<RelayDto>> getAllRelays() {
        return ResponseEntity.ok(
            relayRepo.findAll().stream().map(RelayDto::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RelayDto> getRelay(@PathVariable Long id) {
        Relay relay = relayRepo.findById(id)
            .orElseThrow(() -> ShieldException.notFound("Relay", id));
        return ResponseEntity.ok(RelayDto.from(relay));
    }

    @PostMapping("/{id}/open")
    public ResponseEntity<RelayDto> openRelay(@PathVariable Long id,
                                               @RequestBody(required = false) RelayOperationRequest req) {
        String by = req != null ? req.operatedBy() : "MANUAL";
        Relay relay = engine.operateRelay(id, RelayState.OPEN, by);
        return ResponseEntity.ok(RelayDto.from(relay));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<RelayDto> closeRelay(@PathVariable Long id,
                                                @RequestBody(required = false) RelayOperationRequest req) {
        String by = req != null ? req.operatedBy() : "MANUAL";
        Relay relay = engine.operateRelay(id, RelayState.CLOSED, by);
        return ResponseEntity.ok(RelayDto.from(relay));
    }
}
