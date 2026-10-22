package com.shield.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalized configuration for the simulation engine.
 * All values can be overridden via application.yml or environment variables.
 */
@Component
@ConfigurationProperties(prefix = "shield.simulation")
public class SimulationProperties {

    private double totalCableLengthKm = 10.0;
    private double referenceVoltageV = 11000.0;
    private double supplyFrequencyHz = 50.0;
    private double voltageDropThresholdPercent = 20.0;
    private double overcurrentThresholdMultiplier = 1.5;
    private double undercurrentThresholdPercent = 90.0;
    private int faultConfirmationSamples = 3;
    private long tickIntervalMs = 1000L;
    private double sensorNoisePercent = 1.0;
    private boolean autoIsolation = true;

    // ── Getters and Setters ──────────────────────────────────────────────────

    public double getTotalCableLengthKm() { return totalCableLengthKm; }
    public void setTotalCableLengthKm(double totalCableLengthKm) { this.totalCableLengthKm = totalCableLengthKm; }
    public double getReferenceVoltageV() { return referenceVoltageV; }
    public void setReferenceVoltageV(double referenceVoltageV) { this.referenceVoltageV = referenceVoltageV; }
    public double getSupplyFrequencyHz() { return supplyFrequencyHz; }
    public void setSupplyFrequencyHz(double supplyFrequencyHz) { this.supplyFrequencyHz = supplyFrequencyHz; }
    public double getVoltageDropThresholdPercent() { return voltageDropThresholdPercent; }
    public void setVoltageDropThresholdPercent(double voltageDropThresholdPercent) { this.voltageDropThresholdPercent = voltageDropThresholdPercent; }
    public double getOvercurrentThresholdMultiplier() { return overcurrentThresholdMultiplier; }
    public void setOvercurrentThresholdMultiplier(double overcurrentThresholdMultiplier) { this.overcurrentThresholdMultiplier = overcurrentThresholdMultiplier; }
    public double getUndercurrentThresholdPercent() { return undercurrentThresholdPercent; }
    public void setUndercurrentThresholdPercent(double undercurrentThresholdPercent) { this.undercurrentThresholdPercent = undercurrentThresholdPercent; }
    public int getFaultConfirmationSamples() { return faultConfirmationSamples; }
    public void setFaultConfirmationSamples(int faultConfirmationSamples) { this.faultConfirmationSamples = faultConfirmationSamples; }
    public long getTickIntervalMs() { return tickIntervalMs; }
    public void setTickIntervalMs(long tickIntervalMs) { this.tickIntervalMs = tickIntervalMs; }
    public double getSensorNoisePercent() { return sensorNoisePercent; }
    public void setSensorNoisePercent(double sensorNoisePercent) { this.sensorNoisePercent = sensorNoisePercent; }
    public boolean isAutoIsolation() { return autoIsolation; }
    public void setAutoIsolation(boolean autoIsolation) { this.autoIsolation = autoIsolation; }
}
