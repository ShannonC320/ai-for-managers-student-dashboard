import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';
import { setLanguage, t } from './i18n.js';
import { FINAL_KEY, assess, readFinal, coastalSelects } from './finalIntegration.js';
import { copy, questions, week7Spanish, capabilities } from './finalIntegrationContent.js';

const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const stored = () => JSON.parse(localStorage.getItem(FINAL_KEY));
const choose = (q, value) => fireEvent.click(screen.getByRole('radio', { name: t(q.options[value]) }));
beforeEach(() => { localStorage.clear(); setLanguage('en'); window.history.replaceState(null, '', '#/final'); });
afterEach(() => { cleanup(); setLanguage('en'); vi.restoreAllMocks(); });

it('adds one final navigation destination, all eight four-choice questions, progress, and separate workspaces', () => {
  render(<App />);
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  expect(within(nav).getAllByRole('button').slice(-2).map(b => b.textContent)).toEqual(['AI Assistant', copy.nav]);
  expect(screen.getByRole('heading', { level: 1, name: copy.nav })).toBeInTheDocument();
  expect(screen.getByText(copy.progress)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Student Dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Coastal Life Management Application' })).toHaveClass('coastal-intro');
  for (const q of questions) expect(within(screen.getByRole('group', { name: new RegExp(q.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).getAllByRole('radio')).toHaveLength(4);
  expect(screen.getAllByRole('radio')).toHaveLength(32);
  expect(screen.getAllByRole('textbox')).toHaveLength(3);
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
  fill(copy.action, 'Arrange a current inspection and guest follow-up.');
  fill(copy.reason, 'The old note does not establish current conditions.');
  click(copy.save); expect(screen.getByRole('status')).toHaveTextContent(copy.saved);
  expect(stored().submitted).toBeNull(); expect(stored().coastalCompleted).toBe(true);
  cleanup(); render(<App />); expect(screen.getByLabelText(copy.action)).toHaveValue('Arrange a current inspection and guest follow-up.');
  fill(copy.action, 'Escalate for management review now.');
  expect(stored().coastalCompleted).toBe(false);
  click(copy.save); expect(stored().coastal.action).toBe('Escalate for management review now.');
  expect(screen.queryByText(/incorrect|universally correct/i)).not.toBeInTheDocument();
});

it('switches all Week 7 content to Spanish without translating student text or changing records', () => {
  localStorage.setItem('ai-managers-student-tasks-v1', JSON.stringify({ version: 1, tasks: [] }));
  const old = localStorage.getItem('ai-managers-student-tasks-v1');
  render(<App />); questions.forEach(q => choose(q, q.correct)); click(copy.submit);
  fill(copy.action, 'Research');
  const saved = localStorage.getItem(FINAL_KEY);
  fill('Interface language', 'es');
  expect(screen.getByRole('heading', { level: 1, name: week7Spanish[copy.nav] })).toBeInTheDocument();
  for (const q of questions) {
    expect(screen.getByText(new RegExp(week7Spanish[q.prompt].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    for (const o of q.options) expect(screen.getByRole('radio', { name: week7Spanish[o] })).toBeInTheDocument();
    expect(screen.getByText(week7Spanish[q.explanation])).toBeInTheDocument();
  }
  expect(screen.getByText(week7Spanish[copy.scenario])).toBeInTheDocument();
  expect(screen.getByLabelText(week7Spanish[copy.action])).toHaveValue('Research');
  expect(screen.getByText('8 de 8 decisiones de gestión se ajustaron a los principios del curso.')).toBeInTheDocument();
  expect(localStorage.getItem(FINAL_KEY)).toBe(saved);
  expect(localStorage.getItem('ai-managers-student-tasks-v1')).toBe(old);
  fill('Idioma de la interfaz', 'en'); expect(localStorage.getItem(FINAL_KEY)).toBe(saved);
  setLanguage('es'); for (const [en, es] of Object.entries(week7Spanish)) expect(t(en)).toBe(es);
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
