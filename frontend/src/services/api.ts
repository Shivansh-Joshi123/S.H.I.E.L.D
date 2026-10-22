import axios from 'axios';
import type {
  NetworkStateResponse,
  SimulationStatus,
  FaultRecord,
  SensorMeasurement,
  FaultEvent,
  NotificationItem,
  LocalizationResult,
  FaultType,
  Relay,
  CableSegment,
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Network & Status
  getHealth: async () => (await client.get('/health')).data,
  getNetwork: async (): Promise<NetworkStateResponse> => (await client.get('/network')).data,
  getStatus: async (): Promise<SimulationStatus> => (await client.get('/simulation/status')).data,

  // Simulation Controls
  startSimulation: async () => (await client.post('/simulation/start')).data,
  stopSimulation: async () => (await client.post('/simulation/stop')).data,
  resetSimulation: async () => (await client.post('/simulation/reset')).data,
  triggerManualIsolation: async () => (await client.post('/simulation/isolate')).data,
  rerouteViaBackup: async (segmentId: number): Promise<CableSegment> =>
    (await client.post(`/simulation/segments/${segmentId}/reroute`)).data,
  restorePrimaryRoute: async (segmentId: number): Promise<CableSegment> =>
    (await client.post(`/simulation/segments/${segmentId}/restore`)).data,

  // Faults
  injectFault: async (segmentId: number, faultType: FaultType, distanceKm?: number): Promise<FaultRecord> => {
    return (await client.post('/simulation/faults', { segmentId, faultType, distanceKm })).data;
  },
  getFaults: async (): Promise<FaultRecord[]> => (await client.get('/simulation/faults')).data,
  getActiveFaults: async (): Promise<FaultRecord[]> => (await client.get('/simulation/faults/active')).data,
  getFault: async (id: number): Promise<FaultRecord> => (await client.get(`/simulation/faults/${id}`)).data,
  clearFault: async (id: number): Promise<FaultRecord> => (await client.post(`/simulation/faults/${id}/clear`)).data,

  // Relays
  getRelays: async (): Promise<Relay[]> => (await client.get('/relays')).data,
  openRelay: async (id: number, operatedBy = 'MANUAL'): Promise<Relay> => {
    return (await client.post(`/relays/${id}/open`, { targetState: 'OPEN', operatedBy })).data;
  },
  closeRelay: async (id: number, operatedBy = 'MANUAL'): Promise<Relay> => {
    return (await client.post(`/relays/${id}/close`, { targetState: 'CLOSED', operatedBy })).data;
  },

  // Measurements & Events
  getMeasurements: async (segmentId?: number, limit = 100): Promise<SensorMeasurement[]> => {
    const params = { ...(segmentId ? { segmentId } : {}), limit };
    return (await client.get('/measurements', { params })).data;
  },
  getEvents: async (limit = 50): Promise<FaultEvent[]> => {
    return (await client.get('/events', { params: { limit } })).data;
  },

  // Notifications
  getNotifications: async (unreadOnly = false): Promise<NotificationItem[]> => {
    return (await client.get('/notifications', { params: { unreadOnly } })).data;
  },
  getUnreadCount: async (): Promise<{ count: number }> => (await client.get('/notifications/unread-count')).data,
  markNotificationRead: async (id: number): Promise<NotificationItem> => {
    return (await client.patch(`/notifications/${id}/read`)).data;
  },
  markAllNotificationsRead: async () => (await client.patch('/notifications/read-all')).data,

  // Localization Analysis Calculator
  calculateReportBasedLocalization: async (
    faultVoltageV: number,
    referenceVoltageV: number,
    totalLengthKm: number,
    actualDistanceKm?: number
  ): Promise<LocalizationResult> => {
    return (
      await client.post('/localization/report-based', {
        faultVoltageV,
        referenceVoltageV,
        totalLengthKm,
        actualDistanceKm,
      })
    ).data;
  },

  // Configuration
  updateConfiguration: async (config: {
    totalCableLengthKm?: number;
    referenceVoltageV?: number;
    voltageDropThresholdPercent?: number;
    overcurrentThresholdMultiplier?: number;
    undercurrentThresholdPercent?: number;
    faultConfirmationSamples?: number;
    sensorNoisePercent?: number;
    autoIsolation?: boolean;
  }) => {
    return (await client.put('/network/configuration', config)).data;
  },

  updateBackupFeeder: async (update: { available?: boolean; capacityAmperes?: number }) => {
    return (await client.put('/network/backup-feeder', update)).data;
  },

  // Export CSV URL
  getCsvExportUrl: () => `${API_BASE}/reports/export`,
};
