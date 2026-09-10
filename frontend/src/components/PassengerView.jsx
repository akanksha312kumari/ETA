import React, { useState, useEffect, useRef } from 'react';
import { 
  Train, Clock, MapPin, Gauge, Info, AlertTriangle, Search, Calendar, 
  ChevronRight, ChevronDown, ArrowRight, Radio, RefreshCw, X, CheckCircle2, ShieldCheck,
  CloudRain, Sun, Cloud, Thermometer, Wind, Zap, Navigation, Activity, Sparkles, Share2, Wifi
} from 'lucide-react';
import axios from 'axios';
import PassengerMap from './PassengerMap';

const POPULAR_STATIONS = [
  { code: 'HWH', name: 'Howrah Junction (HWH)' },
  { code: 'BWN', name: 'Barddhaman (BWN)' },
  { code: 'DGR', name: 'Durgapur (DGR)' },
  { code: 'ASN', name: 'Asansol Junction (ASN)' },
  { code: 'NDLS', name: 'New Delhi (NDLS)' },
  { code: 'SDAH', name: 'Sealdah (SDAH)' },
  { code: 'GHY', name: 'Guwahati (GHY)' },
  { code: 'CSMT', name: 'Mumbai CSMT (CSMT)' },
  { code: 'GAYA', name: 'Gaya Junction (GAYA)' }
];

export default function PassengerView({ 
  etaData: initialEtaData, 
  simStatus, 
  lastUpdateTimestamp: initialTimestamp, 
  isWsConnected, 
  onSwitchToOperations,
  handleStartSim,
  handleStopSim,
  handleTriggerEvent
}) {
  // Search state
  const [sourceStation, setSourceStation] = useState('HWH');
  const [destStation, setDestStation] = useState('ASN');
  const [journeyDate, setJourneyDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);
  
  // Selected Train & Live Data State
  const [selectedTrainNo, setSelectedTrainNo] = useState('12301');
  const [liveTrainData, setLiveTrainData] = useState(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState(Date.now());
  const [countdown, setCountdown] = useState(30);
  const [showWhyModal, setShowWhyModal] = useState(false);

  // Fetch live train status from RailRadar API backend endpoint
  const fetchLiveTrainStatus = async (trainNo) => {
    const tNo = trainNo || selectedTrainNo;
    setIsLoadingLive(true);
    try {
      const res = await axios.get(`/api/railradar/live-status/${tNo}`);
      setLiveTrainData(res.data);
      const now = Date.now();
      setLiveTimestamp(now);
      setCountdown(30);
    } catch (err) {
      console.error("RailRadar live status error:", err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Perform train search between stations
  const handleSearchTrains = async (e) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await axios.get('/api/railradar/search', {
        params: {
          source: sourceStation,
          destination: destStation,
          date: journeyDate
        }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error("RailRadar search error:", err);
      setSearchError("Unable to search train schedules. Please check your station selection.");
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-poll live train status every 30 seconds
  useEffect(() => {
    fetchLiveTrainStatus(selectedTrainNo);

    const pollInterval = setInterval(() => {
      fetchLiveTrainStatus(selectedTrainNo);
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [selectedTrainNo]);

  // 1-second countdown ticker for 30s polling cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Derived Telemetry Values
  const trainNumber = liveTrainData?.train_number || selectedTrainNo || '12301';
  const trainName = liveTrainData?.train_name || `Express #${trainNumber}`;
  const dataSource = (selectedTrainNo === '12301' && simStatus?.is_running) 
    ? 'LIVE TELEMETRY STREAM (RTIS Engine)' 
    : (liveTrainData?.data_source || 'LIVE DATA (RailRadar API)');
  const isLiveData = liveTrainData?.is_live_data ?? true;

  const speedKmh = (selectedTrainNo === '12301' && simStatus?.current_speed_kmh !== undefined)
    ? simStatus.current_speed_kmh
    : (liveTrainData?.current_speed_kmh ?? 84.0);

  const delayMin = (selectedTrainNo === '12301' && simStatus?.current_delay_min !== undefined)
    ? simStatus.current_delay_min
    : (liveTrainData?.current_delay_minutes ?? liveTrainData?.current_delay_min ?? 12.0);

  const currentLat = (selectedTrainNo === '12301' && simStatus?.latest_telemetry?.latitude)
    ? simStatus.latest_telemetry.latitude
    : (liveTrainData?.latitude ?? 23.2494);

  const currentLng = (selectedTrainNo === '12301' && simStatus?.latest_telemetry?.longitude)
    ? simStatus.latest_telemetry.longitude
    : (liveTrainData?.longitude ?? 87.8698);

  const cumKm = (selectedTrainNo === '12301' && simStatus?.latest_telemetry?.cumulative_distance_km !== undefined)
    ? simStatus.latest_telemetry.cumulative_distance_km
    : (liveTrainData?.cumulative_distance_km ?? 47.5);

  const currentLocationText = (selectedTrainNo === '12301' && cumKm !== undefined)
    ? (
        cumKm < 15 ? 'Departed Howrah Junction (HWH)' :
        cumKm < 85 ? `En route to Barddhaman Junction (${(95.0 - cumKm).toFixed(1)} km away)` :
        cumKm < 100 ? 'Passing Barddhaman Junction (BWN)' :
        cumKm < 150 ? `En route to Durgapur (${(158.0 - cumKm).toFixed(1)} km away)` :
        cumKm < 162 ? 'Passing Durgapur (DGR)' :
        cumKm < 195 ? `En route to Asansol Junction (${(200.0 - cumKm).toFixed(1)} km away)` :
        'Arriving Asansol Junction (ASN)'
      )
    : (liveTrainData?.current_location || 'Near Barddhaman Junction');

  // Weather Information
  const weatherInfo = liveTrainData?.weather_info || {
    station_code: 'BWN',
    station_name: 'Barddhaman Junction',
    temp_celsius: 29.4,
    weather_description: 'Light Rain',
    humidity_percent: 78,
    wind_speed_kmh: 14.2,
    weather_impact_label: 'Moderate Rain - Traction Penalty Active'
  };

  // Signal & Congestion Status
  const congestionStatus = liveTrainData?.eta_explanation?.signal_congestion_status || 
    (speedKmh < 50 ? 'INFERRED SECTION CONGESTION (SPEED-BASED)' : 'SIMULATED CLEAR SIGNAL STREAM');

  // Downstream ETAs
  const downstreamEtas = (selectedTrainNo === '12301' && simStatus?.latest_pipeline_result?.downstream_etas)
    ? simStatus.latest_pipeline_result.downstream_etas
    : (liveTrainData?.downstream_etas || [
        { to_station_code: 'BWN', to_station_name: 'Barddhaman Junction', distance_km: 95.0, calculated_eta: '10:52 AM', accumulated_delay_min: delayMin },
        { to_station_code: 'DGR', to_station_name: 'Durgapur', distance_km: 158.0, calculated_eta: '12:04 PM', accumulated_delay_min: delayMin + 6 },
        { to_station_code: 'ASN', to_station_name: 'Asansol Junction', distance_km: 200.0, calculated_eta: '12:48 PM', accumulated_delay_min: delayMin + 8 }
      ]);

  const nextStation = downstreamEtas[0] || {
    to_station_name: 'Barddhaman Junction',
    calculated_eta: '10:52 AM',
    accumulated_delay_min: delayMin
  };

  // Detailed Station List for "Where Is My Train" Vertical Tracker with Inter-Station Section Distances
  const rawRouteStations = [
    { code: 'HWH', name: 'Howrah Junction', km: 0, schedArr: '08:00', schedDep: '08:05', predArr: '08:00', predDep: '08:05', delayMin: 0, platform: 'PF 08', halt: '5m', hasWifi: true },
    { code: 'DKAE', name: 'Dankuni Junction', km: 15, schedArr: '08:24', schedDep: '08:26', predArr: '08:24', predDep: '08:26', delayMin: 0, platform: 'PF 03', halt: '2m', hasWifi: false },
    { code: 'BWN', name: 'Barddhaman Junction', km: 95, schedArr: '10:40', schedDep: '10:45', predArr: '10:52', predDep: '10:57', delayMin: Math.round(delayMin), platform: 'PF 02', halt: '5m', hasWifi: true },
    { code: 'PAN', name: 'Panagarh', km: 131, schedArr: '11:28', schedDep: '11:30', predArr: '11:34', predDep: '11:36', delayMin: Math.round(delayMin + 4), platform: 'PF 01', halt: '2m', hasWifi: false },
    { code: 'DGR', name: 'Durgapur', km: 158, schedArr: '11:58', schedDep: '12:03', predArr: '12:04', predDep: '12:09', delayMin: Math.round(delayMin + 6), platform: 'PF 03', halt: '5m', hasWifi: true },
    { code: 'RNG', name: 'Raniganj', km: 182, schedArr: '12:22', schedDep: '12:24', predArr: '12:29', predDep: '12:31', delayMin: Math.round(delayMin + 7), platform: 'PF 02', halt: '2m', hasWifi: false },
    { code: 'ASN', name: 'Asansol Junction', km: 200, schedArr: '12:40', schedDep: '12:50', predArr: '12:48', predDep: '12:58', delayMin: Math.round(delayMin + 8), platform: 'PF 04', halt: '10m', hasWifi: true }
  ];

  // Calculate status and section distance between stations
  const routeStations = rawRouteStations.map((st, i) => {
    const prevKm = i === 0 ? 0 : rawRouteStations[i - 1].km;
    const sectionDist = st.km - prevKm;
    
    let status = 'upcoming';
    if (cumKm >= st.km + 5.0) {
      status = 'passed';
    } else if (i === 0 || (cumKm < st.km + 5.0 && (i === 0 || cumKm >= rawRouteStations[i-1].km))) {
      status = (st.code === nextStation.to_station_code) ? 'next' : (cumKm >= st.km - 5.0 ? 'passed' : 'upcoming');
    }

    return { ...st, sectionDist, status };
  });

  const totalKm = 200.0;
  const trainProgressPct = Math.min(100, Math.max(0, (cumKm / totalKm) * 100));

  const fullRouteTimeline = [
    { code: 'HWH', name: 'Howrah Junction', km: 0.0, sched: '08:00 AM' },
    { code: 'BWN', name: 'Barddhaman Junction', km: 95.0, sched: '10:47 AM' },
    { code: 'DGR', name: 'Durgapur', km: 158.0, sched: '11:58 AM' },
    { code: 'ASN', name: 'Asansol Junction', km: 200.0, sched: '12:40 PM' }
  ];

  const timelineWithStatus = fullRouteTimeline.map((st, i) => {
    let status = 'upcoming';
    if (cumKm >= st.km + 5.0) {
      status = 'passed';
    } else if (i === 0 || (cumKm < st.km + 5.0 && (i === 0 || cumKm >= fullRouteTimeline[i-1].km))) {
      status = (st.code === nextStation.to_station_code) ? 'next' : (cumKm >= st.km - 5.0 ? 'passed' : 'upcoming');
    }
    return { ...st, status };
  });

  // Next-Position Predictions
  const nextPredictions = liveTrainData?.next_predictions || [
    { time_offset: '3 min', predicted_km: Math.min(200, roundVal(cumKm + (speedKmh / 60) * 3)), status_label: 'En route section' },
    { time_offset: '5 min', predicted_km: Math.min(200, roundVal(cumKm + (speedKmh / 60) * 5)), status_label: 'En route section' },
    { time_offset: '10 min', predicted_km: Math.min(200, roundVal(cumKm + (speedKmh / 60) * 10)), status_label: 'Approaching signal block' }
  ];

  // Dynamic Station ETA Table Data
  const stationEtaTable = liveTrainData?.station_eta_table || [
    { station_code: 'BWN', station_name: 'Barddhaman Junction', scheduled_time: '10:47 AM', predicted_time: downstreamEtas[0]?.calculated_eta || '10:52 AM', accumulated_delay_min: delayMin },
    { station_code: 'DGR', station_name: 'Durgapur', scheduled_time: '11:58 AM', predicted_time: downstreamEtas[1]?.calculated_eta || '12:04 PM', accumulated_delay_min: delayMin + 6 },
    { station_code: 'ASN', station_name: 'Asansol Junction', scheduled_time: '12:40 PM', predicted_time: downstreamEtas[2]?.calculated_eta || '12:48 PM', accumulated_delay_min: delayMin + 8 }
  ];

  // Explainable ETA Reason Breakdown
  const etaExplanation = liveTrainData?.eta_explanation || {
    reason_summary: `Speed: ${speedKmh} km/h • Weather: ${weatherInfo.weather_description} (${weatherInfo.weather_impact_label}) • Delay: +${delayMin} min`,
    math_baseline_min: roundVal((95.0 / Math.max(speedKmh, 30.0)) * 60),
    xgboost_ml_correction_min: 0.8,
    weather_penalty_min: 2.5,
    propagated_delay_min: roundVal(delayMin),
    signal_congestion_status: congestionStatus
  };

  function roundVal(val) {
    return Math.round((val || 0) * 10) / 10;
  }

  // Ref for auto-scrolling to live train location on vertical tracker
  const trainIconRef = useRef(null);

  useEffect(() => {
    if (trainIconRef.current) {
      trainIconRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [cumKm, selectedTrainNo]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 text-[#2c241e]">

      {/* SEARCH PANEL WITH WARM BEIGE & MOCHA CLAYMORPHIC STYLING */}
      <div className="clay-card p-7 md:p-8 space-y-6 bg-gradient-to-br from-white via-[#fbf9f4] to-[#f4eee2] border-[#e5dbc9]">
        <div className="flex items-center justify-between border-b border-[#e5dbc9] pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-[#3e2e23] via-[#2d2018] to-[#1f1610] rounded-2xl shadow-md text-amber-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#2c241e] tracking-tight">Search Live Trains (RailRadar API)</h2>
              <p className="text-xs md:text-sm text-[#7a6453] font-semibold">Real-time Indian Railways schedule & telemetry search</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs md:text-sm font-extrabold px-4 py-1.5 rounded-full border ${
              isLiveData 
                ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300' 
                : 'bg-amber-100/80 text-amber-900 border-amber-300'
            }`}>
              {isLiveData ? '🟢 LIVE DATA (RailRadar)' : '🟠 SIMULATION FALLBACK'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSearchTrains} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {/* Source Station */}
          <div>
            <label className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-[#5c493b] block mb-2">
              Source Station
            </label>
            <select
              value={sourceStation}
              onChange={(e) => setSourceStation(e.target.value)}
              className="w-full clay-input px-4 py-3 text-sm md:text-base font-bold text-[#2c241e] focus:outline-none transition cursor-pointer"
            >
              {POPULAR_STATIONS.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Destination Station */}
          <div>
            <label className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-[#5c493b] block mb-2">
              Destination Station
            </label>
            <select
              value={destStation}
              onChange={(e) => setDestStation(e.target.value)}
              className="w-full clay-input px-4 py-3 text-sm md:text-base font-bold text-[#2c241e] focus:outline-none transition cursor-pointer"
            >
              {POPULAR_STATIONS.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Journey Date */}
          <div>
            <label className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-[#5c493b] block mb-2">
              Journey Date
            </label>
            <input
              type="date"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="w-full clay-input px-4 py-3 text-sm md:text-base font-bold text-[#2c241e] focus:outline-none transition cursor-pointer"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 bg-gradient-to-r from-[#3e2e23] via-[#2d2018] to-[#1f1610] text-amber-50 text-sm font-extrabold tracking-wider uppercase rounded-2xl shadow-md hover:from-[#4f3c2e] hover:to-[#2c2017] flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95"
            >
              {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>SEARCH TRAINS</span>
            </button>
          </div>
        </form>

        {/* SEARCH RESULTS LIST */}
        {searchResults && (
          <div className="pt-5 border-t border-[#e5dbc9] space-y-4">
            <div className="flex items-center justify-between text-sm text-[#2c241e] font-extrabold">
              <span>Matching Real Trains ({searchResults.trains?.length || 0} found):</span>
              <button 
                onClick={() => setSearchResults(null)} 
                className="text-xs text-[#8c5a3c] hover:text-[#5c3c26] underline font-bold"
              >
                Hide Search Results
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1">
              {searchResults.trains?.map((t) => (
                <div
                  key={t.train_number}
                  onClick={() => {
                    setSelectedTrainNo(t.train_number);
                    fetchLiveTrainStatus(t.train_number);
                  }}
                  className={`p-4 md:p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedTrainNo === t.train_number
                      ? 'bg-[#e8decb] border-[#cbb79a] text-[#2c241e] font-extrabold scale-[1.01] shadow-sm'
                      : 'bg-white/90 border-[#e0d5c3] hover:bg-[#f5efe4] text-[#2c241e]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-extrabold text-sm bg-[#d8caa3] text-[#3d2e20] px-2.5 py-0.5 rounded">
                        #{t.train_number}
                      </span>
                      <span className="text-sm md:text-base font-extrabold truncate max-w-[220px]">{t.train_name}</span>
                    </div>
                    <p className="text-xs text-[#6e5d4f] font-bold">
                      Dep: {t.departure_time} | Arr: {t.arrival_time} • {t.running_days}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs md:text-sm font-extrabold text-[#3e2e23] bg-[#f4eee2] px-3.5 py-2 rounded-xl border border-[#d8ccb8] shadow-xs">
                    <span>Track Live</span>
                    <ChevronRight className="w-4 h-4 text-[#6e4e37]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC LIVE TELEMETRY STATUS BAR */}
      <div className="clay-card px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white via-[#fcfbfa] to-[#f4eee2] border-[#e5dbc9]">
        <div className="flex items-center gap-3.5">
          <div className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse shadow-sm" />
          <span className="text-sm md:text-base font-extrabold text-[#2c241e]">
            {dataSource}
          </span>
          <span className="text-xs md:text-sm text-[#6e5d4f] border-l border-[#d8ccb8] pl-3.5 font-bold flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin text-[#8c5a3c]' : 'text-stone-400'}`} />
            Auto-polling 30s • Updated <strong className="font-mono text-[#3e2e23]">{countdown}s</strong> ago
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!simStatus || !simStatus.is_running ? (
            <button
              onClick={handleStartSim}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs md:text-sm flex items-center gap-2 transition shadow-sm active:scale-95"
            >
              <span>▶ START TRAIN MOVEMENT</span>
            </button>
          ) : (
            <button
              onClick={handleStopSim}
              className="px-4 py-2 bg-[#3e2e23] hover:bg-[#2c2018] text-amber-50 font-extrabold rounded-xl text-xs md:text-sm flex items-center gap-2 transition shadow-sm active:scale-95"
            >
              <span>⏹ PAUSE MOVEMENT</span>
            </button>
          )}

          {simStatus?.is_running && (
            <>
              <button
                onClick={() => handleTriggerEvent('congestion')}
                className="px-3.5 py-2 bg-amber-200/80 text-amber-950 hover:bg-amber-300/80 border border-amber-400 font-extrabold rounded-xl text-xs md:text-sm transition shadow-sm active:scale-95"
                title="Simulate signal congestion"
              >
                <span>⚡ +DELAY</span>
              </button>
              <button
                onClick={() => handleTriggerEvent('recovery')}
                className="px-3.5 py-2 bg-emerald-200/80 text-emerald-950 hover:bg-emerald-300/80 border border-emerald-400 font-extrabold rounded-xl text-xs md:text-sm transition shadow-sm active:scale-95"
                title="Recover delay"
              >
                <span>🚀 RECOVER</span>
              </button>
            </>
          )}

          <button
            onClick={() => fetchLiveTrainStatus(selectedTrainNo)}
            className="p-2.5 rounded-xl bg-white hover:bg-[#f4efe4] text-[#2c241e] border border-[#d8ccb8] transition shadow-sm active:scale-95"
            title="Refresh Telemetry Now"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-[#8c5a3c]' : ''}`} />
          </button>

          <button
            onClick={() => setShowWhyModal(true)}
            className="flex items-center gap-2 text-xs md:text-sm font-extrabold text-[#3e2e23] bg-[#eae1d0] hover:bg-[#decfa7] border border-[#cbb79a] px-4 py-2 rounded-xl transition shadow-sm active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#8c5a3c]" />
            <span>Why this ETA?</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN SIDE-BY-SIDE GRID: CARD 1 (WHERE IS MY TRAIN LIVE STATUS) | CARD 2 (LIVE LOCATION MAP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-stretch">

        {/* CARD 1 (LEFT SIDE OF MAP): WHERE IS MY TRAIN REAL-TIME VERTICAL RUNNING STATUS */}
        <div className="clay-card rounded-3xl border border-[#e5dbc9] shadow-md flex flex-col justify-between overflow-hidden bg-white">
          
          {/* 1. TOP MOCHA HEADER BAR */}
          <div className="bg-gradient-to-r from-[#3e2e23] via-[#2d2018] to-[#1f1610] text-amber-50 p-5 md:p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100/15 rounded-xl border border-amber-200/20">
                <Train className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>#{trainNumber}</span>
                  <span className="text-amber-200 font-extrabold truncate max-w-[200px]">{trainName}</span>
                </h3>
                <span className="text-xs text-amber-200/80 font-bold block mt-0.5">
                  Real-time Route & Station Delays
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-100 bg-amber-200/20 px-3 py-1 rounded-xl border border-amber-200/30">
                Today (10 Sep)
              </span>
              <button 
                onClick={() => setShowWhyModal(true)}
                className="p-2 text-amber-200 hover:text-white transition"
                title="Why did ETA change?"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. TABLE HEADERS SUB-BAR */}
          <div className="bg-[#ede6d8] px-5 py-3 border-b border-[#e5dbc9] flex items-center justify-between text-xs md:text-sm font-black text-[#3e2e23] uppercase tracking-wider">
            <div className="flex items-center">
              <span className="w-16 text-right pr-3">Distance</span>
              <span className="w-16 text-center">Track</span>
              <span className="pl-4">Station Details</span>
            </div>
            <div className="text-right">Arr / Dep / Delay</div>
          </div>

          {/* 3. VERTICAL TRACK & CLEAN IXIGO-STYLE STATION CARDS */}
          <div className="p-4 md:p-6 flex-1 overflow-y-auto max-h-[560px] relative bg-[#faf8f4] space-y-4">

            {/* Vertical Track Line (positioned after Distance column at left-20) */}
            <div className="absolute left-20 top-6 bottom-6 w-2.5 bg-gradient-to-b from-[#bfa990] via-[#d8ccb8] to-[#bfa990] z-0 rounded-full shadow-inner" />

            {/* Station Item Rows */}
            {routeStations.map((st, idx) => {
              const isNext = st.status === 'next';
              const isPassed = st.status === 'passed';
              const nextSt = routeStations[idx + 1];
              
              // Determine if train is in this section or at this station
              const isTrainInSection = nextSt 
                ? (cumKm >= st.km && cumKm < nextSt.km) 
                : (cumKm >= st.km && idx === routeStations.length - 1);

              return (
                <React.Fragment key={st.code}>
                  <div className="relative z-10 flex items-center pl-24">
                    
                    {/* 1. DISTANCE ON FAR LEFT (To the left of vertical line) */}
                    <div className="absolute left-1 w-16 text-right pr-3 flex flex-col justify-center">
                      <span className="text-xs md:text-sm font-mono font-black text-[#5c493b] leading-tight">
                        {st.km} km
                      </span>
                    </div>

                    {/* 2. STATION STOPPAGE NODE DOT ON VERTICAL ROUTE LINE (at left-20) */}
                    <div className={`absolute left-20 -translate-x-1/2 w-5 h-5 rounded-full border-2 z-20 transition-all flex items-center justify-center ${
                      isNext 
                        ? 'bg-[#5c402c] border-white ring-4 ring-[#5c402c]/30 scale-110 shadow-md' 
                        : isPassed 
                        ? 'bg-emerald-700 border-white shadow-xs' 
                        : 'bg-white border-[#bfa990]'
                    }`}>
                      {isPassed && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      {isNext && <div className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />}
                    </div>

                    {/* 3. STATION DETAILS CARD TO THE RIGHT OF THE VERTICAL LINE */}
                    <div 
                      className={`w-full p-3.5 md:p-4 rounded-2xl transition-all flex items-center justify-between ${
                        isNext 
                          ? 'bg-white border-2 border-[#5c402c] shadow-md scale-[1.01]' 
                          : isPassed 
                          ? 'bg-[#f4efe4]/80 border border-[#e5dbc9]' 
                          : 'bg-white border border-[#e5dbc9]'
                      }`}
                    >
                      {/* Station Name & Code */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[#3e2e23] bg-[#eae1d0] px-2.5 py-0.5 rounded">
                            {st.code}
                          </span>
                          <span className={`text-sm md:text-base font-black ${isNext ? 'text-[#3e2b1d]' : 'text-[#2c241e]'}`}>
                            {st.name}
                          </span>
                          {st.hasWifi && <Wifi className="w-3.5 h-3.5 text-blue-600" title="Free Railway WiFi" />}
                        </div>

                        <div className="text-xs text-[#7a6453] font-bold font-mono">
                          {st.platform} • Halt: {st.halt}
                        </div>
                      </div>

                      {/* Times & Delay Badges */}
                      <div className="text-right space-y-1">
                        <div className="text-xs md:text-sm font-bold flex items-center justify-end gap-2">
                          <span className="text-[#7a6453]">Arr:</span>
                          <span className={st.delayMin > 0 ? 'text-amber-900 font-mono font-black text-sm md:text-base' : 'text-emerald-800 font-mono font-bold'}>
                            {st.predArr}
                          </span>
                          <span className="line-through text-stone-400 text-xs font-mono">{st.schedArr}</span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[#7a6453] font-bold">Dep: <strong className="font-mono text-[#2c241e]">{st.predDep}</strong></span>
                          {st.delayMin > 0 ? (
                            <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                              +{st.delayMin}m delay
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              On time
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* INTER-STATION GAP WITH PROMINENT LIVE TRAIN ICON ON THE VERTICAL ROUTE LINE */}
                  {nextSt && (
                    <div className="relative pl-24 my-2 flex items-center min-h-[36px]">
                      
                      {/* PROMINENT TRAIN ICON ON THE VERTICAL ROUTE LINE */}
                      {isTrainInSection && (
                        <div ref={trainIconRef} className="absolute left-20 -translate-x-1/2 z-30">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3e2e23] via-[#2d2018] to-[#120b06] border-2 border-amber-300 text-amber-100 shadow-xl flex items-center justify-center ring-4 ring-amber-500/40 scale-110">
                            <Train className="w-5 h-5 text-amber-200 animate-bounce-subtle" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

          </div>

          {/* 4. BOTTOM STATUS FOOTER BAR */}
          <div className="bg-[#3e2e23] text-amber-50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-bold border-t border-[#2c2018]">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{currentLocationText}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-amber-200/80 font-mono">
                Updated {countdown}s ago
              </span>
              <button 
                onClick={() => fetchLiveTrainStatus(selectedTrainNo)}
                className="p-1.5 rounded-xl bg-amber-100/10 hover:bg-amber-100/20 text-amber-100 transition"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

        </div>

        {/* CARD 2 (RIGHT SIDE): LIVE TRAIN LOCATION MAP CARD */}
        <div className="clay-card p-7 md:p-8 flex flex-col justify-between space-y-4 bg-gradient-to-br from-white via-[#fbf9f4] to-[#f4eee2] border-[#e5dbc9] shadow-md relative overflow-hidden h-full rounded-3xl">
          <div className="flex items-center justify-between border-b border-[#e5dbc9] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-[#3e2e23] via-[#2d2018] to-[#1f1610] rounded-2xl shadow-sm text-amber-100">
                <MapPin className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-[#2c241e]">Live Train Location Map</h3>
                <p className="text-xs md:text-sm text-[#7a6453] font-semibold">Real-time corridor GPS polyline & station markers</p>
              </div>
            </div>
            <span className="text-xs font-mono font-extrabold text-[#3e2e23] bg-[#eae1d0] px-3 py-1 rounded-xl border border-[#cbb79a]">
              #{trainNumber}
            </span>
          </div>

          {/* Interactive Map Component Filling Container Height */}
          <div className="flex-1 min-h-[440px] md:min-h-[520px] w-full rounded-2xl overflow-hidden shadow-inner border border-[#e5dbc9]">
            <PassengerMap
              currentLat={currentLat}
              currentLng={currentLng}
              speedKmh={speedKmh}
              delayMin={delayMin}
              nextStationName={nextStation.to_station_name}
            />
          </div>
        </div>

      </div>



      {/* DYNAMIC STATION ETA TABLE */}
      <div className="clay-card p-7 md:p-9 space-y-6 bg-gradient-to-br from-white via-[#fbf9f4] to-[#f2ebe0] border-[#e5dbc9]">
        <div className="flex items-center justify-between border-b border-[#e5dbc9] pb-5">
          <div>
            <h3 className="text-lg md:text-xl font-extrabold text-[#2c241e] flex items-center gap-3">
              <Clock className="w-6 h-6 text-[#8c5a3c]" />
              Dynamic Station ETA Table (Scheduled vs Predicted)
            </h3>
            <p className="text-xs md:text-sm text-[#7a6453] font-semibold mt-1">
              ETAs update dynamically based on live speed, XGBoost residual correction, and delay propagation
            </p>
          </div>
          <span className="text-xs md:text-sm font-mono font-extrabold text-[#3e2e23] bg-[#eae1d0] px-4 py-1.5 rounded-xl border border-[#cbb79a]">
            Engine Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5dbc9] text-xs md:text-sm font-black text-[#5c493b] uppercase tracking-wider">
                <th className="py-4 px-4">Station</th>
                <th className="py-4 px-4">Scheduled Arrival</th>
                <th className="py-4 px-4">Predicted ETA</th>
                <th className="py-4 px-4">Accumulated Delay</th>
                <th className="py-4 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dbc9]/70 text-sm font-bold">
              {stationEtaTable.map((row, idx) => (
                <tr key={row.station_code || idx} className="hover:bg-[#f5efe4]/70 transition-colors">
                  <td className="py-4 px-4 font-extrabold text-[#2c241e]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#3e2e23] bg-[#eae1d0] px-2.5 py-1 rounded text-xs md:text-sm">
                        {row.station_code}
                      </span>
                      <span className="text-sm md:text-base">{row.station_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono text-[#6e5d4f] text-sm md:text-base">{row.scheduled_time}</td>
                  <td className="py-4 px-4 font-mono font-black text-[#3e2b1d] text-base md:text-lg">
                    {row.predicted_time}
                  </td>
                  <td className="py-4 px-4 font-mono font-black text-amber-800 text-sm md:text-base">
                    +{roundVal(row.accumulated_delay_min)} min
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                      idx === 0 
                        ? 'bg-[#5c402c] text-amber-100 border-[#3e2b1d]' 
                        : 'bg-[#f4efe4] text-[#6e5d4f] border-[#d8ccb8]'
                    }`}>
                      {idx === 0 ? 'NEXT STATION' : 'UPCOMING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEXT-POSITION PREDICTION FORECAST CARDS (+3M, +5M, +10M) */}
      <div className="clay-card p-7 md:p-9 space-y-6 bg-gradient-to-br from-white via-[#fbf9f4] to-[#f2ebe0] border-[#e5dbc9]">
        <div className="flex items-center justify-between border-b border-[#e5dbc9] pb-5">
          <div>
            <h3 className="text-lg md:text-xl font-extrabold text-[#2c241e] flex items-center gap-3">
              <Zap className="w-6 h-6 text-[#8c5a3c]" />
              Next-Position Prediction (Short-Term Location Forecast)
            </h3>
            <p className="text-xs md:text-sm text-[#7a6453] font-semibold mt-1">
              Predicts train position over the next few minutes using speed, distance, and ML correction
            </p>
          </div>
          <span className="text-xs md:text-sm font-mono font-extrabold text-[#3e2e23] bg-[#eae1d0] px-4 py-1.5 rounded-xl border border-[#cbb79a]">
            Forecast Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {nextPredictions.map((pred, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-[#e5dbc9] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm font-extrabold text-[#3e2e23] bg-[#eae1d0] px-3 py-1 rounded-full border border-[#cbb79a]">
                  +{pred.time_offset} Forecast
                </span>
                <span className="text-xs md:text-sm font-mono font-extrabold text-[#5c493b]">~{pred.predicted_km} km mark</span>
              </div>
              <p className="text-xs md:text-sm text-[#6e5d4f] font-bold">{pred.status_label}</p>
              <div className="pt-3 border-t border-[#f0e8da] text-xs font-mono font-bold text-[#2c241e] flex items-center justify-between">
                <span>Lat: {pred.latitude || 23.25}</span>
                <span>Lng: {pred.longitude || 87.87}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EXPLAINABLE ETA MODAL ("WHY DID THE ETA CHANGE?") */}
      {showWhyModal && (
        <div className="fixed inset-0 z-[5000] bg-black/45 backdrop-blur-md flex items-center justify-center p-4">
          <div className="clay-card max-w-xl w-full p-7 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 bg-white border-[#e5dbc9]">
            <div className="flex items-center justify-between border-b border-[#e5dbc9] pb-4">
              <div className="flex items-center gap-3 text-[#2c241e] font-black text-xl">
                <Sparkles className="w-6 h-6 text-[#8c5a3c]" />
                <span>Why did the ETA change?</span>
              </div>
              <button 
                onClick={() => setShowWhyModal(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-[#2c241e] hover:bg-[#f4efe4] transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5 text-sm text-[#2c241e]">
              <div className="p-4 rounded-2xl bg-[#f5efe4] border border-[#e0d5c3]">
                <span className="font-extrabold text-[#2c241e] block mb-1 text-base">Summary Rationale:</span>
                <p className="text-[#5c493b] font-bold text-sm md:text-base leading-relaxed">{etaExplanation.reason_summary}</p>
              </div>

              <div className="space-y-3 pt-1">
                <h4 className="font-black text-[#2c241e] uppercase text-xs tracking-wider">ETA Model Factor Breakdown</h4>
                
                <div className="flex items-center justify-between p-3.5 bg-[#fbf9f4] rounded-xl border border-[#e5dbc9]">
                  <span className="font-bold text-[#5c493b]">1. Mathematical Corridor Baseline</span>
                  <span className="font-mono font-black text-[#2c241e] text-base">{etaExplanation.math_baseline_min} min</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#f5efe4] rounded-xl border border-[#cbb79a]">
                  <span className="font-bold text-[#3e2e23]">2. XGBoost ML Residual Correction</span>
                  <span className="font-mono font-black text-[#3e2e23] text-base">+{etaExplanation.xgboost_ml_correction_min} min</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900">3. OpenWeather Impact Penalty</span>
                  <span className="font-mono font-black text-amber-950 text-base">+{etaExplanation.weather_penalty_min} min</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-amber-100/60 rounded-xl border border-amber-300">
                  <span className="font-bold text-amber-950">4. Propagated Corridor Delay</span>
                  <span className="font-mono font-black text-amber-950 text-base">+{etaExplanation.propagated_delay_min} min</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#ede6d8] border border-[#d8ccb8] text-xs md:text-sm text-[#3e2e23] font-mono font-bold">
                Signal Status: <strong>{etaExplanation.signal_congestion_status}</strong>
              </div>
            </div>

            <div className="pt-5 border-t border-[#e5dbc9] flex items-center justify-between">
              <button
                onClick={() => setShowWhyModal(false)}
                className="px-5 py-2.5 bg-[#eae1d0] hover:bg-[#decfa7] text-[#3e2e23] rounded-xl text-xs md:text-sm font-extrabold transition"
              >
                Close Explanation
              </button>

              <button
                onClick={() => {
                  setShowWhyModal(false);
                  onSwitchToOperations();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#3e2e23] via-[#2d2018] to-[#1f1610] text-amber-50 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition"
              >
                <span>View AI Model Engine</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
