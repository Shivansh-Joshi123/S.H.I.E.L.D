import React from 'react';
import { Shield, Play, Square, RotateCcw, Bell, Sliders, Activity, BookOpen, History, Cpu } from 'lucide-react';
import type { SimulationStatus } from '../types';

interface NavbarProps {
  status: SimulationStatus | null;
  unreadCount: number;
  activeTab: 'network' | 'localization' | 'relays' | 'history';
  onSelectTab: (tab: 'network' | 'localization' | 'relays' | 'history') => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onOpenNotifications: () => void;
  onOpenConfig: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  unreadCount,
  activeTab,
  onSelectTab,
  onStart,
  onStop,
  onReset,
  onOpenNotifications,
  onOpenConfig,
  loading,
}) => {
  const isRunning = status?.running ?? false;
  const phase = status?.phase ?? 'NORMAL_MONITORING';

  const getPhaseBadge = (p: string) => {
    switch (p) {
      case 'NORMAL_MONITORING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">NORMAL MONITORING</span>;
      case 'FAULT_SUSPECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950 text-amber-400 border border-amber-800 animate-bounce">FAULT SUSPECTED</span>;
      case 'FAULT_CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">FAULT CONFIRMED</span>;
      case 'FAULT_LOCALIZED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-950 text-purple-300 border border-purple-800">FAULT LOCALIZED</span>;
      case 'FAULT_ISOLATED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-900 text-amber-300 border border-amber-700">FAULT ISOLATED</span>;
      case 'REROUTING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950 text-blue-300 border border-blue-800 animate-spin">REROUTING...</span>;
      case 'SUPPLY_RESTORED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">SUPPLY RESTORED (BACKUP)</span>;
      case 'REROUTING_FAILED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-950 text-red-400 border border-red-800">REROUTING FAILED</span>;
      case 'FAULT_CLEARED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">FAULT CLEARED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300">{p}</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-wider text-white">S.H.I.E.L.D.</span>
                <span className="text-xs font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1.5 py-0.5 rounded">v1.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Underground Cable Fault Detection, Localization & Self-Healing
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => onSelectTab('network')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'network'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Network</span>
            </button>
            <button
              onClick={() => onSelectTab('localization')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'localization'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Localization Analysis</span>
            </button>
            <button
              onClick={() => onSelectTab('relays')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'relays'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Relays & Backup</span>
            </button>
            <button
              onClick={() => onSelectTab('history')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit & History</span>
            </button>
          </nav>

          {/* Right Controls: Phase badge + Simulation control + Notifications + Config */}
          <div className="flex items-center space-x-3">
            {/* Live State Badge */}
            <div className="hidden lg:block">{getPhaseBadge(phase)}</div>

            {/* Sim Control Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {!isRunning ? (
                <button
                  onClick={onStart}
                  disabled={loading}
                  title="Start Simulation Engine"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Start</span>
                </button>
              ) : (
                <button
                  onClick={onStop}
                  disabled={loading}
                  title="Stop Simulation Engine"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
              <button
                onClick={onReset}
                disabled={loading}
                title="Reset Network to Normal"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              title="Notifications"
              className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-slate-800"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Config Gear */}
            <button
              onClick={onOpenConfig}
              title="Simulation Settings"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-slate-800"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
