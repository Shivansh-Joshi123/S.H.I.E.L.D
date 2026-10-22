package com.shield.domain;

/**
 * Classifies the type of relay in the network.
 * ISOLATION: Used to isolate a faulty cable segment.
 * BACKUP: Controls the alternate backup feeder path.
 */
public enum RelayType {
    ISOLATION,
    BACKUP
}
