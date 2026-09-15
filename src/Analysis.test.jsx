import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App.jsx';
import { ANALYSIS_KEY, parseCSV, numericSummaries, sortRows, datasetCSV, readAnalysis, parseProposals } from './analysis.js';
import { RESEARCH_KEY } from './research.js';
import { TASKS_KEY } from './planner.js';
import { PLANNING_KEY, emptyPlanning } from './planningSupport.js';

const coastal = `Property,Occupancy,Avg Nightly Rate,Monthly Revenue,Guest Rating,Maintenance Cost,Guest Complaints
Beach House A,92,310,8560,4.8,620,2
Beach House B,88,295,7790,4.6,740,4
Marsh Villa,81,260,6320,4.7,510,2
Harbor Condo,94,225,6350,4.2,1480,9
Garden Cottage,76,205,4670,4.9,390,1
Oceanview Condo,90,245,6620,4.3,1260,7
Historic Home,72,340,7340,4.7,860,3
Creekside House,84,275,6930,4.5,690,4`;
const question = 'Which properties need the most management attention, and what should Coastal Life prioritize to improve performance?';
const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const stored = () => JSON.parse(localStorage.getItem(ANALYSIS_KEY));
function loadDataset() {
  fill('Dataset Name', 'Coastal Life'); fill('Management Question', question);
  fill('Dataset Input', coastal); click('Load Dataset');
}
function fillRecord(finding = 'Harbor needs attention') {
  fill('Finding / Pattern', finding); fill('Evidence from the Data', 'Harbor has 9 complaints and maintenance cost 1480.');
  fill('What It Could Mean', 'Investigate guest experience and maintenance needs.');
}

const proposed = { finding: 'Harbor needs attention', evidence: '9 complaints', meaning: 'Investigate guest concerns', needsMore: 'Yes', additional: 'Complaint details' };
const proposalJSON = findings => JSON.stringify({ findings });

describe('structured AI proposals', () => {
  it('validates JSON and fenced JSON, including conditional additional information', () => {
    expect(parseProposals('```json\n' + proposalJSON([proposed]) + '\n```')[0]).toMatchObject({ needsMore: true, additional: 'Complaint details' });
    expect(parseProposals(proposalJSON([{ ...proposed, needsMore: 'No', additional: undefined }]))[0]).toMatchObject({ needsMore: false, additional: '' });
    for (const response of ['plain text', '{}', '{"findings":[]}', proposalJSON([null]), proposalJSON([{ ...proposed, needsMore: true }]), proposalJSON([proposed, { ...proposed, evidence: '' }]), proposalJSON([{ ...proposed, additional: '' }])]) {
      expect(() => parseProposals(response)).toThrow();
    }
  });
  it('imports only on request, allows editing and explicit acceptance/rejection, and persists only accepted records', () => {
    render(<App />); loadDataset(); click('Prepare AI Analysis Prompt');
    expect(screen.getByLabelText('AI Analysis Prompt').value).toContain('Return only valid JSON');
    fill('Paste AI Analysis', proposalJSON([proposed, { ...proposed, finding: 'Second finding', needsMore: 'No', additional: undefined }]));
    expect(screen.queryByRole('form', { name: 'AI-proposed finding 1' })).not.toBeInTheDocument();
    expect(stored().records).toEqual([]);
    click('Import proposed findings');
    expect(stored().records).toEqual([]);
    expect(screen.getByRole('button', { name: 'Import proposed findings' })).toBeDisabled();
    const draft = within(screen.getByRole('form', { name: 'AI-proposed finding 1' }));
    expect(draft.getByLabelText('What additional information would help?')).toHaveValue('Complaint details');
    fireEvent.change(draft.getByLabelText('Finding / Pattern'), { target: { value: 'Student-reviewed Harbor finding' } });
    fireEvent.change(draft.getByLabelText('Needs More Information?'), { target: { value: 'No' } });
    expect(draft.queryByLabelText('What additional information would help?')).not.toBeInTheDocument();
    fireEvent.click(draft.getByRole('button', { name: 'Accept and Save Analysis Record' }));
    expect(stored().records).toHaveLength(1);
    expect(stored().records[0]).toMatchObject({ finding: 'Student-reviewed Harbor finding', needsMore: false });
    click('Reject proposal'); expect(stored().records).toHaveLength(1);
    expect(screen.queryByRole('form', { name: /AI-proposed/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import proposed findings' })).toBeDisabled();
    cleanup(); render(<App />);
    expect(screen.getByRole('heading', { name: 'Student-reviewed Harbor finding' })).toBeInTheDocument();
    click('Edit record'); expect(screen.getByLabelText('Finding / Pattern')).toHaveValue('Student-reviewed Harbor finding');
  });
  it('rejects malformed imports atomically and retains proposals after failed acceptance', () => {
    render(<App />); loadDataset();
    fill('Paste AI Analysis', proposalJSON([proposed, { ...proposed, additional: '' }])); click('Import proposed findings');
    expect(screen.getByRole('alert')).toHaveTextContent('Finding 2');
    expect(screen.queryByRole('form', { name: /AI-proposed/ })).not.toBeInTheDocument();
    fill('Paste AI Analysis', proposalJSON([proposed])); click('Import proposed findings');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    click('Accept and Save Analysis Record');
    expect(screen.getByRole('form', { name: 'AI-proposed finding 1' })).toBeInTheDocument();
    expect(stored().records).toEqual([]);
    expect(screen.getByText(/Your draft remains available/)).toBeInTheDocument();
  });
});

it('shows a completed decision card, updates the single decision, and reports errors near its controls', () => {
  render(<App />); loadDataset();
  const section = () => within(screen.getByRole('region', { name: 'Decide — Management Decision' }));
  fill('What needs the most management attention?', 'Harbor'); fill('Evidence Supporting Your Decision', '9 complaints');
  fill('Recommended Management Action', 'Inspect'); fill('What information would you want before acting?', 'Repair logs');
  click('Save Management Decision'); expect(section().getByRole('alert')).toHaveTextContent('acknowledgment');
  fireEvent.click(screen.getByRole('checkbox')); click('Save Management Decision');
  expect(section().getByRole('status')).toHaveTextContent('saved');
  expect(section().queryByRole('textbox')).not.toBeInTheDocument();
  click('Edit Decision'); expect(screen.getByLabelText('Recommended Management Action')).toHaveValue('Inspect');
  fill('Recommended Management Action', 'Inspect this week'); fireEvent.click(screen.getByRole('checkbox'));
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
  click('Save Management Decision'); expect(section().getByRole('alert')).toHaveTextContent('could not be saved');
  expect(screen.getByLabelText('Recommended Management Action')).toHaveValue('Inspect this week');
  expect(stored().decision.action).toBe('Inspect'); write.mockRestore();
  click('Save Management Decision'); expect(stored().decision.action).toBe('Inspect this week');
  expect(Array.isArray(stored().decision)).toBe(false);
  cleanup(); render(<App />);
  expect(section().getByText('Inspect this week')).toBeInTheDocument();
  expect(section().getAllByRole('heading', { name: 'Completed Management Decision' })).toHaveLength(1);
  expect(section().getByRole('button', { name: 'Edit Decision' })).toBeInTheDocument();
});

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '#/analysis'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CSV and numeric inspection', () => {
  it('loads the 8 by 7 Coastal Life dataset and calculates all six numeric summaries', () => {
    const dataset = parseCSV(coastal);
    expect(dataset.headers).toHaveLength(7); expect(dataset.rows).toHaveLength(8);
    const summaries = numericSummaries(dataset);
    expect(summaries).toHaveLength(6);
    const expected = [[84.625,72,94],[269.375,205,340],[6822.5,4670,8560],[4.5875,4.2,4.9],[818.75,390,1480],[4,1,9]];
    summaries.forEach((column, i) => {
      expect(column.count).toBe(8); expect(column.average).toBeCloseTo(expected[i][0]);
      expect(column.minimum).toBe(expected[i][1]); expect(column.maximum).toBe(expected[i][2]);
    });
    expect(sortRows(dataset, 5, 'ascending').map(row => Number(row[5]))).toEqual([390,510,620,690,740,860,1260,1480]);
    expect(sortRows(dataset, 5, 'descending')[0][0]).toBe('Harbor Condo');
    expect(dataset.rows[0][0]).toBe('Beach House A');
  });
  it('handles general datasets, quoted commas, escaped quotes, multiline cells and CRLF', () => {
    const dataset = parseCSV('\uFEFFName,Value,Note\r\n"Team, A",-2.5,"A ""quote""\r\nnext line"\r\nTeam B,1e2,ok\r\nTeam C,,empty\r\n');
    expect(dataset.rows[0]).toEqual(['Team, A', '-2.5', 'A "quote"\nnext line']);
    expect(numericSummaries(dataset)[0]).toMatchObject({ count: 2, average: 48.75, minimum: -2.5, maximum: 100 });
    expect(parseCSV(datasetCSV(dataset))).toEqual(dataset);
    expect(sortRows(dataset, 1, 'descending').at(-1)[0]).toBe('Team C');
    expect(numericSummaries(parseCSV('Name,Value\nA,12\nB,unknown'))).toEqual([]);
  });
  it.each(['', 'A,B', 'A,B\n1', 'A,B\n1,2,3', 'A,A\n1,2', ',B\n1,2', 'A,B\n"open,2', 'A,B\n"closed"oops,2', 'A,B\na"b,2'])('rejects unusable CSV: %s', input => {
    expect(() => parseCSV(input)).toThrow();
  });
});

describe('Analysis workflow', () => {
  it('opens Analysis directly and keeps every prior destination accessible', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Data Analysis & Decision Support' })).toBeInTheDocument();
    expect(document.title).toMatch(/^Analysis/);
    for (const [button, route] of [['Home','home'], ['Profile','profile'], ['Planner / Tasks','tasks'], ['Research','research'], ['Analysis','analysis']]) {
      click(button); expect(window.location.hash).toBe(`#/${route}`);
      expect(screen.getByRole('main')).toBeInTheDocument();
    }
  });
  it('loads, sorts, summarizes and restores the dataset; failed loads retain previous data', () => {
    render(<App />); loadDataset();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    click('Maintenance Cost');
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Garden Cottage');
    click('Maintenance Cost');
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Harbor Condo');
    expect(screen.getByText('84.625')).toBeInTheDocument();
    fill('Dataset Input', 'A,B\n1'); click('Load Dataset');
    expect(screen.getByRole('alert')).toHaveTextContent('expected 2');
    expect(stored().dataset.rows).toHaveLength(8);
    cleanup(); render(<App />);
    expect(screen.getByLabelText('Dataset Input')).toHaveValue(coastal);
    expect(screen.getByLabelText('Dataset Name')).toHaveValue('Coastal Life');
    expect(screen.getByLabelText('Management Question')).toHaveValue(question);
  });
  it('prepares and copies an evidence-focused prompt; AI text never creates records', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<App />); click('Prepare AI Analysis Prompt');
    expect(screen.getByRole('alert')).toHaveTextContent('Load a dataset');
    loadDataset(); click('Prepare AI Analysis Prompt');
    const prompt = screen.getByLabelText('AI Analysis Prompt').value;
    for (const text of ['Coastal Life', question, coastal, 'evidence-supported patterns', 'specific values', 'Compare relevant records', 'management concerns', 'Distinguish observations', 'unsupported causal claims', 'additional information']) expect(prompt).toContain(text);
    click('Copy prompt'); expect(writeText).toHaveBeenCalledWith(prompt);
    fill('Paste AI Analysis', 'Harbor has the most complaints.');
    expect(stored().records).toEqual([]);
    expect(localStorage.getItem(ANALYSIS_KEY)).not.toContain('Harbor has the most complaints.');
    click('Home'); click('Analysis');
    expect(screen.getByLabelText('Paste AI Analysis')).toHaveValue('');
    expect(screen.queryByLabelText('AI Analysis Prompt')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
  it('creates multiple records, conditionally requires information, edits in place and confirms deletion', () => {
    render(<App />); loadDataset(); click('Add Analysis Record'); fillRecord();
    expect(screen.queryByLabelText('What additional information would help?')).not.toBeInTheDocument();
    fill('Needs More Information?', 'Yes');
    expect(screen.getByLabelText('What additional information would help?')).toBeRequired();
    fill('What additional information would help?', 'Complaint categories and repair history.');
    click('Save Analysis Record'); expect(stored().records).toHaveLength(1);
    const id = stored().records[0].id;
    click('Edit record'); fill('Finding / Pattern', 'Review Harbor first'); fill('Needs More Information?', 'No');
    expect(screen.queryByLabelText('What additional information would help?')).not.toBeInTheDocument();
    click('Save Analysis Record'); expect(stored().records).toHaveLength(1);
    expect(stored().records[0]).toMatchObject({ id, finding: 'Review Harbor first', needsMore: false });
    click('Add Analysis Record'); fillRecord('Review Oceanview next'); click('Save Analysis Record');
    expect(stored().records).toHaveLength(2);
    cleanup(); render(<App />);
    const article = screen.getByRole('heading', { name: 'Review Harbor first' }).closest('article');
    fireEvent.click(within(article).getByRole('button', { name: 'Delete record' }));
    expect(stored().records).toHaveLength(2); click('Keep record'); expect(stored().records).toHaveLength(2);
    fireEvent.click(within(article).getByRole('button', { name: 'Delete record' })); click('Confirm delete');
    expect(stored().records).toHaveLength(1); expect(screen.queryByText('Review Harbor first')).not.toBeInTheDocument();
  });
  it('gates decisions on acknowledgment, persists saved decisions, and preserves Weeks 1–3 storage', () => {
    const prior = {
      [STORAGE_KEY]: JSON.stringify({ name: 'Jordan', major: 'Business', academicYear: 'Junior', goals: ['Lead well'] }),
      [TASKS_KEY]: JSON.stringify({ version: 1, tasks: [] }),
      [PLANNING_KEY]: JSON.stringify(emptyPlanning()),
      [RESEARCH_KEY]: JSON.stringify({ version: 1, records: [{ id: 'r1', question: 'Demand?', area: 'Market', claim: 'Demand is rising', source: '', sourceUrl: '', finding: '', status: 'Pending' }] }),
    };
    Object.entries(prior).forEach(([key, value]) => localStorage.setItem(key, value));
    render(<App />); loadDataset();
    fill('What needs the most management attention?', 'Harbor Condo');
    fill('Evidence Supporting Your Decision', '9 complaints and 1480 maintenance cost.');
    fill('Recommended Management Action', 'Review complaints and inspect repairs.');
    fill('What information would you want before acting?', 'Complaint details and repair logs.');
    click('Save Management Decision'); expect(within(screen.getByRole('region', { name: 'Decide — Management Decision' })).getByRole('alert')).toHaveTextContent('responsibility acknowledgment');
    expect(stored().decision).toBeNull();
    fireEvent.click(screen.getByRole('checkbox')); click('Save Management Decision');
    expect(stored().decision.attention).toBe('Harbor Condo');
    expect(screen.queryByLabelText('Recommended Management Action')).not.toBeInTheDocument();
    click('Edit Decision');
    fill('Recommended Management Action', 'Unsaved revision');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    click('Home'); click('Analysis');
    expect(screen.getByText('Review complaints and inspect repairs.')).toBeInTheDocument();
    cleanup(); render(<App />);
    expect(within(screen.getByRole('region', { name: 'Decide — Management Decision' })).getByText('Harbor Condo')).toBeInTheDocument();
    Object.entries(prior).forEach(([key, value]) => expect(localStorage.getItem(key)).toBe(value));
    click('Research'); expect(screen.getByRole('heading', { name: 'Demand?' })).toBeInTheDocument();
  });
  it('protects unreadable data and reports storage failures without false success', () => {
    localStorage.setItem(ANALYSIS_KEY, '{broken'); render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('not been overwritten');
    expect(screen.getByRole('button', { name: 'Load Dataset' })).toBeDisabled();
    expect(localStorage.getItem(ANALYSIS_KEY)).toBe('{broken');
    cleanup(); localStorage.removeItem(ANALYSIS_KEY); render(<App />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    fill('Dataset Input', coastal); click('Load Dataset');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('rejects malformed saved records without replacing them', () => {
    const raw = JSON.stringify({ version: 1, name: '', question: '', dataset: null, records: [{}], decision: null });
    localStorage.setItem(ANALYSIS_KEY, raw);
    expect(readAnalysis().error).toBeTruthy(); expect(localStorage.getItem(ANALYSIS_KEY)).toBe(raw);
  });
});

it('Research guidance follows each verification status', () => {
  window.history.replaceState(null, '', '#/research'); render(<App />); click(/Add research record/);
  const select = screen.getByRole('combobox');
  const guidance = select.parentElement.querySelector('small');
  for (const [status, text] of [['Pending','verification is incomplete'], ['Verified','supports the full claim'], ['Partly verified','only part of the claim'], ['Not verified','does not adequately support']]) {
    fireEvent.change(select, { target: { value: status } }); expect(guidance).toHaveTextContent(text);
    if (status !== 'Pending') expect(guidance).not.toHaveTextContent('Pending:');
  }
});

