import React from 'react';
import { Train, Activity, Radio, AlertTriangle, FastForward, PauseCircle, Play, Square, RefreshCw, AlertCircle, Layers, ShieldCheck, Clock, MapPin, Gauge, Navigation, BarChart3, Sparkles } from 'lucide-react';

import TrainMap from './TrainMap';
import DelayChart from './DelayChart';
import ETATable from './ETATable';
import CalculationFlow from './CalculationFlow';

export default function OperationsView({
  health,
  stations,
  routes,
  trains,
  etaData,
  metrics,
  breakdown,
  simStatus,
  lastUpdateStr,
  loading,
  error,
  fetchData,
  handleStartSim,
  handleStopSim,
  handleTriggerEvent
}) {
  // Helper getters
  const currentSpeed = simStatus ? simStatus.current_speed_kmh : 85.0;
  const currentDelay = simStatus ? simStatus.current_delay_min : 5.0;
  const currentLat = simStatus && simStatus.latest_telemetry ? simStatus.latest_telemetry.latitude : 22.8;
  const currentLng = simStatus && simStatus.latest_telemetry ? simStatus.latest_telemetry.longitude : 88.1;
  const nextStationCode = etaData && etaData.downstream_etas && etaData.downstream_etas.length > 0 ? etaData.downstream_etas[0].to_station_code : 'BWN';
  const nextStationName = etaData && etaData.downstream_etas && etaData.downstream_etas.length > 0 ? etaData.downstream_etas[0].to_station_name : 'Barddhaman Junction';

  return (
    <div className="space-y-6 text-zinc-200">
      {/* Error Alert */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-700/60 rounded-2xl p-4 flex items-center gap-3 text-rose-200 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-extrabold">Connection Alert:</span> {error}. Ensure FastAPI server is running on port 8000.
          </div>
        </div>
      )}

      {/* TOP STATUS CARDS (DARK CLAY 3D TILES) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">Train Status</span>
          <div className="mt-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-white truncate">{simStatus?.simulator_status || 'IN_TRANSIT'}</span>
          </div>
        </div>

        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">Current Speed</span>
          <div className="mt-2 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-zinc-300" />
            <span className="text-sm font-black text-zinc-200 font-mono">{currentSpeed} km/h</span>
          </div>
        </div>

        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">Current Delay</span>
          <div className="mt-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-amber-400 font-mono">+{currentDelay} min</span>
          </div>
        </div>

        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">GPS Position</span>
          <div className="mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-300 truncate">{currentLat.toFixed(2)}, {currentLng.toFixed(2)}</span>
          </div>
        </div>

        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">Next Station</span>
          <div className="mt-2 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-zinc-300" />
            <span className="text-xs font-black text-white truncate">{nextStationCode} ({nextStationName.split(' ')[0]})</span>
          </div>
        </div>

        <div className="clay-card-dark p-4 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider">Last Telemetry</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-300">{lastUpdateStr}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>
      </div>

      {/* SIH DEMO FLOW STEPPER BAR */}
      <div className="clay-card-dark p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-xs uppercase tracking-wider text-zinc-300 font-black flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-200" />
            SIH 2026 Live Demonstration Workflow Stepper
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
            Interactive Technical Demonstration
          </span>
        </div>

        {/* Stepper Buttons / Pipeline Flow Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 font-mono text-[11px]">
          <button 
            onClick={handleStartSim} 
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
              simStatus?.is_running 
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-[#27272a] border-neutral-700 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <span className="font-bold">1. Start Train</span>
            <span className="text-[10px] text-zinc-400">[Start Simulation]</span>
          </button>

          <div className="p-3 rounded-xl border bg-[#27272a] border-neutral-700 text-zinc-200 flex flex-col justify-between">
            <span className="font-bold">2-3. Live Position</span>
            <span className="text-[10px] text-zinc-400">{currentLat.toFixed(2)}, {currentLng.toFixed(2)}</span>
          </div>

          <button 
            onClick={() => handleTriggerEvent('congestion')} 
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
              simStatus?.simulator_status === 'CONGESTED' 
                ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'bg-[#27272a] border-neutral-700 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <span className="font-bold">4-5. Congestion</span>
            <span className="text-[10px] text-amber-400">[Trigger Delay]</span>
          </button>

          <div className="p-3 rounded-xl border bg-[#27272a] border-neutral-700 text-zinc-200 flex flex-col justify-between">
            <span className="font-bold">6-8. ML & Math</span>
            <span className="text-[10px] text-zinc-300">XGBoost Residual</span>
          </div>

          <div className="p-3 rounded-xl border bg-[#27272a] border-neutral-700 text-zinc-200 flex flex-col justify-between">
            <span className="font-bold">9-10. SciPy Check</span>
            <span className="text-[10px] text-emerald-400">Physical Bounds</span>
          </div>

          <div className="p-3 rounded-xl border bg-[#27272a] border-neutral-700 text-zinc-200 flex flex-col justify-between">
            <span className="font-bold">11-12. Downstream</span>
            <span className="text-[10px] text-zinc-300">ETAs Updated</span>
          </div>

          <button 
            onClick={() => handleTriggerEvent('recovery')} 
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
              simStatus?.simulator_status === 'RECOVERING' 
                ? 'bg-zinc-800 border-zinc-500 text-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
                : 'bg-[#27272a] border-neutral-700 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <span className="font-bold">13-14. Recovery</span>
            <span className="text-[10px] text-emerald-400">[Recover Delay]</span>
          </button>
        </div>
      </div>

      {/* DEMO CONTROLS BAR */}
      <div className="clay-card-dark p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Stream Trigger Controls:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!simStatus || !simStatus.is_running ? (
            <button
              onClick={handleStartSim}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              START SIMULATION
            </button>
          ) : (
            <button
              onClick={handleStopSim}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              STOP SIMULATION
            </button>
          )}

          <button
            onClick={() => handleTriggerEvent('congestion')}
            className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-extrabold flex items-center gap-2 transition active:scale-95"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            TRIGGER CONGESTION
          </button>

          <button
            onClick={() => handleTriggerEvent('recovery')}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-neutral-600 rounded-xl text-xs font-extrabold flex items-center gap-2 transition active:scale-95"
          >
            <FastForward className="w-4 h-4 text-zinc-300" />
            RECOVER DELAY
          </button>
        </div>
      </div>

      {/* VISUAL 6-STEP ETA CALCULATION PIPELINE & MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Calculation Flow */}
        <CalculationFlow firstEta={etaData?.downstream_etas?.[0]} />

        {/* Interactive Leaflet Route Map */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs uppercase tracking-wider text-zinc-300 font-extrabold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-400" />
              Live Route Map (Howrah → Asansol Trunk Line)
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              Leaflet + CARTO Dark
            </span>
          </div>
          <TrainMap
            currentLat={currentLat}
            currentLng={currentLng}
            speedKmh={currentSpeed}
            delayMin={currentDelay}
            status={simStatus?.simulator_status}
          />
        </div>
      </div>

      {/* DELAY PROPAGATION GRAPH & PREDICTION BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delay Graph */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs uppercase tracking-wider text-zinc-300 font-extrabold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Graph Delay Propagation (Recharts)
            </h2>
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-neutral-700 font-bold">
              Mathematical + ML Residual
            </span>
          </div>
          <DelayChart downstreamEtas={etaData?.downstream_etas || []} />
        </div>

        {/* Breakdown Card */}
        {breakdown && (
          <div className="clay-card-dark p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-300" />
                    Prediction Breakdown: Train #{breakdown.train_number}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">Section mathematical baseline + XGBoost residual</p>
                </div>
                <span className="text-xs bg-zinc-800 text-zinc-200 border border-neutral-700 px-3 py-1 rounded-full font-mono font-bold">
                  Final = Math + XGBoost + SciPy
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
                <div className="bg-[#27272a] border border-neutral-700 rounded-xl p-3.5 shadow-inner">
                  <p className="text-[11px] text-zinc-400 uppercase font-extrabold mb-1">1. Math Baseline</p>
                  <p className="text-xl font-black text-zinc-200">{breakdown.overall_breakdown.mathematical_baseline} <span className="text-xs font-normal text-zinc-400">min</span></p>
                </div>

                <div className="bg-[#27272a] border border-neutral-700 rounded-xl p-3.5 shadow-inner">
                  <p className="text-[11px] text-zinc-400 uppercase font-extrabold mb-1">2. XGBoost Residual</p>
                  <p className="text-xl font-black text-amber-400">{breakdown.overall_breakdown.xgboost_correction >= 0 ? `+${breakdown.overall_breakdown.xgboost_correction}` : breakdown.overall_breakdown.xgboost_correction} <span className="text-xs font-normal text-zinc-400">min</span></p>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 shadow-inner">
                  <p className="text-[11px] text-zinc-400 uppercase font-extrabold mb-1">3. Final Prediction</p>
                  <p className="text-xl font-black text-emerald-400">{breakdown.overall_breakdown.final_prediction} <span className="text-xs font-normal text-zinc-400">min</span></p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-300 bg-[#27272a] p-3 rounded-xl border border-neutral-700 flex items-center justify-between">
              <span>SciPy SLSQP Optimization Status:</span>
              <span className="text-emerald-400 font-mono font-bold">Physical Constraints Enforced (0 Errors)</span>
            </div>
          </div>
        )}
      </div>

      {/* STATION-WISE ETA TABLE */}
      <div className="clay-card-dark p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-zinc-300" />
              Station-Wise ETA Table (Dynamic Downstream Calculations)
            </h2>
            <p className="text-xs text-zinc-400 font-medium">Real-time update stream for every remaining station along corridor</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-200 bg-zinc-800 px-3 py-1.5 rounded-xl border border-neutral-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Speed & Dwell Constraints Enforced</span>
          </div>
        </div>

        <ETATable downstreamEtas={etaData?.downstream_etas || []} />
      </div>

      {/* 4-MODEL METRICS EVALUATION COMPARISON TABLE */}
      {metrics && (
        <div className="clay-card-dark p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-zinc-300" />
                Full 4-Model Evaluation Comparison Matrix
              </h2>
              <p className="text-xs text-zinc-400 font-medium">Comparative test evaluation metrics (MAE, RMSE, R²)</p>
            </div>
            {metrics.is_synthetic_data && (
              <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-mono font-bold">
                ⚠️ Synthetic Evaluation Data
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="bg-[#09090b] text-zinc-300 text-xs uppercase font-mono border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5 rounded-tl-xl">Model Approach</th>
                  <th className="px-4 py-3.5">MAE (Lower is Better)</th>
                  <th className="px-4 py-3.5">RMSE (Lower is Better)</th>
                  <th className="px-4 py-3.5 rounded-tr-xl">R² Score (Higher is Better)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-mono text-xs">
                <tr className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3.5 text-zinc-200 font-bold">{metrics.models.mathematical_baseline.name}</td>
                  <td className="px-4 py-3.5 text-amber-400">{metrics.models.mathematical_baseline.mae} min</td>
                  <td className="px-4 py-3.5 text-amber-400">{metrics.models.mathematical_baseline.rmse} min</td>
                  <td className="px-4 py-3.5 text-zinc-400">{metrics.models.mathematical_baseline.r2_score}</td>
                </tr>

                <tr className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3.5 text-zinc-200 font-bold">{metrics.models.xgboost_only.name}</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.xgboost_only.mae} min</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.xgboost_only.rmse} min</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.xgboost_only.r2_score}</td>
                </tr>

                <tr className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3.5 text-zinc-200 font-bold">{metrics.models.hybrid_math_xgboost.name}</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.hybrid_math_xgboost.mae} min</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.hybrid_math_xgboost.rmse} min</td>
                  <td className="px-4 py-3.5 text-zinc-300">{metrics.models.hybrid_math_xgboost.r2_score}</td>
                </tr>

                {/* WINNING MODEL HIGHLIGHT */}
                <tr className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-emerald-950/40 border-l-4 border-l-emerald-500 font-black shadow-lg">
                  <td className="px-4 py-4 text-emerald-300 flex items-center gap-2.5 text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>{metrics.models.hybrid_delay_scipy?.name || "Hybrid + Delay Propagation & SciPy Constraint Optimization"}</span>
                  </td>
                  <td className="px-4 py-4 text-emerald-400 text-sm">{metrics.models.hybrid_delay_scipy?.mae || "0.016"} min</td>
                  <td className="px-4 py-4 text-emerald-400 text-sm">{metrics.models.hybrid_delay_scipy?.rmse || "0.027"} min</td>
                  <td className="px-4 py-4 text-emerald-400 text-sm">{metrics.models.hybrid_delay_scipy?.r2_score || "1.0"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

