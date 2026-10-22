import React from 'react';
import type { FaultEvent } from '../types';
import { Terminal, Download, Clock, ShieldAlert } from 'lucide-react';

interface LiveEventLogProps {
  events: FaultEvent[];
  onExportCsv: () => void;
}

export const LiveEventLog: React.FC<LiveEventLogProps> = ({ events, onExportCsv }) => {
  const getBadgeForType = (type: string) => {
    if (type.includes('FAULT')) {
      return 'bg-rose-950 text-rose-300 border-rose-800';
    }
    if (type.includes('ISOLAT') || type.includes('RELAY')) {
      return 'bg-amber-950 text-amber-300 border-amber-800';
    }
    if (type.includes('BACKUP') || type.includes('RESTORE')) {
      return 'bg-cyan-950 text-cyan-300 border-cyan-800';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Live Audit Event Trail</h3>
          <span className="text-[11px] text-slate-400 font-mono">({events.length} events)</span>
        </div>
        <button
          onClick={onExportCsv}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Clock className="w-8 h-8 mb-2 opacity-40" />
          <span>No audit events recorded yet. Actions will populate here in real-time.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex items-start space-x-3"
            >
              <span className="text-slate-500 text-[10px] whitespace-nowrap pt-0.5">
                {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getBadgeForType(ev.eventType)}`}>
                    {ev.eventType}
                  </span>
                  {ev.segmentName && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold">
                      {ev.segmentName}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-sans">{ev.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
