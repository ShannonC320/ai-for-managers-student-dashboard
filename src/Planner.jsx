import { useEffect, useRef, useState } from 'react';
import { formatHours, priorities, summarize, taskStatus, validateTask } from './planner.js';
import { dependencyIssues, duplicateTask } from './planningSupport.js';
import { DependencyPicker } from './PlanningControls.jsx';
import { CapacitySummary } from './PlanningSummary.jsx';
import AITaskImport from './AITaskImport.jsx';
import AIPlanning from './AIPlanning.jsx';

const blankTask = () => ({ title: '', category: '', dueDate: '', hours: '', priority: 'Medium', notes: '', completed: false, dependencies: [] });
const displayDate = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function Planner({ dashboard }) {
  const { tasks, saveTasks, today, taskError, planning } = dashboard;
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('deadline');
  const [deleting, setDeleting] = useState(null);
  const titleInput = useRef(null);
  const addButton = useRef(null);

  useEffect(() => { if (draft) titleInput.current?.focus(); }, [draft?.id, draft === null]);

  const summary = summarize(tasks, today);
  const issues = dependencyIssues(tasks);
  const visible = tasks.filter(task => filter === 'All' || (filter === 'Upcoming'
    ? !task.completed && task.dueDate >= today : taskStatus(task, today) === filter))
    .sort((a, b) => Number(a.completed) - Number(b.completed)
      || (sort === 'priority' ? priorities.indexOf(a.priority) - priorities.indexOf(b.priority) : 0)
      || a.dueDate.localeCompare(b.dueDate)
      || priorities.indexOf(a.priority) - priorities.indexOf(b.priority)
      || a.title.localeCompare(b.title));

  function commit(next, success) {
    try {
      saveTasks(next);
      setError(''); setMessage(success);
      return true;
    } catch {
      setError('Tasks could not be saved in this browser. Your changes have not been applied. Check browser storage or available space and try again.');
      setMessage(''); return false;
    }
  }
  function closeForm() { setDraft(null); setError(''); addButton.current?.focus(); }
  function save(event) {
    event.preventDefault();
    const validation = validateTask(draft);
    if (validation) { setError(validation); return; }
    const task = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim(), category: draft.category.trim(), notes: draft.notes.trim(), hours: Number(draft.hours) };
    const next = draft.id ? tasks.map(item => item.id === draft.id ? task : item) : [...tasks, task];
    const dependencyError = dependencyIssues(next).find(issue => issue.taskId === task.id && issue.kind !== 'unfinished');
    if (dependencyError) { setError(dependencyError.message); return; }
    if (commit(draft.id ? tasks.map(item => item.id === draft.id ? task : item) : [...tasks, task], 'Task saved in this browser.')) {
      closeForm();
    }
  }
  function field(event) { setDraft({ ...draft, [event.target.name]: event.target.value }); }

  return (
    <main className="page planner-page" id="main-content" tabIndex="-1">
      <div className="page-heading">
        <div><div className="eyebrow">Week 2 · Planning, Priorities & Workload</div><h1>Planner / Tasks</h1><p>Make room for what matters. Review deadlines, effort, and your priorities.</p></div>
        <button ref={addButton} className="primary-button" disabled={!!taskError || !!draft} onClick={() => { setDraft(blankTask()); setError(''); setMessage(''); setDeleting(null); }}>+ Add task</button>
      </div>
      {taskError && <p className="error-message" role="alert">{taskError}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      <div className="summary-grid" aria-label="Task overview">
        <div className="summary-card"><span>Upcoming, including today</span><strong>{summary.upcoming}</strong><small>Unfinished tasks</small></div>
        <div className="summary-card"><span>Overdue</span><strong className={summary.overdue ? 'danger-text' : ''}>{summary.overdue}</strong><small>{formatHours(summary.overdueHours)} hours outstanding</small></div>
        <div className="summary-card"><span>Completed</span><strong>{summary.completed}</strong><small>Ready to review or reopen</small></div>
        <div className="summary-card"><span>Total remaining workload</span><strong>{formatHours(summary.totalHours)} <small>hrs</small></strong><small>All unfinished tasks</small></div>
      </div>

      <div className="ai-workflows">
        <AITaskImport tasks={tasks} commit={commit} today={today} disabled={!!taskError || !!draft} />
        <AIPlanning tasks={tasks} today={today} store={planning} disabled={!!taskError || !!draft} />
      </div>

      {draft && <section className="panel task-editor" aria-labelledby="editor-title">
        <h2 id="editor-title">{draft.id ? 'Edit task' : 'Add a task or assignment'}</h2>
        <p className="muted">Title, due date, hours, and priority are required. Estimates can be revised.</p>
        <form onSubmit={save}>
          <div className="task-form-grid">
            <label className="span-two">Task title<input ref={titleInput} name="title" value={draft.title} onChange={field} required maxLength={160} /></label>
            <label>Course / project / category (optional)<input name="category" value={draft.category} onChange={field} maxLength={100} /></label>
            <label>Due date<input name="dueDate" type="date" value={draft.dueDate} onChange={field} min="1900-01-01" max="9999-12-31" required /><small>Due through the end of this date, in your local time.</small></label>
            <label>Estimated remaining hours<input name="hours" type="number" min="0" max="1000" step="any" value={draft.hours} onChange={field} required /><small>Decimals are welcome, e.g. 0.5 for 30 minutes.</small></label>
            <label>Priority<select name="priority" value={draft.priority} onChange={field}>{priorities.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="span-two">Brief notes (optional)<textarea name="notes" value={draft.notes} onChange={field} rows={3} maxLength={1000} /></label>
          </div>
          <DependencyPicker tasks={tasks} value={draft.dependencies || []} currentId={draft.id} onChange={dependencies => setDraft({ ...draft, dependencies })} />
          <div className="form-actions"><button type="button" className="secondary-button" onClick={closeForm}>Cancel</button><button className="primary-button" type="submit">Save task</button></div>
        </form>
      </section>}

      <div className="planner-columns">
        <section className="panel tasks-panel" aria-labelledby="tasks-title">
          <div className="panel-heading"><h2 id="tasks-title">Your tasks</h2><span className="muted">{visible.length} shown</span></div>
          <div className="task-toolbar">
            <label>Show<select value={filter} onChange={event => { setFilter(event.target.value); setDeleting(null); }}>{['All', 'Upcoming', 'Overdue', 'Completed'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Deadline first</option><option value="priority">Priority first</option></select></label>
          </div>
          {!visible.length ? <div className="empty-state"><h3>{tasks.length ? 'No tasks in this view' : 'A clear place to start'}</h3><p>{tasks.length ? 'Choose another view to see your tasks.' : 'Add an assignment, estimate the effort, and choose its priority. Your plan starts here.'}</p></div> :
            <ul className="task-list">{visible.map(task => {
              const status = taskStatus(task, today);
              return <li key={task.id} className={`task-item ${task.completed ? 'is-complete' : ''}`}>
                <div className="task-title-row"><h3>{task.title}</h3><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority} priority</span></div>
                {task.category && <p className="task-category">{task.category}</p>}
                <div className="task-meta"><span className={`status status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span><span>Due {displayDate(task.dueDate)}</span><span>{formatHours(task.hours)} hrs estimated</span></div>
                {task.notes && <p className="task-notes">{task.notes}</p>}
                {issues.some(issue => issue.taskId === task.id) && <ul className="review-flags">{issues.filter(issue => issue.taskId === task.id).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
                <div className="task-actions">
                  <label className="completion-control"><input type="checkbox" checked={task.completed} disabled={!!draft} onChange={() => commit(tasks.map(item => item.id === task.id ? { ...item, completed: !item.completed } : item), task.completed ? 'Task reopened.' : 'Task completed.')} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`} />{task.completed ? 'Completed' : 'Mark complete'}</label>
                  <button className="text-button" disabled={!!draft} onClick={() => { setDraft({ ...task }); setError(''); setMessage(''); setDeleting(null); }} aria-label={`Edit ${task.title}`}>Edit</button>
                  <button className="text-button" disabled={!!draft} onClick={() => { setDraft(duplicateTask(task)); setError(''); setMessage('Duplicate draft: choose a new due date and revise any details before saving.'); setDeleting(null); }} aria-label={`Duplicate ${task.title}`}>Duplicate task</button>
                  <button className="remove-button" disabled={!!draft} onClick={() => { setDeleting(task.id); setMessage(''); }} aria-label={`Delete ${task.title}`}>Delete</button>
                </div>
                {deleting === task.id && <div className="delete-confirmation"><p>Delete “{task.title}”? This cannot be undone.</p>{tasks.some(item => item.dependencies?.includes(task.id)) && <p>Other tasks require this prerequisite. Deleting it will leave a missing-reference warning until you revise those dependencies.</p>}<button className="remove-button" onClick={() => { if (commit(tasks.filter(item => item.id !== task.id), 'Task deleted.')) { setDeleting(null); addButton.current?.focus(); } }}>Confirm delete</button><button className="secondary-button" onClick={() => setDeleting(null)}>Keep task</button></div>}
              </li>;
            })}</ul>}
        </section>

        <aside className="planning-sidebar" aria-label="Planning overview">
          <section className="panel workload-panel"><CapacitySummary tasks={tasks} today={today} planning={planning} /></section>
          <section className="panel" aria-labelledby="week-workload"><h2 id="week-workload">Next 7 days</h2><p className="muted">Estimated hours grouped by due date, not scheduled work sessions.</p>
            <ul className="workload-days">{summary.days.map(day => <li key={day.date}>
              <div><span>{day.date === today ? 'Today' : new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><strong>{formatHours(day.hours)} hrs · {day.count} {day.count === 1 ? 'task' : 'tasks'}</strong></div>
              <div className="workload-track" aria-hidden="true"><span style={{ width: `${day.hours / Math.max(1, ...summary.days.map(item => item.hours)) * 100}%` }} /></div>
              {day.clustered && <small className="deadline-cluster">Deadlines clustered: 3+ on this date</small>}
            </li>)}</ul>
          </section>
          <section className="panel planning-support"><h2>Planning Support</h2><p>AI proposes → dashboard checks → student evaluates → student decides.</p><p>Use the two prompt features above with your approved external AI tool. Review its assumptions and change its recommendations when needed.</p><p>Parsing, dependency checks, workload totals, sorting, and duplication are ordinary rules, not AI. Priority is importance; sequence also depends on prerequisites and available time.</p></section>
        </aside>
      </div>
      <p className="storage-note">Saved only in this browser on this device. Clearing site data removes your profile and tasks. No account or cloud sync.</p>
    </main>
  );
}
