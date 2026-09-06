import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App.jsx';
import { dateAfter, localDate, readTasks, writeTasks } from './planner.js';
import { PLANNING_KEY } from './planningSupport.js';

const today = localDate();

const task = (id, changes = {}) => ({
  id,
  title: id,
  category: '',
  dueDate: today,
  hours: 1,
  priority: 'Low',
  notes: '',
  completed: false,
  dependencies: [],
  ...changes
});

const tasks = [
  task('Reading'),
  task('Exam', {
    dependencies: ['Reading'],
    priority: 'High',
    hours: 1.5
  })
];

const click = name =>
  fireEvent.click(screen.getByRole('button', { name }));

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), {
    target: { value }
  });

const openImport = () =>
  fireEvent.click(
    screen.getByText('Prepare AI Task Import', {
      selector: 'summary'
    })
  );

const openPlanning = () =>
  fireEvent.click(
    screen.getByText('Prepare AI Planning Prompt', {
      selector: 'summary'
    })
  );

const plan = {
  sequence: [
    {
      taskId: 'Exam',
      day: 'today',
      reason: 'High priority'
    },
    {
      taskId: 'Reading',
      day: 'today',
      reason: 'Lower priority'
    }
  ],
  assumptions: ['Both fit today'],
  unscheduled: []
};

function preparePlan() {
  openPlanning();
  click('Select unfinished tasks');
  fill('Available hours today', '2');
  fill('Available hours tomorrow', '2');
  click('Generate planning prompt');

  fill('AI planning response', JSON.stringify(plan));
  click('Review AI recommendation');
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#/tasks');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('prepares import, reviews edits rejects and approves separately while keeping import work temporary', () => {
  const profile = {
    name: 'Student',
    major: 'Business',
    academicYear: 'Junior',
    goals: ['Lead']
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

  render(<App />);
  openImport();

  click('Generate task-import prompt');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Paste task information'
  );

  fill(
    'Task information',
    'Read Chapter 1 and prepare case brief'
  );

  click('Generate task-import prompt');

  expect(
    screen.getByLabelText('Task-import prompt').value
  ).toContain('Read Chapter 1');

  fill('AI task response', '{bad');
  click('Review proposed tasks');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'valid JSON'
  );

  fill(
    'AI task response',
    JSON.stringify({
      tasks: [
        {
          id: 'T1',
          title: 'Reading',
          dueDate: today,
          hours: 1,
          priority: 'Low',
          dependencies: [],
          source: 'Read Chapter 1',
          assumptions: []
        },
        {
          id: 'T2',
          title: 'Unwanted',
          dueDate: null,
          hours: null,
          priority: 'Urgent',
          dependencies: []
        }
      ]
    })
  );

  click('Review proposed tasks');

  expect(readTasks().tasks).toHaveLength(0);

  const row = within(
    screen.getByRole('region', {
      name: 'Proposal T1'
    })
  );

  fireEvent.change(row.getByLabelText('Proposed title'), {
    target: {
      value: 'Chapter 1 reviewed'
    }
  });

  click('Approve task T1');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Confirm'
  );

  fireEvent.click(
    row.getByRole('checkbox', {
      name: /I checked/
    })
  );

  click('Approve task T1');
  click('Reject task T2');

  expect(readTasks().tasks).toHaveLength(1);
  expect(readTasks().tasks[0].title).toBe(
    'Chapter 1 reviewed'
  );

  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEY))
  ).toEqual(profile);

  cleanup();
  render(<App />);
  openImport();

  expect(
    screen.getByLabelText('Task information')
  ).toHaveValue('');

  expect(
    screen.getByLabelText('Task-import prompt')
  ).toHaveValue('');

  expect(
    screen.getByLabelText('AI task response')
  ).toHaveValue('');

  expect(
    screen.queryByRole('region', {
      name: 'Proposal T1'
    })
  ).not.toBeInTheDocument();

  expect(readTasks().tasks).toHaveLength(1);
  expect(readTasks().tasks[0].title).toBe(
    'Chapter 1 reviewed'
  );
});

it('starts a new task import without deleting approved Planner tasks', () => {
  render(<App />);
  openImport();

  fill(
    'Task information',
    'Read Chapter 1'
  );

  click('Generate task-import prompt');

  fill(
    'AI task response',
    JSON.stringify({
      tasks: [
        {
          id: 'T1',
          title: 'Read Chapter 1',
          category: 'Course',
          dueDate: today,
          hours: 1,
          priority: 'Medium',
          notes: '',
          dependencies: [],
          source: 'Read Chapter 1',
          assumptions: []
        }
      ]
    })
  );

  click('Review proposed tasks');

  const row = within(
    screen.getByRole('region', {
      name: 'Proposal T1'
    })
  );

  fireEvent.click(
    row.getByRole('checkbox', {
      name: /I checked/
    })
  );

  click('Approve task T1');

  expect(readTasks().tasks).toHaveLength(1);

  click('Start new task import');

  expect(
    screen.getByLabelText('Task information')
  ).toHaveValue('');

  expect(
    screen.getByLabelText('Task-import prompt')
  ).toHaveValue('');

  expect(
    screen.getByLabelText('AI task response')
  ).toHaveValue('');

  expect(
    screen.queryByRole('region', {
      name: 'Proposal T1'
    })
  ).not.toBeInTheDocument();

  expect(readTasks().tasks).toHaveLength(1);
  expect(readTasks().tasks[0].title).toBe(
    'Read Chapter 1'
  );
});

it('creates dependencies, blocks cycles, duplicates independently and flags deleted prerequisites', () => {
  writeTasks(tasks);
  render(<App />);

  click('Edit Reading');

  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Exam',
      exact: true
    })
  );

  click('Save task');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'circular'
  );

  click('Cancel');

  click('Edit Exam');

  expect(
    screen.getByRole('checkbox', {
      name: 'Reading',
      exact: true
    })
  ).toBeChecked();

  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Reading',
      exact: true
    })
  );

  click('Save task');

  expect(readTasks().tasks[1].dependencies).toEqual([]);

  click('Edit Exam');

  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Reading',
      exact: true
    })
  );

  click('Save task');
  click('Duplicate Exam');

  expect(
    screen.getByLabelText(/^Due date/)
  ).toHaveValue('');

  fill('Task title', 'Exam 2');
  fill(/^Due date/, dateAfter(today, 7));
  fill('Priority', 'Medium');

  click('Save task');

  expect(readTasks().tasks).toHaveLength(3);
  expect(readTasks().tasks[1].priority).toBe('High');

  expect(readTasks().tasks[2]).toMatchObject({
    title: 'Exam 2',
    priority: 'Medium',
    completed: false,
    dependencies: ['Reading']
  });

  click('Delete Reading');
  click('Confirm delete');

  expect(
    screen.getAllByText(/missing prerequisite/).length
  ).toBeGreaterThan(0);
});

it('reviews AI plan, fixes dependency order, revises excludes includes work saves decision and marks changed facts', () => {
  writeTasks(tasks);
  render(<App />);

  preparePlan();

  expect(
    screen.getByLabelText('Planning prompt').value
  ).toContain('"dependencies"');

  expect(
    screen.getAllByText(/must be scheduled first/).length
  ).toBe(2);

  expect(
    screen.getAllByText(/exceeds capacity by 0.5/).length
  ).toBe(3);

  click('Move step 2 up');

  expect(
    within(
      screen.getByRole('region', {
        name: 'AI recommendation'
      })
    ).getAllByRole('listitem')[0]
  ).toHaveTextContent('Exam');

  fill(
    'Your reason for step 1',
    'Reading prepares me for the exam.'
  );

  click('Exclude step 2');
  click('Include Exam in plan');

  fill(
    'My decision and explanation',
    'Read first, then study tomorrow to fit my available time.'
  );

  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /I reviewed the assumptions/
    })
  );

  click('Save accepted plan');

  const saved = JSON.parse(
    localStorage.getItem(PLANNING_KEY)
  );

  expect(
    saved.recommendation.sequence[0].taskId
  ).toBe('Exam');

  expect(
    saved.decision.sequence.map(step => step.taskId)
  ).toEqual(['Reading', 'Exam']);

  expect(saved.decision.status).toBe('accepted');
  expect(readTasks().tasks).toEqual(tasks);

  cleanup();
  render(<App />);
  openPlanning();

  expect(
    screen.getByRole('region', {
      name: 'Saved student decision'
    })
  ).toHaveTextContent('Read first');

  click('Edit Exam');
  fill(/^Estimated remaining hours/, '3');
  click('Save task');

  expect(
    screen.getByText('Needs review.', {
      selector: 'strong'
    })
  ).toBeInTheDocument();

  click(/^home$/i);

  expect(
    screen.getByRole('region', {
      name: 'Planning summary'
    })
  ).toHaveTextContent('Needs review');

  expect(
    screen.getByRole('region', {
      name: 'Planning summary'
    })
  ).toHaveTextContent('4 hours due');
});

it('requires explanation and acknowledgment supports rejection invalid plans and storage failure', () => {
  writeTasks(tasks);
  render(<App />);
  preparePlan();

  click('Reject recommendation');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Explain'
  );

  fill(
    'My decision and explanation',
    'The dependency order is wrong.'
  );

  click('Reject recommendation');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Confirm'
  );

  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /I reviewed the assumptions/
    })
  );

  click('Reject recommendation');

  expect(
    JSON.parse(
      localStorage.getItem(PLANNING_KEY)
    ).decision.status
  ).toBe('rejected');

  fill(
    'AI planning response',
    '{"sequence":[]}'
  );

  click('Review AI recommendation');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Expected sequence'
  );

  expect(
    JSON.parse(
      localStorage.getItem(PLANNING_KEY)
    ).decision.status
  ).toBe('rejected');

  fill('Available hours today', '25');
  click('Generate planning prompt');

  expect(screen.getByRole('alert')).toHaveTextContent(
    '0 and 24'
  );

  fill('Available hours today', '3');

  vi.spyOn(
    Storage.prototype,
    'setItem'
  ).mockImplementation(() => {
    throw new Error('Full');
  });

  click('Save available time');

  expect(
    screen
      .getAllByRole('alert')
      .some(element =>
        element.textContent.includes('Could not save')
      )
  ).toBe(true);

  expect(
    JSON.parse(
      localStorage.getItem(PLANNING_KEY)
    ).capacity.todayHours
  ).toBe('2');
});

it('preserves corrupted planning data without crashing while task import remains usable', () => {
  localStorage.setItem(
    PLANNING_KEY,
    '{bad'
  );

  render(<App />);

  openPlanning();
  openImport();

  expect(
    screen.getByRole('button', {
      name: 'Generate planning prompt'
    })
  ).toBeDisabled();

  expect(
    screen.getByRole('button', {
      name: 'Review proposed tasks'
    })
  ).not.toBeDisabled();

  fill(
    'Task information',
    'Read Chapter 2'
  );

  click('Generate task-import prompt');

  expect(
    screen.getByLabelText('Task-import prompt').value
  ).toContain('Read Chapter 2');

  expect(
    localStorage.getItem(PLANNING_KEY)
  ).toBe('{bad');
});

it('shows three small deadlines as clustered never heavy and keeps overdue distinct on Home', () => {
  writeTasks([
    task('A', {
      hours: 0.5
    }),
    task('B'),
    task('C'),
    task('Old', {
      dueDate: dateAfter(today, -1),
      hours: 8
    })
  ]);

  window.history.replaceState(
    null,
    '',
    '#/home'
  );

  render(<App />);

  const home = within(
    screen.getByRole('region', {
      name: 'Planning summary'
    })
  );

  expect(
    home.getByText(/Deadlines clustered/)
  ).toHaveTextContent('Task count alone');

  expect(
    home.getByRole('heading', {
      name: '2.5 hours due · 3 deadlines'
    })
  ).toBeInTheDocument();

  expect(
    home.getByText(/Also review 1 overdue/)
  ).toHaveTextContent('8 hrs');

  expect(
    screen.queryByText(
      'Potentially heavy workload'
    )
  ).not.toBeInTheDocument();
});
