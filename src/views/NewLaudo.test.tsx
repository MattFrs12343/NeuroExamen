import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewLaudo } from './NewLaudo';
import type { Laudo, LaudoConclusaoOption } from '../types';

// t() identidad: las consultas apuntan a la clave i18n (ASCII) en vez de al
// texto. Evita depender de acentos literal y, sobre todo, de que dos
//-literales acentuados distintos en el mismo archivo Comparisons como mismo
// byte — que es lo que rompe getByTitle/title en este proyecto.
const t = (key: string): string => key;

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

const mock = vi.hoisted(() => ({
  laudoConclusoesCatalog: [] as LaudoConclusaoOption[],
  addLaudoConclusao: vi.fn(),
  renameLaudoConclusao: vi.fn(),
  deleteLaudoConclusao: vi.fn(),
  addLaudo: vi.fn(),
  updateLaudo: vi.fn(),
  setCurrentView: vi.fn(),
  setActiveLaudoForEdit: vi.fn(),
  activeLaudoForEdit: null as Laudo | null,
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    patients: [],
    clinicProfiles: [],
    laudoClinics: [],
    triggerDirectPrintLaudo: vi.fn(),
    addLaudo: mock.addLaudo,
    updateLaudo: mock.updateLaudo,
    activeLaudoForEdit: mock.activeLaudoForEdit,
    setActiveLaudoForEdit: mock.setActiveLaudoForEdit,
    saveLaudoClinicProfile: vi.fn(),
    // Con clínica ya elegida se entra directo a la hoja editable, que es
    // donde vive la sección Conclusão Pericial.
    lastClinicName: 'CLINICA TESTE',
    setLastClinicName: vi.fn(),
    laudoConclusoesCatalog: mock.laudoConclusoesCatalog,
    addLaudoConclusao: mock.addLaudoConclusao,
    renameLaudoConclusao: mock.renameLaudoConclusao,
    deleteLaudoConclusao: mock.deleteLaudoConclusao,
    signPrintBusy: false,
    setSignPrintBusy: vi.fn(),
    setCurrentView: mock.setCurrentView,
  }),
}));

// El selector de clínica abre su propio dropdown; no es parte de lo que se
// prueba acá y la hoja editable ya viene con clínica elegida.
vi.mock('../components/ClinicProfileField', () => ({ ClinicProfileField: () => null }));

const ORIGENALES: LaudoConclusaoOption[] = [
  { id: 'apto', label: 'Apto(a) para atividades laborais' },
  { id: 'inapto_temporario', label: 'Inapto(a) temporariamente para atividades laborais' },
  { id: 'inapto_definitivo', label: 'Inapto(a) definitivamente para atividades laborais' },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
  mock.laudoConclusoesCatalog = [...ORIGENALES];
  mock.activeLaudoForEdit = null;
  mock.addLaudoConclusao.mockImplementation((label: string) =>
    Promise.resolve({ id: `concl-${label.length}`, label }),
  );
  mock.renameLaudoConclusao.mockResolvedValue(undefined);
  mock.deleteLaudoConclusao.mockResolvedValue(undefined);
  mock.addLaudo.mockImplementation((data: object) =>
    Promise.resolve({ id: 'LAU-2026-0001', ...(data as object) }),
  );
});

/** La fila (radio + botones) de la opción con ese texto. */
const filaDaOpcao = (label: string): HTMLElement => {
  const el = screen.getByText(label).closest('.group');
  if (!el) throw new Error(`No se encontro la fila de la opcion "${label}"`);
  return el as HTMLElement;
};

const typePatient = async (user: ReturnType<typeof userEvent.setup>, patient = 'JUAN PEREZ') => {
  await user.type(screen.getByPlaceholderText('laudo_patient_placeholder'), patient);
};

const guardar = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'laudo_save_btn' }));
};

describe('NewLaudo — catalogo de Conclusao Pericial', () => {
  it('lista las opciones del catalogo, no las 3 fijas de antes', () => {
    mock.laudoConclusoesCatalog = [
      { id: 'apto', label: ORIGENALES[0].label },
      { id: 'concl-a1', label: 'Apto(a) com restricao de direcao' },
    ];
    render(<NewLaudo />);

    expect(screen.getByRole('radio', { name: 'Apto(a) com restricao de direcao' })).toBeInTheDocument();
    // Las originales que el medico borro del catalogo ya no se ofrecen.
    expect(screen.queryByRole('radio', { name: ORIGENALES[1].label })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: ORIGENALES[2].label })).not.toBeInTheDocument();
  });

  it('agrega una conclusion nueva y la deja marcada', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.type(screen.getByPlaceholderText('laudo_conclusao_add_placeholder'), 'Apto(a) com restricoes');
    await user.click(screen.getByRole('button', { name: 'laudo_conclusao_add_btn' }));

    await waitFor(() => {
      expect(mock.addLaudoConclusao).toHaveBeenCalledWith('Apto(a) com restricoes');
    });
  });

  it('no manda una conclusion en blanco', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.type(screen.getByPlaceholderText('laudo_conclusao_add_placeholder'), '   ');
    expect(screen.getByRole('button', { name: 'laudo_conclusao_add_btn' })).toBeDisabled();
  });

  it('edita el texto de una conclusion conservando su id', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.click(within(filaDaOpcao(ORIGENALES[2].label)).getByTitle('laudo_conclusao_edit'));
    const campo = screen.getByDisplayValue(ORIGENALES[2].label);
    await user.clear(campo);
    await user.type(campo, 'Inapto(a) de forma definitiva');
    await user.click(screen.getByTitle('laudo_conclusao_edit_save'));

    await waitFor(() => {
      expect(mock.renameLaudoConclusao).toHaveBeenCalledWith('inapto_definitivo', 'Inapto(a) de forma definitiva');
    });
  });

  it('descarta la edicion si se cancela', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.click(within(filaDaOpcao(ORIGENALES[0].label)).getByTitle('laudo_conclusao_edit'));
    await user.click(screen.getByTitle('laudo_conclusao_edit_cancel'));

    expect(mock.renameLaudoConclusao).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: ORIGENALES[0].label })).toBeInTheDocument();
  });

  it('elimina una opcion previa confirmacion', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.click(within(filaDaOpcao(ORIGENALES[0].label)).getByTitle('laudo_conclusao_delete'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mock.deleteLaudoConclusao).toHaveBeenCalledWith('apto');
    });
  });

  it('no borra si el medico cancela la confirmacion', async () => {
    window.confirm = vi.fn(() => false);
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.click(within(filaDaOpcao(ORIGENALES[0].label)).getByTitle('laudo_conclusao_delete'));

    expect(mock.deleteLaudoConclusao).not.toHaveBeenCalled();
  });

  it('desmarca la conclusion que se acaba de eliminar', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    // 'inapto_temporario' viene marcado por defecto.
    await user.click(within(filaDaOpcao(ORIGENALES[1].label)).getByTitle('laudo_conclusao_delete'));
    await typePatient(user);
    await guardar(user);

    await waitFor(() => {
      expect(mock.addLaudo).toHaveBeenCalled();
    });
    const data = mock.addLaudo.mock.calls.at(-1)?.[0] as Laudo;
    expect(data.conclusao).toBeUndefined();
  });

  it('guarda el id elegido JUNTO con la lista completa (snapshot para el PDF firmado)', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    await user.click(screen.getByRole('radio', { name: ORIGENALES[0].label }));
    await typePatient(user);
    await guardar(user);

    await waitFor(() => {
      expect(mock.addLaudo).toHaveBeenCalled();
    });
    const data = mock.addLaudo.mock.calls.at(-1)?.[0] as Laudo;
    expect(data.conclusao).toBe('apto');
    expect(data.conclusaoOpcoes).toEqual(ORIGENALES);
  });

  it('no manda lista de conclusiones cuando no se elige ninguna (la seccion no se imprime)', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    // 'inapto_temporario' viene marcado por defecto; un segundo click lo quita.
    await user.click(screen.getByRole('radio', { name: ORIGENALES[1].label }));
    await typePatient(user);
    await guardar(user);

    await waitFor(() => {
      expect(mock.addLaudo).toHaveBeenCalled();
    });
    const data = mock.addLaudo.mock.calls.at(-1)?.[0] as Laudo;
    expect(data.conclusao).toBeUndefined();
    expect(data.conclusaoOpcoes).toBeUndefined();
  });

  it('no manda la conclusion por defecto si esa opcion ya no existe en el catalogo', async () => {
    // El estado inicial marca 'inapto_temporario', pero el medico la borro del
    // catalogo: mandar ese id haria imprimir checkboxes sin marcar.
    mock.laudoConclusoesCatalog = [ORIGENALES[0], ORIGENALES[2]];
    const user = userEvent.setup();
    render(<NewLaudo />);

    expect(screen.queryByRole('radio', { name: ORIGENALES[1].label })).not.toBeInTheDocument();
    await typePatient(user);
    await guardar(user);

    await waitFor(() => {
      expect(mock.addLaudo).toHaveBeenCalled();
    });
    const data = mock.addLaudo.mock.calls.at(-1)?.[0] as Laudo;
    expect(data.conclusao).toBeUndefined();
    expect(data.conclusaoOpcoes).toBeUndefined();
  });

  it('al editar un laudo viejo muestra la opcion elegida aunque ya no este en el catalogo', () => {
    mock.laudoConclusoesCatalog = [ORIGENALES[0]];
    mock.activeLaudoForEdit = {
      id: 'LAU-2026-0001',
      patientName: 'JUAN PEREZ',
      narrative: 'Texto da narrativa.',
      createdBy: 'Dr. Teste',
      clinicName: 'CLINICA TESTE',
      conclusao: 'inapto_temporario',
      // El snapshot del laudo conserva el texto aunque la opcion se borrara.
      conclusaoOpcoes: [ORIGENALES[1]],
    };
    render(<NewLaudo />);

    expect(screen.getByRole('radio', { name: ORIGENALES[1].label })).toBeChecked();
  });
});

// El editor del modal se localiza por su placeholder en data-placeholder: el
// formulario tiene otros RichTextField (observações, perfil) que también son
// role="textbox" sin nombre accesible.
const editorNarrativa = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>(
    '[data-placeholder="laudo_narrative_placeholder"]',
  );
  if (!el) throw new Error('No se encontro el editor de narrativa del modal');
  return el;
};

describe('NewLaudo — modal de narrativa extendida', () => {
  it('queda acotado a la ventana y con scroll, para poder ver narratives largas', async () => {
    const user = userEvent.setup();
    render(<NewLaudo />);

    // El campo de narrativa del formulario abre el modal al hacer clic.
    await user.click(screen.getByText('laudo_narrative_placeholder'));
    await waitFor(() => expect(editorNarrativa()).toBeInTheDocument());

    const editor = editorNarrativa();
    const card = editor.closest('.max-w-3xl');
    const body = editor.closest('.overflow-y-auto');
    if (!card || !body) throw new Error('No se encontro la estructura del modal');

    // La tarjeta se limita a 90vh: sin esto el modal crecia mas alla de la
    // pantalla y, con el body bloqueado (overflow:hidden), el texto sobrante
    // quedaba inalcanzable.
    expect(card.className).toContain('max-h-[90vh]');
    expect(card.className).toContain('flex-col');
    // El cuerpo tiene su propio scroll...
    expect(body.className).toContain('overflow-y-auto');
    // ...y el area editable tambien esta acotada y desplazable.
    expect(editor.style.maxHeight).not.toBe('');
    expect(editor.style.overflowY).toBe('auto');
  });

  it('abre con la narrativa larga del laudo que se esta editando', async () => {
    mock.activeLaudoForEdit = {
      id: 'LAU-2026-0001',
      patientName: 'JUAN PEREZ',
      narrative: 'Texto pericial largo. '.repeat(80),
      createdBy: 'Dr. Teste',
      clinicName: 'CLINICA TESTE',
    };
    const user = userEvent.setup();
    render(<NewLaudo />);

    // El modal arranca ya con el texto dentro: es justo el caso en el que antes
    // se quedaba inalcanzable. Con la narrativa cargada la vista previa
    // muestra el texto (no el placeholder), así que se abre desde ella.
    await waitFor(() => expect(screen.getByText(/Texto pericial largo/)).toBeInTheDocument());
    await user.click(screen.getByText(/Texto pericial largo/));
    await waitFor(() => expect(editorNarrativa()).toBeInTheDocument());
    expect(editorNarrativa().innerHTML).toContain('Texto pericial largo.');
  });
});
