package com.shield.exception;

import org.springframework.http.HttpStatus;

/**
 * Base application exception for all S.H.I.E.L.D. domain errors.
 */
public class ShieldException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public ShieldException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() { return status; }
    public String getErrorCode() { return errorCode; }

    public static ShieldException notFound(String resource, Object id) {
        return new ShieldException(
            resource + " not found with id: " + id,
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND"
        );
    }

    public static ShieldException invalidState(String message) {
        return new ShieldException(message, HttpStatus.CONFLICT, "INVALID_STATE");
    }

    public static ShieldException validationError(String message) {
        return new ShieldException(message, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
    }

    public static ShieldException simulationError(String message) {
        return new ShieldException(message, HttpStatus.UNPROCESSABLE_ENTITY, "SIMULATION_ERROR");
    }
}
