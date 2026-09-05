import { formatHours, summarize, taskStatus } from './planner.js';
import { capacityComparison, capacityFor, needsReview } from './planningSupport.js';

export function CapacitySummary({ tasks, today, planning }) {
  const summary = summarize(tasks, today);
  const capacity = capacityFor(planning.data.capacity, today);
  return <>
    <div className="eyebrow">Today & tomorrow</div><h2>{formatHours(summary.hours)} hours due · {summary.nearCount} {summary.nearCount === 1 ? 'deadline' : 'deadlines'}</h2>
    {summary.clustered && <p className="deadline-cluster">Deadlines clustered: {summary.nearCount} across two dates. Task count alone does not establish heavy workload.</p>}
    <p>Today: {capacityComparison(Math.round(summary.days[0].hours * 100) / 100, capacity.todayHours)}</p>
    <p>Tomorrow: {capacityComparison(Math.round(summary.days[1].hours * 100) / 100, capacity.tomorrowHours)}</p>
    <p className="muted">Effort grouped by due date, not a work schedule. Set available time in Prepare AI Planning Prompt. Overdue work is separate and also needs attention.</p>
    {summary.overdue > 0 && <p className="danger-text">Also review {summary.overdue} overdue {summary.overdue === 1 ? 'task' : 'tasks'} ({formatHours(summary.overdueHours)} hrs).</p>}
    {planning.error && <p className="error-message" role="alert">{planning.error}</p>}
  </>;
}

export default function PlanningSummary({ dashboard, onOpenPlanner }) {
  const { tasks, today, planning, taskError } = dashboard;
  const summary = summarize(tasks, today);
  const urgent = tasks.filter(task => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  return <section className="panel home-planning" aria-labelledby="home-planning-title"><div className="panel-heading"><h2 id="home-planning-title">Planning summary</h2><button className="secondary-button" onClick={onOpenPlanner}>Review Planner</button></div>
    {taskError ? <p role="alert" className="error-message">{taskError}</p> : <>
      <p><strong>{summary.overdue} overdue</strong> · {summary.upcoming} upcoming (including today) · {tasks.filter(task => !task.completed && task.priority === 'High').length} high-priority tasks</p>
      <div className="home-planning-grid"><div><h3>Deadlines needing attention</h3>{urgent.length ? <ul>{urgent.map(task => <li key={task.id}><strong>{task.title}</strong><span>{taskStatus(task, today)} · {task.dueDate} · {task.priority} priority</span></li>)}</ul> : <p>No unfinished tasks. Add work in Planner when you are ready.</p>}</div><div><CapacitySummary tasks={tasks} today={today} planning={planning} /></div></div>
      {needsReview(planning.data.exchange, tasks, planning.data.capacity, today) && <p className="review-flags">Needs review: your AI planning prompt or recommendation is based on older task, time, or date information.</p>}
    </>}
  </section>;
}
