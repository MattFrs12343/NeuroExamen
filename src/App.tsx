import { createPortal } from 'react-dom';
import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { PrintTemplate } from './components/PrintTemplate';
import { PrintRecetaTemplate } from './components/PrintRecetaTemplate';
import { PrintEncaminhamentoTemplate } from './components/PrintEncaminhamentoTemplate';
import { PrintAtestadoTemplate } from './components/PrintAtestadoTemplate';
import { PrintSelectionModal } from './components/PrintSelectionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

// Cada vista se descarga solo cuando el usuario navega a ella — reduce el
// bundle inicial. Dashboard y Login quedan eager porque son la primera
// pantalla que ve cualquier usuario (logueado o no).
const OrdersList          = lazy(() => import('./views/OrdersList').then(m => ({ default: m.OrdersList })));
const NewOrder             = lazy(() => import('./views/NewOrder').then(m => ({ default: m.NewOrder })));
const Profile              = lazy(() => import('./views/Profile').then(m => ({ default: m.Profile })));
const Patients             = lazy(() => import('./views/Patients').then(m => ({ default: m.Patients })));
const RecetasList          = lazy(() => import('./views/RecetasList').then(m => ({ default: m.RecetasList })));
const NewReceta            = lazy(() => import('./views/NewReceta').then(m => ({ default: m.NewReceta })));
const EncaminhamentosList  = lazy(() => import('./views/EncaminhamentosList').then(m => ({ default: m.EncaminhamentosList })));
const NewEncaminhamento    = lazy(() => import('./views/NewEncaminhamento').then(m => ({ default: m.NewEncaminhamento })));
const AtestadosList        = lazy(() => import('./views/AtestadosList').then(m => ({ default: m.AtestadosList })));
const NewAtestado          = lazy(() => import('./views/NewAtestado').then(m => ({ default: m.NewAtestado })));

const ViewLoading = () => (
  <div className="flex items-center justify-center py-24 no-print">
    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0F4C81] animate-spin" />
  </div>
);

const ViewError = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-24 text-center no-print">
    <p className="text-sm font-semibold text-slate-700">No se pudo cargar esta sección.</p>
    <p className="text-xs text-slate-400">Probá recargar la página. El resto de la app sigue funcionando.</p>
  </div>
);

const AppContent: React.FC = () => {
  const { currentUser, currentView } = useApp();

  if (!currentUser || currentView === 'login') return <Login />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'orders':    return <OrdersList />;
      case 'new-order': return <NewOrder />;
      case 'profile':   return <Profile />;
      case 'patients':  return <Patients />;
      case 'recetas':   return <RecetasList />;
      case 'new-receta': return <NewReceta />;
      case 'encaminhamentos':     return <EncaminhamentosList />;
      case 'new-encaminhamento':  return <NewEncaminhamento />;
      case 'atestados':           return <AtestadosList />;
      case 'new-atestado':        return <NewAtestado />;
      default:          return <Dashboard />;
    }
  };

  // Cada plantilla de impresión y la vista activa tienen su propio Error
  // Boundary: si una sección falla, las demás (sidebar, header, otras
  // plantillas de impresión) siguen funcionando de forma independiente.
  return (
    <>
      <Layout>
        <ErrorBoundary fallback={<ViewError />}>
          <Suspense fallback={<ViewLoading />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </Layout>
      {createPortal(<ErrorBoundary><PrintTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintRecetaTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintEncaminhamentoTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintAtestadoTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintSelectionModal /></ErrorBoundary>, document.body)}
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
