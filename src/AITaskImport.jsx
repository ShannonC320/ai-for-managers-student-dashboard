import { useState } from 'react';
import { approvedTask, emptyImport, IMPORT_KEY, parseProposals, proposalWarnings, taskImportPrompt, validImportRecord } from './planningSupport.js';
import { useLocalRecord } from './useDashboardData.js';
import { DependencyPicker, ExternalAINotice, PromptOutput } from './PlanningControls.jsx';

export default function AITaskImport({ tasks, commit, today, disabled }) {
  const store = useLocalRecord(IMPORT_KEY, emptyImport, validImportRecord);
  const { data, save } = store;
  const [source, setSource] = useState(data.source);
  const [response, setResponse] = useState(data.response);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const locked = disabled || store.blocked;
  const candidates = [...tasks, ...data.proposals.filter(proposal => proposal.status === 'pending' && !tasks.some(task => task.id === proposal.id))];
  function update(id, fields) {
    return save({ ...data, proposals: data.proposals.map(proposal => proposal.id === id ? { ...proposal, ...fields } : proposal) });
  }
  function prepare() {
    if (!source.trim()) { setError('Paste assignment information before preparing the prompt.'); return; }
    if (save({ ...data, source, prompt: taskImportPrompt(source, today) })) { setError(''); setMessage('Prompt prepared. Copy it to your approved AI tool, then return here with the response.'); }
  }
  function parse() {
    try {
      const proposals = parseProposals(response);
      if (save({ ...data, response, proposals })) { setError(''); setMessage('Proposed Tasks are ready for review. No tasks have been added to the Planner.'); }
    } catch (failure) { setError(failure.message); }
  }
  function approve(proposal) {
    try {
      const task = approvedTask(proposal, tasks);
      if (commit([...tasks, task], 'Reviewed task added to Planner.')) {
        update(proposal.id, { status: 'approved' }); setError(''); setMessage(`Approved: ${task.title}`);
      }
    } catch (failure) { setError(failure.message); }
  }
  function startOver() {
    if (save({ ...data, response: '', proposals: [] })) {
      setResponse('');
      setError('');
      setMessage('Current proposed tasks cleared. Paste a new AI response when you are ready.');
    }
  }
  return <details className="panel ai-feature"><summary>Prepare AI Task Import</summary>
    <ExternalAINotice />
    <p>Turn syllabus, course schedule, instructor-list, or spreadsheet-style text into proposals using an external AI tool. Review the result here before adding anything to Planner.</p>
    {(error || store.error) && <p className="error-message" role="alert">{error || store.error}</p>}
    {message && <p role="status" className="success-message">{message}</p>}
    <label>Assignment information<textarea value={source} onChange={event => setSource(event.target.value)} rows={5} maxLength={30000} placeholder="Paste the relevant assignment text here. Remove sensitive information first." /></label>
    <button className="primary-button" type="button" disabled={locked} onClick={prepare}>Generate task-import prompt</button>
    <PromptOutput value={data.prompt} label="Task-import prompt" />
    <label>AI task response<textarea value={response} onChange={event => setResponse(event.target.value)} rows={5} maxLength={100000} placeholder="Paste the complete JSON response from your AI tool. You do not need to write code." /></label>
    <p className="muted">Parsing checks the response format; it is not AI. Parsing another response replaces the review rows below, never your saved Planner tasks. Prepared prompts and review edits stay in this browser; unprepared source/response typing is not saved.</p>
    <div className="task-actions">
  <button className="secondary-button" disabled={locked} type="button" onClick={parse}>Review proposed tasks</button>
  {data.proposals.length > 0 && <button className="remove-button" disabled={locked} type="button" onClick={startOver}>Start over with AI response</button>}
</div>
    {data.proposals.length > 0 && <section aria-label="Proposed Tasks" className="proposals"><h2>Proposed Tasks</h2><p>Check dates, effort, priority, sources, and prerequisites. Approve prerequisites first. Each approval adds one task; rejecting a proposal does not delete a saved task.</p>
      {data.proposals.map(proposal => {
        const isSaved = tasks.some(task => task.id === proposal.id);
        const status = isSaved ? 'approved' : proposal.status;
        return <section key={proposal.id} className="proposal-card" aria-label={`Proposal ${proposal.externalId}`}>
          <div className="panel-heading"><h3>{proposal.externalId}: {proposal.title || 'Untitled proposal'}</h3><span className="proposal-status">{status}</span></div>
          {status === 'pending' ? <>
            <p className="source-excerpt"><strong>Source excerpt:</strong> {proposal.source || 'Not supplied'}</p>
            <ul className="review-flags">{proposalWarnings(proposal, candidates, today).map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            <div className="task-form-grid">
              <label className="span-two">Proposed title<input value={proposal.title} maxLength={160} onChange={event => update(proposal.id, { title: event.target.value, reviewed: false })} /></label>
              <label>Proposed category<input value={proposal.category} maxLength={100} onChange={event => update(proposal.id, { category: event.target.value, reviewed: false })} /></label>
              <label>Proposed due date<input type="date" min="1900-01-01" max="9999-12-31" value={proposal.dueDate} onChange={event => update(proposal.id, { dueDate: event.target.value, reviewed: false })} /></label>
              <label>Proposed hours<input type="number" min="0" max="1000" step="any" value={proposal.hours} onChange={event => update(proposal.id, { hours: event.target.value, reviewed: false })} /></label>
              <label>Proposed priority<select value={proposal.priority} onChange={event => update(proposal.id, { priority: event.target.value, reviewed: false })}><option value="">Choose priority</option>{['High', 'Medium', 'Low'].map(priority => <option key={priority}>{priority}</option>)}</select></label>
              <label className="span-two">Proposed notes<textarea value={proposal.notes} maxLength={1000} rows={2} onChange={event => update(proposal.id, { notes: event.target.value, reviewed: false })} /></label>
            </div>
            <DependencyPicker tasks={candidates} currentId={proposal.id} value={proposal.dependencies} onChange={dependencies => update(proposal.id, { dependencies, reviewed: false })} />
            <label className="review-check"><input type="checkbox" checked={proposal.reviewed} onChange={event => update(proposal.id, { reviewed: event.target.checked })} />I checked this proposal against the source and reviewed every flag.</label>
            <div className="task-actions"><button className="primary-button" type="button" disabled={locked} onClick={() => approve(proposal)}>Approve task {proposal.externalId}</button><button className="remove-button" type="button" disabled={locked} onClick={() => { if (update(proposal.id, { status: 'rejected' })) { setError(''); setMessage(`Rejected proposal ${proposal.externalId}. No task was saved.`); } }}>Reject task {proposal.externalId}</button></div>
          </> : <p>{status === 'approved' ? 'Approved proposal. Manage the saved task in Your tasks.' : 'Rejected proposal. Nothing was added to Planner.'}</p>}
        </section>;
      })}
    </section>}
  </details>;
}
