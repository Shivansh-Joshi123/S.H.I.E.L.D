import React, { useState } from 'react';
import type { CableSegment, Relay, BackupFeeder, ElectricalLoad, ActiveFault } from '../types';
import { Zap, AlertTriangle, ShieldCheck, PowerOff, RefreshCw, Info, CheckCircle2, XCircle } from 'lucide-react';

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
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<CableSegment | null>(null);

  // Relay lookup by segment ID
  const getRelayForSegment = (segId: number): Relay | undefined => {
    return relays.find((r) => r.segmentId === segId);
  };

  const backupRelay = relays.find((r) => r.type === 'BACKUP');

  // Determine color and status styling for each segment
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

  // Determine power flow active states
  const isPrimaryActive = simulationRunning && (!activeFault || activeFault.segmentId !== segments[0]?.id);
  const isBackupActive = backupFeeder?.active && backupRelay?.state === 'CLOSED';

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
              Underground Cable Circuit Model & Power Flow
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">11 kV Radial</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Lumped-parameter resistive line model ($R = \rho \cdot L$). Click any segment or relay to inspect.
          </p>
        </div>

        {/* Quick action: Inject Fault button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenInjectModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-900/30 transition border border-rose-500"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inject Fault</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Schematic */}
      <div className="mt-4 w-full overflow-x-auto pb-2">
        <div className="min-w-[850px] flex justify-center">
          <svg viewBox="0 0 920 320" className="w-full h-auto select-none">
            <defs>
              {/* Power flow animation gradients */}
              <linearGradient id="primaryFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="backupFlowGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>

              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. Main Substation Source (Left) */}
            <g transform="translate(30, 80)">
              <rect
                x="0"
                y="0"
                width="80"
                height="80"
                rx="8"
                fill="#0f172a"
                stroke="#0284c7"
                strokeWidth="2"
                className="drop-shadow"
              />
              <circle cx="40" cy="30" r="14" fill="#0369a1" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="40" y="34" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                11kV
              </text>
              <text x="40" y="60" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
                Primary Grid
              </text>
              <text x="40" y="72" textAnchor="middle" fill="#64748b" fontSize="8">
                Substation
              </text>
            </g>

            {/* Wire from Substation to Segment 1 */}
            <line
              x1="110"
              y1="120"
              x2="150"
              y2="120"
              stroke="#0284c7"
              strokeWidth="4"
              strokeDasharray={simulationRunning ? '6,3' : 'none'}
              className={simulationRunning ? 'animate-[dash_1s_linear_infinite]' : ''}
            />

            {/* 2. Cable Segments (S1 to S4) */}
            {segments.map((seg, idx) => {
              const startX = 150 + idx * 160;
              const segWidth = 120;
              const relay = getRelayForSegment(seg.id);
              const styling = getSegmentColor(seg);
              const isFaultOnThis = activeFault && activeFault.segmentId === seg.id;
              const isHovered = hoveredSegment?.id === seg.id;

              return (
                <g
                  key={seg.id}
                  transform={`translate(${startX}, 70)`}
                  className="cursor-pointer transition-transform duration-150"
                  onClick={() => onSelectSegment(seg)}
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  {/* Segment Box Container */}
                  <rect
                    x="0"
                    y="0"
                    width={segWidth}
                    height="100"
                    rx="8"
                    fill={isHovered ? '#1e293b' : '#0f172a'}
                    stroke={styling.stroke}
                    strokeWidth={isHovered || isFaultOnThis ? '2.5' : '1.5'}
                    filter={isFaultOnThis ? 'url(#glowEffect)' : undefined}
                    className="transition-colors"
                  />

                  {/* Header: Segment Name & Status badge */}
                  <text x="12" y="24" fill="#f8fafc" fontSize="12" fontWeight="bold">
                    {seg.name}
                  </text>
                  <text x="12" y="38" fill="#94a3b8" fontSize="9">
                    {seg.lengthKm} km ({seg.totalResistanceOhm.toFixed(2)} Ω)
                  </text>

                  {/* Electrical Readings */}
                  <g transform="translate(12, 54)">
                    <text x="0" y="12" fill="#38bdf8" fontSize="10" fontWeight="600" fontFamily="monospace">
                      V: {seg.lastVoltageV ? `${(seg.lastVoltageV / 1000).toFixed(2)} kV` : '—'}
                    </text>
                    <text x="0" y="26" fill="#34d399" fontSize="10" fontWeight="600" fontFamily="monospace">
                      I: {seg.lastCurrentA ? `${seg.lastCurrentA.toFixed(1)} A` : '—'}
                    </text>
                  </g>

                  {/* Fault Icon if active on this segment */}
                  {isFaultOnThis && (
                    <g transform="translate(85, 12)">
                      <circle cx="12" cy="12" r="14" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                      <circle cx="12" cy="12" r="10" fill="#dc2626" />
                      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                        !
                      </text>
                    </g>
                  )}

                  {/* Isolation Relay between segments */}
                  {relay && (
                    <g
                      transform={`translate(${segWidth + 5}, 38)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRelay(relay.id, relay.state);
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx="15"
                        cy="12"
                        r="14"
                        fill={relay.state === 'CLOSED' ? '#064e3b' : '#7f1d1d'}
                        stroke={relay.state === 'CLOSED' ? '#10b981' : '#ef4444'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="15"
                        y="15"
                        textAnchor="middle"
                        fill={relay.state === 'CLOSED' ? '#34d399' : '#f87171'}
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {relay.name}
                      </text>
                      <text
                        x="15"
                        y="-4"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                      >
                        {relay.state}
                      </text>
                    </g>
                  )}

                  {/* Interconnecting Cable line to next segment */}
                  {idx < segments.length - 1 && (
                    <line
                      x1={segWidth + 35}
                      y1="50"
                      x2={segWidth + 40}
                      y2="50"
                      stroke={styling.stroke}
                      strokeWidth="3"
                    />
                  )}
                </g>
              );
            })}

            {/* 3. Downstream Loads (Right side, fed by S4) */}
            <g transform="translate(800, 75)">
              <rect
                x="0"
                y="0"
                width="95"
                height="90"
                rx="8"
                fill="#0f172a"
                stroke={loads.some((l) => l.supplied) ? '#10b981' : '#ef4444'}
                strokeWidth="2"
              />
              <circle
                cx="47"
                cy="28"
                r="14"
                fill={loads.some((l) => l.supplied) ? '#064e3b' : '#450a0a'}
                stroke={loads.some((l) => l.supplied) ? '#34d399' : '#f87171'}
                strokeWidth="1.5"
              />
              <text
                x="47"
                y="32"
                textAnchor="middle"
                fill={loads.some((l) => l.supplied) ? '#34d399' : '#f87171'}
                fontSize="10"
                fontWeight="bold"
              >
                LOAD
              </text>
              <text x="47" y="58" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="600">
                1.5 MW Total
              </text>
              <text
                x="47"
                y="74"
                textAnchor="middle"
                fill={loads.some((l) => l.supplied) ? '#34d399' : '#f87171'}
                fontSize="9"
                fontWeight="bold"
              >
                {loads.some((l) => l.supplied) ? '● SUPPLIED' : '○ DE-ENERGIZED'}
              </text>
            </g>

            {/* Wire to load */}
            <line
              x1="760"
              y1="120"
              x2="800"
              y2="120"
              stroke={loads.some((l) => l.supplied) ? '#10b981' : '#64748b'}
              strokeWidth="4"
            />

            {/* 4. Alternate Backup Feeder Loop (Bottom) */}
            <g transform="translate(80, 230)">
              {/* Backup Substation / Generator */}
              <rect
                x="0"
                y="0"
                width="120"
                height="65"
                rx="8"
                fill="#0f172a"
                stroke={backupFeeder?.active ? '#10b981' : backupFeeder?.available ? '#0284c7' : '#64748b'}
                strokeWidth="2"
              />
              <text x="60" y="24" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                Backup Feeder
              </text>
              <text x="60" y="38" textAnchor="middle" fill="#94a3b8" fontSize="9">
                11 kV / 200 A Capacity
              </text>
              <text
                x="60"
                y="52"
                textAnchor="middle"
                fill={backupFeeder?.active ? '#34d399' : backupFeeder?.available ? '#38bdf8' : '#94a3b8'}
                fontSize="9"
                fontWeight="bold"
              >
                {backupFeeder?.active ? 'ACTIVE (SUPPLYING)' : backupFeeder?.available ? 'STANDBY' : 'UNAVAILABLE'}
              </text>

              {/* Backup Relay (RB) */}
              {backupRelay && (
                <g
                  transform="translate(150, 18)"
                  onClick={() => onToggleRelay(backupRelay.id, backupRelay.state)}
                  className="cursor-pointer"
                >
                  <circle
                    cx="15"
                    cy="15"
                    r="16"
                    fill={backupRelay.state === 'CLOSED' ? '#064e3b' : '#7f1d1d'}
                    stroke={backupRelay.state === 'CLOSED' ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                  />
                  <text
                    x="15"
                    y="18"
                    textAnchor="middle"
                    fill={backupRelay.state === 'CLOSED' ? '#34d399' : '#f87171'}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    RB
                  </text>
                  <text x="15" y="-3" textAnchor="middle" fill="#94a3b8" fontSize="8">
                    {backupRelay.state}
                  </text>
                </g>
              )}

              {/* Feeder line connects from RB across the bottom to the load station */}
              <path
                d="M 120 32 L 150 32 M 182 32 L 760 32 L 760 -45"
                fill="none"
                stroke={backupFeeder?.active ? '#10b981' : '#334155'}
                strokeWidth="3"
                strokeDasharray={backupFeeder?.active ? '6,3' : '4,4'}
                className={backupFeeder?.active ? 'animate-[dash_1s_linear_infinite]' : ''}
              />
              <text x="440" y="24" textAnchor="middle" fill={backupFeeder?.active ? '#34d399' : '#64748b'} fontSize="9" fontWeight="500">
                Alternate Feeder Rerouting Bus
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Legend & Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-medium">Status Legend:</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300">Healthy</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse" />
            <span className="text-slate-300">Suspected Fault</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-bounce" />
            <span className="text-slate-300">Confirmed Fault</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            <span className="text-slate-300">Isolated</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-400">De-energized</span>
          </span>
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          Total Model Length: 10.0 km | Nominal Voltage: 11.0 kV | Primary Frequency: 50 Hz
        </div>
      </div>
    </div>
  );
};
