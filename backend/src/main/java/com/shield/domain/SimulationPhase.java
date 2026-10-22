package com.shield.domain;

/**
 * Represents the current phase of the simulation state machine.
 *
 * Transition sequence:
 * NORMAL_MONITORING → FAULT_SUSPECTED → FAULT_CONFIRMED
 *   → FAULT_LOCALIZED → FAULT_ISOLATED
 *   → SUPPLY_RESTORED (backup OK) or REROUTING_FAILED (backup unavailable)
 *
 * Reset transitions:
 * Any phase → FAULT_CLEARED → NORMAL_MONITORING
 * Any phase → SYSTEM_RESET → NORMAL_MONITORING
 */
public enum SimulationPhase {
    NORMAL_MONITORING,
    FAULT_SUSPECTED,
    FAULT_CONFIRMED,
    FAULT_LOCALIZED,
    FAULT_ISOLATED,
    REROUTING,
    SUPPLY_RESTORED,
    REROUTING_FAILED,
    FAULT_CLEARED,
    SYSTEM_RESET
}
