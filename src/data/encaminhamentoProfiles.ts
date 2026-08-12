import NeuroCerebroImg from '../assets/print-neurocerebro.webp';
import NeuroMobiusImg from '../assets/print-neuomobius.webp';
import CerebroImg from '../assets/cerebro.png';

// ── Perfiles de documento de la sección Encaminhamentos ─────────────────────
// Cada clínica es un "tema" completo: identidad en el UI de la sección y en la
// plantilla de impresión. Todo lo que varía por clínica vive aquí.

export type EncProfileKey = 'neuromobius' | 'neuroisbe';

export interface EncProfile {
  key: EncProfileKey;
  label: string;
  // UI de la sección
  primary: string;
  primaryDark: string;
  primaryMid: string;
  // Plantilla de impresión
  printDark: string;
  printPrimary: string;
  printPrimaryMid: string;
  printSurface: string;
  printSurfaceBorder: string;
  printLine: string;
  printBody: string;
  printSecondary: string;
  printMuted: string;
  printQrDark: string;
  printHeaderVariant: 'flat' | 'gradient';
  // Degradado del encabezado y de la onda del footer
  gradientFrom: string;
  gradientMid: string;
  gradientTo: string;
  /** Emblema principal del encabezado (izquierda). */
  mainLogo: string;
  /** Logotipo institucional que algunos perfiles muestran a la derecha. */
  logo: string;
  logoAlt: string;
  /** Muestra contactos (teléfono/email) y QR en el pie de impresión. */
  footerContacts: boolean;
  /** Muestra el logotipo secundario a la derecha del encabezado. */
  headerRightLogo: boolean;
  headerSpecialties: string[];
  phone: string;
  email: string;
  whatsappUrl: string;
}

const CONTACTS = {
  phone: '(11) 96860-6652',
  email: 'neuromobiusclinic@gmail.com',
  whatsappUrl: 'https://wa.me/5511968606652',
};

const SPECIALTIES = [
  'NEUROLOGIA',
  'PSIQUIATRIA',
  'NEUROPEDIATRIA',
  'PSIQUIATRIA DA INFÂNCIA E ADOLESCÊNCIA',
];

export const DEFAULT_ENC_PROFILE: EncProfileKey = 'neuromobius';

export const ENC_PROFILES: Record<EncProfileKey, EncProfile> = {
  neuromobius: {
    key: 'neuromobius',
    label: 'NeuroMobius',
    primary: '#5146B8',
    primaryDark: '#4A3FA8',
    primaryMid: '#9C93D8',
    printDark: '#4A3FA8',
    printPrimary: '#5146B8',
    printPrimaryMid: '#9C93D8',
    printSurface: '#F4F2FB',
    printSurfaceBorder: '#DFDBF2',
    printLine: '#E3E1EC',
    printBody: '#26262F',
    printSecondary: '#6E6E85',
    printMuted: '#A0A0B4',
    printQrDark: '#9C93D8',
    printHeaderVariant: 'flat',
    gradientFrom: '#5146B8',
    gradientMid: '#9C93D8',
    gradientTo: '#F4F2FB',
    mainLogo: NeuroCerebroImg,
    logo: NeuroMobiusImg,
    logoAlt: 'NeuroMobius',
    footerContacts: true,
    headerRightLogo: true,
    headerSpecialties: SPECIALTIES,
    ...CONTACTS,
  },
  neuroisbe: {
    key: 'neuroisbe',
    label: 'NeuroIsbe',
    primary: '#0F4C81',
    primaryDark: '#0a3a63',
    primaryMid: '#06B6D4',
    printDark: '#0F4C81',
    printPrimary: '#0F4C81',
    printPrimaryMid: '#06B6D4',
    printSurface: '#EFF6FF',
    printSurfaceBorder: '#BFDBFE',
    printLine: '#E2E8F0',
    printBody: '#101419',
    printSecondary: '#475569',
    printMuted: '#94A3B8',
    printQrDark: '#0F4C81',
    printHeaderVariant: 'gradient',
    gradientFrom: '#0F4C81',
    gradientMid: '#0891B2',
    gradientTo: '#06B6D4',
    mainLogo: CerebroImg,
    logo: NeuroMobiusImg,
    logoAlt: 'NeuroIsbe',
    footerContacts: false,
    headerRightLogo: false,
    headerSpecialties: SPECIALTIES,
    ...CONTACTS,
  },
};

export const getEncProfile = (templateId?: string | null): EncProfile =>
  templateId === 'neuroisbe' ? ENC_PROFILES.neuroisbe : ENC_PROFILES.neuromobius;

export const ENC_PROFILE_KEYS = Object.keys(ENC_PROFILES) as EncProfileKey[];

// Convierte #RRGGBB + alpha a un rgba() usable en estilos inline.
export const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Clases Tailwind literales por perfil (Tailwind solo genera las que ve escritas
// en el código, por eso se componen strings completos por clínica).
export const encUi = (profileKey: EncProfileKey) => {
  const purple = profileKey === 'neuromobius';
  return {
    iconBox: purple ? 'bg-[#5146B8]/8 border border-[#5146B8]/15' : 'bg-[#0F4C81]/8 border border-[#0F4C81]/15',
    iconCls: purple ? 'text-[#5146B8]' : 'text-[#0F4C81]',
    solidBtn: purple ? 'bg-[#5146B8] hover:bg-[#4A3FA8]' : 'bg-[#0F4C81] hover:bg-[#0a3a63]',
    solidBadge: purple ? 'bg-[#5146B8]' : 'bg-[#0F4C81]',
    checkedOption: purple
      ? 'bg-[#5146B8]/8 border-[#5146B8]/30 text-[#5146B8]'
      : 'bg-[#0F4C81]/8 border-[#0F4C81]/30 text-[#0F4C81]',
    accentInput: purple ? 'accent-[#5146B8]' : 'accent-[#0F4C81]',
    focusBorder: purple ? 'focus:border-[#5146B8]/50' : 'focus:border-[#0F4C81]/50',
    avatar: purple ? 'bg-[#5146B8]/10 text-[#5146B8]' : 'bg-[#0F4C81]/10 text-[#0F4C81]',
    dot: purple ? 'bg-[#5146B8]' : 'bg-[#0F4C81]',
    hoverIcon: purple ? 'hover:text-[#5146B8] hover:bg-[#5146B8]/8' : 'hover:text-[#0F4C81] hover:bg-[#0F4C81]/8',
    pageActive: purple ? 'bg-[#5146B8] text-white border-[#5146B8]' : 'bg-[#0F4C81] text-white border-[#0F4C81]',
  };
};