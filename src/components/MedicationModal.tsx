import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Copy, Check } from 'lucide-react';
import { RichTextField } from './ui/rich-text-field';
import { RichText } from './RichText';
import { isRichTextEmpty, richTextToPlain } from '../lib/richText';
import { useTranslation } from 'react-i18next';

interface MedicationModalProps {
  open: boolean;
  onClose: () => void;
  medication: { id: string; text: string } | null;
  onSave: (id: string, text: string) => void;
  title?: string;
}

export const MedicationModal: React.FC<MedicationModalProps> = ({
  open,
  onClose,
  medication,
  onSave,
  title = 'Medicamento',
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const [editText, setEditText] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (open && medication) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local state with incoming medication prop
      setEditText(medication.text);
      setIsEditing(false);
      setCopied(false);
    }
  }, [open, medication]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const handleSave = () => {
    if (medication && !isRichTextEmpty(editText)) {
      onSave(medication.id, editText);
    }
    setIsEditing(false);
  };

  const handleCopy = async () => {
    if (!medication) return;
    const text = richTextToPlain(medication.text);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* ignore */ }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open || !medication) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl z-10 bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 overflow-hidden animate-scale-in"
      >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <Pencil size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('receta_med_modal_subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title={copied ? t('copied') : t('copy')}
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title={isEditing ? t('cancel') : t('edit')}
              >
                {isEditing ? <X size={16} /> : <Pencil size={16} />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <RichTextField
                  value={editText}
                  onChange={setEditText}
                  placeholder={t('receta_med_paragraph_placeholder')}
                  autoFocus
                  className="border border-slate-200 rounded-xl bg-slate-50/50 focus-within:border-emerald-500 focus-within:bg-white transition-colors overflow-hidden"
                  style={{ fontSize: '15px', lineHeight: 1.7, color: '#1F2937', padding: '14px 16px', minHeight: '40vh' }}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isRichTextEmpty(editText)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('med_modal_save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <RichText
                  html={medication.text}
                  tag="p"
                  className="text-base text-slate-700 leading-relaxed"
                  style={{ fontSize: '16px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
                />
              </div>
            )}
          </div>
    </div>
    </div>,
    document.body
  );
};