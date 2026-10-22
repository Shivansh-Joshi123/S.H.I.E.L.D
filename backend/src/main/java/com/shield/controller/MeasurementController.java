package com.shield.controller;

import com.shield.domain.SensorMeasurement;
import com.shield.dto.EventDto;
import com.shield.dto.EventDto.*;
import com.shield.repository.FaultEventRepository;
import com.shield.repository.SensorMeasurementRepository;
import com.shield.simulation.SimulationEngine;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * REST endpoints for sensor measurements, events, and SSE.
 */
@RestController
@RequestMapping("/api")
public class MeasurementController {

    private final SensorMeasurementRepository measurementRepo;
    private final FaultEventRepository eventRepo;
    private final SimulationEngine engine;

    public MeasurementController(SensorMeasurementRepository measurementRepo,
                                  FaultEventRepository eventRepo,
                                  SimulationEngine engine) {
        this.measurementRepo = measurementRepo;
        this.eventRepo = eventRepo;
        this.engine = engine;
    }

    public record MeasurementDto(
        Long id,
        Long segmentId,
        String segmentName,
        String timestamp,
        double voltageV,
        double currentA,
        double powerW,
        boolean faultActive
    ) {
        public static MeasurementDto from(SensorMeasurement m) {
            return new MeasurementDto(
                m.getId(),
                m.getSegmentId(),
                m.getSegmentName(),
                m.getTimestamp().toString(),
                m.getVoltageV(),
                m.getCurrentA(),
                m.getPowerW(),
                m.isFaultActive()
            );
        }
    }

    @GetMapping("/measurements")
    public ResponseEntity<List<MeasurementDto>> getMeasurements(
            @RequestParam(required = false) Long segmentId,
            @RequestParam(defaultValue = "100") int limit) {
        Long sid = engine.getCurrentSessionId();
        List<SensorMeasurement> measurements = (sid != null)
            ? measurementRepo.findTop100BySessionIdOrderByTimestampDesc(sid)
            : List.of();

        return ResponseEntity.ok(
            measurements.stream().map(MeasurementDto::from).toList());
    }

    @GetMapping("/events")
    public ResponseEntity<List<FaultEventDto>> getEvents(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(
            eventRepo.findTop50ByOrderByTimestampDesc().stream()
                .map(FaultEventDto::from).toList());
    }

    /**
     * Server-Sent Events endpoint for real-time simulation state.
     * Frontend can listen to this endpoint for live updates.
     */
    @GetMapping(value = "/events/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        Consumer<String> listener = payload -> {
            try {
                emitter.send(SseEmitter.event().data(payload));
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
        };

        engine.addSseListener(listener);
        emitter.onCompletion(() -> engine.removeSseListener(listener));
        emitter.onTimeout(() -> engine.removeSseListener(listener));
        emitter.onError(e -> engine.removeSseListener(listener));

        return emitter;
    }

    @GetMapping("/reports/export")
    public void exportCsv(@RequestParam(required = false) Long sessionId,
                           HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=shield-events.csv");

        PrintWriter writer = response.getWriter();
        writer.println("timestamp,eventType,segmentName,description");

        Long sid = sessionId != null ? sessionId : engine.getCurrentSessionId();
        List<com.shield.domain.FaultEvent> events;
        if (sid != null) {
            events = eventRepo.findBySessionIdOrderByTimestampDesc(sid);
        } else {
            events = eventRepo.findTop50ByOrderByTimestampDesc();
        }

        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (com.shield.domain.FaultEvent e : events) {
            writer.printf("\"%s\",\"%s\",\"%s\",\"%s\"%n",
                fmt.format(e.getTimestamp()),
                e.getEventType(),
                e.getSegmentName() != null ? e.getSegmentName() : "",
                e.getDescription() != null ? e.getDescription().replace('"', '\'') : ""
            );
        }
        writer.flush();
    }
}
