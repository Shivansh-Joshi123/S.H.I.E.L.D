import React from 'react';
import type { CableSegment, Relay } from '../types';
import { X, Activity, ShieldCheck, AlertOctagon, Sliders } from 'lucide-react';

interface SegmentDetailModalProps {
  segment: CableSegment | null;
  relay?: Relay;
  onClose: () => void;
  onToggleRelay: (relayId: number, currentState: 'OPEN' | 'CLOSED') => void;
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  segment,
  relay,
  onClose,
  onToggleRelay,
}) => {
  if (!segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{segment.name} Telemetry & Specs</h3>
            <p className="text-xs text-slate-400">{segment.displayLabel}</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Segment Status:</span>
              <span className="font-bold text-white">{segment.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Physical Length:</span>
              <span className="text-cyan-400">{segment.lengthKm} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resistivity:</span>
              <span className="text-white">{segment.resistancePerKm} Ω/km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Resistance:</span>
              <span className="text-white font-bold">{segment.totalResistanceOhm.toFixed(3)} Ω</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Live Sending Voltage:</span>
              <span className="text-cyan-400 font-bold">
                {segment.lastVoltageV ? `${segment.lastVoltageV.toFixed(1)} V (${(segment.lastVoltageV / 1000).toFixed(2)} kV)` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Live Phase Current:</span>
              <span className="text-emerald-400 font-bold">
                {segment.lastCurrentA ? `${segment.lastCurrentA.toFixed(2)} A` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nominal Voltage:</span>
              <span className="text-slate-400">
                {segment.normalVoltageV ? `${segment.normalVoltageV.toFixed(1)} V` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nominal Current:</span>
              <span className="text-slate-400">
                {segment.normalCurrentA ? `${segment.normalCurrentA.toFixed(2)} A` : '—'}
              </span>
            </div>
          </div>

          {relay && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Associated Protection Relay:</span>
                <span className="font-bold text-white text-sm">{relay.name}</span>
                <span className="text-slate-400 text-[10px] block font-sans">
                  Current state: <strong className={relay.state === 'CLOSED' ? 'text-emerald-400' : 'text-rose-400'}>{relay.state}</strong>
                </span>
              </div>
              <button
                onClick={() => onToggleRelay(relay.id, relay.state)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
                  relay.state === 'CLOSED'
                    ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700'
                    : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                }`}
              >
                {relay.state === 'CLOSED' ? 'TRIP RELAY' : 'CLOSE RELAY'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
