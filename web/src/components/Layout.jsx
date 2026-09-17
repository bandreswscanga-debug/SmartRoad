import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Toasts from './Toasts';
import CriticalAlertModal from './CriticalAlertModal';
import { ShieldAlert } from 'lucide-react';
import { useApp } from '../store/AppContext';

const TITLES = {
  '/': ['Dashboard', 'Vista general del sistema SmartRoad S.O.S en tiempo real'],
  '/monitoreo': ['Monitoreo en vivo', 'Flotilla conectada: estado, riesgo y telemetría de cada dispositivo ESP32'],
  '/historial': ['Historial de eventos', 'Registro de anomalías de somnolencia y señales de emergencia (RF10)'],
  '/reportes': ['Reportes y analítica', 'Indicadores de fatiga y comportamiento de los conductores'],
  '/conductores': ['Conductores', 'Estado de fatiga, jornadas y seguimiento por conductor (RF10)'],
  '/alertas': ['Centro de alertas', 'Alertas críticas activas y gestionadas del sistema'],
  '/app-movil': ['App Móvil', 'Aplicación complementaria para el conductor (Flutter)'],
  '/configuracion': ['Configuración', 'Umbrales de riesgo, tipo de alerta y número de emergencia (CU-05)']
};

export default function Layout({ children }) {
  const { criticalAlert, activeAlerts } = useApp();
  const location = useLocation();
  const cfg = TITLES[location.pathname] || TITLES['/'];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = `${cfg[0]} · SmartRoad S.O.S`;
  }, [cfg]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="lg:pl-[236px]">
        <Header title={cfg[0]} subtitle={cfg[1]} onMenu={() => setMenuOpen((v) => !v)} menuOpen={menuOpen} />
        <main className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6">{children}</main>
      </div>
      <Toasts />
      {criticalAlert && <CriticalAlertModal alert={criticalAlert} />}
    </div>
  );
}