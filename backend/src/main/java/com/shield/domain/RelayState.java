package com.shield.domain;

/**
 * Represents the state of a protection relay.
 * CLOSED: Normal operation — circuit path is complete.
 * OPEN: Relay has operated — circuit is interrupted.
 */
public enum RelayState {
    CLOSED,
    OPEN
}
