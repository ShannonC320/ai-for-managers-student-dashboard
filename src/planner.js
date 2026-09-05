export const TASKS_KEY = 'ai-managers-student-tasks-v1';
export const priorities = ['High', 'Medium', 'Low'];

// Compare local calendar dates, avoiding UTC date shifts and daylight-saving hours.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateAfter(date, days) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return localDate(result);
}

export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= '1900-01-01' && value <= '9999-12-31'
    && localDate(new Date(`${value}T12:00:00`)) === value;
}

export function taskStatus(task, today = localDate()) {
  if (task.completed) return 'Completed';
  if (task.dueDate < today) return 'Overdue';
  return task.dueDate === today ? 'Due today' : 'Upcoming';
}

export function formatHours(hours) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(hours);
}

export function summarize(tasks, today = localDate()) {
  const open = tasks.filter(task => !task.completed);
  const near = open.filter(task => task.dueDate >= today && task.dueDate <= dateAfter(today, 1));
  const hours = near.reduce((sum, task) => sum + task.hours, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = dateAfter(today, index);
    const items = open.filter(task => task.dueDate === date);
    const total = items.reduce((sum, task) => sum + task.hours, 0);
    return { date, count: items.length, hours: total, clustered: items.length >= 3 };
  });
  return {
    open: open.length,
    overdue: open.filter(task => task.dueDate < today).length,
    overdueHours: open.filter(task => task.dueDate < today).reduce((sum, task) => sum + task.hours, 0),
    completed: tasks.length - open.length,
    upcoming: open.filter(task => task.dueDate >= today).length,
    hours, nearCount: near.length, clustered: near.length >= 3,
    totalHours: open.reduce((sum, task) => sum + task.hours, 0), days,
  };
}

export function validateTask(task) {
  if (!task.title.trim()) return 'Enter a task title; spaces alone are not a title.';
  if (task.title.trim().length > 160) return 'Keep the task title to 160 characters or fewer.';
  if (!validDate(task.dueDate)) return 'Enter a valid due date (1900 or later).';
  if (String(task.hours).trim() === '' || !Number.isFinite(Number(task.hours)) || Number(task.hours) < 0 || Number(task.hours) > 1000) return 'Enter estimated hours between 0 and 1,000.';
  if (!priorities.includes(task.priority)) return 'Choose High, Medium, or Low priority.';
  if (task.category.length > 100 || task.notes.length > 1000) return 'Use up to 100 characters for category and 1,000 for notes.';
  return '';
}

export function readTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    if (!saved) return { tasks: [], error: '' };
    const data = JSON.parse(saved);
    if (data.version !== 1 || !Array.isArray(data.tasks)) throw new Error('Invalid saved tasks');
    const ids = new Set();
    for (const task of data.tasks) {
      if (!task || typeof task.id !== 'string' || !task.id || ids.has(task.id)
        || !['title', 'category', 'notes'].every(key => typeof task[key] === 'string')
        || typeof task.hours !== 'number' || typeof task.completed !== 'boolean' || validateTask(task)) throw new Error('Invalid task');
      ids.add(task.id);
      if (task.dependencies !== undefined && (!Array.isArray(task.dependencies) || task.dependencies.some(id => typeof id !== 'string'))) throw new Error('Invalid dependencies');
    }
    return { tasks: data.tasks.map(task => ({ ...task, dependencies: task.dependencies || [] })), error: '' };
  } catch {
    return { tasks: [], error: 'Saved tasks could not be read. Your stored data has not been replaced. Restore browser storage access or recover the saved data, then reload.' };
  }
}

export function writeTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify({ version: 1, tasks }));
}
