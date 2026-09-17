import { Component } from 'react';
import { ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[SmartRoad] error de renderizado:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-4">
        <div className="w-full max-w-lg animate-rise">
          <div className="card p-7">
            <div className="mb-4 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger text-white">
                <ShieldAlert size={26} />
              </span>
              <div>
                <p className="text-lg font-black text-danger-bright">Ocurrió un error</p>
                <p className="text-sm text-muted">El panel no pudo mostrarse. Detalles en la consola.</p>
              </div>
            </div>
            <pre className="max-h-52 overflow-auto rounded-xl border border-danger/40 bg-danger/10 p-4 text-[11px] whitespace-pre-wrap text-danger-bright">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div className="mt-5 flex gap-2">
              <button className="btn-primary flex-1" onClick={() => window.location.reload()}>
                Recargar página
              </button>
              <button
                className="btn-ghost flex-1"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                Reiniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}