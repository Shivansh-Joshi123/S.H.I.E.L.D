import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { LocalizationResult, CableSegment } from '../types';
import { BookOpen, Calculator, AlertTriangle, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';

interface LocalizationAnalysisProps {
  segments: CableSegment[];
  referenceVoltageV: number;
  totalLengthKm: number;
  lastFaultVoltageV?: number | null;
  lastActualDistanceKm?: number | null;
}

export const LocalizationAnalysis: React.FC<LocalizationAnalysisProps> = ({
  segments,
  referenceVoltageV: defaultVT,
  totalLengthKm: defaultLT,
  lastFaultVoltageV,
  lastActualDistanceKm,
}) => {
  const [vf, setVf] = useState<number>(lastFaultVoltageV ?? 5500);
  const [vt, setVt] = useState<number>(defaultVT || 11000);
  const [lt, setLt] = useState<number>(defaultLT || 10.0);
  const [actualDist, setActualDist] = useState<number>(lastActualDistanceKm ?? 5.0);
  const [result, setResult] = useState<LocalizationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync if new fault measurements come in from live simulation
  useEffect(() => {
    if (lastFaultVoltageV != null) setVf(lastFaultVoltageV);
    if (lastActualDistanceKm != null) setActualDist(lastActualDistanceKm);
  }, [lastFaultVoltageV, lastActualDistanceKm]);

  const runCalculation = async () => {
    setLoading(true);
    try {
      const res = await api.calculateReportBasedLocalization(vf, vt, lt, actualDist);
      setResult(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [vf, vt, lt, actualDist]);

  // Determine estimated segment
  const getEstimatedSegment = (dist: number | null): string => {
    if (dist == null || dist < 0) return '—';
    let cumulative = 0;
    for (const seg of segments) {
      cumulative += seg.lengthKm;
      if (dist <= cumulative) {
        return `${seg.name} (${seg.displayLabel})`;
      }
    }
    return 'Beyond cable boundary';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Module C: Report-Based Voltage Ratio Localization Method
            </h2>
            <p className="text-xs text-purple-300/80">
              Comparative Analysis, Mathematical Derivation, and Empirical Verification Lab
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Calculator (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Calculation Parameters</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono">
              Live Evaluation
            </span>
          </div>

          {/* Theoretical Formula Display */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center">
            <div className="text-xs text-slate-400 mb-1">Proposed Academic Formula</div>
            <div className="text-lg font-bold text-purple-300 tracking-wider">
              D<sub>f</sub> = ( V<sub>f</sub> / V<sub>T</sub> ) × L<sub>T</sub>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Linear potential divider relationship along uniform resistive line
            </div>
          </div>

          {/* Parameter Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Measured Fault Voltage (V<sub>f</sub>) [Volts]
              </label>
              <input
                type="number"
                step="10"
                value={vf}
                onChange={(e) => setVf(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Reference Voltage (V<sub>T</sub>) [Volts]
              </label>
              <input
                type="number"
                step="100"
                value={vt}
                onChange={(e) => setVt(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Cable Network Length (L<sub>T</sub>) [Kilometres]
              </label>
              <input
                type="number"
                step="0.5"
                value={lt}
                onChange={(e) => setLt(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Actual Ground-Truth Distance [km] (For Error Verification)
              </label>
              <input
                type="number"
                step="0.1"
                value={actualDist}
                onChange={(e) => setActualDist(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Test Scenarios:</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setVf(2750);
                  setVt(11000);
                  setLt(10);
                  setActualDist(2.5);
                }}
                className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono"
              >
                25% (2.5 km)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVf(5500);
                  setVt(11000);
                  setLt(10);
                  setActualDist(5.0);
                }}
                className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono"
              >
                50% (5.0 km)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVf(8250);
                  setVt(11000);
                  setLt(10);
                  setActualDist(7.5);
                }}
                className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono"
              >
                75% (7.5 km)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Results & Engineering Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <span>Localization Results & Error Metrics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {/* Estimated Distance */}
              <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/50">
                <div className="text-xs text-purple-300 font-medium">Estimated Distance (D<sub>f</sub>)</div>
                <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                  {result?.valid && result.estimatedDistanceKm != null
                    ? `${result.estimatedDistanceKm.toFixed(2)} km`
                    : 'INVALID'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Report Method
                </div>
              </div>

              {/* Ground Truth Distance */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Actual Injected Distance</div>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                  {actualDist.toFixed(2)} km
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Ground Truth Reference</div>
              </div>

              {/* Absolute Localization Error */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Absolute Error (|ΔD|)</div>
                <div
                  className={`text-2xl font-bold font-mono mt-1 ${
                    result?.errorKm != null && result.errorKm < 0.5
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {result?.errorKm != null ? `${result.errorKm.toFixed(2)} km` : '—'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {result?.errorKm != null && lt > 0
                    ? `(${((result.errorKm / lt) * 100).toFixed(1)}% of total line)`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Estimated Segment Identified */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Identified Fault Segment:</span>
                <span className="text-sm font-bold text-white">
                  {getEstimatedSegment(result?.estimatedDistanceKm ?? null)}
                </span>
              </div>
              <div className="px-3 py-1 rounded bg-slate-800 text-xs font-mono text-cyan-300">
                Target Relay Isolation: Ready
              </div>
            </div>

            {/* Warnings if formula exceeds boundaries */}
            {result?.warning && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{result.warning}</span>
              </div>
            )}
          </div>

          {/* Academic Critique & Physical Limitations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Engineering Assumptions & Real-World Limitations</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              The project report proposes the voltage ratio relationship $D_f = (V_f / V_T) \times L_T$. In real power distribution engineering, the following physical caveats apply:
            </p>

            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-slate-200">Fault Arc Resistance ($R_f$):</strong> The simplified voltage ratio formula assumes a bolting dead-short where fault impedance is zero. High-resistance arcing creates an additional voltage drop that shifts the apparent fault distance.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-slate-200">Line Reactance & Mutual Coupling ($X_L, B_C$):</strong> Real underground cables exhibit significant distributed capacitance and sheath inductive reactance. AC impedance ($Z = R + jX$) must be used for higher frequency or long runs.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-bold shrink-0">•</span>
                <span>
                  <strong className="text-slate-200">Downstream Load Backfeed:</strong> If alternate feeders or distributed generation sources backfeed the faulted segment, two-terminal synchronized voltage-current algorithms (e.g. Takagi method or impedance distance relays) are required in commercial substations.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
