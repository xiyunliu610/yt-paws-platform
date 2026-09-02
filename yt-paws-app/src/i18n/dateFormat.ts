import type { Language } from './translations';

const localeFor = (language: Language) => (language === 'zh' ? 'zh-CN' : 'en-NZ');

export function formatLocalizedDate(value: string | Date, language: Language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatLocalizedDateTime(value: string | Date, language: Language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
