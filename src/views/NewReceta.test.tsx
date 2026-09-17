import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewReceta } from './NewReceta';
import type { Patient, Receta } from '../types';

const t = (key: string): string => {
  const map: Record<string, string> = {
    new_order_validation_pat: 'Selecciona o ingresa el paciente',
    receta_validation_meds: 'Agrega al menos un medicamento',
    receta_success: 'Guardado',
    receta_success_edit: 'Guardado',
    receta_sec_emitter: 'Dados do Emitente',
    receta_sec_patient: 'Dados do Paciente',
    receta_sec_medications: 'Prescrição',
    receta_sec_summary: 'Resumen',
    receta_emitter_prefeitura: 'Prefeitura',
    receta_clinic_select_placeholder: 'Selecciona clínica',
    optional: 'opcional',
    new_receta_title: 'Nueva Receta',
    pat_col_name: 'Nombre',
    new_order_pat_search: 'Buscar paciente...',
    new_order_smart_search_title: 'Resultados',
    new_order_date_label: 'Fecha',
    receta_pat_address_label: 'Endereço do Paciente',
    receta_pat_address_placeholder: 'Dirección del paciente...',
    receta_pat_cpf_label: 'CPF',
    receta_pat_cpf_placeholder: 'CPF del paciente...',
    receta_med_paragraph_placeholder: 'Medicamento, posología...',
    receta_med_add_btn: 'Agregar',
    save: 'Guardar',
    save_and_print: 'Guardar e imprimir',
    receta_clear_btn: 'Limpiar',
    cancel: 'Cancelar',
  };
  return map[key] ?? key;
};

const mock = vi.hoisted(() => {
  // Tipado explícito porque getLastKnownPatientPhone/Address se referencian
  // a sí mismas (vía `state`) dentro del propio literal que las define —
  // TS no puede inferir un tipo recursivo, hace falta declararlo.
  const state: {
    patients: Patient[];
    recetas: Receta[];
    addPatient: ReturnType<typeof vi.fn>;
    updatePatient: ReturnType<typeof vi.fn>;
    addReceta: ReturnType<typeof vi.fn>;
    setCurrentView: ReturnType<typeof vi.fn>;
    setActiveRecetaForEdit: ReturnType<typeof vi.fn>;
    triggerDirectPrintReceta: ReturnType<typeof vi.fn>;
    setLastClinicName: ReturnType<typeof vi.fn>;
    setRecetaPrintCopies: ReturnType<typeof vi.fn>;
    activeRecetaForEdit: Receta | null;
    clinicProfiles: unknown[];
    lastClinicName: string;
    // Referencias estables (definidas una sola vez acá, no en el factory de
    // useApp() de más abajo) — de lo contrario cada render del componente
    // ve una identidad de función distinta, y como NewReceta.tsx las lista
    // en el array de dependencias de un useEffect, eso dispara un loop
    // infinito de renders en el test (no pasa en la app real: ahí sí son
    // estables, vía useCallback en AppContext.tsx).
    getLastKnownPatientPhone: (patientId: string) => string;
    getLastKnownPatientAddress: (patientId: string) => string;
  } = {
    patients: [],
    recetas: [],
    addPatient: vi.fn(),
    updatePatient: vi.fn(),
    addReceta: vi.fn(),
    setCurrentView: vi.fn(),
    setActiveRecetaForEdit: vi.fn(),
    triggerDirectPrintReceta: vi.fn(),
    setLastClinicName: vi.fn(),
    setRecetaPrintCopies: vi.fn(),
    activeRecetaForEdit: null,
    clinicProfiles: [],
    lastClinicName: '',
    getLastKnownPatientPhone: (patientId: string): string =>
      state.recetas.find(r => r.patientId === patientId && r.patientPhone)?.patientPhone || '',
    getLastKnownPatientAddress: (patientId: string): string =>
      state.recetas.find(r => r.patientId === patientId && r.patientAddress)?.patientAddress || '',
  };
  return state;
});

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    patients: mock.patients,
    recetas: mock.recetas,
    clinicProfiles: mock.clinicProfiles,
    addPatient: mock.addPatient,
    updatePatient: mock.updatePatient,
    addReceta: mock.addReceta,
    updateReceta: vi.fn(),
    setCurrentView: mock.setCurrentView,
    activeRecetaForEdit: mock.activeRecetaForEdit,
    setActiveRecetaForEdit: mock.setActiveRecetaForEdit,
    triggerDirectPrintReceta: mock.triggerDirectPrintReceta,
    lastClinicName: mock.lastClinicName,
    setLastClinicName: mock.setLastClinicName,
    setRecetaPrintCopies: mock.setRecetaPrintCopies,
    getLastKnownPatientPhone: mock.getLastKnownPatientPhone,
    getLastKnownPatientAddress: mock.getLastKnownPatientAddress,
  }),
}));

vi.mock('../components/ClinicProfileField', () => ({
  ClinicProfileField: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }));
  mock.patients = [];
  mock.recetas = [];
  mock.activeRecetaForEdit = null;
  mock.clinicProfiles = [];
  mock.lastClinicName = '';
  mock.addPatient.mockResolvedValue({ id: 'new-1', name: 'PACIENTE' });
  mock.addReceta.mockImplementation((data: unknown) =>
    Promise.resolve({ id: 'REC-2026-0001', patientId: 'p1', medications: [], ...(data as object) })
  );
});

const medModalEditor = (): HTMLElement => {
  const editor = screen.getAllByRole('textbox').find(
    el => (el as HTMLElement).getAttribute('data-placeholder') === 'Medicamento, posología...'
  );
  if (!editor) throw new Error('No se encontró el editor del medicamento en el modal');
  return editor as HTMLElement;
};

const fillMedAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText('Medicamento, posología...'));
  await user.type(medModalEditor(), 'Paracetamol 500mg');
  const addBtns = screen.getAllByRole('button', { name: 'Agregar' });
  await user.click(addBtns[addBtns.length - 1]);
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
};

describe('NewReceta — Endereço do Paciente + CPF', () => {
  it('guarda dirección y CPF cuando se crea un paciente NUEVO', async () => {
    const user = userEvent.setup();
    mock.addPatient.mockResolvedValue({
      id: 'new-1', name: 'MARIA DA SILVA', address: 'Rua das Flores, 100', identityCard: '111.222.333-44',
    });

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'MARIA DA SILVA');
    await user.type(screen.getByPlaceholderText('Dirección del paciente...'), 'Rua das Flores, 100');
    await user.type(screen.getByPlaceholderText('CPF del paciente...'), '111.222.333-44');
    await fillMedAndSave(user);

    await waitFor(() => {
      expect(mock.addPatient).toHaveBeenCalledWith({
        name: 'MARIA DA SILVA',
        address: 'Rua das Flores, 100',
        identityCard: '111.222.333-44',
      });
    });
  });

  it('persiste dirección Y CPF juntos al guardar para un paciente existente', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JUAN PEREZ' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'JUAN PEREZ');
    await user.type(screen.getByPlaceholderText('Dirección del paciente...'), 'Calle Falsa 123');
    await user.type(screen.getByPlaceholderText('CPF del paciente...'), 'ABC-12345');
    await fillMedAndSave(user);

    await waitFor(() => {
      expect(mock.updatePatient).toHaveBeenCalled();
    });

    const lastCall = mock.updatePatient.mock.calls.at(-1)?.[0] as Patient;
    expect(lastCall).toBeDefined();
    expect(lastCall.address).toBe('Calle Falsa 123');
    expect(lastCall.identityCard).toBe('ABC-12345');
  });

  it('autocompleta dirección y CPF al seleccionar un paciente existente', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JUAN PEREZ', address: 'Calle Falsa 123', identityCard: 'ABC-12345' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'JUAN');
    fireEvent.mouseDown(screen.getByRole('button', { name: /JUAN PEREZ/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Dirección del paciente...')).toHaveValue('Calle Falsa 123');
      expect(screen.getByPlaceholderText('CPF del paciente...')).toHaveValue('ABC-12345');
    });
  });

  it('autocompleta dirección y CPF desde la receta más reciente si el paciente no los tiene', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JUAN PEREZ' }];
    mock.recetas = [
      {
        id: 'REC-2026-0001',
        patientId: 'p1',
        patientName: 'JUAN PEREZ',
        date: '2026-08-10',
        patientAddress: 'Av. Siempreviva 742',
        patientCpf: '999.888.777-66',
        medications: [],
        createdBy: 'Dr. Test',
      },
    ];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'JUAN');
    fireEvent.mouseDown(screen.getByRole('button', { name: /JUAN PEREZ/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Dirección del paciente...')).toHaveValue('Av. Siempreviva 742');
      expect(screen.getByPlaceholderText('CPF del paciente...')).toHaveValue('999.888.777-66');
    });
  });

  it('NO autocompleta con solo teclear/pegar el nombre completo (evita vincular al paciente equivocado)', async () => {
    // El nombre no es único en la base: autoseleccionar el paciente en cada
    // tecla/pegado (sin que el Dr. elija explícitamente de la lista) puede
    // enganchar el registro a OTRO paciente homónimo y terminar imprimiendo
    // sus datos. La vinculación solo debe ocurrir al elegir del desplegable.
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JOAO BATISTA CORREA (', address: 'TRAVESSA LAZARO # 480' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'joao batista correa');

    expect(screen.getByPlaceholderText('Dirección del paciente...')).toHaveValue('');
  });

  it('sigue autocompletando dirección al elegir del desplegable aunque el registro tenga basura', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JOAO BATISTA CORREA (', address: 'TRAVESSA LAZARO # 480' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'joao');
    fireEvent.mouseDown(screen.getByRole('button', { name: /JOAO BATISTA CORREA/ }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Dirección del paciente...')).toHaveValue('TRAVESSA LAZARO # 480');
    });
  });

  it('bloquea el guardado y avisa cuando el nombre tecleado coincide con más de un paciente', async () => {
    const user = userEvent.setup();
    mock.patients = [
      { id: 'p1', name: 'MARIA SOUZA', address: 'Rua A, 1' },
      { id: 'p2', name: 'MARIA SOUZA', address: 'Rua B, 2' },
    ];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'MARIA SOUZA');
    await fillMedAndSave(user);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('patient_ambiguous_match');
    });
    expect(mock.addReceta).not.toHaveBeenCalled();
  });

  it('muestra en el desplegable pacientes con nombre con basura al teclear el nombre limpio', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JOAO BATISTA CORREA (', address: 'TRAVESSA LAZARO # 480' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'joao batista');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /JOAO BATISTA CORREA/ })).toBeInTheDocument();
    });
  });

  it('reutiliza el paciente existente al guardar aunque su nombre tenga basura (no crea duplicado)', async () => {
    const user = userEvent.setup();
    mock.patients = [{ id: 'p1', name: 'JOAO BATISTA CORREA (', address: 'TRAVESSA LAZARO # 480' }];

    render(<NewReceta />);

    await user.type(screen.getByPlaceholderText('Buscar paciente...'), 'joao batista correa');
    await fillMedAndSave(user);

    await waitFor(() => {
      expect(mock.addPatient).not.toHaveBeenCalled();
      expect(mock.addReceta).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
    });
  });
});
