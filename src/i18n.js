import { spanish } from './spanish.js';

export const LANGUAGE_KEY = 'ai-managers-interface-language-v1';
let language = 'en';
export function readLanguage() {
  try { language = localStorage.getItem(LANGUAGE_KEY) === 'es' ? 'es' : 'en'; }
  catch { language = 'en'; }
  return language;
}
export function setLanguage(value) { language = value === 'es' ? 'es' : 'en'; }

// Called only for interface text; never for record values or AI/source content.
export function t(text) {
  if (language !== 'es' || typeof text !== 'string') return text;
  const key = text.trim();
  const translated = Object.hasOwn(spanish, key) ? spanish[key] : undefined;
  if (translated !== undefined) return text.replace(key, () => translated);
  for (const [pattern, translation] of templates) {
    const match = key.match(pattern);
    if (match) return text.replace(key, () => translation.replace(/\{(\d+)\}/g, (_, index) => match[Number(index) + 1]));
  }
  return text;
}
const templates = Object.entries(spanish).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
  const pattern = key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]*?)');
  return [new RegExp(`^${pattern}$`), value];
});
