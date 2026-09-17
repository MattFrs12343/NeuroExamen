import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
}

// Boundary de RAÍZ: envuelve TODO el árbol, incluido AppProvider y Layout.
// Es el último recurso para que un error inesperado en cualquier parte de la
// app (Sidebar, Header, el propio provider, etc.) NUNCA deje la pantalla en
// blanco — en vez de desmontar React completo, muestra este mensaje con un
// botón para recargar. Lo más probable es que un error acá sea transitorio;
// recargar restaura la sesión desde localStorage.
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[RootErrorBoundary]', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: '#0F4C81',
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 22,
            }}>!</div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Algo salió mal
            </h1>
            <p style={{ margin: '8px 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Ocurrió un error inesperado que impidió mostrar la pantalla.
              Recargá la página para continuar. Lamentablemente el error no
              afecta los datos guardados: tus registros ya guardados no se pierden.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                width: '100%', padding: '12px 16px',
                borderRadius: 12, border: 'none',
                background: '#0F4C81', color: '#fff',
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recargar la aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
