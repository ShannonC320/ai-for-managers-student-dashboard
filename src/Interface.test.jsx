import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App.jsx';
import { LANGUAGE_KEY, setLanguage, t } from './i18n.js';
import { TASKS_KEY, writeTasks, localDate } from './planner.js';
import { RESEARCH_KEY, makeEmptyRecord } from './research.js';
import { ANALYSIS_KEY, emptyAnalysis, parseCSV } from './analysis.js';
import { WORKFLOWS_KEY, emptyWorkflows, TEST_SITUATIONS } from './workflows.js';
import { GRACE_KEY } from './grace.js';
import { STUDENT_ANALYSIS_KEY, emptyStudentAnalysis } from './studentAnalysis.js';
import { PLANNING_KEY, emptyPlanning } from './planningSupport.js';
import { coastalDataset } from './coastalExercise.js';
import { coastalInformation } from '../worker/knowledge/coastal.js';

const click = name => fireEvent.click(screen.getByRole('button', { name }));
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const switchLanguage = value => fill(/Interface language|Idioma de la interfaz/, value);
beforeEach(() => { localStorage.clear(); setLanguage('en'); window.history.replaceState(null, '', '#/home'); });
afterEach(() => { cleanup(); setLanguage('en'); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('persists language, translates every route, and preserves focus and all saved W1–W6 data byte for byte', () => {
  const records = {
    [STORAGE_KEY]: { name: 'Save task', major: 'Research', academicYear: 'Junior', goals: ['Home'] },
    [RESEARCH_KEY]: { version: 1, records: [{ ...makeEmptyRecord(), id: 'r', question: 'Save task', area: 'Home', claim: 'Research' }] },
    [ANALYSIS_KEY]: { ...emptyAnalysis(), name: 'Home', question: 'Research', dataset: parseCSV('Name,Count\nSave task,2') },
    [STUDENT_ANALYSIS_KEY]: { ...emptyStudentAnalysis(), response: 'Save task', judgment: 'Home' },
    [WORKFLOWS_KEY]: { ...emptyWorkflows(), workflow: { name: 'Research', purpose: 'Save task', steps: [] } },
    [PLANNING_KEY]: emptyPlanning(),
    [GRACE_KEY]: { version: 1, tests: [{ id: 'g', source: 'coastal', type: 'Supported', question: 'Home', response: 'Save task', supported: 'Yes', authority: 'Yes', human: 'No', reason: 'Research' }], evaluation: null },
  };
  for (const [key, value] of Object.entries(records)) localStorage.setItem(key, JSON.stringify(value));
  writeTasks([{ id: 't', title: 'Save task', category: 'Home', dueDate: localDate(), hours: 1, priority: 'High', notes: 'Research', completed: true, completedOn: localDate() }]);
  const before = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
  render(<App />);
  const control = screen.getByLabelText('Interface language'); control.focus(); switchLanguage('es');
  expect(control).toHaveFocus(); expect(document.documentElement.lang).toBe('es');
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('es');
  for (const [nav, heading] of [['Perfil', 'Tu panorama académico'], ['Planificador / Tareas', 'Planificador / Tareas'], ['Investigación', 'Investigación y verificación'], ['Análisis', 'Análisis de datos y apoyo a las decisiones'], ['Flujos de trabajo', 'Flujos de trabajo y automatización'], ['Asistente de IA', 'Grace']]) {
    click(nav); expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    if (nav === 'Investigación') expect(screen.getByRole('heading', { name: 'Save task' })).toBeInTheDocument();
    if (nav === 'Análisis') expect(screen.getByLabelText('Pegar respuesta de IA sobre el historial')).toHaveValue('Save task');
    if (nav === 'Asistente de IA') expect(screen.getAllByText('Save task')).toHaveLength(2);
  }
  switchLanguage('en'); switchLanguage('es'); cleanup(); render(<App />);
  expect(screen.getByLabelText('Idioma de la interfaz')).toHaveValue('es');
  for (const [key, value] of Object.entries(before)) expect(localStorage.getItem(key)).toBe(value);
  expect(localStorage.length).toBe(Object.keys(before).length + 1);
});

it('preserves unsaved text when switching and saves original enum values while using Spanish controls', () => {
  window.history.replaceState(null, '', '#/tasks'); render(<App />); click('+ Add task');
  fill('Task title', 'Save task'); fill(/^Due date/, localDate()); fill(/^Estimated remaining hours/, '2');
  switchLanguage('es'); expect(screen.getByLabelText('Título de la tarea')).toHaveValue('Save task');
  fill('Prioridad', 'High'); click('Guardar tarea');
  expect(JSON.parse(localStorage.getItem(TASKS_KEY)).tasks[0]).toMatchObject({ title: 'Save task', priority: 'High', completed: false });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar Save task como completada' }));
  expect(JSON.parse(localStorage.getItem(TASKS_KEY)).tasks[0]).toMatchObject({ completed: true, completedOn: localDate() });
  click('Análisis'); fill('Pegar respuesta de IA sobre el historial', 'Save task');
  fill(/Tras comparar el análisis/, 'Home'); switchLanguage('en');
  expect(screen.getByLabelText('Paste AI completion-history response')).toHaveValue('Save task');
  click('Save student analysis'); cleanup(); render(<App />);
  expect(screen.getByLabelText('Paste AI completion-history response')).toHaveValue('Save task');
});

it('shows distinct workspaces and copies the exact supplied dataset without replacing saved data', async () => {
  const original = JSON.stringify({ ...emptyAnalysis(), name: 'My project', dataset: parseCSV('A,B\n1,2') });
  localStorage.setItem(ANALYSIS_KEY, original);
  const writeText = vi.fn().mockResolvedValue(); vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  window.history.replaceState(null, '', '#/analysis'); render(<App />);
  expect(screen.getByRole('region', { name: 'Student Dashboard' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Coastal Life Management Application' })).toBeInTheDocument();
  fireEvent.click(screen.getByText('Supplied Coastal Life exercise')); click('Copy supplied dataset');
  expect(writeText).toHaveBeenCalledWith(coastalDataset);
  expect(parseCSV(coastalDataset).rows).toHaveLength(8);
  expect(parseCSV(coastalDataset).headers).toHaveLength(7);
  switchLanguage('es'); expect(screen.getByLabelText('Conjunto de datos proporcionado (CSV)')).toHaveValue(coastalDataset);
  expect(localStorage.getItem(ANALYSIS_KEY)).toBe(original);
  expect(await screen.findByRole('status')).toHaveTextContent('Datos copiados');
});

it('translates interface validation and keeps dynamic student text literal', () => {
  setLanguage('es'); expect(t('Edit Save  task $&')).toBe('Editar Save  task $&');
  expect(t('Save task')).toBe('Guardar tarea');
  localStorage.setItem(LANGUAGE_KEY, 'es'); window.history.replaceState(null, '', '#/tasks'); render(<App />);
  click('+ Añadir tarea'); fill('Título de la tarea', '   '); fill(/^Fecha de entrega/, localDate()); fill(/^Horas restantes/, '1'); click('Guardar tarea');
  expect(screen.getByRole('alert')).toHaveTextContent('no puede contener solo espacios');
});

it('runs briefing and Coastal Life rules with Spanish labels and original stored values', () => {
  localStorage.setItem(LANGUAGE_KEY, 'es'); window.history.replaceState(null, '', '#/workflows'); render(<App />);
  click('Probar automatización'); expect(screen.getByRole('status')).toHaveTextContent('0 vencidas; 0');
  fill('Mantenimiento — Derivar a', 'Property Manager');
  expect(JSON.parse(localStorage.getItem(WORKFLOWS_KEY)).rules.Maintenance.routeTo).toBe('Property Manager');
  click('+ Añadir registro de prueba del flujo'); fill('Situación de prueba', TEST_SITUATIONS[1].issue); fill('Flujo esperado', 'Keep my words'); click('Ejecutar flujo');
  expect(screen.getByRole('region', { name: 'Resultado de la automatización' })).toHaveTextContent('Gerente de la propiedad');
  switchLanguage('en'); expect(screen.getByLabelText('Expected Workflow')).toHaveValue('Keep my words');
});

it('keeps approved Grace references, questions and AI responses unchanged across language switches', async () => {
  vi.stubEnv('VITE_GRACE_ENDPOINT', 'https://grace.example');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ response: 'Save task' }) }); vi.stubGlobal('fetch', fetch);
  window.history.replaceState(null, '', '#/assistant'); render(<App />);
  fill('Knowledge source', 'coastal'); fill('Your question', 'How much PTO do I receive after three years?'); click('Send'); await screen.findByText('Save task');
  switchLanguage('es'); fireEvent.click(screen.getByText('Leer información seleccionada'));
  expect(screen.getByText(coastalInformation, { exact: false, normalizer: s => s })).toBeInTheDocument();
  expect(screen.getByText('Save task')).toBeInTheDocument();
  expect(screen.getByText('How much PTO do I receive after three years?')).toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ source: 'coastal', question: 'How much PTO do I receive after three years?' });
});

it('reports language persistence failure without touching student records', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Name', major: 'Major', academicYear: 'Junior', goals: [] }));
  const before = localStorage.getItem(STORAGE_KEY); render(<App />);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
  switchLanguage('es'); expect(screen.getByRole('alert')).toHaveTextContent('no se pudo guardar');
  expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
});
