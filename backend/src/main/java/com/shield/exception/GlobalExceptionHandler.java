package com.shield.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ShieldException.class)
    public ResponseEntity<ErrorResponse> handleShieldException(ShieldException ex) {
        log.warn("Application error [{}]: {}", ex.getErrorCode(), ex.getMessage());
        return ResponseEntity
            .status(ex.getStatus())
            .body(new ErrorResponse(ex.getErrorCode(), ex.getMessage(), ex.getStatus().value()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        String msg = "Validation failed: " + fieldErrors;
        log.warn(msg);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_FAILED", msg, 400, fieldErrors));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage(), 404));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500));
    }

    public record ErrorResponse(
        String code,
        String message,
        int httpStatus,
        Map<String, String> fieldErrors,
        Instant timestamp
    ) {
        public ErrorResponse(String code, String message, int httpStatus) {
            this(code, message, httpStatus, null, Instant.now());
        }
        public ErrorResponse(String code, String message, int httpStatus, Map<String, String> fieldErrors) {
            this(code, message, httpStatus, fieldErrors, Instant.now());
        }
    }
}
