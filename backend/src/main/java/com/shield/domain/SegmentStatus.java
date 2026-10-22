package com.shield.domain;

/**
 * Represents the operational status of a cable segment.
 * HEALTHY: Normal operation, no faults detected.
 * SUSPECTED_FAULT: Measurements deviate from normal; awaiting confirmation.
 * CONFIRMED_FAULT: Fault has been confirmed by threshold analysis.
 * ISOLATED: The segment has been electrically isolated by its relay.
 * DE_ENERGIZED: The segment has no power (downstream of isolation or fault).
 */
public enum SegmentStatus {
    HEALTHY,
    SUSPECTED_FAULT,
    CONFIRMED_FAULT,
    ISOLATED,
    DE_ENERGIZED
}
