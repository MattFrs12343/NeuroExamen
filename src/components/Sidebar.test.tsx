import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';

const mock = vi.hoisted(() => {
  const state = {
    currentView: 'dashboard',
    activeEncProfile: 'neuromobius',
  };
  return {
    state,
    setCurrentView: vi.fn((v: string) => { state.currentView = v; }),
    setActiveEncProfile: vi.fn((p: string) => { state.activeEncProfile = p; }),
    logout: vi.fn(),
  };
});

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    currentView: mock.state.currentView,
    setCurrentView: mock.setCurrentView,
    logout: mock.logout,
    activeEncProfile: mock.state.activeEncProfile,
    setActiveEncProfile: mock.setActiveEncProfile,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderSidebar = () => render(<Sidebar isOpen={false} setIsOpen={vi.fn()} />);

// El submenú siempre está en el DOM (se oculta/muestra por CSS para animar),
// así que verificamos el estado visual por las clases de grid/opacidad.
const submenuState = () => {
  const el = screen.getByTestId('enc-submenu');
  return {
    expanded: el.classList.contains('grid-rows-[1fr]') && el.classList.contains('opacity-100'),
    collapsed: el.classList.contains('grid-rows-[0fr]') && el.classList.contains('opacity-0'),
  };
};

beforeEach(() => {
  mock.state.currentView = 'dashboard';
  mock.state.activeEncProfile = 'neuromobius';
  mock.setCurrentView.mockClear();
  mock.setActiveEncProfile.mockClear();
});

describe('Sidebar — submenú Encaminhamentos', () => {
  it('oculta las clínicas por defecto (submenú colapsado)', () => {
    renderSidebar();
    expect(submenuState().collapsed).toBe(true);
  });

  it('despliega ambas clínicas al hacer clic en Encaminhamentos', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'nav_encaminhamentos' }));
    expect(submenuState().expanded).toBe(true);
    expect(screen.getByText('NeuroMobius')).toBeInTheDocument();
    expect(screen.getByText('NeuroIsbe')).toBeInTheDocument();
  });

  it('al elegir una clínica activa el perfil y navega a encaminhamentos', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'nav_encaminhamentos' }));
    fireEvent.click(screen.getByText('NeuroIsbe'));
    expect(mock.setActiveEncProfile).toHaveBeenCalledWith('neuroisbe');
    expect(mock.setCurrentView).toHaveBeenCalledWith('encaminhamentos');
  });

  it('se abre automáticamente cuando ya estás en la sección encaminhamentos', () => {
    mock.state.currentView = 'encaminhamentos';
    renderSidebar();
    expect(submenuState().expanded).toBe(true);
    expect(screen.getByText('NeuroMobius')).toBeInTheDocument();
    expect(screen.getByText('NeuroIsbe')).toBeInTheDocument();
  });

  it('se cierra al seleccionar otra sección', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'nav_encaminhamentos' }));
    expect(submenuState().expanded).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'nav_recetas' }));
    expect(mock.setCurrentView).toHaveBeenCalledWith('recetas');
    expect(submenuState().collapsed).toBe(true);
  });
});
