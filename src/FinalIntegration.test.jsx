import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';
import { setLanguage, t } from './i18n.js';
import { FINAL_KEY, assess, readFinal, coastalSelects, emptyFinal } from './finalIntegration.js';
import { copy, questions, week7Spanish, capabilities, coastalChecks } from './finalIntegrationContent.js';

const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const stored = () => JSON.parse(localStorage.getItem(FINAL_KEY));
const choose = (q, value) => fireEvent.click(screen.getByRole('radio', { name: t(q.options[value]) }));
beforeEach(() => { localStorage.clear(); setLanguage('en'); window.history.replaceState(null, '', '#/final'); });
afterEach(() => { cleanup(); setLanguage('en'); vi.restoreAllMocks(); });

it('adds one final navigation destination, all eight four-choice questions, progress, and separate workspaces', () => {
  render(<App />);
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  const lastButtons = within(nav).getAllByRole('button').slice(-2);
  expect(lastButtons[0]).toHaveAccessibleName('AI Assistant');
  expect(lastButtons[1]).toHaveAccessibleName(copy.nav);
  for (const button of lastButtons) expect(button.querySelector('span[aria-hidden="true"]')).toHaveTextContent(/\S/);
  expect(screen.getByRole('complementary')).not.toHaveTextContent('Map. Automate. Control. Test.');
  expect(screen.getByRole('complementary')).toHaveTextContent('Course workspace');
  expect(screen.getByRole('heading', { level: 1, name: copy.nav })).toBeInTheDocument();
  expect(screen.getByText(copy.progress)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Student Dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Coastal Life Management Application' })).toHaveClass('coastal-intro');
  for (const q of questions) expect(within(screen.getByRole('group', { name: new RegExp(q.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).getAllByRole('radio')).toHaveLength(4);
  expect(screen.getAllByRole('radio')).toHaveLength(32);
  expect(screen.getAllByRole('textbox')).toHaveLength(2);
  click(copy.submit); expect(screen.getByRole('alert')).toHaveTextContent(copy.incomplete);
  expect(stored()).toBeNull();
});

it('preserves seven answers when revising only question 3, recalculates feedback and capabilities, and persists every revision', () => {
  render(<App />);
  questions.forEach(q => choose(q, q.id === 'cause' ? 1 : q.correct));
  click(copy.submit);
  expect(stored().submitted.result.total).toBe(7);
  expect(screen.getByTestId('feedback-cause')).toHaveTextContent(copy.incorrect);
  expect(screen.getByTestId('capability-2')).toHaveTextContent(copy.review);
  const before = stored().answers;
  choose(questions[2], 0);
  for (const q of questions.filter(q => q.id !== 'cause')) {
    expect(stored().answers[q.id]).toBe(before[q.id]);
    expect(screen.getByRole('radio', { name: q.options[before[q.id]] })).toBeChecked();
  }
  expect(screen.getByText(copy.pending)).toBeInTheDocument();
  expect(stored().submitted.result.total).toBe(7);
  cleanup(); render(<App />);
  expect(screen.getByRole('radio', { name: questions[2].options[0] })).toBeChecked();
  expect(screen.getByText(copy.pending)).toBeInTheDocument();
  click(copy.submit);
  expect(stored().submitted.result.total).toBe(8);
  expect(screen.getByTestId('feedback-cause')).toHaveTextContent(copy.correct);
  expect(screen.getByTestId('capability-2')).toHaveTextContent(copy.demonstrated);
  for (const q of questions) expect(screen.getByText(q.explanation)).toBeInTheDocument();
  for (let attempt = 0; attempt < 6; attempt++) { choose(questions[2], attempt % 2); click(copy.submit); }
  expect(stored().submitted.result.total).toBe(7);
  const latest = localStorage.getItem(FINAL_KEY);
  click('Home'); click(copy.nav); cleanup(); render(<App />);
  expect(localStorage.getItem(FINAL_KEY)).toBe(latest);
  expect(screen.getByRole('radio', { name: questions[2].options[1] })).toBeChecked();
  expect(screen.getByTestId('capability-2')).toHaveTextContent(copy.review);
  expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
});

it('calculates every capability from all its associated decisions without a passing threshold', () => {
  const correct = Object.fromEntries(questions.map(q => [q.id, q.correct]));
  expect(assess(correct)).toEqual({ total: 8, capabilities: capabilities.map(() => true) });
  for (const q of questions) {
    const result = assess({ ...correct, [q.id]: (q.correct + 1) % 4 });
    expect(result.total).toBe(7);
    expect(result.capabilities).toEqual(capabilities.map((_, i) => i !== q.capability));
  }
});

it('saves editable Coastal Life responses independently of assessment score and preserves uncertainty', () => {
  render(<App />);
  for (const key of ['scenario', 'routing', 'metrics', 'limits', 'prior', 'workflow', 'grace', 'question']) expect(screen.getByText(copy[key])).toBeInTheDocument();
  click(copy.save); expect(screen.getByRole('alert')).toHaveTextContent(copy.required);
  for (const s of coastalSelects) fireEvent.change(document.getElementById(`final-${s.id}`), { target: { value: s.options[0].id } });
  fill(copy.justification, 'Verify current moisture with an authorized person.');
  fill(copy.decision, 'Arrange a current inspection; the old note does not establish current conditions.');
  click(copy.save); expect(screen.getByText(copy.saved)).toHaveAttribute('role', 'status');
  expect(stored().submitted).toBeNull(); expect(stored().coastalCompleted).toBe(true);
  cleanup(); render(<App />); expect(screen.getByLabelText(copy.decision)).toHaveValue('Arrange a current inspection; the old note does not establish current conditions.');
  fill(copy.decision, 'Escalate for management review now because the condition is uncertain.');
  expect(stored().coastalCompleted).toBe(false);
  click(copy.save); expect(stored().coastal.decision).toBe('Escalate for management review now because the condition is uncertain.');
  for (const heading of [copy.human, copy.final]) expect(within(screen.getByRole('group', { name: heading })).queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText(/incorrect|universally correct/i)).not.toBeInTheDocument();
});

it('switches all Week 7 content to Spanish without translating student text or changing records', () => {
  localStorage.setItem('ai-managers-student-tasks-v1', JSON.stringify({ version: 1, tasks: [] }));
  const old = localStorage.getItem('ai-managers-student-tasks-v1');
  render(<App />); questions.forEach(q => choose(q, q.correct)); click(copy.submit);
  fill(copy.decision, 'Research');
  coastalChecks.forEach(check => fill(check.label, check.correct));
  const saved = localStorage.getItem(FINAL_KEY);
  fill('Interface language', 'es');
  expect(screen.getByRole('heading', { level: 1, name: week7Spanish[copy.nav] })).toBeInTheDocument();
  for (const q of questions) {
    expect(screen.getByText(new RegExp(week7Spanish[q.prompt].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    for (const o of q.options) expect(screen.getByRole('radio', { name: week7Spanish[o] })).toBeInTheDocument();
    expect(screen.getByText(week7Spanish[q.explanation])).toBeInTheDocument();
  }
  expect(screen.getByText(week7Spanish[copy.scenario])).toBeInTheDocument();
  expect(screen.getByLabelText(week7Spanish[copy.decision])).toHaveValue('Research');
  for (const check of coastalChecks) {
    expect(screen.getByLabelText(week7Spanish[check.label])).toHaveValue(check.correct);
    expect(screen.getByTestId(`coastal-feedback-${check.id}`)).toHaveTextContent(week7Spanish[check.feedback]);
  }
  expect(screen.getByRole('complementary')).toHaveTextContent('Semanas 1–7 de 7');
  expect(screen.getByRole('complementary')).not.toHaveTextContent(t('Map. Automate. Control. Test.'));
  expect(screen.getByText('8 de 8 decisiones de gestión se ajustaron a los principios del curso.')).toBeInTheDocument();
  expect(localStorage.getItem(FINAL_KEY)).toBe(saved);
  expect(localStorage.getItem('ai-managers-student-tasks-v1')).toBe(old);
  fill('Idioma de la interfaz', 'en'); expect(localStorage.getItem(FINAL_KEY)).toBe(saved);
  setLanguage('es'); for (const [en, es] of Object.entries(week7Spanish)) expect(t(en)).toBe(es);
});

it('uses one question per first two sections with immediate, revisable feedback and only two short written fields', () => {
  render(<App />);
  [copy.situation, copy.information].forEach((heading, index) => {
    const section = screen.getByRole('group', { name: heading });
    const check = coastalChecks[index];
    expect(within(section).getAllByRole('combobox')).toHaveLength(1);
    expect(within(section).queryByRole('status')).not.toBeInTheDocument();
    fill(check.label, check.options.find(o => o.id !== check.correct).id);
    expect(within(section).getByRole('status')).toHaveTextContent(copy.checkAgain);
    expect(within(section).getByRole('status')).toHaveTextContent(check.feedback);
    fill(check.label, check.correct);
    expect(within(section).getByRole('status')).toHaveTextContent(copy.correct);
    expect(stored().coastal[check.id]).toBe(check.correct);
  });
  for (const heading of [copy.human, copy.final]) {
    const section = screen.getByRole('group', { name: heading });
    expect(within(section).getAllByRole('combobox')).toHaveLength(1);
    expect(within(section).getAllByRole('textbox')).toHaveLength(1);
    expect(within(section).getByRole('textbox')).toHaveAttribute('maxlength', '400');
  }
  cleanup(); render(<App />);
  coastalChecks.forEach(check => expect(screen.getByTestId(`coastal-feedback-${check.id}`)).toHaveTextContent(copy.correct));
});

it.each([false, true])('preserves earlier completed work without truncation, including long text: %s', long => {
  const legacy = {
    stain: 'known', moisture: 'unknown', route: 'can', diagnose: 'cannot', researchReview: 'verify', analysisReview: 'pattern',
    workflowReview: 'route', graceReview: 'bounded', intervention: 'verify', owner: 'manager', justification: 'Research',
    action: long ? 'A'.repeat(400) : 'Request a current inspection.', reason: long ? 'B'.repeat(400) : 'The old note is not current evidence.',
  };
  const answers = Object.fromEntries(questions.map(q => [q.id, q.correct]));
  const previous = { ...emptyFinal(), answers, submitted: { answers, result: assess(answers) }, coastal: legacy, coastalCompleted: true };
  localStorage.setItem(FINAL_KEY, JSON.stringify(previous));
  render(<App />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText(copy.decision)).toHaveValue(long ? '' : `${legacy.action}\n${legacy.reason}`);
  expect(screen.getByText(legacy.action)).toBeInTheDocument();
  expect(screen.getByText(legacy.reason)).toBeInTheDocument();
  const original = localStorage.getItem(FINAL_KEY);
  fill('Interface language', 'es');
  expect(localStorage.getItem(FINAL_KEY)).toBe(original);
  expect(screen.getByLabelText(week7Spanish[copy.justification])).toHaveValue('Research');
  fill('Idioma de la interfaz', 'en');
  coastalChecks.forEach(check => fill(check.label, check.correct));
  fill(copy.decision, 'Arrange inspection because present moisture is unknown.');
  click(copy.save);
  expect(stored().coastal).toMatchObject(legacy);
  expect(stored().coastalCompleted).toBe(true);
  expect(stored().submitted).toEqual(previous.submitted);
  cleanup(); render(<App />);
  expect(screen.getByLabelText(copy.decision)).toHaveValue('Arrange inspection because present moisture is unknown.');
});

it('protects unreadable data and reports storage failures without losing in-memory edits', () => {
  localStorage.setItem(FINAL_KEY, '{broken'); render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent(copy.readError);
  expect(screen.getByRole('button', { name: copy.submit })).toBeDisabled();
  expect(localStorage.getItem(FINAL_KEY)).toBe('{broken');
  cleanup(); localStorage.removeItem(FINAL_KEY); render(<App />);
  const mock = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('full'); });
  choose(questions[0], 1); expect(screen.getByRole('alert')).toHaveTextContent(copy.storageError);
  expect(screen.getByRole('radio', { name: questions[0].options[1] })).toBeChecked();
  mock.mockRestore(); click(copy.retry); expect(stored().answers.research).toBe(1);
  localStorage.setItem(FINAL_KEY, JSON.stringify({ ...stored(), version: 2 }));
  expect(readFinal().error).toBe(true);
});
