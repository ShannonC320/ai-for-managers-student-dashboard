import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';
import WeeklyBriefing from './WeeklyBriefing.jsx';
import { weeklyBriefing } from './weeklyBriefing.js';
import { TASKS_KEY, writeTasks } from './planner.js';
import { WORKFLOWS_KEY, emptyWorkflows } from './workflows.js';

const task = (id, dueDate, completed = false) => ({ id, title: id, dueDate, completed, category: '', hours: 1, priority: 'Medium', notes: '' });
const tasks = [task('Older', '2026-09-26'), task('Sunday', '2026-09-27'), task('Monday', '2026-09-28'), task('Saturday', '2026-10-03'), task('Next Sunday', '2026-10-04'), task('Completed old', '2026-09-25', true), task('Completed this week', '2026-09-30', true)];
beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/workflows'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('applies Sunday–Saturday boundaries, excludes completed work, and catches up midweek without overlap', () => {
  const sunday = weeklyBriefing(tasks, '2026-09-27');
  expect(sunday.sunday).toBe('2026-09-27'); expect(sunday.saturday).toBe('2026-10-03');
  expect(sunday.pastDue.map(item => item.id)).toEqual(['Older']);
  expect(sunday.dueThisWeek.map(item => item.id)).toEqual(['Sunday', 'Monday', 'Saturday']);
  const monday = weeklyBriefing(tasks, '2026-09-28');
  expect(monday.pastDue.map(item => item.id)).toEqual(['Older', 'Sunday']);
  expect(monday.dueThisWeek.map(item => item.id)).toEqual(['Monday', 'Saturday']);
  expect(weeklyBriefing(tasks, '2026-10-03').dueThisWeek.map(item => item.id)).toEqual(['Saturday']);
  expect(weeklyBriefing(tasks, '2026-10-04').dueThisWeek.map(item => item.id)).toEqual(['Next Sunday']);
  expect(weeklyBriefing([], '2026-01-01')).toMatchObject({ sunday: '2025-12-28', saturday: '2026-01-03', pastDue: [], dueThisWeek: [] });
  expect(weeklyBriefing([], '2026-03-08')).toMatchObject({ sunday: '2026-03-08', saturday: '2026-03-14' });
});

it('automatically shows current records, reruns the test rule, and updates when records or the week change', () => {
  const { rerender } = render(<WeeklyBriefing tasks={tasks} today="2026-09-28" />);
  expect(within(screen.getByRole('region', { name: 'Past Due — Needs Attention' })).getAllByRole('listitem')).toHaveLength(2);
  expect(within(screen.getByRole('region', { name: 'Due This Week' })).getAllByRole('listitem')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Test Automation' }));
  expect(screen.getByRole('status')).toHaveTextContent('2 past due; 2 due this week');
  const changed = tasks.map(item => item.id === 'Monday' ? { ...item, completed: true } : item);
  rerender(<WeeklyBriefing tasks={changed} today="2026-09-28" />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Test Automation' }));
  expect(screen.getByRole('status')).toHaveTextContent('2 past due; 1 due this week');
  rerender(<WeeklyBriefing tasks={changed} today="2026-10-04" />);
  expect(within(screen.getByRole('region', { name: 'Due This Week' })).getByText('Next Sunday — Due 2026-10-04')).toBeInTheDocument();
});

it('uses persisted Planner records on dashboard use and refresh while preserving Coastal Life and Planner storage', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 28, 12));
  writeTasks(tasks);
  const coastal = JSON.stringify(emptyWorkflows()); localStorage.setItem(WORKFLOWS_KEY, coastal);
  const savedTasks = localStorage.getItem(TASKS_KEY);
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Weekly Assignment Briefing' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Guest Issue Response Workflow' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Test Automation' }));
  expect(screen.getByRole('status')).toHaveTextContent('2 past due; 2 due this week');
  cleanup(); render(<App />);
  expect(screen.getByText('Monday — Due 2026-09-28')).toBeInTheDocument();
  expect(localStorage.getItem(TASKS_KEY)).toBe(savedTasks);
  expect(localStorage.getItem(WORKFLOWS_KEY)).toBe(coastal);
  expect(localStorage.length).toBe(2);
});

it('shows empty sections and blocks testing when Planner data cannot be read', () => {
  const { rerender } = render(<WeeklyBriefing tasks={[]} today="2026-09-28" />);
  expect(screen.getByText('No incomplete past-due assignments.')).toBeInTheDocument();
  expect(screen.getByText('No incomplete assignments due in the rest of this week.')).toBeInTheDocument();
  rerender(<WeeklyBriefing tasks={[]} today="2026-09-28" taskError="Saved tasks could not be read." />);
  expect(screen.getByRole('alert')).toHaveTextContent('Saved tasks could not be read.');
  expect(screen.getByRole('button', { name: 'Test Automation' })).toBeDisabled();
  expect(screen.queryByText('No incomplete past-due assignments.')).not.toBeInTheDocument();
});
