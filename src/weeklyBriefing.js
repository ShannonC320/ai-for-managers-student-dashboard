import { dateAfter, localDate, validDate } from './planner.js';

export function weeklyBriefing(tasks, today = localDate()) {
  const sunday = dateAfter(today, -new Date(`${today}T12:00:00`).getDay());
  const saturday = dateAfter(sunday, 6);
  const incomplete = tasks.filter(task => !task.completed && validDate(task.dueDate));
  return {
    sunday, saturday,
    pastDue: incomplete.filter(task => task.dueDate < today),
    dueThisWeek: incomplete.filter(task => task.dueDate >= today && task.dueDate <= saturday),
  };
}
