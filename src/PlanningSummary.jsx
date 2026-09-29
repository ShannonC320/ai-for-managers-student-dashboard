import { t } from './i18n.js';
import { formatHours, summarize, taskStatus } from './planner.js';
import { capacityComparison, capacityFor, needsReview } from './planningSupport.js';

export function CapacitySummary({ tasks, today, planning }) {
  const summary = summarize(tasks, today);
  const capacity = capacityFor(planning.data.capacity, today);
  return <>
    <div className="eyebrow">{t("Today & tomorrow")}</div><h2>{formatHours(summary.hours)}{t(" hours due · ")}{summary.nearCount} {summary.nearCount === 1 ? t('deadline') : t('deadlines')}</h2>
    {summary.clustered && <p className="deadline-cluster">{t("Deadlines clustered: ")}{summary.nearCount}{t(" across two dates. Task count alone does not establish heavy workload.")}</p>}
    <p>{t("Today: ")}{t(capacityComparison(Math.round(summary.days[0].hours * 100) / 100, capacity.todayHours))}</p>
    <p>{t("Tomorrow: ")}{t(capacityComparison(Math.round(summary.days[1].hours * 100) / 100, capacity.tomorrowHours))}</p>
    <p className="muted">{t("Effort grouped by due date, not a work schedule. Set available time in Prepare AI Planning Prompt. Overdue work is separate and also needs attention.")}</p>
    {summary.overdue > 0 && <p className="danger-text">{t("Also review ")}{summary.overdue}{t(" overdue ")}{summary.overdue === 1 ? t('task') : t('tasks')} ({formatHours(summary.overdueHours)}{t(" hrs).")}</p>}
    {planning.error && <p className="error-message" role="alert">{t(planning.error)}</p>}
  </>;
}

export default function PlanningSummary({ dashboard, onOpenPlanner }) {
  const { tasks, today, planning, taskError } = dashboard;
  const summary = summarize(tasks, today);
  const urgent = tasks.filter(task => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  return <section className="panel home-planning" aria-labelledby="home-planning-title"><div className="panel-heading"><h2 id="home-planning-title">{t("Planning summary")}</h2><button className="secondary-button" onClick={onOpenPlanner}>{t("Review Planner")}</button></div>
    {taskError ? <p role="alert" className="error-message">{t(taskError)}</p> : <>
      <p><strong>{summary.overdue}{t(" overdue")}</strong> · {summary.upcoming}{t(" upcoming (including today) · ")}{tasks.filter(task => !task.completed && task.priority === 'High').length}{t(" high-priority tasks")}</p>
      <div className="home-planning-grid"><div><h3>{t("Deadlines needing attention")}</h3>{urgent.length ? <ul>{urgent.map(task => <li key={task.id}><strong>{task.title}</strong><span>{t(taskStatus(task, today))} · {task.dueDate} · {t(task.priority)}{t(" priority")}</span></li>)}</ul> : <p>{t("No unfinished tasks. Add work in Planner when you are ready.")}</p>}</div><div><CapacitySummary tasks={tasks} today={today} planning={planning} /></div></div>
      {needsReview(planning.data.exchange, tasks, planning.data.capacity, today) && <p className="review-flags">{t("Needs review: your AI planning prompt or recommendation is based on older task, time, or date information.")}</p>}
    </>}
  </section>;
}
