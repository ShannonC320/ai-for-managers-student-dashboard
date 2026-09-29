import { questions, capabilities, statements, classifications, reviews, interventions, owners } from './finalIntegrationContent.js';
export const FINAL_KEY = 'ai-managers-final-integration-v1';
export const emptyFinal = () => ({ version: 1, answers: {}, submitted: null, coastal: {}, coastalCompleted: false });
export function assess(answers) {
  const correct = questions.filter(q => answers[q.id] === q.correct);
  return { total: correct.length, capabilities: capabilities.map((_, index) => questions.filter(q => q.capability === index).every(q => answers[q.id] === q.correct)) };
}
export const coastalSelects = [...statements.map(s => ({ ...s, options: classifications })), ...reviews, { id: 'intervention', options: interventions }, { id: 'owner', options: owners }];
const written = ['justification', 'action', 'reason'];
export function coastalComplete(value) {
  return coastalSelects.every(s => s.options.some(o => o.id === value[s.id])) && written.every(key => typeof value[key] === 'string' && value[key].trim().length > 0 && value[key].length <= 400);
}
export function readFinal() {
  try {
    const raw = localStorage.getItem(FINAL_KEY);
    if (!raw) return { data: emptyFinal(), error: false };
    const data = JSON.parse(raw);
    const validAnswers = a => a && typeof a === 'object' && !Array.isArray(a) && Object.entries(a).every(([id, v]) => questions.some(q => q.id === id) && Number.isInteger(v) && v >= 0 && v < 4);
    if (data.version !== 1 || !validAnswers(data.answers) || !data.coastal || typeof data.coastal !== 'object' || Array.isArray(data.coastal) || typeof data.coastalCompleted !== 'boolean') throw Error();
    if (Object.entries(data.coastal).some(([key, value]) => written.includes(key) ? typeof value !== 'string' || value.length > 400 : !coastalSelects.some(s => s.id === key && (value === '' || s.options.some(o => o.id === value))))) throw Error();
    if (data.submitted !== null) {
      if (!validAnswers(data.submitted?.answers) || questions.some(q => data.submitted.answers[q.id] === undefined)) throw Error();
      data.submitted.result = assess(data.submitted.answers);
    }
    if (data.coastalCompleted && !coastalComplete(data.coastal)) throw Error();
    return { data, error: false };
  } catch { return { data: emptyFinal(), error: true }; }
}
