import React from 'react';
import type { Relay, BackupFeeder, CableSegment } from '../types';
import { Cpu, Power, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface RelayControlPanelProps {
  relays: Relay[];
  backupFeeder: BackupFeeder | null;
  segments: CableSegment[];
  onToggleRelay: (relayId: number, currentState: 'OPEN' | 'CLOSED') => void;
  onUpdateBackupFeeder: (available: boolean, capacity: number) => void;
  onTriggerManualIsolation: () => void;
}

export const RelayControlPanel: React.FC<RelayControlPanelProps> = ({
  relays,
  backupFeeder,
  segments,
  onToggleRelay,
  onUpdateBackupFeeder,
  onTriggerManualIsolation,
}) => {
  const isolationRelays = relays.filter((r) => r.type === 'ISOLATION');
  const backupRelay = relays.find((r) => r.type === 'BACKUP');

  const getSegmentName = (segId: number | null) => {
    if (!segId) return 'N/A';
    const s = segments.find((seg) => seg.id === segId);
    return s ? `${s.name} (${s.displayLabel})` : `Segment #${segId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Module D & E: Protection Relays & Self-Healing Feeder Management
              </h2>
              <p className="text-xs text-amber-300/80">
                Independent Relay Switching, Manual Override, and Alternate Route Stress Testing
              </p>
            </div>
          </div>

          <button
            onClick={onTriggerManualIsolation}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/30 transition border border-amber-500"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Trigger Automatic Isolation Routine</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Isolation Relays (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <Power className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Segment Isolation Relays</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Interlocked Switching Protocol
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isolationRelays.map((relay) => {
              const isClosed = relay.state === 'CLOSED';
              return (
                <div
                  key={relay.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isClosed
                      ? 'bg-slate-950/70 border-emerald-900/50 hover:border-emerald-700/60'
                      : 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isClosed ? '#10b981' : '#ef4444' }} />
                      <span className="font-bold text-sm text-white font-mono">{relay.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {relay.type}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleRelay(relay.id, relay.state)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${
                        isClosed
                          ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700'
                          : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                      }`}
                    >
                      {isClosed ? 'TRIP / OPEN' : 'CLOSE / ENERGIZE'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 mt-2 space-y-1 font-mono text-[11px]">
                    <div>Controlling: <span className="text-white font-medium">{getSegmentName(relay.segmentId)}</span></div>
                    <div>State: <span className={isClosed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{relay.state}</span></div>
                    <div className="text-slate-400">
                      Operated: {relay.lastOperatedBy ? `${relay.lastOperatedBy}` : 'SYSTEM_INIT'} (
                      {relay.lastOperatedAt ? new Date(relay.lastOperatedAt).toLocaleTimeString() : 'Init'})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Alternate Backup Feeder Controls (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Alternate Backup Feeder</h3>
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
                <div className="flex justify-between">
                  <span className="text-slate-400">Feeder Relay (RB):</span>
                  <span className={`font-mono font-bold ${backupRelay?.state === 'CLOSED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {backupRelay?.state ?? 'CLOSED'}
                  </span>
                </div>
              </div>

              {/* Reroute failure test toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-white block">Feeder Available</span>
                    <span className="text-[11px] text-slate-400">Toggle to simulate backup feeder outage</span>
                  </div>
                  <button
                    onClick={() => onUpdateBackupFeeder(!backupFeeder.available, backupFeeder.capacityAmperes)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      backupFeeder.available
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {backupFeeder.available ? 'AVAILABLE' : 'OFFLINE'}
                  </button>
                </div>

                {backupRelay && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">Backup Relay (RB)</span>
                      <span className="text-[11px] text-slate-400">Manually operate feeder tie-breaker</span>
                    </div>
                    <button
                      onClick={() => onToggleRelay(backupRelay.id, backupRelay.state)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        backupRelay.state === 'CLOSED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {backupRelay.state}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
