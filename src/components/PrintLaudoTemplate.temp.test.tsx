import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { PrintLaudoTemplate } from './PrintLaudoTemplate';
import type { Laudo } from '../types';

// En jsdom todas las medidas son 0 y el reparto colapsa en UNA hoja, así que
// el encabezado de continuidad (hoja 2+) nunca se pinta. Para poder afirmar su
// geometría forzamos un plan de DOS hojas desde el propio paginador.
const plan = vi.hoisted(() => ({ forceTwoPanes: false }));

vi.mock('../lib/printPagination', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/printPagination')>();
  const twoPanes = (): import('../lib/printPagination').PanePlan[] => [
    { blocks: [], usedPx: 100, leadMarginTopPx: 0 },
    { blocks: [], usedPx: 100, leadMarginTopPx: 0 },
  ];
  return {
    ...actual,
    planDocIntoPanes: ((
      blocks: import('../lib/printPagination').DocBlock[],
      opts: import('../lib/printPagination').PanePlanOptions,
    ) =>
      plan.forceTwoPanes ? twoPanes() : actual.planDocIntoPanes(blocks, opts)) as typeof actual.planDocIntoPanes,
  };
});

const t = (key: string, opts?: { current?: number; total?: number }): string => {
  const map: Record<string, string> = {
    print_laudo_title: 'LAUDO PERICIAL',
    print_laudo_patient_label: 'Paciente',
    print_laudo_birth_label: 'Nascimento:',
    print_laudo_doc_label: 'Documento:',
    print_laudo_base_info_label: 'Base de Informações',
    print_laudo_ao_perito: 'AO SENHOR PERITO',
    print_laudo_grato: 'Atenciosamente,',
    print_laudo_diagnostico_label: 'Diagnóstico',
    print_laudo_conclusao_label: 'Conclusão',
    print_laudo_afastamento_label: 'Afastamento',
    laudo_afastamento_de: 'Por um período de',
    laudo_dias: 'dias',
    print_laudo_observacoes_label: 'Observações',
    print_laudo_local_data: 'Local e data',
    print_laudo_page_of: `Página ${opts?.current} de ${opts?.total}`,
  };
  return map[key] ?? key;
};

const store = vi.hoisted(() => {
  const laudo: Laudo = {
    id: 'L1',
    patientName: 'JUAN PEREZ',
    patientIdentityCard: 'RG 12.345.678-9',
    patientBirthDate: '03/05/1967',
    orgao: 'IAMSPE',
    date: '2026-08-12',
    local: 'Campinas - SP',
    narrative: 'Lorem ipsum dolor sit amet. '.repeat(40),
    cids: 'F33 + F40 + F41.9',
    diagnostico: '',
    conclusao: 'apto',
    conclusaoOpcoes: [
      { id: 'apto', label: 'Apto(a) para atividades laborais' },
      { id: 'inapto_temporario', label: 'Inapto(a) temporariamente' },
      { id: 'inapto_definitivo', label: 'Inapto(a) definitivamente' },
    ],
    afastamentoDias: 190,
    observacoes: 'Paciente com quadro estável. '.repeat(10),
    clinicName: 'CLINICA SAUDE CAMPINAS',
    clinicAddress: 'Rua Teste, 123',
    clinicPhone: '(19) 99999-9999',
    doctorName: 'DR. FULANO',
    doctorCrm: 'CRM 123456',
    templateId: 'clinica_saude_campinas',
    createdBy: 'Dr. Fulano',
  };
  return { laudo: laudo as Laudo | null, laudoClinics: [] as unknown[] };
});

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    selectedLaudoForPrint: store.laudo,
    laudoClinics: store.laudoClinics,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

// Copia del laudo de prueba: los casos siguientes lo vacían.
const baseLaudo = store.laudo!;
const shortLaudo = () => ({
  ...baseLaudo,
  narrative: 'Corto.',
  conclusao: '',
  conclusaoOpcoes: [],
  afastamentoDias: undefined,
  observacoes: '',
});

describe('PrintLaudoTemplate repro', () => {
  it('renderiza sin tirar', () => {
    const { container } = render(<PrintLaudoTemplate />);
    expect(container.querySelector('.print-area-laudo')).not.toBeNull();
    expect(container.textContent).toContain('JUAN PEREZ');
  });
  it('renderiza con laudo corto (1 hoja)', () => {
    store.laudo = shortLaudo();
    const { container } = render(<PrintLaudoTemplate />);
    expect(container.textContent).toContain('Corto.');
    store.laudo = null;
  });
  it('cada hoja lleva su contenido y la firma está en la última', () => {
    store.laudo = shortLaudo();
    const { container } = render(<PrintLaudoTemplate />);
    // Sin layout en jsdom todo mediría 0: el reparto debe colapsar en una
    // sola hoja, con el contenido y la firma dentro de ella.
    const sheets = container.querySelectorAll('.print-area-laudo > div');
    expect(sheets.length).toBe(1);
    expect(sheets[0].textContent).toContain('Corto.');
    expect(sheets[0].textContent).toContain('DR. FULANO');
    store.laudo = null;
  });

  it('el encabezado de continuidad (hoja 2+) respeta el margen lateral', async () => {
    store.laudo = shortLaudo();
    plan.forceTwoPanes = true;
    try {
      const { container } = render(<PrintLaudoTemplate />);
      await waitFor(() =>
        expect(container.querySelectorAll('.print-area-laudo > div').length).toBe(2),
      );
      const sheets = container.querySelectorAll('.print-area-laudo > div');
      const header = Array.from(sheets[1].querySelectorAll('div')).find(
        (d) => d.getAttribute('aria-hidden') === 'true' && /Página 2 de 2/.test(d.textContent ?? ''),
      );
      expect(header, 'falta el encabezado de continuidad en la hoja 2').toBeTruthy();
      // left/right en mm de la hoja (SIDE_MM = 18), NO en 0: un absoluto se
      // ancla a la padding-box del ancestro posicionado, así que left:0 caía
      // en el borde físico de la hoja y el nombre salía pegado al borde.
      expect(header!.style.left).toBe('18mm');
      expect(header!.style.right).toBe('18mm');
      expect(header!.style.top).toBe('5mm');
    } finally {
      plan.forceTwoPanes = false;
      store.laudo = null;
    }
  });
});

afterEach(() => {
  plan.forceTwoPanes = false;
  store.laudo = null;
});
