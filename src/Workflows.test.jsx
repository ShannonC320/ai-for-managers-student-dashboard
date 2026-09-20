import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App.jsx';
import { TASKS_KEY } from './planner.js';
import { RESEARCH_KEY } from './research.js';
import { ANALYSIS_KEY } from './analysis.js';
import { WORKFLOWS_KEY, TEST_SITUATIONS, workflowPrompt } from './workflows.js';

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
  click('+ Add Workflow Test Record');
  const form = screen.getByRole('form', { name: 'Add Workflow Test Record' });
  fireEvent.change(within(form).getByLabelText('Test Situation'), { target: { value: situation } });
  fireEvent.change(within(form).getByLabelText('Problem/Exception?'), { target: { value: 'Workflow behaved as intended' } });
  fireEvent.change(within(form).getByLabelText('Expected Workflow'), { target: { value: expected } });
  fireEvent.change(within(form).getByLabelText('What Happened'), { target: { value: 'The issue followed the expected steps.' } });
  fireEvent.change(within(form).getByLabelText('Manager Decision'), { target: { value: 'Keep the tested controls.' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Save Workflow Test Record' }));
}

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/workflows'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Week 5 Workflows & Automation', () => {
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
    TEST_SITUATIONS.forEach(situation => expect(screen.getByText(situation)).toBeInTheDocument());
    TEST_SITUATIONS.forEach(situation => addTest(situation));
    addTest('Wi-Fi outage', 'Retest the revised route');
    expect(stored().tests).toHaveLength(5);
    expect(stored().tests.filter(test => test.situation === 'Wi-Fi outage')).toHaveLength(2);
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
