import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, sseUrl } from '../api/client';
import { playAlarm, stopAlarm, primeAudio } from '../utils/alarm';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('srs_token') || null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('srs_user') || 'null');
    } catch {
      return null;
    }
  });
  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [config, setConfig] = useState(null);
  const [latestEvents, setLatestEvents] = useState([]);
  const [criticalAlert, setCriticalAlert] = useState(null);
  const [connected, setConnected] = useState(false);
  const [serverUptime, setServerUptime] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('srs_theme') || 'dark');
  const modalShownRef = useRef(false);
  const esRef = useRef(null);

  useEffect(() => {
    primeAudio();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('srs_theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshSummary = useCallback(async () => {
    try {
      const { summary } = await api.summary();
      setSummary(summary);
      setServerUptime(summary.sistema?.uptime_seg || 0);
    } catch {
      /* conectando */
    }
  }, []);

  const refreshVehicles = useCallback(async () => {
    try {
      const { vehicles } = await api.vehicles();
      setVehicles(vehicles);
    } catch {
      /* conectando */
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const { alerts } = await api.activeAlerts();
      setActiveAlerts(alerts);
      if (!modalShownRef.current) {
        const critical = alerts.find((a) => a.riesgo === 'CRITICO' && a.estado === 'ACTIVA');
        if (critical) {
          modalShownRef.current = true;
          setCriticalAlert(critical);
        }
      }
    } catch {
      /* conectando */
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const { config } = await api.config();
      setConfig(config);
    } catch {
      /* conectando */
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshVehicles(), refreshAlerts(), refreshConfig()]);
  }, [refreshSummary, refreshVehicles, refreshAlerts, refreshConfig]);

  useEffect(() => {
    if (!token) return;
    refreshAll();
    const es = new EventSource(sseUrl());
    esRef.current = es;

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', () => setConnected(false));
    es.addEventListener('telemetry', (e) => {
      const data = JSON.parse(e.data);
      if (Array.isArray(data.vehiculos)) setVehicles(data.vehiculos);
    });
    es.addEventListener('system', (e) => {
      const data = JSON.parse(e.data);
      if (data.uptime) setServerUptime(data.uptime);
    });
    es.addEventListener('alert_critical', (e) => {
      const { alert } = JSON.parse(e.data);
      setActiveAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
      modalShownRef.current = true;
      setCriticalAlert(alert);
      playAlarm();
      pushToast(`Alerta crítica en ${alert.vehiculo_codigo}`, 'critical');
    });
    es.addEventListener('event', (e) => {
      const { event } = JSON.parse(e.data);
      setLatestEvents((prev) => [event, ...prev].slice(0, 40));
      if (event.riesgo === 'CRITICO' || event.riesgo === 'MEDIO') {
        pushToast(`${EVENT_LABEL(event.tipo)} · ${event.vehiculo_codigo}`, event.riesgo === 'CRITICO' ? 'critical' : 'warning');
      }
    });
    es.addEventListener('alert_resolved', (e) => {
      let alert = null;
      try {
        alert = JSON.parse(e.data).alert;
      } catch {
        alert = null;
      }
      stopAlarm();
      setCriticalAlert((prev) => (prev && (!alert || prev.id === alert.id) ? null : prev));
      if (alert) {
        setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        pushToast(`Alerta atendida · ${alert.vehiculo_codigo}`, 'success');
      }
    });
    es.addEventListener('config', (e) => {
      setConfig(JSON.parse(e.data).config);
    });

    const poll = setInterval(async () => {
      await Promise.all([refreshSummary(), refreshVehicles(), refreshAlerts()]);
    }, 12000);

    return () => {
      clearInterval(poll);
      es.close();
    };
  }, [token, refreshAll, refreshSummary, refreshVehicles, refreshAlerts]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('srs_token', data.token);
    localStorage.setItem('srs_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    stopAlarm();
    localStorage.removeItem('srs_token');
    localStorage.removeItem('srs_user');
    if (esRef.current) esRef.current.close();
    setToken(null);
    setUser(null);
    setSummary(null);
    setVehicles([]);
    setActiveAlerts([]);
    setCriticalAlert(null);
  }, []);

  const actionAlert = useCallback(async (id, accion, meta) => {
    const { alert } = await api.alertAction(id, accion, meta);
    stopAlarm();
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    setCriticalAlert((prev) => (prev && prev.id === alert.id ? null : prev));
    pushToast(`Alerta ${accion.replaceAll('_', ' ').toLowerCase()}`, 'success');
    return alert;
  }, []);

  const dismissCritical = useCallback(() => {
    stopAlarm();
    setCriticalAlert(null);
  }, []);

  const pushToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      summary,
      vehicles,
      activeAlerts,
      config,
      latestEvents,
      criticalAlert,
      connected,
      serverUptime,
      toasts,
      theme,
      toggleTheme,
      login,
      logout,
      refreshAll,
      actionAlert,
      dismissCritical,
      pushToast,
      dismissToast
    }),
    [token, user, summary, vehicles, activeAlerts, config, latestEvents, criticalAlert, connected, serverUptime, toasts, theme, toggleTheme, login, logout, refreshAll, actionAlert, dismissCritical, pushToast, dismissToast]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

function EVENT_LABEL(tipo) {
  const map = {
    MICRO_SUENO: 'Micro sueño',
    SOMNOLENCIA_ALTA: 'Somnolencia alta',
    FATIGA_PROLONGADA: 'Fatiga prolongada',
    DISTRACCION: 'Distracción',
    SOS: 'Señal SOS',
    ACCIDENTE: 'Accidente'
  };
  return map[tipo] || tipo;
}

export function useApp() {
  return useContext(AppCtx);
}