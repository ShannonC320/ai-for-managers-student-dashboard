import { useState } from 'react';
import { localDate } from './planner.js';
import { weeklyBriefing } from './weeklyBriefing.js';

export default function WeeklyBriefing({ tasks, today = localDate(), taskError }) {
  const [test, setTest] = useState(null);
  // Always derive from Planner: no copied assignments or stale saved briefing.
  const briefing = weeklyBriefing(tasks, today);
  function assignments(items, empty) {
    return items.length ? <ul>{items.map(task => <li key={task.id}>{task.title} — Due {task.dueDate}</li>)}</ul> : <p>{empty}</p>;
  }
  return <section className="panel" aria-labelledby="weekly-briefing-title">
    <h2 id="weekly-briefing-title">Weekly Assignment Briefing</h2>
    <p><strong>MAP:</strong> Check incomplete Planner assignments for past-due dates and dates due this week.</p>
    <p><strong>AUTOMATE:</strong> The Sunday check covers Sunday through Saturday. This briefing appears automatically when you use this tab on Sunday or later in that week, using current Planner data. It refreshes as dates and Planner records change while the dashboard is in use. Nothing runs while the dashboard is closed.</p>
    <p><strong>CONTROL:</strong> Automation handles checking dates/status and organizing Past Due and Due This Week assignments. You handle priorities, scheduling decisions, academic work, and deciding what action to take. This is date/status filtering, not AI; list order does not recommend what to work on first.</p>
    {taskError ? <p className="error-message" role="alert">{taskError}</p> : <>
      <p>Week: {briefing.sunday} through {briefing.saturday} · As of {today} (local calendar dates).</p>
      <section aria-labelledby="briefing-past-due"><h3 id="briefing-past-due">Past Due — Needs Attention</h3>
        {assignments(briefing.pastDue, 'No incomplete past-due assignments.')}
      </section>
      <section aria-labelledby="briefing-this-week"><h3 id="briefing-this-week">Due This Week</h3>
        <p>Incomplete assignments due today through Saturday, including both dates.</p>
        {assignments(briefing.dueThisWeek, 'No incomplete assignments due in the rest of this week.')}
      </section>
    </>}
    <p><strong>TEST:</strong> Run the same rule now and compare the assignments above with Planner.</p>
    <button className="secondary-button" disabled={!!taskError} onClick={() => {
      const result = weeklyBriefing(tasks, today);
      setTest({ tasks, today, pastDue: result.pastDue.length, dueThisWeek: result.dueThisWeek.length });
    }}>Test Automation</button>
    {test && test.tasks === tasks && test.today === today && !taskError && <p role="status">Automation tested against current Planner data: {test.pastDue} past due; {test.dueThisWeek} due this week. Results are shown above.</p>}
    <p className="storage-note">Uses Planner records saved in this browser. No separate assignment records are created.</p>
  </section>;
}
