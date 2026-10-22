import React, { useState } from 'react';
import type { CableSegment, Relay, BackupFeeder, ElectricalLoad, ActiveFault } from '../types';
import { Zap, AlertTriangle, ShieldCheck, PowerOff, RefreshCw, Info, CheckCircle2, XCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface NetworkVisualizerProps {
  segments: CableSegment[];
  relays: Relay[];
  backupFeeder: BackupFeeder | null;
  loads: ElectricalLoad[];
  activeFault: ActiveFault | null;
  simulationRunning: boolean;
  onSelectSegment: (segment: CableSegment) => void;
  onToggleRelay: (relayId: number, currentState: 'OPEN' | 'CLOSED') => void;
  onOpenInjectModal: () => void;
  onRerouteViaBackup: (segmentId: number) => void;
  onRestorePrimaryRoute: (segmentId: number) => void;
}

export const NetworkVisualizer: React.FC<NetworkVisualizerProps> = ({
  segments,
  relays,
  backupFeeder,
  loads,
  activeFault,
  simulationRunning,
  onSelectSegment,
  onToggleRelay,
  onOpenInjectModal,
  onRerouteViaBackup,
  onRestorePrimaryRoute,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<CableSegment | null>(null);

  // Relay lookup by segment ID & type
  const getPrimaryRelay = (segId: number): Relay | undefined => {
    return relays.find((r) => r.segmentId === segId && r.type === 'ISOLATION');
  };

  const getBackupRelay = (segId: number): Relay | undefined => {
    return relays.find((r) => r.segmentId === segId && r.type === 'BACKUP');
  };

  // Determine status color styling for each segment
  const getSegmentColor = (seg: CableSegment) => {
    switch (seg.status) {
      case 'HEALTHY':
        return {
          stroke: '#10b981', // emerald-500
          fill: '#064e3b',
          glow: 'rgba(16, 185, 129, 0.4)',
          label: 'Healthy',
          badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
        };
      case 'SUSPECTED_FAULT':
        return {
          stroke: '#f59e0b', // amber-500
          fill: '#78350f',
          glow: 'rgba(245, 158, 11, 0.6)',
          label: 'Suspected Fault',
          badgeClass: 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse',
        };
      case 'CONFIRMED_FAULT':
        return {
          stroke: '#ef4444', // red-500
          fill: '#7f1d1d',
          glow: 'rgba(239, 68, 68, 0.7)',
          label: 'Confirmed Fault',
          badgeClass: 'bg-rose-950 text-rose-300 border-rose-800 animate-bounce',
        };
      case 'ISOLATED':
        return {
          stroke: '#f97316', // orange-500
          fill: '#431407',
          glow: 'rgba(249, 115, 22, 0.3)',
          label: 'Isolated',
          badgeClass: 'bg-orange-950 text-orange-400 border-orange-800',
        };
      case 'DE_ENERGIZED':
        return {
          stroke: '#64748b', // slate-500
          fill: '#1e293b',
          glow: 'none',
          label: 'De-energized',
          badgeClass: 'bg-slate-900 text-slate-400 border-slate-700',
        };
      default:
        return {
          stroke: '#10b981',
          fill: '#064e3b',
          glow: 'none',
          label: seg.status,
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  // Find any segment with an active fault, suspected fault, or isolated state
  const isolatedOrFaultedSeg = segments.find(
    (s) => s.status === 'CONFIRMED_FAULT' || s.status === 'SUSPECTED_FAULT' || s.status === 'ISOLATED' || (activeFault && activeFault.segmentId === s.id)
  );

  // Find any segment currently operating via its backup node
  const activeBackupSeg = segments.find((s) => s.backupActive);

  // Check if load is supplied
  const isLoadSupplied = loads.some((l) => l.supplied);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Underground Cable Circuit Model & Dual-Corridor Power Flow
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-cyan-800/40">
              11 kV Dual-Bus N+1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Primary Corridor (S1–S4) paired with Dedicated Redundant Backup Layer (B1–B4). Moving dots represent real-time current flow.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenInjectModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-900/30 transition border border-rose-500 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inject Fault</span>
          </button>
        </div>
      </div>

      {/* Soft Red-Highlighted Alert Banner for Fault & Failover Controls */}
      {isolatedOrFaultedSeg && !activeBackupSeg && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/50 backdrop-blur-md shadow-lg shadow-red-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-red-900/60 border border-red-500/40 text-red-200 mt-0.5 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-700/60">
                  Manager Action Required
                </span>
                <span className="text-sm font-bold text-red-100">
                  Fault Detected & Isolated on {isolatedOrFaultedSeg.name} ({isolatedOrFaultedSeg.displayLabel})
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                The primary line has been isolated to protect the network. Downstream customers are at risk.
                Press the button below to immediately shift the main power supply route through <strong>Backup Node {isolatedOrFaultedSeg.backupName || 'B' + isolatedOrFaultedSeg.sequenceOrder}</strong> with zero downtime.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onRerouteViaBackup(isolatedOrFaultedSeg.id)}
              className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-red-950/50 border border-red-400 flex items-center justify-center space-x-2 transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
              <span>Shift Power to Backup Node {isolatedOrFaultedSeg.backupName || 'B' + isolatedOrFaultedSeg.sequenceOrder}</span>
            </button>
          </div>
        </div>
      )}

      {/* Soft Red-Highlighted Active Backup & Maintenance Progress Banner */}
      {activeBackupSeg && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/30 border border-red-500/40 backdrop-blur-md shadow-lg shadow-red-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  Backup Active — 100% Grid Uptime
                </span>
                <span className="text-sm font-bold text-red-100">
                  Power Rerouted via Backup Node {activeBackupSeg.backupName}
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                Downstream grid and loads remain continuous and fully energized. Meanwhile, the maintenance crew is repairing the faulty primary line <strong>{activeBackupSeg.name}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onRestorePrimaryRoute(activeBackupSeg.id)}
              className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 border border-emerald-400 flex items-center justify-center space-x-2 transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Complete Repair on {activeBackupSeg.name} & Restore Primary Route</span>
            </button>
          </div>
        </div>
      )}

      {/* SVG Interactive Dual-Corridor Schematic */}
      <div className="mt-4 w-full overflow-x-auto pb-2">
        <div className="min-w-[940px] flex justify-center">
          <svg viewBox="0 0 940 350" className="w-full h-auto select-none">
            <defs>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. Main 11 kV Substation Source (Left) */}
            <g transform="translate(20, 65)">
              <rect
                x="0"
                y="0"
                width="85"
                height="80"
                rx="8"
                fill="#0f172a"
                stroke="#0284c7"
                strokeWidth="2"
                className="drop-shadow"
              />
              <circle cx="42" cy="28" r="14" fill="#0369a1" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="42" y="32" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                11 kV
              </text>
              <text x="42" y="58" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
                Primary Grid
              </text>
              <text x="42" y="70" textAnchor="middle" fill="#64748b" fontSize="8">
                Main Substation
              </text>
            </g>

            {/* Lead Wire from Substation to Bus 0 */}
            <line x1="105" y1="105" x2="135" y2="105" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            {simulationRunning && (
              <line
                x1="105"
                y1="105"
                x2="135"
                y2="105"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-moving-dots"
              />
            )}
            {/* Bus 0 Junction Dot */}
            <circle cx="135" cy="105" r="5" fill="#38bdf8" />

            {/* 2. Four Dual-Corridor Stages: S1..S4 (Primary Top) and B1..B4 (Backup Bottom) */}
            {segments.map((seg, idx) => {
              const startX = 145 + idx * 165;
              const busInX = startX - 10;
              const segWidth = 115;
              const primaryRelay = getPrimaryRelay(seg.id);
              const backupRelay = getBackupRelay(seg.id);
              const styling = getSegmentColor(seg);
              const isFaultOnThis = activeFault && activeFault.segmentId === seg.id;
              const isHovered = hoveredSegment?.id === seg.id;
              const isPrimaryConducting = simulationRunning && seg.status !== 'ISOLATED' && seg.status !== 'DE_ENERGIZED' && !seg.backupActive && primaryRelay?.state === 'CLOSED';
              const isBackupConducting = simulationRunning && seg.backupActive && backupRelay?.state === 'CLOSED';

              const nextBusX = startX + segWidth + 40;

              return (
                <g key={seg.id}>
                  {/* --- PRIMARY CORRIDOR (TOP) --- */}

                  {/* Wire from Bus In into Primary Segment */}
                  <line x1={busInX} y1="105" x2={startX} y2="105" stroke="#1e293b" strokeWidth="5" />
                  {isPrimaryConducting && (
                    <line
                      x1={busInX}
                      y1="105"
                      x2={startX}
                      y2="105"
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-moving-dots"
                    />
                  )}

                  {/* Primary Segment Container Box */}
                  <g
                    transform={`translate(${startX}, 55)`}
                    className="cursor-pointer transition-transform duration-150"
                    onClick={() => onSelectSegment(seg)}
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={segWidth}
                      height="95"
                      rx="8"
                      fill={isHovered ? '#1e293b' : '#0f172a'}
                      stroke={styling.stroke}
                      strokeWidth={isHovered || isFaultOnThis ? '2.5' : '1.5'}
                      filter={isFaultOnThis ? 'url(#glowEffect)' : undefined}
                      className="transition-colors"
                    />

                    {/* Segment Header */}
                    <text x="10" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold">
                      {seg.name} (Primary)
                    </text>
                    <text x="10" y="32" fill="#94a3b8" fontSize="8">
                      {seg.lengthKm} km ({seg.totalResistanceOhm.toFixed(1)} Ω)
                    </text>

                    {/* Electrical Readings */}
                    <g transform="translate(10, 48)">
                      <text x="0" y="10" fill="#38bdf8" fontSize="10" fontWeight="600" fontFamily="monospace">
                        V: {seg.lastVoltageV && seg.lastVoltageV > 0 ? `${(seg.lastVoltageV / 1000).toFixed(2)} kV` : '0.00 kV'}
                      </text>
                      <text x="0" y="24" fill="#34d399" fontSize="10" fontWeight="600" fontFamily="monospace">
                        I: {seg.lastCurrentA && seg.lastCurrentA > 0 ? `${seg.lastCurrentA.toFixed(1)} A` : '0.0 A'}
                      </text>
                    </g>

                    {/* Fault Warning Icon */}
                    {isFaultOnThis && (
                      <g transform="translate(85, 10)">
                        <circle cx="10" cy="10" r="12" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                        <circle cx="10" cy="10" r="9" fill="#dc2626" />
                        <text x="10" y="13" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                          !
                        </text>
                      </g>
                    )}

                    {/* Status Badge */}
                    <rect
                      x="10"
                      y="76"
                      width={segWidth - 20}
                      height="13"
                      rx="3"
                      fill={seg.status === 'HEALTHY' ? '#064e3b' : seg.status === 'ISOLATED' ? '#431407' : '#7f1d1d'}
                    />
                    <text
                      x={segWidth / 2}
                      y="85"
                      textAnchor="middle"
                      fill={seg.status === 'HEALTHY' ? '#34d399' : seg.status === 'ISOLATED' ? '#fb923c' : '#fca5a5'}
                      fontSize="7"
                      fontWeight="bold"
                    >
                      {seg.status}
                    </text>
                  </g>

                  {/* Primary Relay (Ri) */}
                  {primaryRelay && (
                    <g
                      transform={`translate(${startX + segWidth + 6}, 93)`}
                      onClick={() => onToggleRelay(primaryRelay.id, primaryRelay.state)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="12"
                        fill={primaryRelay.state === 'CLOSED' ? '#064e3b' : '#7f1d1d'}
                        stroke={primaryRelay.state === 'CLOSED' ? '#10b981' : '#ef4444'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="12"
                        y="15"
                        textAnchor="middle"
                        fill={primaryRelay.state === 'CLOSED' ? '#34d399' : '#f87171'}
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {primaryRelay.name}
                      </text>
                      <text x="12" y="-3" textAnchor="middle" fill="#94a3b8" fontSize="7">
                        {primaryRelay.state}
                      </text>
                    </g>
                  )}

                  {/* Wire from Primary Relay to Next Bus */}
                  <line x1={startX + segWidth + 30} y1="105" x2={nextBusX} y2="105" stroke="#1e293b" strokeWidth="5" />
                  {isPrimaryConducting && (
                    <line
                      x1={startX + segWidth + 30}
                      y1="105"
                      x2={nextBusX}
                      y2="105"
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-moving-dots"
                    />
                  )}

                  {/* --- BACKUP REDUNDANT CORRIDOR (BOTTOM) --- */}

                  {/* Bypass Downward Jumper: Bus In -> Backup Relay -> B_i */}
                  <path
                    d={`M ${busInX} 105 L ${busInX} 245 L ${startX} 245`}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="4"
                    strokeDasharray={isBackupConducting ? 'none' : '4,4'}
                  />
                  {isBackupConducting && (
                    <path
                      d={`M ${busInX} 105 L ${busInX} 245 L ${startX} 245`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-moving-dots-backup"
                    />
                  )}

                  {/* Backup Bypass Relay (RBi) */}
                  {backupRelay && (
                    <g
                      transform={`translate(${busInX - 12}, 165)`}
                      onClick={() => onToggleRelay(backupRelay.id, backupRelay.state)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="12"
                        fill={backupRelay.state === 'CLOSED' ? '#064e3b' : '#334155'}
                        stroke={backupRelay.state === 'CLOSED' ? '#10b981' : '#64748b'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="12"
                        y="15"
                        textAnchor="middle"
                        fill={backupRelay.state === 'CLOSED' ? '#34d399' : '#94a3b8'}
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {backupRelay.name}
                      </text>
                      <text x="-4" y="14" textAnchor="end" fill="#94a3b8" fontSize="7">
                        {backupRelay.state}
                      </text>
                    </g>
                  )}

                  {/* Backup Node Box Container (B1..B4) */}
                  <g
                    transform={`translate(${startX}, 210)`}
                    className="cursor-pointer transition-transform duration-150"
                    onClick={() => {
                      if (!seg.backupActive) {
                        onRerouteViaBackup(seg.id);
                      } else {
                        onRestorePrimaryRoute(seg.id);
                      }
                    }}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={segWidth}
                      height="75"
                      rx="8"
                      fill={seg.backupActive ? '#064e3b' : '#0f172a'}
                      stroke={seg.backupActive ? '#10b981' : '#334155'}
                      strokeWidth={seg.backupActive ? '2.5' : '1.5'}
                      className="transition-colors"
                    />

                    {/* Backup Header */}
                    <text x="10" y="18" fill={seg.backupActive ? '#34d399' : '#cbd5e1'} fontSize="11" fontWeight="bold">
                      {seg.backupName || `B${idx + 1}`} (Backup Node)
                    </text>
                    <text x="10" y="30" fill={seg.backupActive ? '#a7f3d0' : '#64748b'} fontSize="8">
                      Parallel Bypass Route
                    </text>

                    {/* Backup Telemetry */}
                    <g transform="translate(10, 42)">
                      <text x="0" y="10" fill={seg.backupActive ? '#38bdf8' : '#64748b'} fontSize="9" fontWeight="600" fontFamily="monospace">
                        V: {seg.backupVoltageV && seg.backupVoltageV > 0 ? `${(seg.backupVoltageV / 1000).toFixed(2)} kV` : '0.00 kV (Standby)'}
                      </text>
                      <text x="0" y="22" fill={seg.backupActive ? '#34d399' : '#64748b'} fontSize="9" fontWeight="600" fontFamily="monospace">
                        I: {seg.backupCurrentA && seg.backupCurrentA > 0 ? `${seg.backupCurrentA.toFixed(1)} A` : '0.0 A'}
                      </text>
                    </g>

                    {/* Active pill */}
                    <rect
                      x={segWidth - 55}
                      y="8"
                      width="48"
                      height="13"
                      rx="3"
                      fill={seg.backupActive ? '#047857' : '#1e293b'}
                    />
                    <text
                      x={segWidth - 31}
                      y="17"
                      textAnchor="middle"
                      fill={seg.backupActive ? '#ffffff' : '#94a3b8'}
                      fontSize="7"
                      fontWeight="bold"
                    >
                      {seg.backupActive ? 'ACTIVE' : 'STANDBY'}
                    </text>
                  </g>

                  {/* Bypass Upward Return Jumper: B_i -> Next Bus */}
                  <path
                    d={`M ${startX + segWidth} 245 L ${nextBusX} 245 L ${nextBusX} 105`}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="4"
                    strokeDasharray={isBackupConducting ? 'none' : '4,4'}
                  />
                  {isBackupConducting && (
                    <path
                      d={`M ${startX + segWidth} 245 L ${nextBusX} 245 L ${nextBusX} 105`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-moving-dots-backup"
                    />
                  )}

                  {/* Bus Node Junction Dot */}
                  <circle cx={nextBusX} cy="105" r="5" fill={isPrimaryConducting || isBackupConducting ? '#38bdf8' : '#64748b'} />
                </g>
              );
            })}

            {/* 3. Downstream Loads (Right side, fed by Bus 4) */}
            <g transform="translate(825, 60)">
              <rect
                x="0"
                y="0"
                width="95"
                height="85"
                rx="8"
                fill="#0f172a"
                stroke={isLoadSupplied ? '#10b981' : '#ef4444'}
                strokeWidth="2"
              />
              <circle
                cx="47"
                cy="26"
                r="13"
                fill={isLoadSupplied ? '#064e3b' : '#450a0a'}
                stroke={isLoadSupplied ? '#34d399' : '#f87171'}
                strokeWidth="1.5"
              />
              <text
                x="47"
                y="30"
                textAnchor="middle"
                fill={isLoadSupplied ? '#34d399' : '#f87171'}
                fontSize="10"
                fontWeight="bold"
              >
                LOAD
              </text>
              <text x="47" y="54" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="600">
                1.5 MW Total
              </text>
              <text
                x="47"
                y="70"
                textAnchor="middle"
                fill={isLoadSupplied ? '#34d399' : '#f87171'}
                fontSize="8"
                fontWeight="bold"
              >
                {isLoadSupplied ? '● 100% SUPPLIED' : '○ DE-ENERGIZED'}
              </text>
            </g>

            {/* Wire to load from Bus 4 */}
            <line x1="795" y1="105" x2="825" y2="105" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            {simulationRunning && isLoadSupplied && (
              <line
                x1="795"
                y1="105"
                x2="825"
                y2="105"
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-moving-dots"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Legend & Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-medium">Corridor Status:</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="text-slate-300">Primary Current (Moving Dots)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300">Backup Bypass Current (Moving Dots)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300">Isolated / Faulted Line</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-400">Standby Route</span>
          </span>
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          N+1 Redundancy: 4 Primary (S1–S4) | 4 Backup (B1–B4) | Nominal Voltage: 11.0 kV
        </div>
      </div>
    </div>
  );
};
