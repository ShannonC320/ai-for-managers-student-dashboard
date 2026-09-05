import { describe, it, expect } from 'vitest';
import { readTasks, TASKS_KEY } from './planner.js';
import { approvedTask, capacityComparison, capacityFor, dependencyIssues, duplicateTask, emptyPlanning, needsReview, parseProposals, parseRecommendation, planningPrompt, proposalWarnings, selectedWithPrerequisites, sequenceChecks, sequenceHours, taskImportPrompt, taskSnapshot, validCapacityValue, validPlanningRecord } from './planningSupport.js';

const today = '2026-09-05';
const task = (id, changes = {}) => ({ id, title: id, category: 'Business', dueDate: today, hours: 1, priority: 'Low', notes: '', completed: false, dependencies: [], ...changes });
const tasks = [task('reading'), task('exam', { dependencies: ['reading'], priority: 'High', hours: 1.5 })];
const capacity = { date: today, todayHours: '2', tomorrowHours: '' };
const exchange = () => ({ date: today, capacity, selectedIds: ['exam'], snapshot: taskSnapshot(tasks, ['exam']), prompt: 'Prompt' });
const rawTask = { id: 'T1', title: 'Reading', dueDate: today, hours: 1, priority: 'Low', dependencies: [], source: 'Read chapter 1', assumptions: [] };

describe('bounded external AI exchange and local planning rules', () => {
  it('prompts include schema, uncertainty, source and human control; planning includes prerequisite closure and status', () => {
    expect(taskImportPrompt('Read chapter 1', today)).toContain('Read chapter 1');
    expect(taskImportPrompt('text', today)).toContain('null for unknown');
    expect(taskImportPrompt('text', today)).toContain('review/edit/reject/approve');
    const prompt = planningPrompt(tasks, ['exam'], capacity, today);
    expect(prompt).toContain('Priority and sequence are different');
    expect(prompt).toContain('tomorrow=UNKNOWN');
    expect(prompt).toContain('"status": "Due today"');
    expect(prompt).toContain('"id": "reading"');
    expect(selectedWithPrerequisites(tasks, ['exam'])).toEqual(tasks);
  });
  it('parses fenced JSON, remaps dependencies and never approves output automatically', () => {
    let n = 0;
    const rows = parseProposals('```json\n' + JSON.stringify({ tasks: [rawTask, { ...rawTask, id: 'T2', dependencies: ['T1'] }] }) + '\n```', () => `id${++n}`);
    expect(rows[1]).toMatchObject({ dependencies: ['id1'], status: 'pending', reviewed: false });
    expect(() => approvedTask(rows[0], [])).toThrow(/Confirm/);
    expect(() => approvedTask({ ...rows[1], reviewed: true }, [])).toThrow(/prerequisite/);
    const first = approvedTask({ ...rows[0], reviewed: true }, []);
    expect(approvedTask({ ...rows[1], reviewed: true }, [first]).dependencies).toEqual(['id1']);
  });
  it('flags missing/ambiguous dates, unusual effort, inferred fields, and duplicate titles', () => {
    const [row] = parseProposals(JSON.stringify({ tasks: [{ ...rawTask, dueDate: '9/5', hours: null, priority: 'Urgent', dependencies: ['missing'] }] }));
    expect(row).toMatchObject({ dueDate: '', hours: '', priority: '', dependencies: ['unresolved:missing'] });
    expect(proposalWarnings(row, [task('other', { title: ' reading ' })], today).join(' ')).toMatch(/Possible duplicate/);
    expect(proposalWarnings(row, [], today).join(' ')).toMatch(/questionable date/);
    expect(() => approvedTask({ ...row, reviewed: true }, [])).toThrow();
    expect(proposalWarnings({ ...row, dueDate: '2026-01-01' }, [], today).join(' ')).toMatch(/past/);
  });
  it.each(['', '{broken', '{}', '{"tasks":[]}', '{"tasks":[null]}', JSON.stringify({ tasks: [rawTask, rawTask] }), 'x'.repeat(100001)])('rejects malformed imports without executing text (%#)', text => {
    expect(() => parseProposals(text)).toThrow();
  });
  it('detects self/circular/missing dependencies and terminates on cycles', () => {
    const graph = [task('a', { dependencies: ['b'] }), task('b', { dependencies: ['a', 'gone'] })];
    expect(dependencyIssues(graph).filter(i => i.kind === 'cycle')).toHaveLength(2);
    expect(dependencyIssues(graph).some(i => i.kind === 'missing')).toBe(true);
    expect(selectedWithPrerequisites(graph, ['a'])).toHaveLength(2);
    expect(dependencyIssues([task('a', { dependencies: ['a'] })]).some(i => i.kind === 'cycle')).toBe(true);
  });
  it('duplicates an independent unfinished draft requiring a fresh due date', () => {
    const original = task('exam', { completed: true, dependencies: ['reading'] });
    const copy = duplicateTask(original);
    copy.dependencies.push('other'); copy.notes = 'Chapter 2';
    expect(copy).toMatchObject({ id: undefined, completed: false, dueDate: '' });
    expect(original.dependencies).toEqual(['reading']);
    expect(original.notes).toBe('');
  });
  it('compares effort with known capacity, keeps unknown distinct from zero, and expires capacity next day', () => {
    expect(capacityComparison(2.5, '')).toMatch(/unknown/);
    expect(capacityComparison(2.5, 3)).toMatch(/fits/);
    expect(capacityComparison(2.5, 0)).toMatch(/exceeds capacity by 2.5/);
    expect(capacityComparison(2.5, 2.5)).toMatch(/fits/);
    expect(capacityFor(capacity, '2026-09-06').todayHours).toBe('');
    expect(validCapacityValue(24)).toBe(true);
    for (const value of [-1, 25, Infinity, ' ', 'abc', null]) expect(validCapacityValue(value)).toBe(false);
  });
  it('checks AI sequence order separately from priority and excludes completed effort', () => {
    const wrong = [{ taskId: 'exam', day: 'today', reason: 'high priority' }, { taskId: 'reading', day: 'tomorrow', reason: 'low priority' }];
    expect(sequenceChecks(wrong, tasks, today).join(' ')).toMatch(/reading must be scheduled first/);
    expect(sequenceChecks(wrong, tasks, today).join(' ')).toMatch(/after its due date/);
    expect(sequenceChecks([{ ...wrong[1], day: 'today' }, wrong[0]], tasks, today)).toEqual([]);
    expect(sequenceHours(wrong, tasks)).toEqual({ today: 1.5, tomorrow: 1 });
    expect(sequenceHours(wrong, [tasks[0], { ...tasks[1], completed: true }])).toEqual({ today: 0, tomorrow: 1 });
    expect(tasks[0].priority).toBe('Low');
  });
  it('rejects invented/duplicate/completed plan IDs and records omissions for review', () => {
    const response = { sequence: [{ taskId: 'exam', day: 'today', reason: 'Soon' }], assumptions: [], unscheduled: [] };
    expect(parseRecommendation(JSON.stringify(response), tasks).unscheduled[0]).toMatchObject({ taskId: 'reading', reason: expect.stringMatching(/Omitted/) });
    expect(() => parseRecommendation(JSON.stringify(response), [task('other')])).toThrow(/unknown/);
    expect(() => parseRecommendation(JSON.stringify({ ...response, sequence: [...response.sequence, ...response.sequence] }), tasks)).toThrow(/duplicate/);
    expect(() => parseRecommendation(JSON.stringify(response), [task('exam', { completed: true })])).toThrow(/completed/);
  });
  it('marks changes to task details, prerequisites, completion, availability and date as needing review', () => {
    expect(needsReview(exchange(), tasks, capacity, today)).toBe(false);
    for (const change of [{ hours: 5 }, { priority: 'Medium' }, { completed: true }, { dependencies: [] }, { notes: 'Changed' }, { dueDate: '2026-09-09' }]) {
      expect(needsReview(exchange(), [tasks[0], { ...tasks[1], ...change }], capacity, today)).toBe(true);
    }
    expect(needsReview(exchange(), [tasks[1]], capacity, today)).toBe(true);
    expect(needsReview(exchange(), tasks, { ...capacity, todayHours: '1' }, today)).toBe(true);
    expect(needsReview(exchange(), tasks, capacity, '2026-09-06')).toBe(true);
  });
  it('preserves old task storage and safely rejects broken planning records', () => {
    const old = { ...tasks[0] }; delete old.dependencies;
    localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks: [old] }));
    expect(readTasks().tasks[0].dependencies).toEqual([]);
    expect(validPlanningRecord({ ...emptyPlanning(), exchange: exchange() })).toBe(true);
    expect(validPlanningRecord({ ...emptyPlanning(), exchange: { ...exchange(), snapshot: '{bad' } })).toBe(false);
    expect(validPlanningRecord({ ...emptyPlanning(), exchange: { ...exchange(), snapshot: '[null]' } })).toBe(false);
    localStorage.clear();
  });
});
