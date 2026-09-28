import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';
import { completionTiming, localDate, readTasks, writeTasks } from './planner.js';
import { completionEvidence, completionPrompt, STUDENT_ANALYSIS_KEY } from './studentAnalysis.js';
import { ANALYSIS_KEY, emptyAnalysis } from './analysis.js';
import { duplicateTask } from './planningSupport.js';

const task = (extra = {}) => ({ id: 'one', title: 'Essay', category: '', dueDate: '2026-03-09', hours: 2, priority: 'Medium', notes: '', completed: true, ...extra });
const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/analysis'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('uses calendar days across DST, leap days and year boundaries, excluding incomplete or undated records', () => {
  for (const [dueDate, completedOn, classification, days] of [
    ['2026-03-09', '2026-03-07', 'Early', 2], ['2026-11-01', '2026-11-03', 'Late', 2],
    ['2024-03-01', '2024-02-28', 'Early', 2], ['2025-12-31', '2026-01-02', 'Late', 2],
    ['2026-03-09', '2026-03-09', 'On Time', 0],
  ]) expect(completionTiming(task({ dueDate, completedOn }))).toEqual({ classification, days });
  expect(completionTiming(task())).toBeNull();
  expect(completionTiming(task({ completedOn: '2026-02-30' }))).toBeNull();
  const evidence = completionEvidence([task(), task({ completedOn: '2026-03-09' }), task({ completed: false })]);
  expect(evidence.totals).toEqual({ Early: 0, 'On Time': 1, Late: 0 });
  expect(evidence.missing).toHaveLength(1);
  expect(completionPrompt(evidence)).toContain('Do not invent causes');
  expect(duplicateTask(task({ completedOn: '2026-03-09' }))).toMatchObject({ completed: false, completedOn: '' });
});

it('keeps legacy completion dates blank, supports editing/reload, and defaults new completions to the local date', () => {
  writeTasks([task()]); window.history.replaceState(null, '', '#/tasks'); render(<App />);
  expect(screen.getByText(/Completion date not recorded/)).toBeInTheDocument();
  expect(readTasks().tasks[0].completedOn).toBeUndefined();
  click('Edit Essay'); fill(/^Completed On/, '2026-03-07'); click('Save task');
  expect(readTasks().tasks[0].completedOn).toBe('2026-03-07');
  cleanup(); render(<App />);
  expect(screen.getByText(/Early · 2 calendar days early/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Essay incomplete' }));
  expect(readTasks().tasks[0].completedOn).toBe('');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Essay complete' }));
  expect(readTasks().tasks[0].completedOn).toBe(localDate());
});

it('shows evidence, saves the prompt and student review, copies, and preserves Coastal Life storage', async () => {
  const coastal = JSON.stringify({ ...emptyAnalysis(), name: 'Coastal Life' });
  localStorage.setItem(ANALYSIS_KEY, coastal);
  writeTasks([task({ completedOn: '2026-03-07' }), task({ id: 'two', title: 'Undated' }), task({ id: 'three', title: 'Open', completed: false })]);
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  vi.stubGlobal('navigator', { ...navigator, clipboard });
  render(<App />);
  expect(screen.getByText('Early: 1 · On Time: 0 · Late: 0')).toBeInTheDocument();
  expect(screen.getByText(/Undated — Completion date not recorded/)).toBeInTheDocument();
  click('Generate completion-history prompt');
  const prompt = screen.getByLabelText('Completion-history AI prompt').value;
  expect(prompt).toContain('2026-03-07'); expect(prompt).not.toContain('"title": "Open"');
  click('Copy completion-history prompt'); expect(clipboard.writeText).toHaveBeenCalledWith(prompt);
  fill('Paste AI completion-history response', 'One record was early.');
  fill('What does the evidence actually support?', 'One recorded assignment was two days early.');
  fill('What did AI infer or assume that the evidence does not establish?', 'Causes are unknown.');
  fill('Based on the evidence and my own context, what—if anything—will I change?', 'No change yet.');
  click('Save student analysis'); cleanup(); render(<App />);
  expect(screen.getByLabelText('Paste AI completion-history response')).toHaveValue('One record was early.');
  expect(screen.getByLabelText('Based on the evidence and my own context, what—if anything—will I change?')).toHaveValue('No change yet.');
  expect(localStorage.getItem(ANALYSIS_KEY)).toBe(coastal);
  expect(JSON.parse(localStorage.getItem(STUDENT_ANALYSIS_KEY)).prompt).toBe(prompt);
  vi.unstubAllGlobals();
});

it('protects unreadable student data and reports failed saves without losing the draft', () => {
  localStorage.setItem(STUDENT_ANALYSIS_KEY, '{broken'); render(<App />);
  expect(screen.getByRole('button', { name: 'Save student analysis' })).toBeDisabled();
  expect(localStorage.getItem(STUDENT_ANALYSIS_KEY)).toBe('{broken');
  cleanup(); localStorage.clear(); render(<App />);
  fill('Paste AI completion-history response', 'Keep my draft');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
  click('Save student analysis');
  expect(screen.getByRole('alert')).toHaveTextContent('Student analysis could not be saved');
  expect(screen.getByLabelText('Paste AI completion-history response')).toHaveValue('Keep my draft');
});
