import React from 'react';
import type { SimulationStatus, CableSegment, BackupFeeder, ElectricalLoad } from '../types';
import { Activity, ShieldCheck, AlertOctagon, Power, Crosshair, ArrowRightLeft } from 'lucide-react';

interface MetricsCardsProps {
  status: SimulationStatus | null;
  segments: CableSegment[];
  backupFeeder: BackupFeeder | null;
  loads: ElectricalLoad[];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ status, segments, backupFeeder, loads }) => {
  const healthyCount = segments.filter((s) => s.status === 'HEALTHY').length;
  const isolatedCount = segments.filter((s) => s.status === 'ISOLATED').length;
  const faultCount = segments.filter((s) => s.status === 'SUSPECTED_FAULT' || s.status === 'CONFIRMED_FAULT').length;
  const loadsSupplied = loads.filter((l) => l.supplied).length;
  const activeBackupCount = segments.filter((s) => s.backupActive).length;
  const activeBackupNode = segments.find((s) => s.backupActive);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Network Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Healthy Segments</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-bold text-white font-mono">{healthyCount}</span>
          <span className="text-xs text-slate-400 font-mono">/ {segments.length}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {healthyCount === segments.length ? '100% nominal state' : `${segments.length - healthyCount} affected`}
        </div>
      </div>

      {/* 2. Active Faults */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Active Faults</span>
          <AlertOctagon className={`w-4 h-4 ${faultCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className={`text-2xl font-bold font-mono ${faultCount > 0 ? 'text-rose-400' : 'text-white'}`}>
            {faultCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">detected</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400 truncate">
          {status?.activeFault ? `${status.activeFault.segmentName} (${status.activeFault.faultType})` : 'No active faults'}
        </div>
      </div>

      {/* 3. Isolated Segments */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Isolated Segments</span>
          <Activity className="w-4 h-4 text-orange-400" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-bold text-white font-mono">{isolatedCount}</span>
          <span className="text-xs text-slate-400 font-mono">segments</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {isolatedCount > 0 ? 'Circuit isolated via relay' : 'All circuits online'}
        </div>
      </div>

      {/* 4. Backup Feeder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Backup Redundancy</span>
          <ArrowRightLeft className={`w-4 h-4 ${activeBackupCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span
            className={`text-sm font-bold font-mono uppercase ${
              backupFeeder?.active
                ? 'text-cyan-400'
                : backupFeeder?.available
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {activeBackupNode ? `NODE ${activeBackupNode.backupName} ONLINE` : 'ALL 4 STANDBY'}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {activeBackupNode ? `Bypassing ${activeBackupNode.name} (Zero Downtime)` : 'B1–B4 N+1 Standby'}
        </div>
      </div>

      {/* 5. Downstream Supply */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Downstream Supply</span>
          <Power className={`w-4 h-4 ${loadsSupplied > 0 ? 'text-emerald-400' : 'text-rose-500'}`} />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className={`text-2xl font-bold font-mono ${loadsSupplied > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {loadsSupplied}
          </span>
          <span className="text-xs text-slate-400 font-mono">/ {loads.length} loads</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          {loadsSupplied === loads.length ? 'Fully powered' : 'Partial / Outage'}
        </div>
      </div>

      {/* 6. Fault Localization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium">Estimated Fault Df</span>
          <Crosshair className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-lg font-bold text-white font-mono">
            {status?.activeFault ? `${status.activeFault.actualDistanceKm.toFixed(2)} km` : '—'}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-purple-300 font-mono truncate">
          {status?.activeFault ? `Actual: ${status.activeFault.actualDistanceKm.toFixed(2)} km` : 'Formula: (Vf/VT)×LT'}
        </div>
      </div>
    </div>
  );
};
