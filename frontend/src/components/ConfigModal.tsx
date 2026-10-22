import React, { useState } from 'react';
import { X, Sliders, Save, Check } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: any) => Promise<void>;
  currentLT: number;
  currentVT: number;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
  currentLT,
  currentVT,
}) => {
  const [totalLengthKm, setTotalLengthKm] = useState<number>(currentLT || 10.0);
  const [referenceVoltageV, setReferenceVoltageV] = useState<number>(currentVT || 11000.0);
  const [voltageDropThresholdPercent, setVoltageDropThresholdPercent] = useState<number>(20.0);
  const [overcurrentMultiplier, setOvercurrentMultiplier] = useState<number>(1.5);
  const [faultConfirmationSamples, setFaultConfirmationSamples] = useState<number>(3);
  const [sensorNoisePercent, setSensorNoisePercent] = useState<number>(1.0);
  const [autoIsolation, setAutoIsolation] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig({
        totalCableLengthKm: totalLengthKm,
        referenceVoltageV,
        voltageDropThresholdPercent,
        overcurrentThresholdMultiplier: overcurrentMultiplier,
        faultConfirmationSamples,
        sensorNoisePercent,
        autoIsolation,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Simulation Engineering Parameters</h3>
            <p className="text-xs text-slate-400">Adjust thresholds, circuit model dimensions, and trip logic</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Cable Length (km)
              </label>
              <input
                type="number"
                step="0.5"
                value={totalLengthKm}
                onChange={(e) => setTotalLengthKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reference Voltage (V)
              </label>
              <input
                type="number"
                step="100"
                value={referenceVoltageV}
                onChange={(e) => setReferenceVoltageV(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Voltage Drop Threshold (%)
              </label>
              <input
                type="number"
                step="1"
                value={voltageDropThresholdPercent}
                onChange={(e) => setVoltageDropThresholdPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Overcurrent Multiplier (×In)
              </label>
              <input
                type="number"
                step="0.1"
                value={overcurrentMultiplier}
                onChange={(e) => setOvercurrentMultiplier(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmation Samples
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={faultConfirmationSamples}
                onChange={(e) => setFaultConfirmationSamples(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sensor Noise (Gaussian %)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={sensorNoisePercent}
                onChange={(e) => setSensorNoisePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Automatic Fault Isolation Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Automatic Fault Isolation</span>
              <span className="text-[11px] text-slate-400">
                Immediately trigger relay trip upon fault confirmation
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoIsolation(!autoIsolation)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                autoIsolation
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {autoIsolation ? 'ENABLED' : 'MANUAL ONLY'}
            </button>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-900/30 transition disabled:opacity-50"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved!' : saving ? 'Saving...' : 'Apply Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
