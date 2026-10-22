package com.shield;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * S.H.I.E.L.D. - Self-Healing IoT for Early Localization and Detection
 * of Underground Cable Faults.
 *
 * This application simulates an underground cable network, detects faults,
 * localizes them, isolates affected segments, and reroutes power via backup feeders.
 *
 * DISCLAIMER: This is an academic software simulation. It is NOT certified for
 * use with real electrical infrastructure. Simulated readings do not represent
 * physical relay states or real voltage measurements.
 */
@SpringBootApplication
@EnableScheduling
public class ShieldBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShieldBackendApplication.class, args);
    }
}
