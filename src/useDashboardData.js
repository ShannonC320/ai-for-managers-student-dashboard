import { useEffect, useState } from 'react';
import { localDate, readTasks, writeTasks } from './planner.js';
import { emptyPlanning, PLANNING_KEY, validPlanningRecord } from './planningSupport.js';
import { readResearchRecords, writeResearchRecords } from './research.js';

export function useLocalRecord(key, makeEmpty, validate) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : makeEmpty();
      if (!validate(data)) throw new Error('Invalid data');
      return { data, error: '' };
    } catch { return { data: makeEmpty(), error: 'Saved planning data could not be read. It has not been overwritten. Restore browser storage access or recover the data, then reload.' }; }
  });
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  function save(next) {
    if (initial.error) return false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setData(next); setError(''); return true;
    } catch { setError('Could not save planning changes in this browser. Check available storage and try again.'); return false; }
  }
  return { data, save, error, blocked: !!initial.error };
}

export default function useDashboardData() {
  const [initial] = useState(readTasks);
  const [tasks, setTasks] = useState(initial.tasks);
  const [today, setToday] = useState(localDate);
  const planning = useLocalRecord(PLANNING_KEY, emptyPlanning, validPlanningRecord);
  const [initialResearch] = useState(readResearchRecords);
  const [records, setRecords] = useState(initialResearch.records);
  const researchError = initialResearch.error;
  useEffect(() => {
    const refresh = () => setToday(localDate());
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  function saveTasks(next) {
    if (initial.error) throw new Error(initial.error);
    writeTasks(next); setTasks(next);
  }
  function saveResearchRecords(next) {
    if (researchError) throw new Error(researchError);
    writeResearchRecords(next); setRecords(next);
  }
  return { tasks, saveTasks, taskError: initial.error, today, planning, records, saveResearchRecords, researchError };
}
