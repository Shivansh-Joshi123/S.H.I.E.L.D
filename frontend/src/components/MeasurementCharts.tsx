import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { SensorMeasurement } from '../types';
import { Activity } from 'lucide-react';

interface MeasurementChartsProps {
  measurements: SensorMeasurement[];
}

export const MeasurementCharts: React.FC<MeasurementChartsProps> = ({ measurements }) => {
  const [metric, setMetric] = useState<'voltage' | 'current' | 'power'>('voltage');

  // Group latest measurements by timestamp
  // Format for Recharts: { time: "12:00:01", S1: 10980, S2: 10950, ... }
  const timeMap = new Map<string, any>();

  // Process in chronological order
  const sorted = [...measurements].reverse();

  sorted.forEach((m) => {
    const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour12: false });
    if (!timeMap.has(timeStr)) {
      timeMap.set(timeStr, { time: timeStr });
    }
    const entry = timeMap.get(timeStr);
    if (metric === 'voltage') {
      entry[m.segmentName] = Math.round(m.voltageV);
    } else if (metric === 'current') {
      entry[m.segmentName] = Number(m.currentA.toFixed(1));
    } else {
      entry[m.segmentName] = Math.round(m.powerW / 1000); // kW
    }
  });

  const chartData = Array.from(timeMap.values()).slice(-25);

  const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Real-Time Electrical Sensor Telemetry
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">(Simulated 1Hz Sampling)</span>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMetric('voltage')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              metric === 'voltage' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Voltage (V)
          </button>
          <button
            onClick={() => setMetric('current')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              metric === 'current' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Current (A)
          </button>
          <button
            onClick={() => setMetric('power')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              metric === 'power' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Power (kW)
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Activity className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
          <span>No telemetry captured yet. Start simulation to observe live measurements.</span>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                domain={metric === 'voltage' ? [0, 12000] : ['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              {['S1', 'S2', 'S3', 'S4'].map((seg, idx) => (
                <Line
                  key={seg}
                  type="monotone"
                  dataKey={seg}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
