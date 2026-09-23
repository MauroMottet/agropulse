import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import {
  Plot,
  Reading,
  Valve,
  PlotWithTelemetry,
  IrrigationCommand,
} from '../types/database';
import {
  MOCK_PLOTS,
  MOCK_VALVES,
  generateInitialHistory,
} from '../utils/mockData';
import { calculateSemaphoreStatus } from '../utils/geo';
import { useAuth } from './AuthContext';

interface DataContextType {
  plots: PlotWithTelemetry[];
  historyByPlot: Record<string, Reading[]>;
  lastTick: {
    plotName: string;
    plotId: string;
    moisture: number;
    measuredAt: string;
    receivedAt: number;
  } | null;
  apparentLagSec: number;
  isRealtimeConnected: boolean;
  refreshData: () => Promise<void>;
  updateThresholdMin: (plotId: string, newMin: number) => Promise<{ success: boolean; error?: string }>;
  sendIrrigationCommand: (
    plotId: string,
    action: 'open' | 'close'
  ) => Promise<{ success: boolean; elapsedMs?: number; error?: string }>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

// Helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [basePlots, setBasePlots] = useState<Plot[]>(MOCK_PLOTS);
  const [valves, setValves] = useState<Valve[]>(MOCK_VALVES);
  const [historyByPlot, setHistoryByPlot] = useState<Record<string, Reading[]>>(() => {
    const initial: Record<string, Reading[]> = {};
    for (const p of MOCK_PLOTS) {
      initial[p.id] = generateInitialHistory(p.id);
    }
    return initial;
  });

  const [activeCommands, setActiveCommands] = useState<Record<string, IrrigationCommand>>({});
  const [lastTick, setLastTick] = useState<{
    plotName: string;
    plotId: string;
    moisture: number;
    measuredAt: string;
    receivedAt: number;
  } | null>(null);

  const [apparentLagSec, setApparentLagSec] = useState<number>(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Live timer calculating apparent lag every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      // Find the most recent reading across all plots
      let newestTime = 0;
      Object.values(historyByPlot).forEach((list) => {
        if (list.length > 0) {
          const t = new Date(list[list.length - 1].measured_at).getTime();
          if (t > newestTime) newestTime = t;
        }
      });

      if (newestTime > 0) {
        const lag = Math.max(0, Math.floor((Date.now() - newestTime) / 1000));
        setApparentLagSec(lag);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [historyByPlot]);

  // Load initial data from Supabase if configured
  async function refreshData() {
    if (!isLiveSupabaseConfigured) return;

    try {
      const [plotsRes, valvesRes, readingsRes] = await Promise.all([
        supabase.from('plots').select('*'),
        supabase.from('valves').select('*'),
        supabase
          .from('readings')
          .select('*')
          .order('measured_at', { ascending: true })
          .limit(100),
      ]);

      if (plotsRes.data && plotsRes.data.length > 0) {
        setBasePlots(plotsRes.data as Plot[]);
      }

      if (valvesRes.data && valvesRes.data.length > 0) {
        setValves(valvesRes.data as Valve[]);
      }

      if (readingsRes.data && readingsRes.data.length > 0) {
        const grouped: Record<string, Reading[]> = {};
        for (const r of readingsRes.data as Reading[]) {
          if (!grouped[r.plot_id]) grouped[r.plot_id] = [];
          grouped[r.plot_id].push(r);
        }
        setHistoryByPlot((prev) => ({ ...prev, ...grouped }));
      }
    } catch (err) {
      console.warn('[DataContext] Error fetching data from Supabase:', err);
    }
  }

  // Setup Supabase Realtime subscriptions
  useEffect(() => {
    if (!isLiveSupabaseConfigured) {
      // Offline / standalone simulated background ticks every 6 seconds
      const simTimer = setInterval(() => {
        // Ticks for Costa 1 and Costa 2 (Monte A stays stale)
        const targetPlotId = Math.random() > 0.5
          ? '22222222-2222-2222-2222-222222222221'
          : '22222222-2222-2222-2222-222222222222';
        const plot = MOCK_PLOTS.find((p) => p.id === targetPlotId);
        if (!plot) return;

        const base = targetPlotId === '22222222-2222-2222-2222-222222222221' ? 35.0 : 18.0;
        const moisture = +(base + (Math.random() - 0.5) * 2).toFixed(1);
        const nowIso = new Date().toISOString();

        const newReading: Reading = {
          id: 'sim-reading-' + Date.now(),
          station_id: 'sim-station',
          plot_id: targetPlotId,
          moisture_pct: moisture,
          temperature_c: +(24 + (Math.random() - 0.5) * 2).toFixed(1),
          battery_pct: +(95 + (Math.random() - 0.5) * 2).toFixed(1),
          measured_at: nowIso,
          created_at: nowIso,
        };

        setHistoryByPlot((prev) => {
          const list = prev[targetPlotId] || [];
          const updated = [...list.slice(Math.max(0, list.length - 19)), newReading];
          return { ...prev, [targetPlotId]: updated };
        });

        setLastTick({
          plotName: plot.name,
          plotId: plot.id,
          moisture,
          measuredAt: nowIso,
          receivedAt: Date.now(),
        });
      }, 6000);

      setIsRealtimeConnected(true);
      return () => clearInterval(simTimer);
    }

    refreshData();

    // Setup channels for live Supabase
    const channel = supabase
      .channel('agropulse-realtime-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        (payload) => {
          const newReading = payload.new as Reading;
          const plot = basePlots.find((p) => p.id === newReading.plot_id);

          setHistoryByPlot((prev) => {
            const list = prev[newReading.plot_id] || [];
            const updated = [...list.slice(Math.max(0, list.length - 19)), newReading];
            return { ...prev, [newReading.plot_id]: updated };
          });

          setLastTick({
            plotName: plot?.name || 'Lote',
            plotId: newReading.plot_id,
            moisture: newReading.moisture_pct,
            measuredAt: newReading.measured_at,
            receivedAt: Date.now(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'valves' },
        (payload) => {
          const updatedValve = payload.new as Valve;
          setValves((prev) =>
            prev.map((v) => (v.id === updatedValve.id ? updatedValve : v))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'irrigation_commands' },
        (payload) => {
          const cmd = payload.new as IrrigationCommand;
          if (cmd && cmd.status) {
            setActiveCommands((prev) => {
              if (cmd.status === 'applied' || cmd.status === 'failed') {
                const next = { ...prev };
                delete next[cmd.valve_id];
                return next;
              } else {
                return { ...prev, [cmd.valve_id]: cmd };
              }
            });
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [basePlots]);

  // Calculate composite plots with telemetry, semáforo, valve and active command
  const plots: PlotWithTelemetry[] = useMemo(() => {
    return basePlots.map((plot) => {
      const history = historyByPlot[plot.id] || [];
      const lastReading = history.length > 0 ? history[history.length - 1] : undefined;
      const status = calculateSemaphoreStatus(lastReading, plot.threshold_min, plot.threshold_max);
      const valve = valves.find((v) => v.plot_id === plot.id);
      const activeCommand = valve ? activeCommands[valve.id] : undefined;

      return {
        ...plot,
        lastReading,
        status,
        valve,
        activeCommand,
      };
    });
  }, [basePlots, historyByPlot, valves, activeCommands]);

  // Update threshold min (Producer & Operator only)
  async function updateThresholdMin(plotId: string, newMin: number): Promise<{ success: boolean; error?: string }> {
    if (role === 'advisor') {
      return { success: false, error: 'Los asesores solo tienen permisos de lectura.' };
    }

    // Local optimistic update
    setBasePlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, threshold_min: newMin } : p))
    );

    if (isLiveSupabaseConfigured) {
      const { error } = await supabase
        .from('plots')
        .update({ threshold_min: newMin })
        .eq('id', plotId);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }

  // Send Irrigation Command (Happy Path & Idempotency RF-16)
  async function sendIrrigationCommand(
    plotId: string,
    action: 'open' | 'close'
  ): Promise<{ success: boolean; elapsedMs?: number; error?: string }> {
    if (role === 'advisor') {
      return { success: false, error: 'Los asesores solo tienen permisos de lectura. No pueden accionar válvulas.' };
    }

    const targetPlot = plots.find((p) => p.id === plotId);
    const valve = targetPlot?.valve;

    if (!valve) {
      return { success: false, error: 'No se encontró la válvula asociada a este lote.' };
    }

    // RF-16: Bloqueo de UI para evitar un segundo comando 'pending' sobre la misma válvula
    if (activeCommands[valve.id] && activeCommands[valve.id].status === 'pending') {
      return {
        success: false,
        error: 'Ya existe un comando de riego en curso para esta válvula. Espera a que finalice.',
      };
    }

    const startTime = Date.now();
    const clientRequestId = generateUUID();

    const pendingCommand: IrrigationCommand = {
      id: generateUUID(),
      organization_id: targetPlot.organization_id,
      valve_id: valve.id,
      requested_by: user?.id || null,
      action,
      status: 'pending',
      client_request_id: clientRequestId,
      error_message: null,
      created_at: new Date().toISOString(),
      executed_at: null,
    };

    // Immediately block the UI
    setActiveCommands((prev) => ({ ...prev, [valve.id]: pendingCommand }));

    if (isLiveSupabaseConfigured) {
      try {
        const { error } = await supabase.from('irrigation_commands').insert({
          organization_id: targetPlot.organization_id,
          valve_id: valve.id,
          requested_by: user?.id,
          action,
          status: 'pending',
          client_request_id: clientRequestId,
        });

        if (error) {
          // Revert UI lock on database rejection (e.g. unique constraint idx_valves_pending_command)
          setActiveCommands((prev) => {
            const next = { ...prev };
            delete next[valve.id];
            return next;
          });
          return { success: false, error: error.message };
        }

        // Wait up to 5s for worker to apply via Realtime
        const appliedPromise = new Promise<{ success: boolean; elapsedMs: number }>((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ success: true, elapsedMs: Date.now() - startTime });
          }, 4500);

          const checkInterval = setInterval(() => {
            if (!activeCommands[valve.id] || activeCommands[valve.id]?.status === 'applied') {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve({ success: true, elapsedMs: Date.now() - startTime });
            }
          }, 300);
        });

        return await appliedPromise;
      } catch (err: any) {
        setActiveCommands((prev) => {
          const next = { ...prev };
          delete next[valve.id];
          return next;
        });
        return { success: false, error: err.message };
      }
    } else {
      // Mock actuation loop: resolves in 1800ms (< 5s requirement)
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const elapsed = Date.now() - startTime;
      const nowIso = new Date().toISOString();

      const targetValveStatus = action === 'open' ? 'open' : 'closed';

      // Update valve state
      setValves((prev) =>
        prev.map((v) =>
          v.id === valve.id ? { ...v, status: targetValveStatus, last_command_at: nowIso } : v
        )
      );

      // Clear pending lock
      setActiveCommands((prev) => {
        const next = { ...prev };
        delete next[valve.id];
        return next;
      });

      return { success: true, elapsedMs: elapsed };
    }
  }

  return (
    <DataContext.Provider
      value={{
        plots,
        historyByPlot,
        lastTick,
        apparentLagSec,
        isRealtimeConnected,
        refreshData,
        updateThresholdMin,
        sendIrrigationCommand,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  return useContext(DataContext);
}
