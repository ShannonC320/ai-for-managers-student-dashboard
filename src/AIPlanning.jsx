import { useEffect, useState } from 'react';
import { capacityComparison, capacityFor, needsReview, parseRecommendation, planningPrompt, selectedWithPrerequisites, sequenceChecks, sequenceHours, taskSnapshot, validCapacityValue } from './planningSupport.js';
import { ExternalAINotice, PromptOutput } from './PlanningControls.jsx';

function PlanReadout({ sequence, tasks }) {
  return sequence.length ? <ol className="plan-readout">{sequence.map((step, index) => <li key={step.taskId}><strong>{tasks.find(task => task.id === step.taskId)?.title || `Missing task ${step.taskId}`}</strong><span> · {step.day}</span><p>{step.reason}</p></li>)}</ol> : <p>No work scheduled.</p>;
}

function PlanChecks({ sequence, tasks, capacity, today }) {
  const hours = sequenceHours(sequence, tasks);
  const checks = sequenceChecks(sequence, tasks, today);
  return <div className="plan-checks"><h4>Dashboard checks — rules, not AI</h4><p>Today: {capacityComparison(Math.round(hours.today * 100) / 100, capacity.todayHours)}</p><p>Tomorrow: {capacityComparison(Math.round(hours.tomorrow * 100) / 100, capacity.tomorrowHours)}</p>
    <p className="muted">Uses each task’s full remaining estimate, excluding completed tasks. This compares time totals, not personal feasibility. No task splitting or hidden rescheduling.</p>
    {checks.length ? <ul className="review-flags">{checks.map(check => <li key={check}>{check}</li>)}</ul> : <p>No dependency-order or deadline conflicts detected in this sequence. Still review the assumptions.</p>}
  </div>;
}

export default function AIPlanning({ tasks, today, store, disabled }) {
  const { data, save } = store;
  const currentCapacity = capacityFor(data.capacity, today);
  const [selected, setSelected] = useState(data.exchange?.selectedIds || []);
  const [hoursToday, setHoursToday] = useState(currentCapacity.todayHours);
  const [hoursTomorrow, setHoursTomorrow] = useState(currentCapacity.tomorrowHours);
  const [response, setResponse] = useState('');
  const [draft, setDraft] = useState(data.decision?.sequence || data.recommendation?.sequence || []);
  const [explanation, setExplanation] = useState(data.decision?.explanation || '');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const locked = disabled || store.blocked;
  const stale = needsReview(data.exchange, tasks, data.capacity, today);
  useEffect(() => { setAcknowledged(false); }, [tasks, data.capacity, today]);
  useEffect(() => {
    const capacity = capacityFor(data.capacity, today);
    setHoursToday(capacity.todayHours); setHoursTomorrow(capacity.tomorrowHours);
  }, [today]);
  const included = selectedWithPrerequisites(tasks, selected);
  const activeCapacity = { date: today, todayHours: hoursToday, tomorrowHours: hoursTomorrow };
  function budgetValid() {
    if (!validCapacityValue(hoursToday) || !validCapacityValue(hoursTomorrow)) { setError('Available time must be blank (unknown) or between 0 and 24 hours per day.'); return false; }
    return true;
  }
  function prepare() {
    if (!budgetValid()) return;
    const ids = selected.filter(id => tasks.some(task => task.id === id && !task.completed));
    if (!ids.length) { setError('Select at least one unfinished task for the planning prompt.'); return; }
    const exchange = { date: today, selectedIds: ids, snapshot: taskSnapshot(tasks, ids), capacity: activeCapacity, prompt: planningPrompt(tasks, ids, activeCapacity, today) };
    if (save({ ...data, capacity: activeCapacity, exchange, recommendation: null, decision: null })) {
      setDraft([]); setExplanation(''); setResponse(''); setError(''); setMessage('Planning prompt prepared. Copy it to your approved AI tool.');
    }
  }
  function importPlan() {
    if (!data.exchange) { setError('Prepare a planning prompt first so task ids and context can be checked.'); return; }
    try {
      const snapshotTasks = JSON.parse(data.exchange.snapshot);
      const recommendation = parseRecommendation(response, snapshotTasks);
      if (save({ ...data, recommendation, decision: null })) { setDraft(recommendation.sequence.map(step => ({ ...step }))); setExplanation(''); setAcknowledged(false); setError(''); setMessage('AI recommendation imported for review. Your task details have not changed.'); }
    } catch (failure) { setError(failure.message); }
  }
  function revise(next) { setDraft(next); setAcknowledged(false); }
  function move(index, offset) {
    const next = [...draft]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; revise(next);
  }
  function decide(status) {
    if (!explanation.trim()) { setError('Explain your decision: what did you accept or change, and why?'); return; }
    if (!acknowledged) { setError('Confirm that you reviewed the recommendation, assumptions, and dashboard checks.'); return; }
    if (status === 'accepted' && !draft.length) { setError('Include at least one task, or reject the recommendation.'); return; }
    const decision = { status, sequence: status === 'accepted' ? draft.map(step => ({ ...step })) : [], explanation: explanation.trim(), savedAt: new Date().toISOString(), reviewedSnapshot: taskSnapshot(tasks, data.exchange.selectedIds) };
    if (save({ ...data, decision })) { setError(''); setMessage(status === 'accepted' ? 'Your accepted plan and explanation are saved locally.' : 'Your rejection and explanation are saved locally.'); }
  }
  const eligible = data.exchange ? JSON.parse(data.exchange.snapshot).filter(task => !task.completed) : [];
  return <details className="panel ai-feature"><summary>Prepare AI Planning Prompt</summary>
    <ExternalAINotice /><p>AI proposes → dashboard checks → student evaluates → student decides.</p>
    {(error || store.error) && <p role="alert" className="error-message">{error || store.error}</p>}
    {message && <p role="status" className="success-message">{message}</p>}
    <fieldset className="dependency-picker"><legend>Select tasks to include</legend><p className="muted">Prerequisites are included automatically with their completion status. Review the generated prompt before sharing.</p>
      <button type="button" className="secondary-button" onClick={() => setSelected(tasks.filter(task => !task.completed).map(task => task.id))}>Select unfinished tasks</button>
      <div className="checklist">{tasks.filter(task => !task.completed).map(task => <label key={task.id}><input type="checkbox" checked={selected.includes(task.id)} onChange={() => setSelected(selected.includes(task.id) ? selected.filter(id => id !== task.id) : [...selected, task.id])} />Include {task.title}</label>)}</div>
      {!tasks.some(task => !task.completed) && <p>Add an unfinished task first.</p>}
      <p className="muted">{included.length} tasks including prerequisites in this selection.</p>
    </fieldset>
    <div className="task-form-grid"><label>Available hours today<input type="number" min="0" max="24" step="any" value={hoursToday} onChange={event => setHoursToday(event.target.value)} /></label><label>Available hours tomorrow<input type="number" min="0" max="24" step="any" value={hoursTomorrow} onChange={event => setHoursTomorrow(event.target.value)} /></label></div>
    <p className="muted">Leave blank if unknown; zero means no available time. Availability belongs to today’s date and is not carried forward automatically.</p>
    <div className="task-actions"><button type="button" className="secondary-button" disabled={locked} onClick={() => { if (budgetValid() && save({ ...data, capacity: activeCapacity })) { setError(''); setMessage('Available time saved for today and tomorrow.'); } }}>Save available time</button><button type="button" className="primary-button" disabled={locked} onClick={prepare}>Generate planning prompt</button></div>
    {data.recommendation && <p className="muted">Preparing a new prompt starts a new review and replaces the previous recommendation/decision record. Existing tasks are never replaced.</p>}
    <PromptOutput value={data.exchange?.prompt} label="Planning prompt" />
    {stale && <p className="review-flags" role="status"><strong>Needs review.</strong> Tasks, available time, or the planning date changed since this prompt was prepared. Compare current facts below or prepare a fresh prompt.</p>}
    <label>AI planning response<textarea rows={5} maxLength={100000} value={response} onChange={event => setResponse(event.target.value)} placeholder="Paste the complete JSON recommendation from your approved AI tool." /></label>
    <button type="button" className="secondary-button" disabled={locked} onClick={importPlan}>Review AI recommendation</button>
    {data.recommendation && <div className="plan-review-grid">
      <section className="ai-recommendation" aria-label="AI recommendation"><div className="eyebrow">AI suggestion · not approved</div><h2>AI recommendation</h2><p className="muted">Original proposed order and explanation, preserved for comparison.</p><PlanReadout sequence={data.recommendation.sequence} tasks={JSON.parse(data.exchange.snapshot)} />
        <h3>Assumptions to check</h3>{data.recommendation.assumptions.length ? <ul>{data.recommendation.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul> : <p>No assumptions supplied. Check for unstated assumptions.</p>}
        <h3>Work not scheduled by AI</h3>{data.recommendation.unscheduled.length ? <ul>{data.recommendation.unscheduled.map(item => <li key={item.taskId}>{eligible.find(task => task.id === item.taskId)?.title || item.taskId}: {item.reason}</li>)}</ul> : <p>All selected unfinished work was included.</p>}
        <PlanChecks sequence={data.recommendation.sequence} tasks={tasks} capacity={currentCapacity} today={today} />
      </section>
      <section className="student-plan" aria-label="Student decision"><div className="eyebrow">Your judgment</div><h2>Review your plan</h2><p className="muted">Reorder, change the planned day or reason, and exclude work. These edits do not change task fields. Draft edits are saved only when you save your decision.</p>
        <ol className="editable-plan">{draft.map((step, index) => <li key={step.taskId}><h3>{tasks.find(task => task.id === step.taskId)?.title || 'Missing task'}</h3><label>Planned day for step {index + 1}<select value={step.day} onChange={event => revise(draft.map((item, i) => i === index ? { ...item, day: event.target.value } : item))}><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select></label><label>Your reason for step {index + 1}<textarea rows={2} maxLength={2000} value={step.reason} onChange={event => revise(draft.map((item, i) => i === index ? { ...item, reason: event.target.value } : item))} /></label>
          <div className="task-actions"><button className="secondary-button" disabled={index === 0} onClick={() => move(index, -1)}>Move step {index + 1} up</button><button className="secondary-button" disabled={index === draft.length - 1} onClick={() => move(index, 1)}>Move step {index + 1} down</button><button className="remove-button" onClick={() => revise(draft.filter((_, i) => i !== index))}>Exclude step {index + 1}</button></div>
        </li>)}</ol>
        <div className="excluded-work"><h3>Outside your draft plan</h3>{eligible.filter(task => !draft.some(step => step.taskId === task.id)).map(task => <p key={task.id}>{task.title} <button className="text-button" onClick={() => revise([...draft, { taskId: task.id, day: 'tomorrow', reason: 'Added by student; explain this choice.' }])}>Include {task.title} in plan</button></p>)}</div>
        <PlanChecks sequence={draft} tasks={tasks} capacity={currentCapacity} today={today} />
        <label>My decision and explanation<textarea rows={3} maxLength={2000} value={explanation} onChange={event => { setExplanation(event.target.value); setAcknowledged(false); }} placeholder="What did you accept, change, or reject, and why?" /></label>
        <label className="review-check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />I reviewed the assumptions, capacity, dependencies, and any Needs review notice. I take responsibility for this decision.</label>
        <div className="task-actions"><button className="primary-button" disabled={locked} onClick={() => decide('accepted')}>Save accepted plan</button><button className="remove-button" disabled={locked} onClick={() => decide('rejected')}>Reject recommendation</button></div>
        {data.decision && <section className="accepted-plan" aria-label="Saved student decision"><h3>{data.decision.status === 'accepted' ? 'Student-approved plan' : 'Student rejected recommendation'}</h3><p>{data.decision.explanation}</p><PlanReadout sequence={data.decision.sequence} tasks={tasks} /><p className="muted">Saved {new Date(data.decision.savedAt).toLocaleString()}. {stale ? 'Needs review against changed facts.' : 'This is your saved decision; drafts above do not change it until saved.'}</p></section>}
      </section>
    </div>}
  </details>;
}
