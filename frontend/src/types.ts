export type SegmentStatus = 'HEALTHY' | 'SUSPECTED_FAULT' | 'CONFIRMED_FAULT' | 'ISOLATED' | 'DE_ENERGIZED';
export type FaultType = 'OPEN_CIRCUIT' | 'SHORT_CIRCUIT' | 'GROUND_FAULT';
export type RelayState = 'CLOSED' | 'OPEN';
export type RelayType = 'ISOLATION' | 'BACKUP';
export type SimulationPhase = 
  | 'NORMAL_MONITORING'
  | 'FAULT_SUSPECTED'
  | 'FAULT_CONFIRMED'
  | 'FAULT_LOCALIZED'
  | 'FAULT_ISOLATED'
  | 'REROUTING'
  | 'SUPPLY_RESTORED'
  | 'REROUTING_FAILED'
  | 'FAULT_CLEARED'
  | 'SYSTEM_RESET';

export interface CableSegment {
  id: number;
  name: string;
  displayLabel: string;
  lengthKm: number;
  resistancePerKm: number;
  totalResistanceOhm: number;
  sequenceOrder: number;
  status: SegmentStatus;
  isolationRelayId: number | null;
  lastVoltageV: number | null;
  lastCurrentA: number | null;
  normalVoltageV: number | null;
  normalCurrentA: number | null;
  lastUpdated: string | null;
}

export interface Relay {
  id: number;
  name: string;
  type: RelayType;
  state: RelayState;
  segmentId: number | null;
  manualOverride: boolean;
  lastOperatedAt: string | null;
  lastOperatedBy: string | null;
}

export interface BackupFeeder {
  id: number;
  name: string;
  available: boolean;
  capacityAmperes: number;
  sourceVoltageV: number;
  active: boolean;
  relayId: number | null;
}

export interface ElectricalLoad {
  id: number;
  name: string;
  segmentId: number;
  powerDemandW: number;
  ratedVoltageV: number;
  supplied: boolean;
}

export interface ActiveFault {
  segmentId: number;
  segmentName: string;
  faultType: FaultType;
  actualDistanceKm: number;
  faultRecordId: number;
}

export interface SimulationStatus {
  running: boolean;
  phase: SimulationPhase;
  sessionId: number | null;
  activeFault: ActiveFault | null;
  healthySegments: number;
  activeSegments: number;
  isolatedSegments: number;
  totalCableLengthKm: number;
  referenceVoltageV: number;
}

export interface NetworkStateResponse {
  segments: CableSegment[];
  relays: Relay[];
  backupFeeder: BackupFeeder | null;
  loads: ElectricalLoad[];
  simulationStatus: SimulationStatus;
}

export interface FaultRecord {
  id: number;
  sessionId: number | null;
  segmentId: number;
  segmentName: string;
  faultType: FaultType;
  injectedAt: string;
  detectedAt: string | null;
  localizedAt: string | null;
  isolatedAt: string | null;
  clearedAt: string | null;
  actualFaultDistanceKm: number | null;
  estimatedFaultDistanceKm: number | null;
  localizationErrorKm: number | null;
  faultVoltageV: number | null;
  phase: SimulationPhase;
  isolated: boolean;
  rerouteAttempted: boolean;
  rerouteSuccessful: boolean;
  rerouteFailureReason: string | null;
}

export interface SensorMeasurement {
  id: number;
  segmentId: number;
  segmentName: string;
  timestamp: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  faultActive: boolean;
}

export interface FaultEvent {
  id: number;
  sessionId: number | null;
  faultRecordId: number | null;
  segmentId: number | null;
  segmentName: string | null;
  eventType: string;
  timestamp: string;
  description: string;
  detailJson: string | null;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sessionId: number | null;
  faultRecordId: number | null;
  affectedSegment: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface LocalizationResult {
  method: string;
  estimatedDistanceKm: number | null;
  actualDistanceKm: number | null;
  errorKm: number | null;
  faultVoltageV: number;
  referenceVoltageV: number;
  totalLengthKm: number;
  valid: boolean;
  errorMessage: string | null;
  warning: string | null;
  formulaDescription: string;
}
