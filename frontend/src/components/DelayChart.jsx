import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DelayChart({ downstreamEtas }) {
  if (!downstreamEtas || downstreamEtas.length === 0) {
    return (
      <div className="w-full h-80 clay-card-dark flex items-center justify-center text-xs text-zinc-400 italic">
        Awaiting telemetry stream to render delay propagation graph...
      </div>
    );
  }

  // Format data for Recharts
  const chartData = downstreamEtas.map((eta) => ({
    station: eta.to_station_code,
    name: eta.to_station_name,
    mathDelay: eta.propagated_delay_minutes || 0,
    mlCorrection: eta.xgboost_correction_min || 0,
    finalDelay: roundVal((eta.propagated_delay_minutes || 0) + (eta.xgboost_correction_min || 0)),
  }));

  function roundVal(v) {
    return Math.max(0, Math.round(v * 10) / 10);
  }

  return (
    <div className="w-full h-80 clay-card-dark p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wider text-zinc-300 font-extrabold">
          Section Delay Propagation Graph
        </h3>
        <span className="text-[11px] font-mono text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-neutral-700 font-bold">
          Dynamic Graph Propagation
        </span>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorFinal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.5} />
            <XAxis dataKey="station" stroke="#a1a1aa" tick={{ fontSize: 11, fontWeight: 'bold' }} />
            <YAxis stroke="#a1a1aa" tick={{ fontSize: 11, fontWeight: 'bold' }} unit="m" />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#ffffff' }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px', color: '#d4d4d8' }} />
            <Area type="monotone" dataKey="mathDelay" name="Propagated Delay (min)" stroke="#a1a1aa" strokeWidth={2} fillOpacity={1} fill="url(#colorMath)" />
            <Area type="monotone" dataKey="finalDelay" name="ML Corrected Delay (min)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFinal)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

