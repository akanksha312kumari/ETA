import React, { useEffect, useState, useRef } from 'react';
import { Train, RefreshCw, LayoutDashboard, UserCheck, ShieldAlert, Cpu } from 'lucide-react';
import axios from 'axios';

import PassengerView from './components/PassengerView';
import OperationsView from './components/OperationsView';

export default function App() {
  const [activeView, setActiveView] = useState('passenger'); // 'passenger' | 'operations'
  const [health, setHealth] = useState(null);
  const [stations, setStations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trains, setTrains] = useState([]);
  const [etaData, setEtaData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [simStatus, setSimStatus] = useState(null);
  const [lastUpdateStr, setLastUpdateStr] = useState('--:--:--');
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());
  const [isWsConnected, setIsWsConnected] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);

  // Initial REST API fetch
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, stationsRes, routesRes, trainsRes, etaRes, metricsRes, breakdownRes, simRes] = await Promise.all([
        axios.get('/api/health'),
        axios.get('/api/stations'),
        axios.get('/api/routes'),
        axios.get('/api/trains'),
        axios.get('/api/eta/calculate/1'),
        axios.get('/api/model/metrics'),
        axios.get('/api/trains/12301/model-breakdown'),
        axios.get('/api/simulator/status')
      ]);

      setHealth(healthRes.data);
      setStations(stationsRes.data);
      setRoutes(routesRes.data);
      setTrains(trainsRes.data);
      setEtaData(etaRes.data);
      setMetrics(metricsRes.data);
      setBreakdown(breakdownRes.data);
      setSimStatus(simRes.data);
      
      const now = Date.now();
      setLastUpdateTimestamp(now);
      setLastUpdateStr(new Date(now).toLocaleTimeString());
    } catch (err) {
      console.error("Failed to connect to FastAPI backend:", err);
      setError("Unable to connect to FastAPI backend at http://127.0.0.1:8000");
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection with automatic polling fallback
  useEffect(() => {
    fetchData();

    const wsUrl = `ws://${window.location.hostname}:8000/ws/telemetry`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WEBSOCKET] Connected to real-time telemetry stream.");
      setIsWsConnected(true);
    };

    ws.onclose = () => {
      setIsWsConnected(false);
    };

    ws.onerror = () => {
      setIsWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.downstream_etas) {
          setEtaData((prev) => ({
            ...prev,
            current_speed_kmh: payload.telemetry?.speed_kmh || prev?.current_speed_kmh,
            current_delay_minutes: payload.telemetry?.delay_minutes || prev?.current_delay_minutes,
            downstream_etas: payload.downstream_etas
          }));
          const now = Date.now();
          setLastUpdateTimestamp(now);
          setLastUpdateStr(new Date(now).toLocaleTimeString());
        }
      } catch (e) {
        // silent parse error
      }
    };

    const interval = setInterval(async () => {
      try {
        const simRes = await axios.get('/api/simulator/status');
        setSimStatus(simRes.data);
        
        const now = Date.now();
        setLastUpdateTimestamp(now);
        setLastUpdateStr(new Date(now).toLocaleTimeString());

        if (simRes.data.latest_pipeline_result && simRes.data.latest_pipeline_result.downstream_etas) {
          setEtaData({
            current_speed_kmh: simRes.data.current_speed_kmh,
            current_delay_minutes: simRes.data.current_delay_min,
            downstream_etas: simRes.data.latest_pipeline_result.downstream_etas
          });
        }
      } catch (e) {
        // silent polling catch
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleStartSim = async () => {
    try {
      await axios.post('/api/simulator/start');
      const res = await axios.get('/api/simulator/status');
      setSimStatus(res.data);
    } catch (e) {
      console.error("Start sim error:", e);
    }
  };

  const handleStopSim = async () => {
    try {
      await axios.post('/api/simulator/stop');
      const res = await axios.get('/api/simulator/status');
      setSimStatus(res.data);
    } catch (e) {
      console.error("Stop sim error:", e);
    }
  };

  const handleTriggerEvent = async (action) => {
    try {
      const res = await axios.post('/api/simulator/control', { action });
      if (res.data.telemetry) {
        setSimStatus((prev) => ({
          ...prev,
          current_speed_kmh: res.data.telemetry.speed_kmh,
          current_delay_min: res.data.telemetry.delay_minutes,
          simulator_status: res.data.telemetry.simulator_status
        }));
      }
      if (res.data.pipeline_result && res.data.pipeline_result.downstream_etas) {
        setEtaData({
          current_speed_kmh: res.data.telemetry.speed_kmh,
          current_delay_minutes: res.data.telemetry.delay_minutes,
          downstream_etas: res.data.pipeline_result.downstream_etas
        });
      }
      const now = Date.now();
      setLastUpdateTimestamp(now);
      setLastUpdateStr(new Date(now).toLocaleTimeString());
    } catch (e) {
      console.error("Trigger event error:", e);
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col font-sans transition-colors duration-500 ${
      activeView === 'passenger' ? 'bg-[#f8f5ee] text-[#2c241e]' : 'bg-[#18181b] text-zinc-100'
    }`}>
      {/* FLOATING AMBIENT BACKGROUND BLOBS FOR DEPTH */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-50">
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl ${
          activeView === 'passenger' ? 'bg-[#f3eee3]/80' : 'bg-zinc-800/40'
        }`} />
        <div className={`absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl ${
          activeView === 'passenger' ? 'bg-[#ede6d8]/70' : 'bg-zinc-900/30'
        }`} />
        <div className={`absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full blur-3xl ${
          activeView === 'passenger' ? 'bg-[#e5dbc9]/60' : 'bg-stone-900/30'
        }`} />
      </div>

      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-500 ${
        activeView === 'passenger' 
          ? 'bg-white/95 border-[#e5dbc9] shadow-[0_2px_15px_rgba(44,36,30,0.04)]' 
          : 'bg-[#18181b]/95 border-neutral-800 shadow-xl'
      }`}>
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-gradient-to-tr from-[#3e2e23] via-[#2c2018] to-[#1a120d] rounded-2xl shadow-md transition-transform hover:scale-105">
              <Train className="w-7 h-7 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-2xl font-black tracking-tight ${
                  activeView === 'passenger' ? 'text-[#2c241e]' : 'text-white'
                }`}>
                  Dynamic Train ETA Engine
                </h1>
                <span className={`text-xs px-3.5 py-1 rounded-full font-mono font-extrabold tracking-wide transition-all ${
                  simStatus && simStatus.is_running 
                    ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300 animate-pulse-subtle' 
                    : 'bg-[#ede6d8] text-[#5c493b] border border-[#cbb79a]'
                }`}>
                  {simStatus && simStatus.is_running ? '🟢 TELEMETRY STREAM ACTIVE' : 'STREAM IDLE'}
                </span>
              </div>
              <p className={`text-xs md:text-sm ${
                activeView === 'passenger' ? 'text-[#6e5d4f] font-semibold' : 'text-zinc-400'
              }`}>
                SIH 2026 Problem Statement SIH26028 • Corridor Real-Time ETA Predictor
              </p>
            </div>
          </div>

          {/* CLAYMORPHISM MODE TOGGLE SWITCHER */}
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 transition-all ${
              activeView === 'passenger'
                ? 'bg-[#f5f2e9] border-[#e4dfd0] shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.06)]'
                : 'bg-[#09090b] border-neutral-800 shadow-inner'
            }`}>
              <button
                onClick={() => setActiveView('passenger')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                  activeView === 'passenger'
                    ? 'clay-btn-black scale-[1.01]'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-stone-200/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Passenger View</span>
              </button>

              <button
                onClick={() => setActiveView('operations')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                  activeView === 'operations'
                    ? 'bg-gradient-to-r from-zinc-100 to-stone-200 text-zinc-900 shadow-clay-btn scale-[1.01]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Operations & AI Engine</span>
              </button>
            </div>

            <button
              onClick={fetchData}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                activeView === 'passenger'
                  ? 'bg-white/95 border-stone-200 text-zinc-800 hover:bg-[#f5f2e9] shadow-sm'
                  : 'bg-[#27272a] border-neutral-700 text-zinc-200 hover:bg-neutral-800 shadow-clay-dark'
              }`}
              title="Refresh Telemetry Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 relative z-10">
        {activeView === 'passenger' ? (
          <div className="animate-in fade-in duration-300">
            <PassengerView
              etaData={etaData}
              simStatus={simStatus}
              lastUpdateTimestamp={lastUpdateTimestamp}
              isWsConnected={isWsConnected}
              onSwitchToOperations={() => setActiveView('operations')}
              handleStartSim={handleStartSim}
              handleStopSim={handleStopSim}
              handleTriggerEvent={handleTriggerEvent}
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <OperationsView
              health={health}
              stations={stations}
              routes={routes}
              trains={trains}
              etaData={etaData}
              metrics={metrics}
              breakdown={breakdown}
              simStatus={simStatus}
              lastUpdateStr={lastUpdateStr}
              loading={loading}
              error={error}
              fetchData={fetchData}
              handleStartSim={handleStartSim}
              handleStopSim={handleStopSim}
              handleTriggerEvent={handleTriggerEvent}
            />
          </div>
        )}
      </main>
    </div>
  );
}

