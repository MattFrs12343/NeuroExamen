/* eslint-disable react-refresh/only-export-components -- harness de
   reproducción/medición del modal de narrativa (NewLaudo). No forma parte de
   la app: lo monta scripts/check-modal-scroll.mjs vía /src/dev-modal.html. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { AppContext } from './context/AppContext';
import { NewLaudo } from './views/NewLaudo';
import i18n from './i18n';
import './index.css';
import type { Laudo } from './types';

// Narrativa larga a propósito: el bug era que el modal crecía sin cota y el
// texto sobrante quedaba fuera de la ventana sin forma de desplazarse.
const LARGO = `Exame eletroencefalografico realizado em regime de vigilia, com alteracoes lentas difusas. `.repeat(60);

const laudoParaEditar: Laudo = {
  id: 'LAU-2026-0001',
  patientName: 'JUAN PEREZ GARCIA',
  patientIdentityCard: 'RG 12.345.678-9',
  patientBirthDate: '03/05/1967',
  date: '2026-08-12',
  narrative: LARGO,
  cids: 'G40.9',
  conclusao: 'apto',
  conclusaoOpcoes: [{ id: 'apto', label: 'Apto(a) para atividades laborais' }],
  createdBy: 'Dr. Teste',
  clinicName: 'CLINICA TESTE',
};

const App: React.FC = () => (
  <AppContext.Provider
    value={
      {
        patients: [],
        clinicProfiles: [],
        laudoClinics: [],
        triggerDirectPrintLaudo: () => {},
        addLaudo: async () => undefined,
        updateLaudo: async () => undefined,
        activeLaudoForEdit: laudoParaEditar,
        setActiveLaudoForEdit: () => {},
        saveLaudoClinicProfile: async () => undefined,
        lastClinicName: 'CLINICA TESTE',
        setLastClinicName: () => {},
        laudoConclusoesCatalog: [
          { id: 'apto', label: 'Apto(a) para atividades laborais' },
          { id: 'inapto_temporario', label: 'Inapto(a) temporariamente para atividades laborais' },
        ],
        addLaudoConclusao: async () => undefined,
        renameLaudoConclusao: async () => undefined,
        deleteLaudoConclusao: async () => undefined,
        signPrintBusy: false,
        setSignPrintBusy: () => {},
        setCurrentView: () => {},
      } as never
    }
  >
    <I18nextProvider i18n={i18n}>
      <NewLaudo />
    </I18nextProvider>
  </AppContext.Provider>
);

createRoot(document.getElementById('root')!).render(<App />);
