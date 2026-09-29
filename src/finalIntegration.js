import { questions, capabilities, coastalChecks, interventions, owners } from './finalIntegrationContent.js';
export const FINAL_KEY = 'ai-managers-final-integration-v1';
export const emptyFinal = () => ({ version: 1, answers: {}, submitted: null, coastal: {}, coastalCompleted: false });
export function assess(answers) {
  const correct = questions.filter(q => answers[q.id] === q.correct);
  return { total: correct.length, capabilities: capabilities.map((_, index) => questions.filter(q => q.capability === index).every(q => answers[q.id] === q.correct)) };
}
export const coastalSelects = [...coastalChecks, { id: 'intervention', options: interventions }, { id: 'owner', options: owners }];
const written = ['justification', 'decision'];
// Accept and retain the original fields without requiring the retired controls.
const legacyChoices = {
  stain: ['known', 'unknown', 'can', 'cannot'], moisture: ['known', 'unknown', 'can', 'cannot'],
  route: ['known', 'unknown', 'can', 'cannot'], diagnose: ['known', 'unknown', 'can', 'cannot'],
  researchReview: ['verify', 'conclusive'], analysisReview: ['cause', 'pattern'],
  workflowReview: ['route', 'resolved'], graceReview: ['decision', 'bounded'],
};
const validText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 400;
export function coastalComplete(value) {
  return coastalSelects.every(s => s.options.some(o => o.id === value[s.id])) && written.every(key => validText(value[key]));
}
export function readFinal() {
  try {
    const raw = localStorage.getItem(FINAL_KEY);
    if (!raw) return { data: emptyFinal(), error: false };
    const data = JSON.parse(raw);
    const validAnswers = a => a && typeof a === 'object' && !Array.isArray(a) && Object.entries(a).every(([id, v]) => questions.some(q => q.id === id) && Number.isInteger(v) && v >= 0 && v < 4);
    if (data.version !== 1 || !validAnswers(data.answers) || !data.coastal || typeof data.coastal !== 'object' || Array.isArray(data.coastal) || typeof data.coastalCompleted !== 'boolean') throw Error();
    if (Object.entries(data.coastal).some(([key, value]) => [...written, 'action', 'reason'].includes(key)
      ? typeof value !== 'string' || value.length > 400
      : Object.hasOwn(legacyChoices, key) ? value !== '' && !legacyChoices[key].includes(value)
        : !coastalSelects.some(s => s.id === key && (value === '' || s.options.some(o => o.id === value))))) throw Error();
    if (data.submitted !== null) {
      if (!validAnswers(data.submitted?.answers) || questions.some(q => data.submitted.answers[q.id] === undefined)) throw Error();
      data.submitted.result = assess(data.submitted.answers);
    }
    const legacy = !Object.hasOwn(data.coastal, 'decision') && !Object.hasOwn(data.coastal, 'problem') && !Object.hasOwn(data.coastal, 'information');
    if (data.coastalCompleted && !coastalComplete(data.coastal)) {
      const legacyComplete = legacy && Object.entries(legacyChoices).every(([key, options]) => options.includes(data.coastal[key]))
        && ['justification', 'action', 'reason'].every(key => validText(data.coastal[key]))
        && coastalSelects.slice(2).every(s => s.options.some(o => o.id === data.coastal[s.id]));
      if (!legacyComplete) throw Error();
      data.coastalCompleted = false;
    }
    if (legacy && (data.coastal.action || data.coastal.reason)) {
      const combined = [data.coastal.action, data.coastal.reason].filter(Boolean).join('\n');
      // Never truncate earlier student writing; long originals remain available in the disclosure.
      data.coastal.decision = combined.length <= 400 ? combined : '';
    }
    return { data, error: false };
  } catch { return { data: emptyFinal(), error: true }; }
}
