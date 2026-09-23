import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';
import { GRACE_KEY, readGrace } from './grace.js';
import { graceQuestions } from './graceQuestions.js';

const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const stored = () => JSON.parse(localStorage.getItem(GRACE_KEY));
const answer = 'Generated response for the test; students must judge it.';
beforeEach(() => {
  localStorage.clear(); window.history.replaceState(null, '', '#/assistant');
  vi.stubEnv('VITE_GRACE_ENDPOINT', 'https://grace.example/chat');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ response: answer }) }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function ask(question = 'When does my PTO increase?') {
  fill('Your question', question); click('Send');
  await screen.findAllByText(answer);
}
function judgments(type) {
  fill('Test type', type);
  fill('Was the response supported by the selected information?', 'Partly');
  fill('Did Grace stay within her authority?', 'Yes');
  fill('Was human involvement needed?', 'Yes');
  fill('Student explanation/reasoning', 'I compared the answer with the selected reference.');
}
async function saveTest(type, question) {
  await ask(question);
  const buttons = screen.getAllByRole('button', { name: 'Evaluate this response' });
  fireEvent.click(buttons.at(-1)); judgments(type); click('Save test');
}
describe('Week 6 Grace', () => {
  it('adds navigation without replacing prior destinations and renders Grace', () => {
    window.history.replaceState(null, '', '#/home'); render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const name of ['Home', 'Profile', 'Planner / Tasks', 'Research', 'Analysis', 'Workflows', 'AI Assistant']) {
      expect(within(nav).getByRole('button', { name: new RegExp(name.replace('/', '\\/')) })).toBeInTheDocument();
    }
    click('AI Assistant'); expect(location.hash).toBe('#/assistant');
    expect(screen.getByRole('heading', { name: 'Grace' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Grace' })).toHaveAttribute('src', `${import.meta.env.BASE_URL}assets/grace-avatar.png`);
    expect(screen.queryByText(/Management Decision/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByLabelText('Knowledge source')).toHaveValue('');
  });
  it('shows questions only, requires Send, and sends only source/question', async () => {
    render(<App />); fill('Knowledge source', 'coastal');
    expect(graceQuestions).toHaveLength(14);
    expect(graceQuestions.every(question => typeof question === 'string')).toBe(true);
    click(graceQuestions[0]); expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Your question')).toHaveValue(graceQuestions[0]);
    click('Send'); await screen.findByText(answer);
    expect(fetch).toHaveBeenCalledWith('https://grace.example/chat', expect.objectContaining({
      body: JSON.stringify({ source: 'coastal', question: graceQuestions[0] }),
    }));
    click('Evaluate this response');
    for (const label of ['Test type', 'Was the response supported by the selected information?', 'Did Grace stay within her authority?', 'Was human involvement needed?']) expect(screen.getByLabelText(label)).toHaveValue('');
    expect(localStorage.getItem(GRACE_KEY)).toBeNull();
  });
  it('resets source context and discards a late response after switching', async () => {
    let resolve;
    fetch.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<App />); fill('Knowledge source', 'coastal'); fill('Your question', 'PTO?'); click('Send');
    expect(screen.getByText('Grace is thinking…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    fill('Knowledge source', 'course');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => resolve({ ok: true, json: async () => ({ response: 'OLD SOURCE ANSWER' }) }));
    expect(screen.queryByText('OLD SOURCE ANSWER')).not.toBeInTheDocument();
    expect(screen.queryByText('PTO?')).not.toBeInTheDocument();
    expect(screen.queryByText('Optional example questions')).not.toBeInTheDocument();
    expect(screen.queryByText(/Employees who expect to be late/)).not.toBeInTheDocument();
    await ask('What is the course?');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ source: 'course', question: 'What is the course?' });
    expect(screen.queryByRole('button', { name: 'Evaluate this response' })).not.toBeInTheDocument();
    click('Clear conversation'); expect(screen.queryByText(answer)).not.toBeInTheDocument();
  });
  it.each(['network', 'http', 'invalid', 'missing'])('shows an error with no fabricated answer for %s failure', async failure => {
    if (failure === 'network') fetch.mockRejectedValue(new Error('Network unavailable'));
    if (failure === 'http') fetch.mockResolvedValue({ ok: false });
    if (failure === 'invalid') fetch.mockResolvedValue({ ok: true, json: async () => ({ response: '' }) });
    if (failure === 'missing') vi.stubEnv('VITE_GRACE_ENDPOINT', '');
    render(<App />); fill('Knowledge source', 'coastal'); fill('Your question', 'PTO?'); click('Send');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Evaluate this response' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your question')).toHaveValue('PTO?');
    expect(screen.queryByText('Grace is thinking…')).not.toBeInTheDocument();
  });
  it('validates, retains two tests, persists evaluation, and supports editing/deleting', async () => {
    render(<App />); fill('Knowledge source', 'coastal');
    await ask(); click('Evaluate this response');
    fireEvent.submit(screen.getByRole('form', { name: 'Evaluate Grace response' }));
    expect(screen.getByRole('alert')).toHaveTextContent('complete every judgment');
    expect(localStorage.getItem(GRACE_KEY)).toBeNull();
    judgments('Supported'); click('Save test');
    await saveTest('Boundary', 'How many sick days?');
    expect(stored().tests).toHaveLength(2);
    expect(stored().tests.map(test => test.type)).toEqual(['Supported', 'Boundary']);
    fireEvent.submit(screen.getByRole('form', { name: 'Assistant Evaluation' }));
    expect(screen.getByRole('alert')).toHaveTextContent('both evaluation responses');
    fill(/Based on your testing/, 'Questions covered by the supplied reference.');
    fill(/When should Grace acknowledge/, 'Missing information, approval, and immediate hazards.');
    click('Save Assistant Evaluation');
    expect(stored().evaluation.help).toContain('supplied reference');
    cleanup(); render(<App />);
    expect(screen.getByRole('article', { name: 'Supported test' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Boundary test' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Based on your testing/)).toHaveValue('Questions covered by the supplied reference.');
    click('Edit Supported test'); fill('Student explanation/reasoning', 'Revised reasoning.'); click('Save test');
    expect(stored().tests[0].reason).toBe('Revised reasoning.');
    expect(stored().tests[0].response).toBe(answer);
    expect(stored().evaluation).toBeNull();
    click('Delete Boundary test'); click('Keep test'); expect(stored().tests).toHaveLength(2);
    click('Delete Boundary test'); click('Confirm delete'); expect(stored().tests).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Save Assistant Evaluation' })).toBeDisabled();
  });
  it('prevents duplicate test types', async () => {
    render(<App />); fill('Knowledge source', 'coastal');
    await saveTest('Supported', 'PTO?'); await saveTest('Supported', 'When do I request it?');
    expect(screen.getByRole('alert')).toHaveTextContent('One test of each type');
    expect(stored().tests).toHaveLength(1);
  });
  it('preserves unreadable data and reports save failures', async () => {
    localStorage.setItem(GRACE_KEY, '{broken'); render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('not been overwritten');
    expect(localStorage.getItem(GRACE_KEY)).toBe('{broken');
    cleanup(); localStorage.clear(); render(<App />); fill('Knowledge source', 'coastal');
    await ask(); click('Evaluate this response'); judgments('Supported');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    click('Save test'); expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('form', { name: 'Evaluate Grace response' })).toBeInTheDocument();
  });
  it('rejects malformed stored records', () => {
    localStorage.setItem(GRACE_KEY, JSON.stringify({ version: 1, tests: [{}], evaluation: null }));
    expect(readGrace().error).toContain('could not be read');
  });
});
