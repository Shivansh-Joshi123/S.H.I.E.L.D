package com.shield.config;

import com.shield.domain.*;
import com.shield.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the database with a default 4-segment cable network on first startup.
 * If data already exists, the initializer exits without modifying it.
 *
 * Default Network:
 *   Source (11 kV) → S1 (2.5 km) → S2 (2.5 km) → S3 (2.5 km) → S4 (2.5 km) → Load
 *   Total length: 10 km | Total resistance: ~4 Ω
 *   Backup feeder connected at the end of S4
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final CableSegmentRepository segmentRepo;
    private final RelayRepository relayRepo;
    private final BackupFeederRepository feederRepo;
    private final ElectricalLoadRepository loadRepo;

    public DataInitializer(CableSegmentRepository segmentRepo,
                           RelayRepository relayRepo,
                           BackupFeederRepository feederRepo,
                           ElectricalLoadRepository loadRepo) {
        this.segmentRepo = segmentRepo;
        this.relayRepo = relayRepo;
        this.feederRepo = feederRepo;
        this.loadRepo = loadRepo;
    }

    @Override
    public void run(String... args) {
        if (segmentRepo.count() > 0) {
            log.info("Network data already exists — skipping initialisation");
            return;
        }

        log.info("Seeding default cable network...");

        // 4 cable segments, 2.5 km each, 0.4 Ω/km (total 1.0 Ω each)
        CableSegment s1 = segmentRepo.save(new CableSegment("S1", "Segment 1 — Substation to Node A", 2.5, 0.4, 1));
        CableSegment s2 = segmentRepo.save(new CableSegment("S2", "Segment 2 — Node A to Node B", 2.5, 0.4, 2));
        CableSegment s3 = segmentRepo.save(new CableSegment("S3", "Segment 3 — Node B to Node C", 2.5, 0.4, 3));
        CableSegment s4 = segmentRepo.save(new CableSegment("S4", "Segment 4 — Node C to Distribution", 2.5, 0.4, 4));

        // Calculate and set normal operating values
        // R_load = V^2/P = 11000^2/1000000 = 121 Ω
        // R_cable_total = 4 * 1.0 = 4.0 Ω
        // I_normal = 11000 / (4.0 + 121) = 88 A
        double rTotal = 4 * (2.5 * 0.4); // 4.0 Ω
        double rLoad  = (11000.0 * 11000.0) / 1_000_000.0; // 121 Ω
        double iNormal = 11000.0 / (rTotal + rLoad); // ~88 A
        double vAt1 = 11000.0 - iNormal * 1.0;
        double vAt2 = vAt1 - iNormal * 1.0;
        double vAt3 = vAt2 - iNormal * 1.0;
        double vAt4 = vAt3 - iNormal * 1.0;

        s1.setNormalVoltageV(11000.0); s1.setNormalCurrentA(iNormal);
        s2.setNormalVoltageV(vAt1);    s2.setNormalCurrentA(iNormal);
        s3.setNormalVoltageV(vAt2);    s3.setNormalCurrentA(iNormal);
        s4.setNormalVoltageV(vAt3);    s4.setNormalCurrentA(iNormal);

        s1.setLastVoltageV(11000.0); s1.setLastCurrentA(iNormal);
        s2.setLastVoltageV(vAt1);    s2.setLastCurrentA(iNormal);
        s3.setLastVoltageV(vAt2);    s3.setLastCurrentA(iNormal);
        s4.setLastVoltageV(vAt3);    s4.setLastCurrentA(iNormal);

        segmentRepo.save(s1); segmentRepo.save(s2);
        segmentRepo.save(s3); segmentRepo.save(s4);

        // Isolation relays (one per segment)
        Relay r1 = relayRepo.save(new Relay("R1", RelayType.ISOLATION, s1.getId()));
        Relay r2 = relayRepo.save(new Relay("R2", RelayType.ISOLATION, s2.getId()));
        Relay r3 = relayRepo.save(new Relay("R3", RelayType.ISOLATION, s3.getId()));
        Relay r4 = relayRepo.save(new Relay("R4", RelayType.ISOLATION, s4.getId()));

        // Link relay IDs back to segments
        s1.setIsolationRelayId(r1.getId()); segmentRepo.save(s1);
        s2.setIsolationRelayId(r2.getId()); segmentRepo.save(s2);
        s3.setIsolationRelayId(r3.getId()); segmentRepo.save(s3);
        s4.setIsolationRelayId(r4.getId()); segmentRepo.save(s4);

        // Backup feeder relay
        Relay backupRelay = relayRepo.save(new Relay("RB", RelayType.BACKUP, null));

        // Backup feeder (11 kV, 200 A capacity)
        BackupFeeder feeder = new BackupFeeder("Backup Feeder — Alternate Source", 200.0, 11000.0);
        feeder.setRelayId(backupRelay.getId());
        feederRepo.save(feeder);

        // Downstream load connected to S4
        loadRepo.save(new ElectricalLoad("Primary Load — Distribution Centre", s4.getId(), 1_000_000.0, 11000.0));
        loadRepo.save(new ElectricalLoad("Secondary Load — Industrial Zone",   s3.getId(), 500_000.0,  11000.0));

        log.info("Default network seeded: 4 segments, 4 relays, 1 backup feeder, 2 loads");
    }
}
