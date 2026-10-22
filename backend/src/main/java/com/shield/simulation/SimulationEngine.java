package com.shield.simulation;

import com.shield.config.SimulationProperties;
import com.shield.domain.*;
import com.shield.exception.ShieldException;
import com.shield.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/**
 * The central simulation engine.
 *
 * Implements the state machine with per-node backup redundancy and manager-triggered failover:
 *   NORMAL_MONITORING → FAULT_SUSPECTED → FAULT_CONFIRMED
 *   → FAULT_LOCALIZED → FAULT_ISOLATED
 *   → [Manager clicks "Reroute via Backup"] → SUPPLY_RESTORED
 *   → [Maintenance repairs cable & clears fault] → FAULT_CLEARED / NORMAL_MONITORING
 */
@Service
public class SimulationEngine {

    private static final Logger log = LoggerFactory.getLogger(SimulationEngine.class);

    private final CableSegmentRepository segmentRepo;
    private final RelayRepository relayRepo;
    private final BackupFeederRepository feederRepo;
    private final ElectricalLoadRepository loadRepo;
    private final FaultRecordRepository faultRecordRepo;
    private final SensorMeasurementRepository measurementRepo;
    private final FaultEventRepository eventRepo;
    private final NotificationRepository notificationRepo;
    private final SimulationSessionRepository sessionRepo;
    private final CircuitCalculator calculator;
    private final FaultLocalizer localizer;
    private final SimulationProperties props;

    // ── Volatile simulation state ──────────────────────────────────────────────

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicReference<SimulationPhase> currentPhase =
        new AtomicReference<>(SimulationPhase.NORMAL_MONITORING);
    private final AtomicReference<ActiveFaultState> activeFault =
        new AtomicReference<>(null);
    private final AtomicReference<Long> currentSessionId = new AtomicReference<>(null);

    /** SSE listeners — consumers notified on each tick */
    private final CopyOnWriteArrayList<Consumer<String>> sseListeners = new CopyOnWriteArrayList<>();

    public SimulationEngine(CableSegmentRepository segmentRepo,
                             RelayRepository relayRepo,
                             BackupFeederRepository feederRepo,
                             ElectricalLoadRepository loadRepo,
                             FaultRecordRepository faultRecordRepo,
                             SensorMeasurementRepository measurementRepo,
                             FaultEventRepository eventRepo,
                             NotificationRepository notificationRepo,
                             SimulationSessionRepository sessionRepo,
                             CircuitCalculator calculator,
                             FaultLocalizer localizer,
                             SimulationProperties props) {
        this.segmentRepo = segmentRepo;
        this.relayRepo = relayRepo;
        this.feederRepo = feederRepo;
        this.loadRepo = loadRepo;
        this.faultRecordRepo = faultRecordRepo;
        this.measurementRepo = measurementRepo;
        this.eventRepo = eventRepo;
        this.notificationRepo = notificationRepo;
        this.sessionRepo = sessionRepo;
        this.calculator = calculator;
        this.localizer = localizer;
        this.props = props;
    }

    // ── Simulation Lifecycle ───────────────────────────────────────────────────

    @Transactional
    public SimulationSession startSimulation() {
        if (running.get()) {
            throw ShieldException.invalidState("Simulation is already running.");
        }

        // Close any lingering active sessions
        sessionRepo.findFirstByActiveTrueOrderByStartedAtDesc()
            .ifPresent(s -> { s.setActive(false); s.setEndedAt(Instant.now()); sessionRepo.save(s); });

        SimulationSession session = new SimulationSession();
        session = sessionRepo.save(session);
        currentSessionId.set(session.getId());

        running.set(true);
        currentPhase.set(SimulationPhase.NORMAL_MONITORING);
        activeFault.set(null);

        recordEvent(EventType.SIMULATION_STARTED, null, null, "Simulation session started.");
        notify(NotificationType.SYSTEM_NORMAL, "Simulation Started",
            "Network is now in normal monitoring mode.", "INFO");

        log.info("Simulation started — session {}", session.getId());
        broadcastState();
        return session;
    }

    @Transactional
    public void stopSimulation() {
        if (!running.get()) {
            throw ShieldException.invalidState("Simulation is not running.");
        }
        running.set(false);
        closeSession();
        recordEvent(EventType.SIMULATION_STOPPED, null, null, "Simulation session stopped.");
        broadcastState();
        log.info("Simulation stopped.");
    }

    @Transactional
    public void resetSimulation() {
        running.set(false);
        activeFault.set(null);
        currentPhase.set(SimulationPhase.SYSTEM_RESET);

        // Reset all segment statuses and backup active flags
        List<CableSegment> segments = segmentRepo.findAllByOrderBySequenceOrderAsc();
        for (CableSegment seg : segments) {
            seg.setStatus(SegmentStatus.HEALTHY);
            seg.setBackupActive(false);
            seg.setBackupVoltageV(0.0);
            seg.setBackupCurrentA(0.0);
            seg.resetAbnormalCount();
            segmentRepo.save(seg);
        }

        // Close all primary isolation relays
        List<Relay> isolationRelays = relayRepo.findByType(RelayType.ISOLATION);
        for (Relay r : isolationRelays) {
            r.setState(RelayState.CLOSED);
            r.setLastOperatedAt(Instant.now());
            r.setLastOperatedBy("SYSTEM_RESET");
            relayRepo.save(r);
        }

        // Open all backup bypass relays (return to standby)
        List<Relay> backupRelays = relayRepo.findByType(RelayType.BACKUP);
        for (Relay r : backupRelays) {
            r.setState(RelayState.OPEN);
            r.setLastOperatedAt(Instant.now());
            r.setLastOperatedBy("SYSTEM_RESET");
            relayRepo.save(r);
        }

        // Reset global backup feeder
        feederRepo.findAll().forEach(f -> { f.setActive(false); feederRepo.save(f); });

        // Reset electrical loads to supplied
        loadRepo.findAll().forEach(l -> { l.setSupplied(true); loadRepo.save(l); });

        recalcNormalMeasurements();

        closeSession();
        recordEvent(EventType.SIMULATION_RESET, null, null, "System reset to normal state.");
        notify(NotificationType.SYSTEM_NORMAL, "System Reset",
            "All segments restored to healthy state. Primary corridors active, backup nodes on standby.", "INFO");

        currentPhase.set(SimulationPhase.NORMAL_MONITORING);
        broadcastState();
        log.info("Simulation reset complete.");
    }

    // ── Fault Injection ────────────────────────────────────────────────────────

    @Transactional
    public FaultRecord injectFault(Long segmentId, FaultType faultType, Double distanceKm) {
        if (!running.get()) {
            throw ShieldException.invalidState("Cannot inject fault: simulation is not running.");
        }
        if (activeFault.get() != null) {
            throw ShieldException.invalidState("A fault is already active. Clear the current fault before injecting a new one.");
        }

        CableSegment segment = segmentRepo.findById(segmentId)
            .orElseThrow(() -> ShieldException.notFound("CableSegment", segmentId));

        if (segment.getStatus() == SegmentStatus.ISOLATED) {
            throw ShieldException.invalidState("Cannot inject fault into isolated segment: " + segment.getName());
        }

        // Default distance: midpoint of the segment
        double injectedDistance;
        if (distanceKm != null) {
            double segmentStart = getSegmentStartDistance(segment);
            if (distanceKm < segmentStart || distanceKm > segmentStart + segment.getLengthKm()) {
                throw ShieldException.validationError(String.format(
                    "Distance %.2f km is outside segment %s bounds [%.2f, %.2f] km",
                    distanceKm, segment.getName(), segmentStart, segmentStart + segment.getLengthKm()));
            }
            injectedDistance = distanceKm;
        } else {
            double segStart = getSegmentStartDistance(segment);
            injectedDistance = segStart + segment.getLengthKm() / 2.0;
        }

        // Create fault record
        FaultRecord record = new FaultRecord();
        record.setSessionId(currentSessionId.get());
        record.setSegmentId(segmentId);
        record.setSegmentName(segment.getName());
        record.setFaultType(faultType);
        record.setActualFaultDistanceKm(injectedDistance);
        record.setPhase(SimulationPhase.FAULT_SUSPECTED);
        faultRecordRepo.save(record);

        // Set active fault state
        activeFault.set(new ActiveFaultState(
            segmentId, segment.getName(), faultType, injectedDistance, record.getId()));

        // Mark segment as suspected
        segment.setStatus(SegmentStatus.SUSPECTED_FAULT);
        segment.resetAbnormalCount();
        segmentRepo.save(segment);

        // Transition phase
        currentPhase.set(SimulationPhase.FAULT_SUSPECTED);

        // Record events
        recordEvent(EventType.FAULT_INJECTED, segmentId, segment.getName(),
            String.format("Fault injected: type=%s, segment=%s, actual distance=%.2f km",
                faultType, segment.getName(), injectedDistance));
        recordEvent(EventType.FAULT_SUSPECTED, segmentId, segment.getName(),
            "Abnormal measurements detected — fault suspected on " + segment.getName());

        notify(NotificationType.FAULT_DETECTED, "Fault Detected",
            String.format("Suspected %s fault on %s at %.2f km from source.",
                faultType.name().replace("_", " "), segment.getName(), injectedDistance),
            "WARNING");

        broadcastState();
        log.info("Fault injected: {} on segment {} at {:.2f} km", faultType, segment.getName(), injectedDistance);
        return record;
    }

    // ── Scheduled Simulation Tick ──────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${shield.simulation.tick-interval-ms:1000}")
    @Transactional
    public void tick() {
        if (!running.get()) return;

        List<CableSegment> segments = segmentRepo.findAllByOrderBySequenceOrderAsc();
        ActiveFaultState fault = activeFault.get();

        // Calculate measurements for primary and backup lines
        CircuitCalculator.MeasurementResult[] results =
            calculator.calculate(segments, fault, true);

        // Persist measurements and update segment voltages/currents
        Long sessionId = currentSessionId.get();
        for (int i = 0; i < segments.size(); i++) {
            CableSegment seg = segments.get(i);
            CircuitCalculator.MeasurementResult r = results[i];

            seg.setLastVoltageV(r.voltageV());
            seg.setLastCurrentA(r.currentA());
            seg.setBackupVoltageV(r.backupVoltageV());
            seg.setBackupCurrentA(r.backupCurrentA());
            seg.setLastUpdated(Instant.now());
            segmentRepo.save(seg);

            double recordedV = r.voltageV() > 0 ? r.voltageV() : r.backupVoltageV();
            double recordedA = r.currentA() > 0 ? r.currentA() : r.backupCurrentA();

            measurementRepo.save(new SensorMeasurement(
                seg.getId(), seg.getName(), sessionId,
                recordedV, recordedA, seg.getStatus(),
                fault != null));
        }

        // Dynamically update electrical load supplied status
        boolean allStagesEnergized = true;
        for (CableSegment seg : segments) {
            if (!seg.isBackupActive() && (seg.getStatus() == SegmentStatus.ISOLATED || seg.getStatus() == SegmentStatus.DE_ENERGIZED)) {
                allStagesEnergized = false;
                break;
            }
        }
        for (ElectricalLoad load : loadRepo.findAll()) {
            if (load.isSupplied() != allStagesEnergized) {
                load.setSupplied(allStagesEnergized);
                loadRepo.save(load);
            }
        }

        // Advance state machine
        advanceStateMachine(segments, results, fault);
        broadcastState();
    }

    /**
     * Advances the simulation state machine based on current measurements.
     */
    private void advanceStateMachine(List<CableSegment> segments,
                                      CircuitCalculator.MeasurementResult[] results,
                                      ActiveFaultState fault) {
        SimulationPhase phase = currentPhase.get();

        switch (phase) {
            case FAULT_SUSPECTED -> checkFaultConfirmation(segments, results, fault);
            case FAULT_CONFIRMED -> localizeFault(segments, results, fault);
            case FAULT_LOCALIZED -> {
                if (props.isAutoIsolation()) isolateFault(fault);
            }
            case FAULT_ISOLATED -> {
                // Awaiting manager action to engage backup bypass!
            }
            default -> {} // NORMAL_MONITORING, SUPPLY_RESTORED, etc.
        }
    }

    /** Checks if enough consecutive abnormal samples have been seen to confirm fault */
    private void checkFaultConfirmation(List<CableSegment> segments,
                                         CircuitCalculator.MeasurementResult[] results,
                                         ActiveFaultState fault) {
        if (fault == null) return;

        for (int i = 0; i < segments.size(); i++) {
            CableSegment seg = segments.get(i);
            if (!seg.getId().equals(fault.getSegmentId())) continue;

            CircuitCalculator.MeasurementResult r = results[i];
            boolean anomalous = isAnomalous(seg, r);

            if (anomalous) {
                seg.incrementAbnormalCount();
                segmentRepo.save(seg);

                if (seg.getAbnormalSampleCount() >= props.getFaultConfirmationSamples()) {
                    confirmFault(seg, fault);
                }
            }
            break;
        }
    }

    /** Determines if a measurement is anomalous compared to normal values */
    private boolean isAnomalous(CableSegment seg, CircuitCalculator.MeasurementResult r) {
        if (seg.getNormalVoltageV() == null || seg.getNormalVoltageV() <= 0) return false;

        double voltageDropPercent =
            ((seg.getNormalVoltageV() - r.voltageV()) / seg.getNormalVoltageV()) * 100.0;
        double currentRatio = (seg.getNormalCurrentA() != null && seg.getNormalCurrentA() > 0)
            ? r.currentA() / seg.getNormalCurrentA() : 1.0;

        return voltageDropPercent > props.getVoltageDropThresholdPercent()
            || currentRatio > props.getOvercurrentThresholdMultiplier()
            || (currentRatio < (100.0 - props.getUndercurrentThresholdPercent()) / 100.0);
    }

    private void confirmFault(CableSegment segment, ActiveFaultState fault) {
        segment.setStatus(SegmentStatus.CONFIRMED_FAULT);
        segmentRepo.save(segment);
        currentPhase.set(SimulationPhase.FAULT_CONFIRMED);

        faultRecordRepo.findById(fault.getFaultRecordId()).ifPresent(r -> {
            r.setDetectedAt(Instant.now());
            r.setPhase(SimulationPhase.FAULT_CONFIRMED);
            faultRecordRepo.save(r);
        });

        recordEvent(EventType.FAULT_CONFIRMED, segment.getId(), segment.getName(),
            String.format("Fault confirmed on %s after %d consecutive abnormal samples.",
                segment.getName(), props.getFaultConfirmationSamples()));

        notify(NotificationType.FAULT_DETECTED, "Fault Confirmed",
            String.format("Fault confirmed on segment %s. Initiating localization.", segment.getName()),
            "CRITICAL");

        log.info("Fault confirmed on segment {}", segment.getName());
    }

    private void localizeFault(List<CableSegment> segments,
                                CircuitCalculator.MeasurementResult[] results,
                                ActiveFaultState fault) {
        if (fault == null) return;

        double vf = results[0].voltageV();
        double vt = props.getReferenceVoltageV();
        double lt = props.getTotalCableLengthKm();

        FaultLocalizer.LocalizationResult locResult = localizer.localizeReportBased(vf, vt, lt);

        faultRecordRepo.findById(fault.getFaultRecordId()).ifPresent(r -> {
            r.setFaultVoltageV(vf);
            r.setLocalizedAt(Instant.now());
            r.setPhase(SimulationPhase.FAULT_LOCALIZED);
            if (locResult.isValid()) {
                r.setEstimatedFaultDistanceKm(locResult.getEstimatedDistanceKm());
                r.setLocalizationErrorKm(localizer.calculateError(
                    locResult.getEstimatedDistanceKm(), r.getActualFaultDistanceKm()));
            }
            faultRecordRepo.save(r);
        });

        currentPhase.set(SimulationPhase.FAULT_LOCALIZED);

        String warning = locResult.getWarning() != null ? " Warning: " + locResult.getWarning() : "";
        String desc = String.format(
            "Fault localized: estimated %.2f km from source (method: %s). Actual: %.2f km.%s",
            locResult.isValid() ? locResult.getEstimatedDistanceKm() : Double.NaN,
            locResult.getMethod(), fault.getActualDistanceKm(), warning);

        recordEvent(EventType.FAULT_LOCALIZED, fault.getSegmentId(), fault.getSegmentName(), desc);
        notify(NotificationType.FAULT_LOCALIZED, "Fault Location Estimated",
            String.format("Estimated fault at %.2f km from source on segment %s.",
                locResult.isValid() ? locResult.getEstimatedDistanceKm() : 0,
                fault.getSegmentName()), "WARNING");

        log.info("Fault localized: estimated={} km, actual={} km",
            locResult.getEstimatedDistanceKm(), fault.getActualDistanceKm());
    }

    @Transactional
    public void isolateFault(ActiveFaultState fault) {
        final ActiveFaultState targetFault = (fault != null) ? fault : activeFault.get();
        if (targetFault == null) {
            throw ShieldException.invalidState("No active fault to isolate.");
        }

        CableSegment segment = segmentRepo.findById(targetFault.getSegmentId())
            .orElseThrow(() -> ShieldException.notFound("CableSegment", targetFault.getSegmentId()));

        // Find and open the primary isolation relay
        Long relayId = segment.getIsolationRelayId();
        if (relayId != null) {
            relayRepo.findById(relayId).ifPresent(relay -> {
                relay.setState(RelayState.OPEN);
                relay.setLastOperatedAt(Instant.now());
                relay.setLastOperatedBy("AUTOMATIC");
                relayRepo.save(relay);
            });
        }

        segment.setStatus(SegmentStatus.ISOLATED);
        segmentRepo.save(segment);

        currentPhase.set(SimulationPhase.FAULT_ISOLATED);

        faultRecordRepo.findById(targetFault.getFaultRecordId()).ifPresent(r -> {
            r.setIsolatedAt(Instant.now());
            r.setPhase(SimulationPhase.FAULT_ISOLATED);
            r.setIsolated(true);
            faultRecordRepo.save(r);
        });

        recordEvent(EventType.RELAY_OPENED, targetFault.getSegmentId(), targetFault.getSegmentName(),
            "Primary isolation relay opened — segment " + segment.getName() + " isolated.");
        recordEvent(EventType.SEGMENT_ISOLATED, targetFault.getSegmentId(), targetFault.getSegmentName(),
            "Segment " + segment.getName() + " electrically isolated. Ready for manager backup rerouting.");
        notify(NotificationType.SEGMENT_ISOLATED, "Segment Isolated — Action Required",
            String.format("Segment %s isolated. Manager can now engage backup node %s to restore power.",
                segment.getName(), segment.getBackupName()), "WARNING");

        log.info("Segment {} isolated. Awaiting manager failover trigger.", segment.getName());
    }

    // ── Per-Node Manager Failover & Restoration ────────────────────────────────

    @Transactional
    public CableSegment engageBackupNode(Long segmentId, String operatedBy) {
        CableSegment segment = segmentRepo.findById(segmentId)
            .orElseThrow(() -> ShieldException.notFound("CableSegment", segmentId));

        // Ensure primary relay is OPEN (isolated)
        if (segment.getIsolationRelayId() != null) {
            relayRepo.findById(segment.getIsolationRelayId()).ifPresent(r -> {
                r.setState(RelayState.OPEN);
                r.setLastOperatedAt(Instant.now());
                r.setLastOperatedBy(operatedBy != null ? operatedBy : "MANAGER_MANUAL");
                relayRepo.save(r);
            });
        }
        segment.setStatus(SegmentStatus.ISOLATED);

        // Close backup bypass relay
        if (segment.getBackupRelayId() != null) {
            relayRepo.findById(segment.getBackupRelayId()).ifPresent(r -> {
                r.setState(RelayState.CLOSED);
                r.setLastOperatedAt(Instant.now());
                r.setLastOperatedBy(operatedBy != null ? operatedBy : "MANAGER_MANUAL");
                relayRepo.save(r);
            });
        }

        segment.setBackupActive(true);
        segmentRepo.save(segment);

        // Update active fault record if exists
        ActiveFaultState af = activeFault.get();
        if (af != null) {
            updateFaultReroute(af, true, null);
        }

        currentPhase.set(SimulationPhase.SUPPLY_RESTORED);

        recordEvent(EventType.RELAY_CLOSED, segment.getId(), segment.getName(),
            String.format("Bypass relay for backup node %s closed by %s.",
                segment.getBackupName(), operatedBy != null ? operatedBy : "MANAGER"));

        recordEvent(EventType.BACKUP_ACTIVATED, segment.getId(), segment.getName(),
            String.format("Power route shifted through backup node %s. Grid continuity preserved with 100%% uptime.",
                segment.getBackupName()));

        notify(NotificationType.BACKUP_ACTIVATED, "Power Rerouted via Backup Node",
            String.format("Power shifted through Backup Node %s. Downstream grid intact while line %s is repaired.",
                segment.getBackupName(), segment.getName()),
            "INFO");

        log.info("Manager engaged backup node {} for segment {}", segment.getBackupName(), segment.getName());
        broadcastState();
        return segment;
    }

    @Transactional
    public CableSegment restorePrimaryRoute(Long segmentId, String operatedBy) {
        CableSegment segment = segmentRepo.findById(segmentId)
            .orElseThrow(() -> ShieldException.notFound("CableSegment", segmentId));

        // Open backup bypass relay
        if (segment.getBackupRelayId() != null) {
            relayRepo.findById(segment.getBackupRelayId()).ifPresent(r -> {
                r.setState(RelayState.OPEN);
                r.setLastOperatedAt(Instant.now());
                r.setLastOperatedBy(operatedBy != null ? operatedBy : "MAINTENANCE");
                relayRepo.save(r);
            });
        }

        // Close primary isolation relay
        if (segment.getIsolationRelayId() != null) {
            relayRepo.findById(segment.getIsolationRelayId()).ifPresent(r -> {
                r.setState(RelayState.CLOSED);
                r.setLastOperatedAt(Instant.now());
                r.setLastOperatedBy(operatedBy != null ? operatedBy : "MAINTENANCE");
                relayRepo.save(r);
            });
        }

        segment.setBackupActive(false);
        segment.setStatus(SegmentStatus.HEALTHY);
        segment.resetAbnormalCount();
        segmentRepo.save(segment);

        // Clear active fault if on this segment
        ActiveFaultState af = activeFault.get();
        if (af != null && af.getSegmentId().equals(segmentId)) {
            clearFault(af.getFaultRecordId());
        }

        currentPhase.set(SimulationPhase.NORMAL_MONITORING);

        recordEvent(EventType.RELAY_CLOSED, segment.getId(), segment.getName(),
            "Primary isolation relay closed. Segment " + segment.getName() + " restored to service.");
        recordEvent(EventType.FAULT_CLEARED, segment.getId(), segment.getName(),
            "Power returned to primary route " + segment.getName() + ". Backup node " + segment.getBackupName() + " returned to standby.");

        notify(NotificationType.FAULT_CLEARED, "Primary Route Restored",
            String.format("Line %s repair completed. Power returned to primary corridor.", segment.getName()),
            "INFO");

        broadcastState();
        log.info("Primary route restored for segment {}", segment.getName());
        return segment;
    }

    // ── Manual Relay Control ───────────────────────────────────────────────────

    @Transactional
    public Relay operateRelay(Long relayId, RelayState targetState, String operatedBy) {
        Relay relay = relayRepo.findById(relayId)
            .orElseThrow(() -> ShieldException.notFound("Relay", relayId));

        if (targetState == RelayState.CLOSED && relay.getType() == RelayType.ISOLATION) {
            if (relay.getSegmentId() != null) {
                CableSegment seg = segmentRepo.findById(relay.getSegmentId()).orElse(null);
                if (seg != null && (seg.getStatus() == SegmentStatus.CONFIRMED_FAULT
                    || seg.getStatus() == SegmentStatus.SUSPECTED_FAULT)) {
                    throw ShieldException.invalidState(
                        "SAFETY: Cannot close relay on a suspected/confirmed faulty segment. " +
                        "Clear the fault first before re-energizing.");
                }
            }
        }

        relay.setState(targetState);
        relay.setLastOperatedAt(Instant.now());
        relay.setLastOperatedBy(operatedBy != null ? operatedBy : "MANUAL");
        relayRepo.save(relay);

        EventType evType = targetState == RelayState.OPEN ? EventType.RELAY_OPENED : EventType.RELAY_CLOSED;
        recordEvent(evType, relay.getSegmentId(), null,
            String.format("Relay %s manually %s by %s.",
                relay.getName(), targetState, operatedBy));

        log.info("Relay {} set to {} by {}", relay.getName(), targetState, operatedBy);
        broadcastState();
        return relay;
    }

    @Transactional
    public FaultRecord clearFault(Long faultId) {
        FaultRecord record = faultRecordRepo.findById(faultId)
            .orElseThrow(() -> ShieldException.notFound("FaultRecord", faultId));

        record.setClearedAt(Instant.now());
        record.setPhase(SimulationPhase.FAULT_CLEARED);
        faultRecordRepo.save(record);

        // Clear active fault if it matches
        ActiveFaultState af = activeFault.get();
        if (af != null && af.getFaultRecordId().equals(faultId)) {
            activeFault.set(null);
            currentPhase.set(SimulationPhase.NORMAL_MONITORING);

            // Restore segment
            segmentRepo.findById(record.getSegmentId()).ifPresent(seg -> {
                seg.setStatus(SegmentStatus.HEALTHY);
                seg.resetAbnormalCount();
                // If backup was active, smoothly return to primary
                if (seg.isBackupActive()) {
                    seg.setBackupActive(false);
                    if (seg.getBackupRelayId() != null) {
                        relayRepo.findById(seg.getBackupRelayId()).ifPresent(r -> {
                            r.setState(RelayState.OPEN);
                            r.setLastOperatedAt(Instant.now());
                            r.setLastOperatedBy("MAINTENANCE");
                            relayRepo.save(r);
                        });
                    }
                    if (seg.getIsolationRelayId() != null) {
                        relayRepo.findById(seg.getIsolationRelayId()).ifPresent(r -> {
                            r.setState(RelayState.CLOSED);
                            r.setLastOperatedAt(Instant.now());
                            r.setLastOperatedBy("MAINTENANCE");
                            relayRepo.save(r);
                        });
                    }
                }
                segmentRepo.save(seg);
            });
        }

        recordEvent(EventType.FAULT_CLEARED, record.getSegmentId(), record.getSegmentName(),
            "Fault cleared. Line " + record.getSegmentName() + " repaired by maintenance crew and returned to service.");
        notify(NotificationType.FAULT_CLEARED, "Fault Cleared — Repair Complete",
            "Fault on segment " + record.getSegmentName() + " has been resolved. Primary power route restored.", "INFO");

        broadcastState();
        log.info("Fault {} cleared and primary route restored", faultId);
        return record;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void recalcNormalMeasurements() {
        List<CableSegment> segs = segmentRepo.findAllByOrderBySequenceOrderAsc();
        CircuitCalculator.MeasurementResult[] results =
            calculator.calculate(segs, null, false);
        for (int i = 0; i < segs.size(); i++) {
            segs.get(i).setLastVoltageV(results[i].voltageV());
            segs.get(i).setLastCurrentA(results[i].currentA());
            segs.get(i).setBackupVoltageV(0.0);
            segs.get(i).setBackupCurrentA(0.0);
            segmentRepo.save(segs.get(i));
        }
    }

    private double getSegmentStartDistance(CableSegment target) {
        List<CableSegment> all = segmentRepo.findAllByOrderBySequenceOrderAsc();
        double dist = 0;
        for (CableSegment seg : all) {
            if (seg.getId().equals(target.getId())) return dist;
            dist += seg.getLengthKm();
        }
        return dist;
    }

    private void recordEvent(EventType type, Long segId, String segName, String desc) {
        FaultEvent event = new FaultEvent(type, desc);
        event.setSessionId(currentSessionId.get());
        event.setSegmentId(segId);
        event.setSegmentName(segName);
        ActiveFaultState af = activeFault.get();
        if (af != null) event.setFaultRecordId(af.getFaultRecordId());
        eventRepo.save(event);
    }

    private void notify(NotificationType type, String title, String message, String severity) {
        Notification n = new Notification(type, title, message, severity);
        n.setSessionId(currentSessionId.get());
        ActiveFaultState af = activeFault.get();
        if (af != null) {
            n.setFaultRecordId(af.getFaultRecordId());
            n.setAffectedSegment(af.getSegmentName());
        }
        notificationRepo.save(n);
    }

    private void updateFaultReroute(ActiveFaultState fault, boolean success, String failureReason) {
        if (fault == null) return;
        faultRecordRepo.findById(fault.getFaultRecordId()).ifPresent(r -> {
            r.setRerouteAttempted(true);
            r.setRerouteSuccessful(success);
            r.setRerouteFailureReason(failureReason);
            r.setPhase(success ? SimulationPhase.SUPPLY_RESTORED : SimulationPhase.REROUTING_FAILED);
            faultRecordRepo.save(r);
        });
    }

    private void closeSession() {
        Long sid = currentSessionId.get();
        if (sid != null) {
            sessionRepo.findById(sid).ifPresent(s -> {
                s.setActive(false);
                s.setEndedAt(Instant.now());
                s.setCurrentPhase(currentPhase.get());
                sessionRepo.save(s);
            });
        }
    }

    // ── SSE Support ────────────────────────────────────────────────────────────

    public void addSseListener(Consumer<String> listener) {
        sseListeners.add(listener);
    }

    public void removeSseListener(Consumer<String> listener) {
        sseListeners.remove(listener);
    }

    private void broadcastState() {
        String payload = String.format("{\"phase\":\"%s\",\"running\":%b,\"ts\":\"%s\"}",
            currentPhase.get(), running.get(), Instant.now());
        sseListeners.forEach(l -> {
            try { l.accept(payload); }
            catch (Exception e) { sseListeners.remove(l); }
        });
    }

    // ── State Accessors ────────────────────────────────────────────────────────

    public boolean isRunning() { return running.get(); }
    public SimulationPhase getCurrentPhase() { return currentPhase.get(); }
    public ActiveFaultState getActiveFault() { return activeFault.get(); }
    public Long getCurrentSessionId() { return currentSessionId.get(); }
}
