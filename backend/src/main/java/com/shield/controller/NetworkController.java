package com.shield.controller;

import com.shield.config.SimulationProperties;
import com.shield.domain.*;
import com.shield.dto.NetworkDto;
import com.shield.dto.NetworkDto.*;
import com.shield.repository.*;
import com.shield.simulation.ActiveFaultState;
import com.shield.simulation.SimulationEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for querying and configuring the cable network.
 */
@RestController
@RequestMapping("/api")
public class NetworkController {

    private final CableSegmentRepository segmentRepo;
    private final RelayRepository relayRepo;
    private final BackupFeederRepository feederRepo;
    private final ElectricalLoadRepository loadRepo;
    private final SimulationEngine engine;
    private final SimulationProperties props;

    public NetworkController(CableSegmentRepository segmentRepo,
                              RelayRepository relayRepo,
                              BackupFeederRepository feederRepo,
                              ElectricalLoadRepository loadRepo,
                              SimulationEngine engine,
                              SimulationProperties props) {
        this.segmentRepo = segmentRepo;
        this.relayRepo = relayRepo;
        this.feederRepo = feederRepo;
        this.loadRepo = loadRepo;
        this.engine = engine;
        this.props = props;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(java.util.Map.of(
            "status", "UP",
            "service", "S.H.I.E.L.D. Backend",
            "version", "1.0.0",
            "simulationRunning", engine.isRunning()
        ));
    }

    @GetMapping("/network")
    public ResponseEntity<NetworkStateResponse> getNetwork() {
        List<CableSegment> segments = segmentRepo.findAllByOrderBySequenceOrderAsc();
        List<Relay> relays = relayRepo.findAll();
        BackupFeeder feeder = feederRepo.findAll().stream().findFirst().orElse(null);
        List<ElectricalLoad> loads = loadRepo.findAll();

        ActiveFaultState af = engine.getActiveFault();
        ActiveFaultDto afDto = af == null ? null : new ActiveFaultDto(
            af.getSegmentId(), af.getSegmentName(), af.getFaultType().name(),
            af.getActualDistanceKm(), af.getFaultRecordId()
        );

        SimulationStatusDto status = new SimulationStatusDto(
            engine.isRunning(),
            engine.getCurrentPhase().name(),
            engine.getCurrentSessionId(),
            afDto,
            segmentRepo.countByStatus(SegmentStatus.HEALTHY),
            segments.size(),
            segmentRepo.countByStatus(SegmentStatus.ISOLATED),
            props.getTotalCableLengthKm(),
            props.getReferenceVoltageV()
        );

        NetworkStateResponse response = new NetworkStateResponse(
            segments.stream().map(SegmentDto::from).toList(),
            relays.stream().map(RelayDto::from).toList(),
            feeder != null ? BackupFeederDto.from(feeder) : null,
            loads.stream().map(LoadDto::from).toList(),
            status
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/simulation/status")
    public ResponseEntity<SimulationStatusDto> getStatus() {
        List<CableSegment> segments = segmentRepo.findAllByOrderBySequenceOrderAsc();
        ActiveFaultState af = engine.getActiveFault();
        ActiveFaultDto afDto = af == null ? null : new ActiveFaultDto(
            af.getSegmentId(), af.getSegmentName(), af.getFaultType().name(),
            af.getActualDistanceKm(), af.getFaultRecordId()
        );

        return ResponseEntity.ok(new SimulationStatusDto(
            engine.isRunning(),
            engine.getCurrentPhase().name(),
            engine.getCurrentSessionId(),
            afDto,
            segmentRepo.countByStatus(SegmentStatus.HEALTHY),
            segments.size(),
            segmentRepo.countByStatus(SegmentStatus.ISOLATED),
            props.getTotalCableLengthKm(),
            props.getReferenceVoltageV()
        ));
    }

    @PutMapping("/network/configuration")
    public ResponseEntity<?> updateConfig(@RequestBody ConfigurationUpdateRequest req) {
        if (req.totalCableLengthKm() != null && req.totalCableLengthKm() > 0)
            props.setTotalCableLengthKm(req.totalCableLengthKm());
        if (req.referenceVoltageV() != null && req.referenceVoltageV() > 0)
            props.setReferenceVoltageV(req.referenceVoltageV());
        if (req.voltageDropThresholdPercent() != null && req.voltageDropThresholdPercent() > 0)
            props.setVoltageDropThresholdPercent(req.voltageDropThresholdPercent());
        if (req.overcurrentThresholdMultiplier() != null && req.overcurrentThresholdMultiplier() > 0)
            props.setOvercurrentThresholdMultiplier(req.overcurrentThresholdMultiplier());
        if (req.undercurrentThresholdPercent() != null)
            props.setUndercurrentThresholdPercent(req.undercurrentThresholdPercent());
        if (req.faultConfirmationSamples() != null && req.faultConfirmationSamples() > 0)
            props.setFaultConfirmationSamples(req.faultConfirmationSamples());
        if (req.sensorNoisePercent() != null && req.sensorNoisePercent() >= 0)
            props.setSensorNoisePercent(req.sensorNoisePercent());
        if (req.autoIsolation() != null)
            props.setAutoIsolation(req.autoIsolation());

        return ResponseEntity.ok(java.util.Map.of(
            "message", "Configuration updated",
            "totalCableLengthKm", props.getTotalCableLengthKm(),
            "referenceVoltageV", props.getReferenceVoltageV(),
            "autoIsolation", props.isAutoIsolation()
        ));
    }

    @PutMapping("/network/backup-feeder")
    public ResponseEntity<?> updateBackupFeeder(@RequestBody BackupFeederUpdateRequest req) {
        BackupFeeder feeder = feederRepo.findAll().stream().findFirst()
            .orElseThrow(() -> com.shield.exception.ShieldException.notFound("BackupFeeder", "default"));
        if (req.available() != null) feeder.setAvailable(req.available());
        if (req.capacityAmperes() != null && req.capacityAmperes() > 0)
            feeder.setCapacityAmperes(req.capacityAmperes());
        feederRepo.save(feeder);
        return ResponseEntity.ok(BackupFeederDto.from(feeder));
    }
}
