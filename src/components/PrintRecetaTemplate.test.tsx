import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PrintRecetaTemplate } from './PrintRecetaTemplate';
import type { Receta } from '../types';

const t = (key: string): string => {
  const map: Record<string, string> = {
    print_pat_info: 'Paciente',
    print_issue_date: 'Data',
    print_receta_address: 'Endereço',
    print_receta_cpf: 'CPF',
    print_receta_title: 'RECEITUÁRIO',
    print_receta_emitter: 'Emissor',
    print_receta_via1: '1ª Via',
    print_receta_via2: '2ª Via',
    print_receta_med_table_med: 'Medicamentos',
    print_receta_patient_block: 'Identificação do Paciente',
    print_receta_ident: 'Identificação',
    print_receta_org_emissor: 'Órgão Emissor',
    print_receta_city: 'Cidade',
    print_receta_uf: 'UF',
    print_receta_supplier_block: 'Fornecedor',
  };
  return map[key] ?? key;
};

const mock = vi.hoisted(() => {
  const baseReceta: Receta = {
    id: 'REC-2026-0001',
    patientId: 'p1',
    patientName: 'JUAN PEREZ',
    date: '2026-08-12',
    patientAddress: 'Calle Falsa 123',
    patientCpf: 'ABC-12345',
    clinicName: 'Clinica Test',
    medications: [{ id: 'm1', text: 'Paracetamol 500mg' }],
    createdBy: 'Dr. Test',
  };
  return {
    receta: { ...baseReceta } as Receta | null,
    copies: 1,
    profiles: [] as unknown[],
    baseReceta,
  };
});

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    selectedRecetaForPrint: mock.receta,
    recetaPrintCopies: mock.copies,
    clinicProfiles: mock.profiles,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t }),
}));

const renderPrint = () => render(<PrintRecetaTemplate />);

describe('PrintRecetaTemplate — CPF en la impresión', () => {
  it('muestra el CPF junto a la fecha y la dirección del paciente', () => {
    renderPrint();
    expect(screen.getAllByText('ABC-12345').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el CPF en el bloque de identificación del paciente', () => {
    renderPrint();
    expect(screen.getAllByText('ABC-12345').length).toBeGreaterThanOrEqual(2);
  });

  it('no renderiza nada si no hay receta seleccionada', () => {
    mock.receta = null;
    const { container } = renderPrint();
    expect(container).toBeEmptyDOMElement();
    mock.receta = { ...mock.baseReceta };
  });
});
