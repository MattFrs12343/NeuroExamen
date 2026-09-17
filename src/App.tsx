import { createPortal } from 'react-dom';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { PrintTemplate } from './components/PrintTemplate';
import { PrintRecetaTemplate } from './components/PrintRecetaTemplate';
import { PrintEncaminhamentoTemplate } from './components/PrintEncaminhamentoTemplate';
import { PrintAtestadoTemplate } from './components/PrintAtestadoTemplate';
import { PrintFormulaLeiteTemplate } from './components/PrintFormulaLeiteTemplate';
import { PrintReceituarioTemplate } from './components/PrintReceituarioTemplate';
import { PrintLaudoTemplate } from './components/PrintLaudoTemplate';
import { PrintSelectionModal } from './components/PrintSelectionModal';
import { BrandSpinner } from './components/BrandSpinner';
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
const FormulaLeiteList     = lazy(() => import('./views/FormulaLeiteList').then(m => ({ default: m.FormulaLeiteList })));
const NewFormulaLeite      = lazy(() => import('./views/NewFormulaLeite').then(m => ({ default: m.NewFormulaLeite })));
const Receituario          = lazy(() => import('./views/Receituario').then(m => ({ default: m.Receituario })));
const ReceituariosList     = lazy(() => import('./views/ReceituariosList').then(m => ({ default: m.ReceituariosList })));
const LaudosList           = lazy(() => import('./views/LaudosList').then(m => ({ default: m.LaudosList })));
const NewLaudo             = lazy(() => import('./views/NewLaudo').then(m => ({ default: m.NewLaudo })));

const ViewLoading = () => (
  <div className="flex items-center justify-center py-24 no-print">
    <BrandSpinner size={56} />
  </div>
);

const ViewError = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-24 text-center no-print">
    <p className="text-sm font-semibold text-slate-700">No se pudo cargar esta sección.</p>
    <p className="text-xs text-slate-400">Probá recargar la página. El resto de la app sigue funcionando.</p>
  </div>
);

// Overlay de pantalla completa mientras dura "Assinar e Imprimir" — captura
// (html2canvas) + subida + firma en el servidor pueden tardar varios
// segundos y bloquean bastante el hilo principal; sin este overlay, la app
// se siente "trabada" en vez de "trabajando". Vive acá (fuera de cada
// vista) porque el flujo se dispara desde varios lugares distintos (listas
// y formularios de Encaminhamentos/Recetas/Pedidos) y todos comparten el
// mismo signPrintBusy de AppContext.
const SignPrintOverlay: React.FC = () => {
  const { t } = useTranslation();
  const { signPrintBusy } = useApp();
  if (!signPrintBusy) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm no-print">
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-white px-8 py-7 shadow-xl">
        <BrandSpinner size={56} />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">{t('sign_print_loading')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('sign_print_loading_desc')}</p>
        </div>
      </div>
    </div>
  );
};

// Overlay de carga inicial: mientras el contexto `loading` esté en true
// (primer fetch de datos tras el login), se muestra primero el spinner de
// marca y recién cuando terminó de cargar se deja ver el contenido.
const InitLoadingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const { loading, currentUser } = useApp();
  if (!loading || !currentUser) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-5 bg-white no-print">
      <BrandSpinner size={64} />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900">{t('loading_platform')}</p>
        <p className="text-xs text-slate-500 mt-0.5">{t('loading_platform_desc')}</p>
      </div>
    </div>
  );
};

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
      case 'formula-leite':       return <FormulaLeiteList />;
      case 'new-formula-leite':   return <NewFormulaLeite />;
      case 'receituarios':        return <ReceituariosList />;
      case 'new-receituario':     return <Receituario />;
      case 'laudos':              return <LaudosList />;
      case 'new-laudo':           return <NewLaudo />;
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
      {createPortal(<ErrorBoundary><PrintFormulaLeiteTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintReceituarioTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintLaudoTemplate /></ErrorBoundary>, document.body)}
      {createPortal(<ErrorBoundary><PrintSelectionModal /></ErrorBoundary>, document.body)}
      {createPortal(<SignPrintOverlay />, document.body)}
      {createPortal(<InitLoadingOverlay />, document.body)}
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
