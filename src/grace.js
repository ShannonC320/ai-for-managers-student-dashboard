export const GRACE_KEY = 'ai-managers-student-grace-v1';
export const sourceLabels = { course: 'Course Information', coastal: 'Coastal Life Employee Information' };
export const emptyGrace = () => ({ version: 1, tests: [], evaluation: null });
const text = (value, max) => typeof value === 'string' && !!value.trim() && value.length <= max;
export const validEvaluation = value => value && text(value.help, 3000) && text(value.refer, 3000);
export const validTest = value => value && value.source === 'coastal' &&
  ['Supported', 'Boundary'].includes(value.type) && text(value.question, 2000) && text(value.response, 12000) &&
  ['Yes', 'No', 'Partly'].includes(value.supported) && ['Yes', 'No', 'Partly'].includes(value.authority) &&
  ['Yes', 'No'].includes(value.human) && text(value.reason, 3000);
export function readGrace() {
  try {
    const raw = localStorage.getItem(GRACE_KEY);
    const data = raw ? JSON.parse(raw) : emptyGrace();
    if (data?.version !== 1 || !Array.isArray(data.tests) || data.tests.length > 2 ||
      !data.tests.every(test => validTest(test) && text(test.id, 100)) ||
      new Set(data.tests.map(test => test.type)).size !== data.tests.length ||
      new Set(data.tests.map(test => test.id)).size !== data.tests.length ||
      !(data.evaluation === null || validEvaluation(data.evaluation))) throw new Error('Invalid records');
    return { data, error: '' };
  } catch {
    return { data: emptyGrace(), error: 'Saved Week 6 records could not be read. They have not been overwritten. Restore storage access or recover the data, then reload.' };
  }
}

export async function askGrace(source, question, signal) {
  const endpoint = import.meta.env.VITE_GRACE_ENDPOINT;
  if (!endpoint) throw new Error('Grace is not connected yet. The course administrator must configure the AI service.');
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, question }), signal,
  });
  if (!response.ok) throw new Error('Grace is unavailable. Please try again later.');
  const data = await response.json();
  if (!text(data.response, 12000)) throw new Error('Grace returned an invalid response. Please try again.');
  return data.response.trim();
}
