package com.shield.config;

import com.shield.domain.*;
import com.shield.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the database with a 4-segment cable network with per-node backup redundancy (B1-B4).
 * If data already exists, it verifies and adds missing backup nodes/relays.
 *
 * Network Architecture:
 *   Primary: Source (11 kV) → S1 (2.5 km) → S2 (2.5 km) → S3 (2.5 km) → S4 (2.5 km) → Load
 *   Backup:  Source (11 kV) → B1 (2.5 km) → B2 (2.5 km) → B3 (2.5 km) → B4 (2.5 km) → Load
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
            log.info("Network data exists — verifying and updating backup nodes and bypass relays...");
            upgradeExistingSegmentsIfMissingBackup();
            return;
        }

        log.info("Seeding default cable network with per-node backup redundancy...");

        // 4 cable segments, 2.5 km each, 0.4 Ω/km (total 1.0 Ω each)
        CableSegment s1 = segmentRepo.save(new CableSegment("S1", "Segment 1 — Substation to Node A", 2.5, 0.4, 1));
        CableSegment s2 = segmentRepo.save(new CableSegment("S2", "Segment 2 — Node A to Node B", 2.5, 0.4, 2));
        CableSegment s3 = segmentRepo.save(new CableSegment("S3", "Segment 3 — Node B to Node C", 2.5, 0.4, 3));
        CableSegment s4 = segmentRepo.save(new CableSegment("S4", "Segment 4 — Node C to Distribution", 2.5, 0.4, 4));

        s1.setBackupName("B1");
        s2.setBackupName("B2");
        s3.setBackupName("B3");
        s4.setBackupName("B4");

        // Calculate and set normal operating values
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

        // Isolation relays (one per segment, normally CLOSED)
        Relay r1 = relayRepo.save(new Relay("R1", RelayType.ISOLATION, s1.getId()));
        Relay r2 = relayRepo.save(new Relay("R2", RelayType.ISOLATION, s2.getId()));
        Relay r3 = relayRepo.save(new Relay("R3", RelayType.ISOLATION, s3.getId()));
        Relay r4 = relayRepo.save(new Relay("R4", RelayType.ISOLATION, s4.getId()));

        s1.setIsolationRelayId(r1.getId());
        s2.setIsolationRelayId(r2.getId());
        s3.setIsolationRelayId(r3.getId());
        s4.setIsolationRelayId(r4.getId());

        // Backup bypass relays (one per segment, normally OPEN)
        Relay rb1 = new Relay("RB1", RelayType.BACKUP, s1.getId());
        rb1.setState(RelayState.OPEN);
        rb1 = relayRepo.save(rb1);

        Relay rb2 = new Relay("RB2", RelayType.BACKUP, s2.getId());
        rb2.setState(RelayState.OPEN);
        rb2 = relayRepo.save(rb2);

        Relay rb3 = new Relay("RB3", RelayType.BACKUP, s3.getId());
        rb3.setState(RelayState.OPEN);
        rb3 = relayRepo.save(rb3);

        Relay rb4 = new Relay("RB4", RelayType.BACKUP, s4.getId());
        rb4.setState(RelayState.OPEN);
        rb4 = relayRepo.save(rb4);

        s1.setBackupRelayId(rb1.getId());
        s2.setBackupRelayId(rb2.getId());
        s3.setBackupRelayId(rb3.getId());
        s4.setBackupRelayId(rb4.getId());

        segmentRepo.save(s1); segmentRepo.save(s2);
        segmentRepo.save(s3); segmentRepo.save(s4);

        // Backup feeder relay (global standby alternate source)
        Relay backupRelay = relayRepo.save(new Relay("RB", RelayType.BACKUP, null));
        BackupFeeder feeder = new BackupFeeder("Backup Feeder — Alternate Source", 200.0, 11000.0);
        feeder.setRelayId(backupRelay.getId());
        feederRepo.save(feeder);

        // Downstream load connected to S4
        loadRepo.save(new ElectricalLoad("Primary Load — Distribution Centre", s4.getId(), 1_000_000.0, 11000.0));
        loadRepo.save(new ElectricalLoad("Secondary Load — Industrial Zone",   s3.getId(), 500_000.0,  11000.0));

        log.info("Default network seeded: 4 primary segments, 4 backup nodes (B1-B4), 9 relays, 2 loads");
    }

    private void upgradeExistingSegmentsIfMissingBackup() {
        var segments = segmentRepo.findAllByOrderBySequenceOrderAsc();
        for (int i = 0; i < segments.size(); i++) {
            CableSegment seg = segments.get(i);
            String bName = "B" + (i + 1);
            if (seg.getBackupName() == null || !bName.equals(seg.getBackupName())) {
                seg.setBackupName(bName);
            }
            if (seg.getBackupRelayId() == null) {
                String rName = "RB" + (i + 1);
                Relay existingRelay = relayRepo.findAll().stream()
                    .filter(r -> rName.equals(r.getName()))
                    .findFirst().orElse(null);

                if (existingRelay == null) {
                    existingRelay = new Relay(rName, RelayType.BACKUP, seg.getId());
                    existingRelay.setState(RelayState.OPEN);
                    existingRelay = relayRepo.save(existingRelay);
                }
                seg.setBackupRelayId(existingRelay.getId());
            }
            segmentRepo.save(seg);
        }
    }
}
