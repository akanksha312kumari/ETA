import React from 'react';
import { ArrowDown, Calculator, Cpu, ShieldCheck, Clock, Zap, AlertCircle } from 'lucide-react';

export default function CalculationFlow({ firstEta }) {
  if (!firstEta) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500 italic">
        Awaiting telemetry stream to render ETA calculation flow...
      </div>
    );
  }

  const dist = firstEta.distance_km || 95.0;
  const speed = firstEta.effective_speed_kmh || 85.0;
  const mathBaseline = firstEta.section_baseline_minutes || firstEta.math_baseline_min || 63.0;
  const dwell = firstEta.dwell_time_min || 2.0;
  const xgbResidual = firstEta.xgboost_correction_min || 0.0;
  const delayProp = firstEta.propagated_delay_minutes || firstEta.propagated_delay_min || 5.0;
  const scipyAdj = firstEta.scipy_constraint_adjustment_min || 0.0;
  const finalMinutes = firstEta.final_travel_minutes || (mathBaseline + xgbResidual + delayProp + scipyAdj);

  return (
    <div className="clay-card-dark p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800 text-zinc-200 border border-neutral-700">
            <Calculator className="w-4 h-4" />
          </div>
          <span>Visual 6-Step ETA Engine Pipeline</span>
        </h3>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
          SciPy Bounded SLSQP Active
        </span>
      </div>

      {/* Vertical 6-Step Flow Cards */}
      <div className="flex flex-col items-center space-y-2.5 font-mono text-xs">
        
        {/* Step 1: Distance / Speed */}
        <div className="w-full bg-[#27272a] border border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-zinc-300" />
            <span className="text-zinc-200 font-sans font-semibold">1. Section Distance / Effective Speed:</span>
          </div>
          <span className="text-zinc-200 font-bold">{dist} km / {speed} km/h</span>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-400 animate-bounce" />

        {/* Step 2: Math Travel Time */}
        <div className="w-full bg-[#27272a] border border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-4 h-4 text-zinc-300" />
            <span className="text-zinc-200 font-sans font-semibold">2. Mathematical Baseline Time:</span>
          </div>
          <span className="text-zinc-200 font-bold">{mathBaseline} min</span>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-500" />

        {/* Step 3: Dwell Time */}
        <div className="w-full bg-[#27272a] border border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-200 font-sans font-semibold">3. Scheduled Dwell Time:</span>
          </div>
          <span className="text-amber-400 font-bold">+{dwell} min</span>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-500" />

        {/* Step 4: XGBoost Residual */}
        <div className="w-full bg-[#27272a] border border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-zinc-300" />
            <span className="text-zinc-200 font-sans font-semibold">4. XGBoost ML Residual Correction:</span>
          </div>
          <span className="text-zinc-200 font-bold">{xgbResidual >= 0 ? `+${xgbResidual}` : xgbResidual} min</span>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-500" />

        {/* Step 5: Delay Propagation */}
        <div className="w-full bg-[#27272a] border border-neutral-700 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-200 font-sans font-semibold">5. Graph Delay Propagation:</span>
          </div>
          <span className="text-amber-400 font-bold">+{delayProp} min</span>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-500" />

        {/* Step 6: SciPy Constraint Adjustment */}
        <div className="w-full bg-[#27272a] border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200 font-sans font-semibold">6. SciPy Physical Constraint Adjustment:</span>
          </div>
          <span className="text-emerald-400 font-bold">{scipyAdj >= 0 ? `+${scipyAdj}` : scipyAdj} min</span>
        </div>

        <ArrowDown className="w-4 h-4 text-emerald-400" />

        {/* FINAL RESULT */}
        <div className="w-full bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-zinc-900 border border-emerald-500/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <span className="text-sm font-extrabold text-white font-sans">FINAL CONSTRAINED HYBRID ETA:</span>
          <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">{roundVal(finalMinutes)} min</span>
        </div>

      </div>
    </div>
  );

  function roundVal(v) {
    return (Math.round(v * 10) / 10).toFixed(1);
  }
}

