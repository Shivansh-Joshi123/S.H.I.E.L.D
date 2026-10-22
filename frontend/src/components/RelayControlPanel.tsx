import React, { useState } from 'react';
import type { Relay, BackupFeeder, CableSegment } from '../types';
import {
  Cpu,
  Power,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Zap,
  ArrowRight,
  X,
  Info,
  Activity,
  Layers,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface RelayControlPanelProps {
  relays: Relay[];
  backupFeeder: BackupFeeder | null;
  segments: CableSegment[];
  onToggleRelay: (relayId: number, currentState: 'OPEN' | 'CLOSED') => void;
  onUpdateBackupFeeder: (available: boolean, capacity: number) => void;
  onTriggerManualIsolation: () => void;
}

interface ActionPreviewState {
  isOpen: boolean;
  actionTitle: string;
  actionSubtitle: string;
  relayName: string;
  relayType: 'ISOLATION' | 'BACKUP' | 'FEEDER';
  currentState: 'OPEN' | 'CLOSED';
  targetState: 'OPEN' | 'CLOSED';
  targetName: string;
  impactDescription: string;
  downstreamEffect: string;
  safetyLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  safetyWarning?: string;
  onConfirm: () => void;
}

export const RelayControlPanel: React.FC<RelayControlPanelProps> = ({
  relays,
  backupFeeder,
  segments,
  onToggleRelay,
  onUpdateBackupFeeder,
  onTriggerManualIsolation,
}) => {
  const [previewAction, setPreviewAction] = useState<ActionPreviewState | null>(null);
  const [hoveredRelayId, setHoveredRelayId] = useState<number | null>(null);

  const isolationRelays = relays.filter((r) => r.type === 'ISOLATION');
  const backupRelays = relays.filter((r) => r.type === 'BACKUP' && r.segmentId != null);
  const globalBackupRelay = relays.find((r) => r.type === 'BACKUP' && r.segmentId == null);

  const getSegment = (segId: number | null): CableSegment | undefined => {
    if (!segId) return undefined;
    return segments.find((seg) => seg.id === segId);
  };

  const getSegmentName = (segId: number | null) => {
    const s = getSegment(segId);
    return s ? `${s.name} (${s.displayLabel})` : `Segment #${segId || 'N/A'}`;
  };

  // Helper to open the floating action preview screen before executing relay toggle
  const initiateRelayAction = (relay: Relay) => {
    const seg = getSegment(relay.segmentId);
    const isPrimary = relay.type === 'ISOLATION';
    const isClosed = relay.state === 'CLOSED';
    const targetState: 'OPEN' | 'CLOSED' = isClosed ? 'OPEN' : 'CLOSED';

    let actionTitle = '';
    let actionSubtitle = '';
    let impactDescription = '';
    let downstreamEffect = '';
    let safetyLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
    let safetyWarning = '';

    if (isPrimary) {
      if (isClosed) {
        // TRIP / OPEN primary relay
        actionTitle = `Trip & Open Primary Isolation Relay (${relay.name})`;
        actionSubtitle = `Disengages 11 kV transmission line across ${seg?.name || 'this segment'}`;
        impactDescription = `Opening ${relay.name} will mechanically separate the primary conductor contacts. Power flow across primary segment ${seg?.name || ''} will instantly drop to 0 V and 0 A.`;
        if (seg && !seg.backupActive) {
          downstreamEffect = `Downstream grid and loads will lose power unless Backup Node ${seg.backupName || 'B' + seg.sequenceOrder} is engaged.`;
          safetyLevel = 'WARNING';
          safetyWarning = 'Primary circuit will be broken. Customer supply downstream may experience an outage if bypass is not active.';
        } else {
          downstreamEffect = `Downstream grid is protected: Backup Node ${seg?.backupName} is currently active and carrying load current.`;
          safetyLevel = 'SAFE';
        }
      } else {
        // CLOSE / ENERGIZE primary relay
        actionTitle = `Close & Energize Primary Isolation Relay (${relay.name})`;
        actionSubtitle = `Restores 11 kV power transmission to ${seg?.name || 'this segment'}`;
        impactDescription = `Closing ${relay.name} will bridge the primary contacts, allowing 11 kV grid current to flow through segment ${seg?.name || ''}.`;
        downstreamEffect = `Restores normal primary corridor path. If backup node ${seg?.backupName} was active, you can subsequently return it to standby.`;

        if (seg && (seg.status === 'CONFIRMED_FAULT' || seg.status === 'SUSPECTED_FAULT')) {
          safetyLevel = 'CRITICAL';
          safetyWarning = `SAFETY INTERLOCK: Segment ${seg.name} has an active/unresolved fault. Closing onto a faulted line will trip substation breakers! Clear the fault first.`;
        } else {
          safetyLevel = 'SAFE';
        }
      }
    } else {
      // BACKUP BYPASS RELAY
      if (!isClosed) {
        // ENGAGE / CLOSE backup relay
        actionTitle = `Engage Backup Bypass Relay (${relay.name})`;
        actionSubtitle = `Shifts current through redundant backup node ${seg?.backupName || 'B'}`;
        impactDescription = `Closing ${relay.name} routes electrical power through parallel backup node ${seg?.backupName || ''}, establishing an alternate low-resistance bypass corridor around ${seg?.name || ''}.`;
        downstreamEffect = `Downstream segments and load receive continuous nominal power (~11 kV, 88 A) with ZERO interruption while primary line ${seg?.name || ''} is worked on.`;
        safetyLevel = 'SAFE';
      } else {
        // DISENGAGE / OPEN backup relay
        actionTitle = `Disengage Backup Bypass Relay (${relay.name})`;
        actionSubtitle = `Returns backup node ${seg?.backupName || 'B'} to standby mode`;
        impactDescription = `Opening ${relay.name} breaks the bypass path through backup node ${seg?.backupName || ''}, placing the backup line in standby mode.`;
        if (seg && seg.status === 'ISOLATED') {
          downstreamEffect = `WARNING: Primary line ${seg.name} is currently isolated. Opening the backup relay now will cause a total downstream power outage!`;
          safetyLevel = 'CRITICAL';
          safetyWarning = 'Do not open backup relay while primary line is isolated without first restoring primary corridor.';
        } else {
          downstreamEffect = `Normal primary corridor is active. Backup node ${seg?.backupName} will remain in ready standby.`;
          safetyLevel = 'SAFE';
        }
      }
    }

    setPreviewAction({
      isOpen: true,
      actionTitle,
      actionSubtitle,
      relayName: relay.name,
      relayType: isPrimary ? 'ISOLATION' : 'BACKUP',
      currentState: relay.state,
      targetState,
      targetName: seg ? `${seg.name} (${seg.displayLabel})` : 'Power Line',
      impactDescription,
      downstreamEffect,
      safetyLevel,
      safetyWarning,
      onConfirm: () => {
        onToggleRelay(relay.id, relay.state);
        setPreviewAction(null);
      },
    });
  };

  // Helper for Global Feeder Relay
  const initiateGlobalFeederAction = () => {
    if (!globalBackupRelay) return;
    const isClosed = globalBackupRelay.state === 'CLOSED';
    const targetState: 'OPEN' | 'CLOSED' = isClosed ? 'OPEN' : 'CLOSED';

    setPreviewAction({
      isOpen: true,
      actionTitle: `${isClosed ? 'Open / Isolate' : 'Close / Connect'} Global Backup Feeder Breaker (RB)`,
      actionSubtitle: 'Controls the 11 kV / 200 A alternate substation tie-line',
      relayName: 'RB',
      relayType: 'FEEDER',
      currentState: globalBackupRelay.state,
      targetState,
      targetName: 'Global Alternate Source Feeder',
      impactDescription: isClosed
        ? 'Isolates the global alternate feeder bus from the distribution load station.'
        : 'Connects the global backup generator / alternate feeder to the distribution bus as emergency reserve.',
      downstreamEffect: isClosed
        ? 'Alternate source will be disconnected.'
        : 'Alternate 200 A reserve capacity is placed online.',
      safetyLevel: 'SAFE',
      onConfirm: () => {
        onToggleRelay(globalBackupRelay.id, globalBackupRelay.state);
        setPreviewAction(null);
      },
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Protection Relays & Dual-Corridor Switching SCADA
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  Interactive Previews
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Click any relay switch button to open the visual action preview screen showing live electrical contact movement and circuit consequences.
              </p>
            </div>
          </div>

          <button
            onClick={onTriggerManualIsolation}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40 transition border border-amber-400 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Trigger Automatic Isolation Routine</span>
          </button>
        </div>

        {/* Quick Corridor Overview Matrix Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {segments.map((s, idx) => {
            const priRelay = isolationRelays.find((r) => r.segmentId === s.id);
            const bkpRelay = backupRelays.find((r) => r.segmentId === s.id);
            const priClosed = priRelay?.state === 'CLOSED';
            const bkpClosed = bkpRelay?.state === 'CLOSED';

            return (
              <div
                key={s.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="text-white font-bold block">{s.name} / {s.backupName || `B${idx + 1}`}</span>
                  <span className="text-[10px] text-slate-400">
                    {s.backupActive ? '⚡ Bypassed via Backup' : s.status}
                  </span>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      priClosed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    R{idx + 1}: {priClosed ? 'ON' : 'TRIP'}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      bkpClosed ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}
                  >
                    RB{idx + 1}: {bkpClosed ? 'BYPASS' : 'STBY'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Primary & Backup Relays (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Primary Line Isolation Relays */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Power className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Primary Line Isolation Relays (R1–R4)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Normally Closed Contactors
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isolationRelays.map((relay) => {
                const seg = getSegment(relay.segmentId);
                const isClosed = relay.state === 'CLOSED';
                const isHovered = hoveredRelayId === relay.id;

                return (
                  <div
                    key={relay.id}
                    onMouseEnter={() => setHoveredRelayId(relay.id)}
                    onMouseLeave={() => setHoveredRelayId(null)}
                    className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                      isClosed
                        ? 'bg-slate-950/70 border-emerald-900/50 hover:border-emerald-500/50 shadow-sm'
                        : 'bg-rose-950/20 border-rose-900/60 hover:border-rose-500/50 shadow-sm'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-3 h-3 rounded-full flex items-center justify-center ${
                            isClosed ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500 shadow-md shadow-rose-500/50'
                          }`}
                        />
                        <span className="font-bold text-sm text-white font-mono">{relay.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          PRIMARY
                        </span>
                      </div>

                      {/* Action Trigger Button */}
                      <button
                        onClick={() => initiateRelayAction(relay)}
                        className={`group flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md cursor-pointer border ${
                          isClosed
                            ? 'bg-gradient-to-r from-rose-900/80 to-red-900/80 hover:from-rose-800 hover:to-red-800 text-rose-200 border-rose-700 hover:border-rose-500'
                            : 'bg-gradient-to-r from-emerald-900/80 to-teal-900/80 hover:from-emerald-800 hover:to-teal-800 text-emerald-200 border-emerald-700 hover:border-emerald-500'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition" />
                        <span>{isClosed ? 'TRIP / OPEN' : 'CLOSE / ENERGIZE'}</span>
                      </button>
                    </div>

                    {/* Circuit Schematic Visual Mini-Bar */}
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="text-[10px] text-slate-400">Path:</div>
                        <span className="font-semibold text-white">{seg?.name || `Segment #${relay.segmentId}`}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 text-[10px]">Contact:</span>
                        <span className={`font-bold ${isClosed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isClosed ? '●───● CLOSED' : '●──/ ──● OPEN'}
                        </span>
                      </div>
                    </div>

                    {/* Electrical telemetry readings */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[11px] mb-2">
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px] uppercase">Bus Voltage</span>
                        <span className="font-bold text-cyan-400">
                          {seg?.lastVoltageV && seg.lastVoltageV > 0 && isClosed ? `${(seg.lastVoltageV / 1000).toFixed(2)} kV` : '0.00 kV (Isolated)'}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px] uppercase">Current Flow</span>
                        <span className="font-bold text-emerald-400">
                          {seg?.lastCurrentA && seg.lastCurrentA > 0 && isClosed ? `${seg.lastCurrentA.toFixed(1)} A` : '0.0 A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-800/60 font-mono">
                      <span>Op: {relay.lastOperatedBy || 'SYSTEM'}</span>
                      <span>{relay.lastOperatedAt ? new Date(relay.lastOperatedAt).toLocaleTimeString() : 'Ready'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Backup Route Bypass Relays */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Backup Route Bypass Relays (RB1–RB4)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Normally Open (Standby Bypass)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {backupRelays.map((relay) => {
                const seg = getSegment(relay.segmentId);
                const isClosed = relay.state === 'CLOSED';

                return (
                  <div
                    key={relay.id}
                    className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                      isClosed
                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-cyan-800/60'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-3 h-3 rounded-full flex items-center justify-center ${
                            isClosed ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-bold text-sm text-white font-mono">{relay.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                          {seg?.backupName || 'BACKUP'}
                        </span>
                      </div>

                      {/* Action Trigger Button */}
                      <button
                        onClick={() => initiateRelayAction(relay)}
                        className={`group flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md cursor-pointer border ${
                          isClosed
                            ? 'bg-gradient-to-r from-amber-900/80 to-orange-900/80 hover:from-amber-800 hover:to-orange-800 text-amber-200 border-amber-700 hover:border-amber-500'
                            : 'bg-gradient-to-r from-cyan-900/80 to-blue-900/80 hover:from-cyan-800 hover:to-blue-800 text-cyan-200 border-cyan-700 hover:border-cyan-500'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition" />
                        <span>{isClosed ? 'STANDBY / OPEN' : 'BYPASS / CLOSE'}</span>
                      </button>
                    </div>

                    {/* Circuit Schematic Visual Mini-Bar */}
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="text-[10px] text-slate-400">Bypass for:</div>
                        <span className="font-semibold text-white">{seg?.name || `Segment #${relay.segmentId}`}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 text-[10px]">Status:</span>
                        <span className={`font-bold ${isClosed ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {isClosed ? '⚡ ACTIVE BYPASS' : '○ STANDBY'}
                        </span>
                      </div>
                    </div>

                    {/* Electrical telemetry readings */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[11px] mb-2">
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px] uppercase">Bypass Voltage</span>
                        <span className={`font-bold ${isClosed ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {seg?.backupVoltageV && seg.backupVoltageV > 0 && isClosed ? `${(seg.backupVoltageV / 1000).toFixed(2)} kV` : '0.00 kV (Standby)'}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[9px] uppercase">Bypass Current</span>
                        <span className={`font-bold ${isClosed ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {seg?.backupCurrentA && seg.backupCurrentA > 0 && isClosed ? `${seg.backupCurrentA.toFixed(1)} A` : '0.0 A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-800/60 font-mono">
                      <span>Op: {relay.lastOperatedBy || 'SYSTEM'}</span>
                      <span>{relay.lastOperatedAt ? new Date(relay.lastOperatedAt).toLocaleTimeString() : 'Ready'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Alternate Feeder & SCADA Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Global Feeder Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Global Alternate Feeder</h3>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  backupFeeder?.active
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {backupFeeder?.active ? 'ENERGIZED' : 'STANDBY'}
              </span>
            </div>

            {backupFeeder && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Feeder Name:</span>
                    <span className="text-white font-medium">{backupFeeder.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source Voltage:</span>
                    <span className="text-cyan-400 font-mono font-bold">{(backupFeeder.sourceVoltageV / 1000).toFixed(1)} kV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Capacity:</span>
                    <span className="text-emerald-400 font-mono font-bold">{backupFeeder.capacityAmperes} A</span>
                  </div>
                  {globalBackupRelay && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Global Relay (RB):</span>
                      <span className={`font-mono font-bold ${globalBackupRelay.state === 'CLOSED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {globalBackupRelay.state}
                      </span>
                    </div>
                  )}
                </div>

                {/* Operations */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">Feeder Readiness</span>
                      <span className="text-[11px] text-slate-400">Toggle availability state</span>
                    </div>
                    <button
                      onClick={() => onUpdateBackupFeeder(!backupFeeder.available, backupFeeder.capacityAmperes)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        backupFeeder.available
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                          : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                      }`}
                    >
                      {backupFeeder.available ? 'AVAILABLE' : 'OFFLINE'}
                    </button>
                  </div>

                  {globalBackupRelay && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-white block">Tie Breaker (RB)</span>
                        <span className="text-[11px] text-slate-400">Operate alternate bus relay</span>
                      </div>
                      <button
                        onClick={initiateGlobalFeederAction}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 shadow"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Inspect & Switch</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Educational Quick Guide Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400 pb-2 border-b border-slate-800">
              <Info className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">How Switching Works</h4>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>Primary Relays (R1–R4)</strong>: Trip open to isolate damaged cable sections from short circuits.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Backup Relays (RB1–RB4)</strong>: Close to activate the bypass node, restoring continuous 11 kV power to customers downstream.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Visual Action Screen</strong>: Inspecting before switching prevents accidental blackouts and ensures interlock safety.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          FLOATING SMALL SCREEN (Action Preview & Visual Circuit Simulation Dialog)
         ────────────────────────────────────────────────────────────────────────── */}
      {previewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background glowing ambient light */}
            <div
              className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                previewAction.targetState === 'CLOSED' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
              }`}
            />

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    previewAction.targetState === 'CLOSED'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Visual Action Preview
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      Relay {previewAction.relayName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{previewAction.actionTitle}</h3>
                </div>
              </div>
              <button
                onClick={() => setPreviewAction(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Schematic Simulation of the Switch Contact */}
            <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>ELECTRICAL CONTACT VISUALIZER</span>
                <span className={previewAction.targetState === 'CLOSED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  PROPOSED: {previewAction.targetState}
                </span>
              </div>

              {/* Animated SVG representation of the relay contact */}
              <svg viewBox="0 0 380 90" className="w-full h-auto select-none">
                <defs>
                  <linearGradient id="liveBusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Left supply bus wire */}
                <line x1="30" y1="45" x2="110" y2="45" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
                <line
                  x1="30"
                  y1="45"
                  x2="110"
                  y2="45"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-moving-dots"
                />
                <circle cx="110" cy="45" r="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="35" y="32" fill="#94a3b8" fontSize="9" fontWeight="bold">
                  BUS IN (11 kV)
                </text>

                {/* Right load bus wire */}
                <line
                  x1="270"
                  y1="45"
                  x2="350"
                  y2="45"
                  stroke={previewAction.targetState === 'CLOSED' ? '#10b981' : '#334155'}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {previewAction.targetState === 'CLOSED' && (
                  <line
                    x1="270"
                    y1="45"
                    x2="350"
                    y2="45"
                    stroke="#34d399"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="animate-moving-dots"
                  />
                )}
                <circle
                  cx="270"
                  cy="45"
                  r="7"
                  fill={previewAction.targetState === 'CLOSED' ? '#047857' : '#1e293b'}
                  stroke={previewAction.targetState === 'CLOSED' ? '#34d399' : '#64748b'}
                  strokeWidth="2"
                />
                <text x="345" y="32" textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="bold">
                  LINE OUT
                </text>

                {/* Switch Contact Blade */}
                {previewAction.targetState === 'CLOSED' ? (
                  // Closed state: continuous bridge
                  <g>
                    <line x1="110" y1="45" x2="270" y2="45" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
                    <line
                      x1="110"
                      y1="45"
                      x2="270"
                      y2="45"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="animate-moving-dots-fast"
                    />
                    <circle cx="190" cy="45" r="5" fill="#34d399" className="animate-ping" />
                    <text x="190" y="70" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">
                      CONTACT CLOSED (CURRENT CONDUCTING)
                    </text>
                  </g>
                ) : (
                  // Open state: blade lifted at 35 degrees
                  <g>
                    <line x1="110" y1="45" x2="230" y2="15" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="230" cy="15" r="5" fill="#ef4444" />
                    {/* Air gap arc indicator */}
                    <path d="M 235 22 Q 250 35 265 40" fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="2,2" />
                    <text x="190" y="72" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="bold">
                      AIR GAP ISOLATION (ZERO CURRENT)
                    </text>
                  </g>
                )}
              </svg>

              {/* Before vs After Pill comparison */}
              <div className="flex items-center justify-center space-x-4 mt-2 pt-2 border-t border-slate-900 text-xs font-mono">
                <span className="text-slate-400">Current: <span className="text-white font-bold">{previewAction.currentState}</span></span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Action: <span className={previewAction.targetState === 'CLOSED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{previewAction.targetState}</span></span>
              </div>
            </div>

            {/* Impact Details & Explanation */}
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                  Electrical Circuit Consequence:
                </span>
                <p>{previewAction.impactDescription}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Grid & Customer Load Impact:
                </span>
                <p>{previewAction.downstreamEffect}</p>
              </div>

              {/* Safety Warning if critical */}
              {previewAction.safetyWarning && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">{previewAction.safetyWarning}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                onClick={() => setPreviewAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={previewAction.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg flex items-center space-x-2 cursor-pointer ${
                  previewAction.targetState === 'CLOSED'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 border border-emerald-400'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/50 border border-rose-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Switch Relay {previewAction.relayName}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
