import { useRef, useState } from 'react';
import { ANALYSIS_KEY, readAnalysis, emptyRecord, emptyDecision, validRecord, validDecision, parseCSV, numericSummaries, sortRows, datasetCSV, analysisPrompt, parseProposals } from './analysis.js';

const decisionFields = [['attention', 'What needs the most management attention?'], ['evidence', 'Evidence Supporting Your Decision'], ['action', 'Recommended Management Action'], ['information', 'What information would you want before acting?']];

function TextField({ label, value, onChange, ...props }) {
  return <label>{label}<textarea value={value} onChange={event => onChange(event.target.value)} rows={3} {...props} /></label>;
}

export default function Analysis() {
  const [initial] = useState(readAnalysis);
  const [data, setData] = useState(initial.data);
  const [csv, setCSV] = useState(data.dataset ? datasetCSV(data.dataset) : '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sort, setSort] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [proposals, setProposals] = useState([]);
  const [importedResponse, setImportedResponse] = useState(null);
  const [proposalFeedback, setProposalFeedback] = useState('');
  const [record, setRecord] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [decision, setDecision] = useState(data.decision || emptyDecision());
  const [editingDecision, setEditingDecision] = useState(!data.decision);
  const [decisionFeedback, setDecisionFeedback] = useState(null);
  const addButton = useRef(null);

  function fail(text) { setError(text); setMessage(''); }
  function save(next, success = '') {
    if (initial.error) return false;
    try {
      localStorage.setItem(ANALYSIS_KEY, JSON.stringify(next));
      setData(next); setError(''); setMessage(success); return true;
    } catch { fail('Analysis changes could not be saved. Check browser storage or available space and try again.'); return false; }
  }
  function load() {
    try {
      const dataset = parseCSV(csv);
      if (save({ ...data, dataset }, 'Dataset loaded and saved in this browser.')) { setSort(null); setPrompt(''); }
    } catch (issue) { fail(`${issue.message} The previously loaded dataset, if any, remains unchanged.`); }
  }
  function closeRecord() { setRecord(null); addButton.current?.focus(); }
  function saveRecord(event) {
    event.preventDefault();
    if (!validRecord(record)) { fail('Complete the finding, evidence, meaning, and any requested additional information.'); return; }
    const next = { ...record, id: record.id || crypto.randomUUID() };
    if (save({ ...data, records: record.id ? data.records.map(item => item.id === record.id ? next : item) : [...data.records, next] }, 'Analysis Record saved.')) closeRecord();
  }
  function saveDecision(event) {
    event.preventDefault();
    const issue = !decision.acknowledged ? 'Affirm the responsibility acknowledgment before saving your Management Decision.' :
      !validDecision(decision) ? 'Complete all four Management Decision responses.' : '';
    if (issue) { fail(issue); setDecisionFeedback({ error: true, text: issue }); return; }
    const success = 'Management Decision saved in this browser.';
    if (save({ ...data, decision: { ...decision } }, success)) {
      setEditingDecision(false); setDecisionFeedback({ error: false, text: success });
    } else setDecisionFeedback({ error: true, text: 'Management Decision could not be saved. Check browser storage or available space and try again.' });
  }
  const rows = data.dataset ? (sort ? sortRows(data.dataset, sort.index, sort.direction) : data.dataset.rows) : [];
  const summaries = data.dataset ? numericSummaries(data.dataset) : [];

  return <main className="page analysis-page" id="main-content" tabIndex="-1">
    <div className="page-heading"><div>
      <div className="eyebrow">Week 4 · DATA → ANALYZE → REVIEW → DECIDE</div>
      <h1>Data Analysis &amp; Decision Support</h1>
      <p>Use data and AI-supported analysis to identify patterns, evaluate evidence, and make a management decision.</p>
      <p>AI can assist with analysis. You are responsible for checking the analysis and making the decision.</p>
    </div></div>
    {initial.error && <p className="error-message" role="alert">{initial.error}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}

    <section className="panel" aria-labelledby="dataset-title">
      <h2 id="dataset-title">Data — Dataset Workspace</h2>
      <label>Dataset Name<input disabled={!!initial.error} value={data.name} onChange={event => { if (save({ ...data, name: event.target.value })) setPrompt(''); }} /></label>
      <TextField label="Management Question" disabled={!!initial.error} value={data.question} onChange={question => { if (save({ ...data, question })) setPrompt(''); }} />
      <TextField label="Dataset Input" value={csv} onChange={setCSV} rows={9} spellCheck={false} />
      <p className="field-help">Paste CSV with unique column headings followed by records. Quote fields containing commas. Loading replaces the dataset; existing findings and decisions remain for you to review against the new data.</p>
      <button className="primary-button" disabled={!!initial.error} onClick={load}>Load Dataset</button>
      {data.dataset && <>
        <h3>Loaded dataset</h3><p>{rows.length} records · {data.dataset.headers.length} columns. Input edits take effect when you load the dataset.</p>
        <p className="field-help">Select a column heading to sort ascending; select it again to sort descending.</p>
        <div className="analysis-table" role="region" aria-label="Loaded dataset table" tabIndex={0}>
          <table><caption>{data.name || 'Loaded dataset'}</caption><thead><tr>
            {data.dataset.headers.map((heading, index) => <th scope="col" key={index} aria-sort={sort?.index === index ? sort.direction : 'none'}>
              <button className="text-button" onClick={() => setSort({ index, direction: sort?.index === index && sort.direction === 'ascending' ? 'descending' : 'ascending' })}>{heading}<span aria-hidden="true">{sort?.index === index ? (sort.direction === 'ascending' ? ' ↑' : ' ↓') : ' ↕'}</span></button>
            </th>)}
          </tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>
        </div>
        <h3>Numeric summaries</h3><p className="field-help">Plain numeric columns only. Count excludes blank cells; averages display up to four decimal places.</p>
        <div className="analysis-summary">{summaries.map(column => <div className="proposal-card" key={column.index}><h4>{column.name}</h4><dl>
          {[['Count', column.count], ['Average', column.average], ['Minimum', column.minimum], ['Maximum', column.maximum]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</dd></div>)}
        </dl></div>)}</div>{!summaries.length && <p>No numeric columns recognized.</p>}
      </>}
    </section>

    <section className="panel" aria-labelledby="analyze-title">
      <h2 id="analyze-title">Analyze — Prepare External AI Analysis</h2>
      <p>Copy the prompt into a course-approved external AI tool. This dashboard makes no AI/API requests.</p>
      <button className="primary-button" onClick={() => {
        if (!data.dataset || !data.name.trim() || !data.question.trim()) { fail('Load a dataset and enter a Dataset Name and Management Question before preparing a prompt.'); return; }
        setError(''); setPrompt(analysisPrompt(data));
      }}>Prepare AI Analysis Prompt</button>
      {prompt && <div className="prompt-output">
        <TextField label="AI Analysis Prompt" value={prompt} readOnly rows={12} onChange={() => {}} />
        <button className="secondary-button" onClick={async () => {
          try { await navigator.clipboard.writeText(prompt); setError(''); setMessage('Prompt copied.'); }
          catch { fail('Copy was unavailable. Select the prompt text and copy it manually.'); }
        }}>Copy prompt</button>
      </div>}
      <TextField label="Paste AI Analysis" value={response} onChange={setResponse} rows={8} />
      <p>Review the AI analysis against the actual dataset. Record only findings you believe the evidence supports. Pasting a response does not create accepted Analysis Records.</p>
      <button className="secondary-button" disabled={!!initial.error || proposals.length > 0 || response.trim() === importedResponse} onClick={() => {
        try {
          const drafts = parseProposals(response).map(item => ({ ...item, id: crypto.randomUUID() }));
          setProposals(drafts); setImportedResponse(response.trim()); setError('');
          setProposalFeedback(`${drafts.length} AI-proposed drafts imported for review. None are accepted yet.`);
        } catch (issue) { fail(issue.message); setProposalFeedback(issue.message); }
      }}>Import proposed findings</button>
      <p className="field-help">Paste the JSON findings requested by the prompt. Review or reject all current proposals before importing another response. Draft proposals are temporary and are not saved on navigation or refresh.</p>
      {proposalFeedback && <p role="status">{proposalFeedback}</p>}
      {proposals.map((proposal, index) => <form className="proposal-card" key={proposal.id} aria-label={`AI-proposed finding ${index + 1}`} onSubmit={event => {
        event.preventDefault();
        if (!validRecord(proposal)) { const text = 'Complete the proposed finding, evidence, meaning, and additional information when Yes before accepting.'; fail(text); setProposalFeedback(text); return; }
        if (save({ ...data, records: [...data.records, { ...proposal }] }, 'Reviewed finding accepted and saved as an Analysis Record.')) {
          setProposals(items => items.filter(item => item.id !== proposal.id));
          setProposalFeedback('Reviewed finding accepted and saved as an Analysis Record.');
        } else setProposalFeedback('The proposal could not be saved. Your draft remains available; check browser storage and try again.');
      }}>
        <h3>AI-PROPOSED / DRAFT finding {index + 1}</h3>
        <p>Check every observation against the loaded dataset. Edit as needed; accept only what your evaluation of the evidence supports.</p>
        {[['finding', 'Finding / Pattern'], ['evidence', 'Evidence from the Data'], ['meaning', 'What It Could Mean']].map(([key, label]) => <TextField key={key} label={label} value={proposal[key]} required onChange={value => setProposals(items => items.map(item => item.id === proposal.id ? { ...item, [key]: value } : item))} />)}
        <label>Needs More Information?<select value={proposal.needsMore ? 'Yes' : 'No'} onChange={event => setProposals(items => items.map(item => item.id === proposal.id ? { ...item, needsMore: event.target.value === 'Yes' } : item))}><option>No</option><option>Yes</option></select></label>
        {proposal.needsMore && <TextField label="What additional information would help?" value={proposal.additional} required onChange={additional => setProposals(items => items.map(item => item.id === proposal.id ? { ...item, additional } : item))} />}
        <div className="task-actions"><button type="submit" className="primary-button">Accept and Save Analysis Record</button><button type="button" className="remove-button" onClick={() => { setProposals(items => items.filter(item => item.id !== proposal.id)); setProposalFeedback('Proposal rejected. No Analysis Record was created.'); }}>Reject proposal</button></div>
      </form>)}
    </section>

    <section className="panel" aria-labelledby="review-title">
      <h2 id="review-title">Review — Analysis Records</h2>
      <button ref={addButton} className="primary-button" disabled={!!initial.error || !!record} onClick={() => { setRecord(emptyRecord()); setDeleting(null); }}>Add Analysis Record</button>
      {record && <form className="proposal-card" onSubmit={saveRecord}>
        <h3>{record.id ? 'Edit Analysis Record' : 'New Analysis Record'}</h3>
        {[['finding', 'Finding / Pattern'], ['evidence', 'Evidence from the Data'], ['meaning', 'What It Could Mean']].map(([key, label], index) => <TextField key={key} label={label} value={record[key]} onChange={value => setRecord({ ...record, [key]: value })} autoFocus={index === 0} required />)}
        <label>Needs More Information?<select value={record.needsMore ? 'Yes' : 'No'} onChange={event => setRecord({ ...record, needsMore: event.target.value === 'Yes' })}><option>No</option><option>Yes</option></select></label>
        {record.needsMore && <TextField label="What additional information would help?" value={record.additional} onChange={additional => setRecord({ ...record, additional })} required />}
        <div className="task-actions"><button className="primary-button" type="submit">Save Analysis Record</button><button className="secondary-button" type="button" onClick={closeRecord}>Cancel edit</button></div>
      </form>}
      {!data.records.length && <p>No Analysis Records yet.</p>}
      {data.records.map(item => <article className="proposal-card" key={item.id}>
        <h3>{item.finding}</h3><dl>
          {[['Evidence from the Data', item.evidence], ['What It Could Mean', item.meaning], ['Needs More Information?', item.needsMore ? 'Yes' : 'No'], ...(item.needsMore ? [['Additional information', item.additional]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="source-excerpt">{value}</dd></div>)}
        </dl>
        <div className="task-actions"><button className="secondary-button" disabled={!!record} onClick={() => { setRecord({ ...item }); setDeleting(null); }}>Edit record</button><button className="remove-button" disabled={!!record} onClick={() => setDeleting(item.id)}>Delete record</button></div>
        {deleting === item.id && <div className="delete-confirmation"><p>Delete this Analysis Record? This cannot be undone.</p><button className="remove-button" onClick={() => { if (save({ ...data, records: data.records.filter(value => value.id !== item.id) }, 'Analysis Record deleted.')) { setDeleting(null); addButton.current?.focus(); } }}>Confirm delete</button><button className="secondary-button" onClick={() => setDeleting(null)}>Keep record</button></div>}
      </article>)}
    </section>

    <section className="panel" aria-labelledby="decision-title">
      <h2 id="decision-title">Decide — Management Decision</h2>
      {editingDecision ? <form onSubmit={saveDecision}>
        {decisionFields.map(([key, label]) => <TextField key={key} label={label} value={decision[key]} onChange={value => { setDecision({ ...decision, [key]: value, acknowledged: false }); setMessage(''); setDecisionFeedback(null); }} />)}
        <label className="review-check"><input type="checkbox" checked={decision.acknowledged} onChange={event => setDecision({ ...decision, acknowledged: event.target.checked })} />I reviewed the underlying data and AI-supported analysis and am making this management decision based on my evaluation of the evidence.</label>
        <button className="primary-button" disabled={!!initial.error} type="submit">Save Management Decision</button>
      </form> : <article className="proposal-card">
        <h3>Completed Management Decision</h3>
        <dl>{decisionFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd className="source-excerpt">{data.decision[key]}</dd></div>)}</dl>
        <p>Responsibility acknowledged: I reviewed the underlying data and AI-supported analysis and am making this management decision based on my evaluation of the evidence.</p>
        <button className="secondary-button" onClick={() => { setDecision({ ...data.decision }); setEditingDecision(true); setDecisionFeedback(null); setMessage(''); }}>Edit Decision</button>
      </article>}
      {decisionFeedback && <p className={decisionFeedback.error ? 'error-message' : 'success-message'} role={decisionFeedback.error ? 'alert' : 'status'}>{decisionFeedback.text}</p>}
    </section>
    <p className="storage-note">Dataset details, loaded data, Analysis Records, and saved decisions stay in this browser on this device. Generated prompts and pasted AI responses are temporary.</p>
  </main>;
}
