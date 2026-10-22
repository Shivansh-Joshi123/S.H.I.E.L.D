import React, { useState } from 'react';
import type { FaultRecord, FaultEvent, CableSegment } from '../types';
import { History, Download, Filter, Search, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface HistoricalManagementProps {
  faults: FaultRecord[];
  events: FaultEvent[];
  segments: CableSegment[];
  onClearFault: (id: number) => void;
  onExportCsv: () => void;
}

export const HistoricalManagement: React.FC<HistoricalManagementProps> = ({
  faults,
  events,
  segments,
  onClearFault,
  onExportCsv,
}) => {
  const [selectedTab, setSelectedTab] = useState<'faults' | 'events'>('faults');
  const [filterSegment, setFilterSegment] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<FaultRecord | null>(null);

  const filteredFaults = faults.filter((f) => {
    if (filterSegment !== 'ALL' && f.segmentName !== filterSegment) return false;
    if (filterType !== 'ALL' && f.faultType !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-800/40 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Module H: Historical Fault Management & Audit Trail
            </h2>
            <p className="text-xs text-blue-300/80">
              Persistent H2 Storage, Multi-parameter Filtering, and Post-Mortem Sequence Analysis
            </p>
          </div>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition border border-blue-500"
        >
          <Download className="w-4 h-4" />
          <span>Export All History to CSV</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Navigation & Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTab('faults')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTab === 'faults'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Fault Records ({faults.length})
            </button>
            <button
              onClick={() => setSelectedTab('events')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTab === 'events'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              System Events ({events.length})
            </button>
          </div>

          {/* Filter Dropdowns */}
          {selectedTab === 'faults' && (
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Segment:</span>
              </div>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Segments</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Fault Types</option>
                <option value="GROUND_FAULT">Ground Fault</option>
                <option value="SHORT_CIRCUIT">Short Circuit</option>
                <option value="OPEN_CIRCUIT">Open Circuit</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Fault Records Table */}
        {selectedTab === 'faults' && (
          <div className="overflow-x-auto">
            {filteredFaults.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No fault history recorded matching filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Segment</th>
                    <th className="py-2.5 px-3">Fault Type</th>
                    <th className="py-2.5 px-3">Actual Distance</th>
                    <th className="py-2.5 px-3">Estimated (Df)</th>
                    <th className="py-2.5 px-3">Error (km)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Injected At</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFaults.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="py-2.5 px-3 text-slate-400">#{record.id}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{record.segmentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                          {record.faultType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-amber-300">
                        {record.actualFaultDistanceKm != null ? `${record.actualFaultDistanceKm.toFixed(2)} km` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-purple-300">
                        {record.estimatedFaultDistanceKm != null
                          ? `${record.estimatedFaultDistanceKm.toFixed(2)} km`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {record.localizationErrorKm != null ? `${record.localizationErrorKm.toFixed(2)} km` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.clearedAt
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                          }`}
                        >
                          {record.clearedAt ? 'CLEARED' : record.phase}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(record.injectedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {!record.clearedAt && (
                          <button
                            onClick={() => onClearFault(record.id)}
                            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] transition"
                          >
                            Clear Fault
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: System Events Audit Log */}
        {selectedTab === 'events' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-semibold">
                      {ev.segmentName || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                      {ev.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Fault Post-Mortem Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-white mb-1">
              Fault Event Details: #{selectedRecord.id}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Segment: {selectedRecord.segmentName} | Type: {selectedRecord.faultType}
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Injected At:</span>
                <span className="text-white">{new Date(selectedRecord.injectedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Detected At:</span>
                <span className="text-white">
                  {selectedRecord.detectedAt ? new Date(selectedRecord.detectedAt).toLocaleTimeString() : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Isolated At:</span>
                <span className="text-white">
                  {selectedRecord.isolatedAt ? new Date(selectedRecord.isolatedAt).toLocaleTimeString() : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fault Voltage (Vf):</span>
                <span className="text-cyan-400">
                  {selectedRecord.faultVoltageV ? `${selectedRecord.faultVoltageV.toFixed(1)} V` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Distance:</span>
                <span className="text-amber-400">
                  {selectedRecord.actualFaultDistanceKm ? `${selectedRecord.actualFaultDistanceKm.toFixed(2)} km` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Distance:</span>
                <span className="text-purple-400">
                  {selectedRecord.estimatedFaultDistanceKm ? `${selectedRecord.estimatedFaultDistanceKm.toFixed(2)} km` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Localization Error:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedRecord.localizationErrorKm ? `${selectedRecord.localizationErrorKm.toFixed(2)} km` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alternate Reroute:</span>
                <span className={selectedRecord.rerouteSuccessful ? 'text-cyan-400' : 'text-rose-400'}>
                  {selectedRecord.rerouteSuccessful ? 'SUCCESS' : selectedRecord.rerouteFailureReason || 'FAILED / PENDING'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
