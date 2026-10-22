import React, { useState } from 'react';
import type { CableSegment, FaultType } from '../types';
import { X, AlertTriangle, Zap, CheckCircle2, Sliders } from 'lucide-react';

interface FaultInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: CableSegment[];
  onInject: (segmentId: number, faultType: FaultType, distanceKm?: number) => Promise<void>;
  simulationRunning: boolean;
}

export const FaultInjectionModal: React.FC<FaultInjectionModalProps> = ({
  isOpen,
  onClose,
  segments,
  onInject,
  simulationRunning,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<number>(segments[0]?.id ?? 1);
  const [faultType, setFaultType] = useState<FaultType>('GROUND_FAULT');
  const [useCustomDistance, setUseCustomDistance] = useState<boolean>(false);
  const [customDistance, setCustomDistance] = useState<number>(3.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) || segments[0];

  // Calculate start and end distance of the chosen segment
  let segStart = 0;
  for (const s of segments) {
    if (s.id === selectedSegmentId) break;
    segStart += s.lengthKm;
  }
  const segEnd = segStart + (selectedSegment?.lengthKm ?? 2.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationRunning) {
      setError('Please start the simulation first before injecting faults.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dist = useCustomDistance ? customDistance : undefined;
      await onInject(selectedSegmentId, faultType, dist);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to inject fault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Inject Electrical Cable Fault</h3>
            <p className="text-xs text-slate-400">
              Module B: Simplified Physical Circuit Model & Disturbance Injection
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Target Segment Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Cable Segment</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {segments.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setSelectedSegmentId(s.id);
                    // auto center distance slider
                    let start = 0;
                    for (const seg of segments) {
                      if (seg.id === s.id) break;
                      start += seg.lengthKm;
                    }
                    setCustomDistance(start + s.lengthKm / 2);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedSegmentId === s.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{s.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.lengthKm} km</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Fault Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fault Category</label>
            <div className="space-y-2">
              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  faultType === 'GROUND_FAULT'
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="faultType"
                  value="GROUND_FAULT"
                  checked={faultType === 'GROUND_FAULT'}
                  onChange={() => setFaultType('GROUND_FAULT')}
                  className="mt-1 mr-3 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-amber-300">Ground Fault (Conductor to Earth)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Insulation degradation creating a parallel leakage path ($R_{`{ground}`} = 10~\Omega$). Partial voltage drop; fault current to earth.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  faultType === 'SHORT_CIRCUIT'
                    ? 'bg-rose-500/10 border-rose-500/40 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="faultType"
                  value="SHORT_CIRCUIT"
                  checked={faultType === 'SHORT_CIRCUIT'}
                  onChange={() => setFaultType('SHORT_CIRCUIT')}
                  className="mt-1 mr-3 text-rose-500 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-rose-300">Short-Circuit Fault (Phase-to-Phase / Arc)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Near-zero resistance bridge ($R_{`{arc}`} = 0.01~\Omega$). Heavy overcurrent, downstream voltage collapse.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                  faultType === 'OPEN_CIRCUIT'
                    ? 'bg-purple-500/10 border-purple-500/40 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="faultType"
                  value="OPEN_CIRCUIT"
                  checked={faultType === 'OPEN_CIRCUIT'}
                  onChange={() => setFaultType('OPEN_CIRCUIT')}
                  className="mt-1 mr-3 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-bold text-purple-300">Open-Circuit Fault (Physical Cable Sever)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Conductor break ($R_{`{seg}`} \to \infty$). Line current drops to zero; total downstream disconnection.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Injected Distance Options */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Fault Location from Source</label>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>Custom:</span>
                <input
                  type="checkbox"
                  checked={useCustomDistance}
                  onChange={(e) => setUseCustomDistance(e.target.checked)}
                  className="rounded text-cyan-500"
                />
              </div>
            </div>

            {useCustomDistance ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-cyan-400">
                  <span>{segStart.toFixed(1)} km</span>
                  <span className="font-bold underline">{customDistance.toFixed(2)} km</span>
                  <span>{segEnd.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min={segStart}
                  max={segEnd}
                  step="0.05"
                  value={customDistance}
                  onChange={(e) => setCustomDistance(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Default midpoint will be used: <span className="text-cyan-400 font-mono font-semibold">{((segStart + segEnd) / 2).toFixed(2)} km</span> from source.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 transition disabled:opacity-50"
            >
              {loading ? 'Injecting...' : 'Trigger Fault Sequence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
