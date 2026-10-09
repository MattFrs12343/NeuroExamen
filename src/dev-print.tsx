/* eslint-disable react-refresh/only-export-components -- harness de
   reproducción/medición de la plantilla de impresión: no es parte de la app,
   lo monta scripts/repro-print.mjs vía /src/dev-print.html. */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { AppContext } from './context/AppContext';
import { PrintLaudoTemplate } from './components/PrintLaudoTemplate';
import i18n from './i18n';
import './index.css';
import type { Laudo } from './types';

// Harness de desarrollo para reproducir/medir el layout de impresión del
// laudo (PrintLaudoTemplate) sin tener que pasar por login/API. NO forma
// parte de la app. El driver Playwright (scripts/repro-print.mjs) navega a
// /src/dev-print.html?n=..&o=.. y expone window.__laudoRepro para re-render.
const LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation. ';
const OBS = 'Paciente com quadro estavel, em acompanhamento mensal, com boa evolucao clinica. ';

const buildLaudo = (narrativeReps: number, obsReps: number): Laudo => ({
  id: 'REPRO-1',
  patientName: 'JUAN PEREZ GARCIA',
  patientIdentityCard: 'RG 12.345.678-9',
  patientBirthDate: '03/05/1967',
  orgao: 'IAMSPE',
  date: '2026-08-12',
  local: 'Campinas - SP',
  narrative: narrativeReps > 0 ? LONG.repeat(narrativeReps) : 'Corto.',
  cids: 'F33 + F40 + F41.9',
  conclusao: 'apto',
  conclusaoOpcoes: [
    { id: 'apto', label: 'Apto(a) para atividades laborais' },
    { id: 'inapto_temporario', label: 'Inapto(a) temporariamente para atividades laborais' },
    { id: 'inapto_definitivo', label: 'Inapto(a) definitivamente para atividades laborais' },
  ],
  afastamentoDias: 190,
  observacoes: obsReps > 0 ? OBS.repeat(obsReps) : '',
  clinicName: 'CLINICA SAUDE CAMPINAS',
  clinicAddress: 'Rua 13 de Maio, 1011 - Centro, Campinas - SP',
  clinicPhone: '(19) 3231-8800',
  doctorName: 'DR. ROBERTO CARLOS DA SILVA',
  doctorCrm: 'CRM-SP 123456',
  templateId: 'clinica_saude_campinas',
  createdBy: 'Dr. Roberto',
});

const App: React.FC<{ narrativeReps: number; obsReps: number }> = ({ narrativeReps, obsReps }) => (
  <AppContext.Provider
    value={
      {
        selectedLaudoForPrint: buildLaudo(narrativeReps, obsReps),
        laudoClinics: [],
      } as never
    }
  >
    <I18nextProvider i18n={i18n}>
      <PrintLaudoTemplate />
    </I18nextProvider>
  </AppContext.Provider>
);

const Root = () => {
  const params = new URLSearchParams(window.location.search);
  const [narrativeReps, setNarrativeReps] = useState(() => parseInt(params.get('n') || '40', 10) || 0);
  const [obsReps, setObsReps] = useState(() => parseInt(params.get('o') || '10', 10) || 0);

  useEffect(() => {
    (
      window as unknown as {
        __laudoRepro?: { set: (n: number, o: number) => void };
      }
    ).__laudoRepro = {
      set: (n, o) => {
        setNarrativeReps(n);
        setObsReps(o);
      },
    };
  }, []);

  return <App narrativeReps={narrativeReps} obsReps={obsReps} />;
};

// Montaje FUERA de #root: index.css esconde #root en @media print
// (display:none) y la app real monta esta plantilla con
// createPortal(..., document.body). Dentro de #root el harness no tendría
// layout en modo print y todas las medidas de scripts/repro-print.mjs
// saldrían 0/null (sin poder validar nada en el modo que realmente se
// imprime).
const mount = document.createElement('div');
mount.id = 'print-root';
document.body.appendChild(mount);
createRoot(mount).render(<Root />);