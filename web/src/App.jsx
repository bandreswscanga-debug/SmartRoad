import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './store/AppContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import RegistroConductor from './pages/RegistroConductor';
import Dashboard from './pages/Dashboard';
import Monitoreo from './pages/Monitoreo';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Conductores from './pages/Conductores';
import Alertas from './pages/Alertas';
import AppMovil from './pages/AppMovil';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import ConductorInicio from './pages/ConductorInicio';
import ConductorMonitoreo from './pages/ConductorMonitoreo';

function Protected({ children }) {
  const { token } = useApp();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useApp();
  return <Navigate to={user?.rol === 'conductor' ? '/conductor' : '/'} replace />;
}

export default function App() {
  const { token } = useApp();
  return (
    <ErrorBoundary>
      <Routes>
      <Route
        path="/login"
        element={token ? <HomeRedirect /> : <Login />}
      />
      <Route path="/registro-conductor" element={token ? <Navigate to="/" replace /> : <RegistroConductor />} />
      <Route path="/conductor" element={<Protected><Layout><ConductorInicio /></Layout></Protected>} />
      <Route path="/conductor/monitoreo" element={<Protected><Layout><ConductorMonitoreo /></Layout></Protected>} />
      <Route path="/conductor/eventos" element={<Protected><Layout><ConductorInicio showEvents /></Layout></Protected>} />
      <Route path="/conductor/configuracion" element={<Protected><Layout><Configuracion /></Layout></Protected>} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="monitoreo" element={<Monitoreo />} />
                <Route path="historial" element={<Historial />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="conductores" element={<Conductores />} />
                <Route path="alertas" element={<Alertas />} />
                <Route path="app-movil" element={<AppMovil />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}