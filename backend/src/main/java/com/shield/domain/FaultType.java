package com.shield.domain;

/**
 * Classifies the type of electrical fault injected into the simulation.
 *
 * OPEN_CIRCUIT: An interruption in the cable path. Current drops to zero.
 *   Model: Segment resistance → infinity (R_segment = MAX_VALUE)
 *
 * SHORT_CIRCUIT: A low-resistance path between conductors.
 *   Model: Segment resistance → near zero (R_fault ≈ 0 Ω)
 *   Effect: Current increases significantly. V at fault node drops toward 0.
 *
 * GROUND_FAULT: A leakage path from a conductor to earth.
 *   Model: Parallel ground resistance R_ground inserted (e.g. 10 Ω)
 *   Effect: Voltage at fault node reduced. Some current diverted to ground.
 */
public enum FaultType {
    OPEN_CIRCUIT,
    SHORT_CIRCUIT,
    GROUND_FAULT
}
