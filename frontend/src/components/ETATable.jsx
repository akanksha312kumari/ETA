import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

export default function ETATable({ downstreamEtas }) {
  if (!downstreamEtas || downstreamEtas.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-zinc-500 italic">
        Awaiting live telemetry stream to populate station-wise ETA table...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-zinc-200">
        <thead className="bg-[#09090b] text-zinc-300 text-xs uppercase font-mono border-b border-neutral-800">
          <tr>
            <th className="px-4 py-3.5 rounded-tl-xl">Station</th>
            <th className="px-4 py-3.5">Scheduled</th>
            <th className="px-4 py-3.5">Mathematical Baseline</th>
            <th className="px-4 py-3.5">ML Residual Correction</th>
            <th className="px-4 py-3.5 text-emerald-400">Final Constrained ETA</th>
            <th className="px-4 py-3.5 text-amber-400 rounded-tr-xl">Total Delay</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 font-mono text-xs">
          {downstreamEtas.map((eta, idx) => {
            const mathTimeStr = formatTime(eta.math_eta || eta.predicted_eta);
            const finalTimeStr = formatTime(eta.final_eta || eta.predicted_eta);
            const schedTimeStr = formatSchedTime(idx);
            const totalDelay = (eta.propagated_delay_minutes || 0) + (eta.xgboost_correction_min || 0);

            return (
              <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3.5 font-bold text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 border border-neutral-700 font-mono text-xs">
                      {eta.to_station_code}
                    </span>
                    <span className="font-sans font-extrabold">{eta.to_station_name}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 text-zinc-400">{schedTimeStr}</td>

                <td className="px-4 py-3.5 text-zinc-300">
                  {mathTimeStr} <span className="text-[10px] text-zinc-500">({eta.section_baseline_minutes}m)</span>
                </td>

                <td className="px-4 py-3.5 text-zinc-200 font-bold">
                  {eta.xgboost_correction_min >= 0 ? `+${eta.xgboost_correction_min}` : eta.xgboost_correction_min} min
                </td>

                <td className="px-4 py-3.5 font-black text-emerald-400 text-sm">
                  {finalTimeStr}
                </td>

                <td className="px-4 py-3.5">
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    +{totalDelay.toFixed(1)} min
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  function formatTime(isoStr) {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  }

  function formatSchedTime(index) {
    const base = new Date();
    base.setMinutes(base.getMinutes() + (index + 1) * 45);
    return base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

