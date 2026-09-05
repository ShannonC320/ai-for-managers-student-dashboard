import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App';
import { dateAfter, localDate, readTasks, summarize, TASKS_KEY, taskStatus, validDate, validateTask, writeTasks } from './planner.js';

const today = localDate();
const sample = (overrides = {}) => ({ id: 'one', title: 'Case brief', category: 'Management', dueDate: today, hours: 2, priority: 'Medium', notes: '', completed: false, ...overrides });
const profile = { name: 'Jordan Lee', major: 'Business', academicYear: 'Junior', goals: ['Lead well', 'Plan realistically'] };
const click = name => fireEvent.click(screen.getByRole('button', { name }));
function fillTask(title = 'Team proposal') {
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(/^Due date/), { target: { value: today } });
  fireEvent.change(screen.getByLabelText(/^Estimated remaining hours/), { target: { value: '2.5' } });
}

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/tasks'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('planner interactions and persistence', () => {
  it('adds, reloads, edits, completes, reopens, and deletes without changing the profile', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    render(<App />);
    click(/add task/i); fillTask();
    fireEvent.change(screen.getByLabelText(/course \/ project/i), { target: { value: 'Business strategy' } });
    fireEvent.change(screen.getByLabelText('Priority', { exact: true }), { target: { value: 'High' } });
    fireEvent.change(screen.getByLabelText(/brief notes/i), { target: { value: 'Review trade-offs & discuss with the team.' } });
    click('Save task');
    expect(screen.getByRole('heading', { name: 'Team proposal' })).toBeInTheDocument();
    expect(readTasks().tasks[0]).toMatchObject({ hours: 2.5, priority: 'High', category: 'Business strategy' });
    cleanup(); render(<App />);
    expect(screen.getByRole('heading', { name: 'Team proposal' })).toBeInTheDocument();
    click('Edit Team proposal');
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Revised proposal' } });
    fireEvent.change(screen.getByLabelText('Priority', { exact: true }), { target: { value: 'Low' } });
    click('Save task');
    expect(readTasks().tasks[0].priority).toBe('Low');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Revised proposal complete' }));
    expect(readTasks().tasks[0].completed).toBe(true);
    cleanup(); render(<App />);
    expect(screen.getByRole('checkbox', { name: 'Mark Revised proposal incomplete' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Revised proposal incomplete' }));
    expect(readTasks().tasks[0].completed).toBe(false);
    click('Delete Revised proposal'); click('Keep task');
    expect(readTasks().tasks).toHaveLength(1);
    click('Delete Revised proposal'); click('Confirm delete');
    expect(readTasks().tasks).toHaveLength(0);
    cleanup(); render(<App />);
    expect(screen.getByText('A clear place to start')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(profile);
    click(/^profile$/i);
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
  });

  it('filters overdue, upcoming (including today), and completed; sorts without changing priorities', () => {
    writeTasks([
      sample({ title: 'Old low', priority: 'Low', dueDate: dateAfter(today, -1) }),
      sample({ id: 'two', title: 'Future high', priority: 'High', dueDate: dateAfter(today, 3) }),
      sample({ id: 'three', title: 'Today medium' }),
      sample({ id: 'four', title: 'Finished', completed: true, dueDate: dateAfter(today, -4) }),
    ]);
    render(<App />);
    const show = screen.getByLabelText('Show');
    fireEvent.change(show, { target: { value: 'Overdue' } });
    expect(screen.getByRole('heading', { name: 'Old low' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Finished' })).not.toBeInTheDocument();
    fireEvent.change(show, { target: { value: 'Upcoming' } });
    expect(screen.getByRole('heading', { name: 'Today medium' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Future high' })).toBeInTheDocument();
    fireEvent.change(show, { target: { value: 'Completed' } });
    expect(screen.getByRole('heading', { name: 'Finished' })).toBeInTheDocument();
    fireEvent.change(show, { target: { value: 'All' } });
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'priority' } });
    const section = screen.getByRole('region', { name: 'Your tasks' });
    expect(within(section).getAllByRole('heading', { level: 3 }).map(el => el.textContent)).toEqual(['Future high', 'Today medium', 'Old low', 'Finished']);
    expect(readTasks().tasks[0].priority).toBe('Low');
  });

  it('shows workload flags and removes completed tasks from workload', () => {
    writeTasks([sample({ hours: 8 })]); render(<App />);
    expect(screen.getByText('Today: 8 hours estimated; available time unknown.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Case brief complete' }));
    expect(screen.queryByText('Potentially heavy workload')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '0 hours due · 0 deadlines' })).toBeInTheDocument();
  });

  it('validates blanks, accepts zero and decimal hours, Unicode and literal markup, and cancels edits', () => {
    render(<App />); click(/add task/i);
    expect(screen.getByLabelText('Task title')).toBeRequired();
    expect(screen.getByLabelText(/^Due date/)).toBeRequired();
    expect(screen.getByLabelText(/^Estimated remaining hours/)).toBeRequired();
    fillTask('   '); click('Save task');
    expect(screen.getByRole('alert')).toHaveTextContent('spaces alone');
    expect(readTasks().tasks).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: '预算 & <script>review</script>' } });
    fireEvent.change(screen.getByLabelText(/^Estimated remaining hours/), { target: { value: '0' } });
    click('Save task');
    expect(readTasks().tasks[0].hours).toBe(0);
    expect(screen.getByRole('heading', { name: '预算 & <script>review</script>' })).toBeInTheDocument();
    click('Edit 预算 & <script>review</script>');
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Discard me' } });
    click('Cancel');
    expect(readTasks().tasks[0].title).toBe('预算 & <script>review</script>');
  });

  it('keeps the draft when saving fails and does not report success', () => {
    render(<App />); click(/add task/i); fillTask();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    click('Save task');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByLabelText('Task title')).toHaveValue('Team proposal');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(readTasks().tasks).toHaveLength(0);
  });

  it('does not overwrite corrupt saved tasks', () => {
    localStorage.setItem(TASKS_KEY, '{bad json'); render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be read');
    expect(screen.getByRole('button', { name: /add task/i })).toBeDisabled();
    expect(localStorage.getItem(TASKS_KEY)).toBe('{bad json');
  });

  it('supports direct task links, hash changes, skip focus, and navigation back to Week 1', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Planner / Tasks' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to main content' }));
    expect(window.location.hash).toBe('#/tasks');
    expect(screen.getByRole('main')).toHaveFocus();
    window.history.replaceState(null, '', '#/profile'); fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.getByRole('heading', { name: 'Create your profile' })).toBeInTheDocument();
    click(/^home$/i);
    expect(screen.getByRole('heading', { name: 'Welcome to your dashboard.' })).toBeInTheDocument();
  });
});

describe('calendar and planning rules', () => {
  it('uses calendar dates across month, year, leap day, and DST boundaries', () => {
    expect(dateAfter('2026-12-31', 1)).toBe('2027-01-01');
    expect(dateAfter('2028-02-28', 1)).toBe('2028-02-29');
    expect(dateAfter('2026-03-08', 1)).toBe('2026-03-09');
    expect(validDate('2026-02-30')).toBe(false);
    expect(validDate('2028-02-29')).toBe(true);
    expect(taskStatus(sample({ dueDate: '2026-09-04' }), '2026-09-05')).toBe('Overdue');
    expect(taskStatus(sample({ dueDate: '2026-09-05' }), '2026-09-05')).toBe('Due today');
    expect(taskStatus(sample({ dueDate: '2026-09-06' }), '2026-09-05')).toBe('Upcoming');
    expect(taskStatus(sample({ completed: true, dueDate: '2026-09-04' }), '2026-09-05')).toBe('Completed');
  });

  it('counts hours and deadlines at the exact flag boundaries, excluding overdue and completed', () => {
    expect(summarize([sample({ hours: 7.99 })], today).clustered).toBe(false);
    expect(summarize([sample({ hours: 8 })], today).clustered).toBe(false);
    const tasks = [sample({ hours: 1.25 }), sample({ id: 'two', hours: .75, dueDate: dateAfter(today, 1) }), sample({ id: 'three', hours: 0 }), sample({ id: 'old', hours: 12, dueDate: dateAfter(today, -1) }), sample({ id: 'done', hours: 9, completed: true }), sample({ id: 'later', hours: 6, dueDate: dateAfter(today, 2) })];
    expect(summarize(tasks, today)).toMatchObject({ clustered: true, hours: 2, nearCount: 3, overdue: 1, overdueHours: 12, completed: 1, totalHours: 20 });
    expect(summarize(tasks, today).days).toHaveLength(7);
    expect(summarize([], today)).toMatchObject({ totalHours: 0, clustered: false, completed: 0 });
  });

  it.each(['', ' ', '-1', 'Infinity', 'NaN', '1001'])('rejects invalid hours %s', hours => {
    expect(validateTask(sample({ hours }))).toMatch(/hours/);
  });
  it.each([0, .1, 0.25, 999.5, 1000])('accepts reasonable workload %s', hours => {
    expect(validateTask(sample({ hours }))).toBe('');
  });
  it('rejects invalid dates, priorities, long fields, and malformed saved values', () => {
    expect(validateTask(sample({ dueDate: '' }))).toMatch(/date/);
    expect(validateTask(sample({ priority: 'Urgent' }))).toMatch(/priority/);
    expect(validateTask(sample({ title: 'x'.repeat(161) }))).toMatch(/160/);
    expect(validateTask(sample({ notes: 'x'.repeat(1001) }))).toMatch(/1,000/);
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks: [sample({ hours: '2' })] }));
    expect(readTasks().error).toBeTruthy();
  });
});

describe('Week 1 additional regression checks', () => {
  beforeEach(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); window.history.replaceState(null, '', '#/profile'); });
  it('edits all fields and goals, cancels a draft, persists, and personalizes Home', () => {
    render(<App />); click('Edit profile');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Discard name' } }); click('Cancel');
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
    click('Edit profile');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '  Avery Chen  ' } });
    fireEvent.change(screen.getByLabelText(/^major/i), { target: { value: 'Marketing' } });
    fireEvent.change(screen.getByLabelText(/academic year/i), { target: { value: 'Senior' } });
    click('Remove goal 2'); click('Remove goal 1');
    expect(screen.getByLabelText('Academic goal 1')).toHaveValue('');
    click(/add another goal/i);
    fireEvent.change(screen.getByLabelText('Academic goal 2'), { target: { value: '  Lead a team  ' } });
    click('Save profile');
    cleanup(); render(<App />);
    expect(screen.getByRole('heading', { name: 'Avery Chen' })).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('Lead a team')).toBeInTheDocument();
    click(/^home$/i); expect(screen.getByRole('heading', { name: 'Welcome, Avery.' })).toBeInTheDocument();
  });
  it('rejects whitespace-only profile fields and reports failed persistence', () => {
    render(<App />); click('Edit profile');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '   ' } }); click('Save profile');
    expect(screen.getByRole('alert')).toHaveTextContent('Spaces alone');
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Avery' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    click('Save profile');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Avery');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(profile);
  });
  it('handles malformed profile field types without crashing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 12, major: {}, goals: [null, 'Keep this'] }));
    render(<App />);
    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    expect(screen.getByLabelText('Academic goal 1')).toHaveValue('Keep this');
  });
});
