import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App.jsx';
import { TASKS_KEY } from './planner.js';
import { RESEARCH_KEY } from './research.js';
import { ANALYSIS_KEY } from './analysis.js';
import { WORKFLOWS_KEY, TEST_SITUATIONS, emptyWorkflows, readWorkflows, runWorkflow, workflowPrompt } from './workflows.js';

const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const stored = () => JSON.parse(localStorage.getItem(WORKFLOWS_KEY));

function addStep(stage, handler = 'Human', review = 'No') {
  click('+ Add workflow step');
  const form = screen.getByRole('form', { name: 'Add workflow step' });
  fireEvent.change(within(form).getByLabelText('Step / stage'), { target: { value: stage } });
  fireEvent.change(within(form).getByLabelText('Who or what handles it?'), { target: { value: handler } });
  fireEvent.change(within(form).getByLabelText('What happens'), { target: { value: `${stage} action` } });
  fireEvent.change(within(form).getByLabelText('Human Review?'), { target: { value: review } });
  fireEvent.change(within(form).getByLabelText('Why?'), { target: { value: `${stage} rationale` } });
  fireEvent.click(within(form).getByRole('button', { name: 'Save workflow step' }));
}

function addTest(situation, expected = 'Route through the saved workflow') {
  const supplied = TEST_SITUATIONS.find(item => item.issue === situation);
  fill(`${supplied.category} Route To`, 'Property Manager');
  click('+ Add Workflow Test Record');
  const form = screen.getByRole('form', { name: 'Add Workflow Test Record' });
  fireEvent.change(within(form).getByLabelText('Test Situation'), { target: { value: situation } });
  fireEvent.change(within(form).getByLabelText('Problem/Exception?'), { target: { value: 'Workflow behaved as intended' } });
  fireEvent.change(within(form).getByLabelText('Expected Workflow'), { target: { value: expected } });
  fireEvent.click(within(form).getByRole('button', { name: 'Run Workflow' }));
  fireEvent.change(within(form).getByLabelText('Problem/Exception?'), { target: { value: 'Workflow behaved as intended' } });
  fireEvent.change(within(form).getByLabelText('Manager Decision'), { target: { value: 'Keep the tested controls.' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Save Workflow Test Record' }));
}

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/workflows'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Week 5 Workflows & Automation', () => {
  it('runs saved rules, holds for review, reruns changed rules, and retains snapshots on reload', () => {
    render(<App />);
    const issue = TEST_SITUATIONS[1].issue;
    fill('Maintenance Route To', 'Property Manager');
    fill('Maintenance Human Review', 'No');
    click('+ Add Workflow Test Record'); fill('Test Situation', issue);
    click('Run Workflow'); expect(screen.getByRole('alert')).toHaveTextContent('Expected Workflow');
    fill('Expected Workflow', 'Route to the manager automatically.'); click('Run Workflow');
    expect(screen.getByRole('region', { name: 'Automation Result' })).toHaveTextContent('Property Manager');
    expect(screen.getByRole('region', { name: 'Automation Result' })).toHaveTextContent('Automatically Routed');
    expect(screen.getByLabelText('Expected Workflow')).toHaveAttribute('readonly');
    fill('Problem/Exception?', 'Wrong routing'); fill('Manager Decision', 'Change the route.'); click('Save Workflow Test Record');
    fill('Maintenance Route To', 'Maintenance'); fill('Maintenance Human Review', 'Yes');
    click('Rerun situation');
    expect(screen.getByLabelText('Expected Workflow')).toHaveValue('');
    fill('Expected Workflow', 'Hold the maintenance route for review.'); click('Run Workflow');
    const form = screen.getByRole('form', { name: 'Add Workflow Test Record' });
    expect(within(form).getByRole('region', { name: 'Automation Result' })).toHaveTextContent('Held for Human Review');
    fill('Problem/Exception?', 'Workflow behaved as intended'); fill('Manager Decision', 'Keep this rule.'); click('Save Workflow Test Record');
    expect(stored().tests.map(test => test.result.routedTo)).toEqual(['Property Manager', 'Maintenance']);
    const saved = localStorage.getItem(WORKFLOWS_KEY);
    cleanup(); render(<App />);
    expect(screen.getByLabelText('Maintenance Route To')).toHaveValue('Maintenance');
    expect(screen.getByLabelText('Maintenance Human Review')).toHaveValue('Yes');
    expect(screen.getAllByRole('region', { name: 'Automation Result' })).toHaveLength(2);
    expect(localStorage.getItem(WORKFLOWS_KEY)).toBe(saved);
  });

  it('requires a configured rule and protects results when a rule cannot be saved', () => {
    render(<App />); click('+ Add Workflow Test Record');
    fill('Test Situation', TEST_SITUATIONS[1].issue); fill('Expected Workflow', 'Apply my rule');
    click('Run Workflow'); expect(screen.getByRole('alert')).toHaveTextContent('configure its Route To');
    fill('Maintenance Route To', 'Property Manager');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    fill('Maintenance Route To', 'Maintenance');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    click('Run Workflow'); expect(screen.getByRole('region', { name: 'Automation Result' })).toHaveTextContent('Property Manager');
  });

  it('loads existing Week 5 records without inventing automation results or losing work', () => {
    const old = emptyWorkflows(); delete old.rules;
    old.tests = [{ id: 'old', situation: 'Wi-Fi outage', expected: 'Escalate', happened: 'Manager reviewed', outcome: 'Workflow behaved as intended', managerDecision: 'Keep' }];
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(old));
    expect(readWorkflows().error).toBe(''); render(<App />);
    expect(screen.getByText('Historical student observation: Manager reviewed')).toBeInTheDocument();
    fill('Maintenance Route To', 'Maintenance'); expect(stored().tests).toEqual(old.tests);
  });

  it('uses configurable destinations and review states for every supplied category', () => {
    expect(TEST_SITUATIONS.map(item => item.category)).toEqual(['Housekeeping', 'Maintenance', 'Guest Services', 'Management/Exception']);
    for (const { issue, category } of TEST_SITUATIONS) {
      for (const humanReview of [true, false]) {
        expect(runWorkflow(issue, { [category]: { routeTo: 'Property Manager', humanReview } })).toEqual({
          guestIssue: issue, category, routedTo: 'Property Manager', humanReview,
          status: humanReview ? 'Held for Human Review' : 'Automatically Routed',
        });
      }
    }
  });

  it('opens directly, appears in navigation, and keeps every prior destination accessible', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Workflows & Automation' })).toBeInTheDocument();
    expect(document.title).toMatch(/^Workflows/);
    for (const [button, route] of [['Home', 'home'], ['Profile', 'profile'], ['Planner / Tasks', 'tasks'], ['Research', 'research'], ['Analysis', 'analysis'], ['Workflows', 'workflows']]) {
      click(button); expect(window.location.hash).toBe(`#/${route}`); expect(screen.getByRole('main')).toBeInTheDocument();
    }
  });

  it('creates, edits, reorders, and safely deletes steps with all handler and review choices', () => {
    render(<App />);
    fill('Workflow name', 'Guest Issue Response'); fill('Workflow purpose', 'Respond consistently while preserving manager control.');
    addStep('Receive', 'Automation', 'No'); addStep('Review', 'AI Support', 'Yes'); addStep('Act', 'Human', 'Yes');
    expect(stored().workflow.steps.map(step => step.handler)).toEqual(['Automation', 'AI Support', 'Human']);
    expect(stored().workflow.steps[1]).toMatchObject({ humanReview: true, reason: 'Review rationale' });

    click('Edit step 2');
    const edit = screen.getByRole('form', { name: 'Edit workflow step' });
    fireEvent.change(within(edit).getByLabelText('Step / stage'), { target: { value: 'Review and classify' } });
    fireEvent.click(within(edit).getByRole('button', { name: 'Save workflow step' }));
    expect(stored().workflow.steps).toHaveLength(3); expect(stored().workflow.steps[1].stage).toBe('Review and classify');

    click('Move step 2 up'); expect(stored().workflow.steps.map(step => step.stage)).toEqual(['Review and classify', 'Receive', 'Act']);
    click('Delete step 2'); expect(stored().workflow.steps).toHaveLength(3);
    click('Keep step'); expect(stored().workflow.steps).toHaveLength(3);
    click('Delete step 2'); click('Confirm delete'); expect(stored().workflow.steps.map(step => step.stage)).toEqual(['Review and classify', 'Act']);
  });

  it('validates meaningful steps, prepares and copies a manager-focused prompt, and never applies AI feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<App />); click('Generate workflow review prompt');
    expect(screen.getByRole('alert')).toHaveTextContent('name, purpose');
    fill('Workflow name', 'Guest response'); fill('Workflow purpose', 'Handle guest issues.');
    click('+ Add workflow step'); fill('Step / stage', ' '); fill('What happens', ' '); fill('Why?', ' '); click('Save workflow step'); expect(screen.getByRole('alert')).toHaveTextContent('Complete the step');
    click('Cancel'); addStep('Receive', 'Automation', 'No'); click('Generate workflow review prompt');
    const prompt = screen.getByLabelText('AI Workflow Review Prompt').value;
    for (const phrase of ['automation opportunities', 'risky automation', 'AI support', 'human-review', 'escalation risks', 'not making the final management decision', 'Do not rewrite', 'suggestions from established facts']) expect(prompt).toContain(phrase);
    click('Copy prompt'); expect(writeText).toHaveBeenCalledWith(prompt);
    fill('Paste AI workflow feedback', 'Consider a manager checkpoint before consequential communication.');
    click('Record feedback for review');
    expect(screen.getByRole('article', { name: 'AI feedback under student review' })).toHaveTextContent('not accepted workflow');
    expect(stored().workflow.steps).toHaveLength(1);
    expect(localStorage.getItem(WORKFLOWS_KEY)).not.toContain('manager checkpoint');
    cleanup(); render(<App />);
    expect(screen.queryByText('Consider a manager checkpoint before consequential communication.')).not.toBeInTheDocument();
  });

  it('offers all four situations, saves repeated tests, edits in place, and persists after remount', () => {
    render(<App />);
    TEST_SITUATIONS.forEach(({ category, issue }) => expect(screen.getByText(`${category}: ${issue}`)).toBeInTheDocument());
    TEST_SITUATIONS.forEach(({ issue }) => addTest(issue));
    addTest(TEST_SITUATIONS[0].issue, 'Retest the revised route');
    expect(stored().tests).toHaveLength(5);
    expect(stored().tests.filter(test => test.situation === TEST_SITUATIONS[0].issue)).toHaveLength(2);
    const firstCard = screen.getAllByRole('button', { name: 'Edit test record' })[0].closest('article');
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Edit test record' }));
    const edit = screen.getByRole('form', { name: 'Edit Workflow Test Record' });
    fireEvent.change(within(edit).getByLabelText('Manager Decision'), { target: { value: 'Revise routing and retest.' } });
    fireEvent.click(within(edit).getByRole('button', { name: 'Save Workflow Test Record' }));
    expect(stored().tests).toHaveLength(5); expect(stored().tests[0].managerDecision).toBe('Revise routing and retest.');
    cleanup(); render(<App />); expect(screen.getByText('Revise routing and retest.')).toBeInTheDocument();
  });

  it('requires responsibility acknowledgment and updates one persistent Management Evaluation', () => {
    render(<App />);
    const values = ['Automation handled intake.', 'Managers retained consequential approvals.', 'Testing found unclear routing.', 'Clarify escalation.', 'The balance is proportionate.'];
    ['What did you automate or make AI-supported?', 'What did you intentionally keep under human control?', 'What did testing reveal?', 'What did you change or what would you change?', 'Why is the final workflow an appropriate management decision?'].forEach((label, index) => fill(label, values[index]));
    click('Save Management Evaluation'); expect(screen.getByRole('alert')).toHaveTextContent('responsibility acknowledgment');
    fireEvent.click(screen.getByRole('checkbox')); click('Save Management Evaluation');
    expect(stored().evaluation.testingRevealed).toBe('Testing found unclear routing.'); expect(Array.isArray(stored().evaluation)).toBe(false);
    click('Edit Management Evaluation'); fill('What did testing reveal?', 'Testing revealed a missing approval.'); fireEvent.click(screen.getByRole('checkbox')); click('Save Management Evaluation');
    expect(stored().evaluation.testingRevealed).toBe('Testing revealed a missing approval.');
    expect(screen.getAllByRole('heading', { name: 'Completed Management Evaluation' })).toHaveLength(1);
  });

  it('protects unreadable Week 5 data and preserves prior-week storage exactly', () => {
    const prior = {
      [STORAGE_KEY]: '{"name":"Jordan"}', [TASKS_KEY]: '{"version":1,"tasks":[]}',
      [RESEARCH_KEY]: '{"version":1,"records":[]}', [ANALYSIS_KEY]: '{"version":1,"name":"","question":"","dataset":null,"records":[],"decision":null}',
    };
    Object.entries(prior).forEach(([key, value]) => localStorage.setItem(key, value));
    render(<App />); fill('Workflow name', 'Guest response');
    Object.entries(prior).forEach(([key, value]) => expect(localStorage.getItem(key)).toBe(value));
    cleanup(); localStorage.setItem(WORKFLOWS_KEY, '{broken'); render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('not been overwritten'); expect(screen.getByLabelText('Workflow name')).toBeDisabled();
    expect(localStorage.getItem(WORKFLOWS_KEY)).toBe('{broken');
  });
});

it('generates a prompt from the ordered workflow without mutating it', () => {
  const workflow = { name: 'Guest response', purpose: 'Handle issues', steps: [{ id: '1', stage: 'Receive', action: 'Capture issue', handler: 'AI Support', humanReview: true, reason: 'Check ambiguity' }] };
  const before = JSON.stringify(workflow); const prompt = workflowPrompt(workflow);
  expect(prompt).toContain('1. Receive'); expect(prompt).toContain('Human review: Yes'); expect(JSON.stringify(workflow)).toBe(before);
});
