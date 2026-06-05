import { createPortal } from 'react-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { OrdersList } from './views/OrdersList';
import { NewOrder } from './views/NewOrder';
import { Profile } from './views/Profile';
import { Patients } from './views/Patients';
import { PrintTemplate } from './components/PrintTemplate';
import './App.css';

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
      default:          return <Dashboard />;
    }
  };

  return (
    <>
      <Layout>{renderView()}</Layout>
      {createPortal(<PrintTemplate />, document.body)}
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
