import { t } from './i18n.js';
import { useState } from 'react';
import { completionEvidence, completionPrompt, readStudentAnalysis, STUDENT_ANALYSIS_KEY } from './studentAnalysis.js';

export default function StudentAnalysis({ tasks, taskError }) {
  const [initial] = useState(readStudentAnalysis);
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const evidence = completionEvidence(tasks);
  function save(next) {
    if (initial.error) return;
    try {
      localStorage.setItem(STUDENT_ANALYSIS_KEY, JSON.stringify(next));
      setData(next); setError(''); setMessage('Student analysis saved in this browser.');
    } catch { setError('Student analysis could not be saved. Check browser storage or available space and try again.'); setMessage(''); }
  }
  function field(key, label, rows = 3) {
    return <label>{t(label)}<textarea rows={rows} value={data[key]} disabled={!!initial.error} onChange={event => { setData({ ...data, [key]: event.target.value }); setMessage(''); }} /></label>;
  }
  return <section className="panel" aria-labelledby="student-analysis-title">
    <h2 id="student-analysis-title">{t("Undergraduate Week 4 — Student Dashboard Analysis")}</h2>
    <p>{t("Use information about your own academic activity or performance to identify a pattern, evaluate what AI says that pattern means, and decide what—if anything—you should do about it.")}</p>
    <p>{t("Planner supports forward-looking planning and prioritization. Analysis reviews past completion evidence and patterns.")}</p>
    {initial.error && <p className="error-message" role="alert">{t(initial.error)}</p>}
    {error && <p className="error-message" role="alert">{t(error)}</p>}
    {message && <p className="success-message" role="status">{t(message)}</p>}
    <h3>{t("DATA — Completion history")}</h3>
    {taskError ? <p className="error-message" role="alert">{t(taskError)}</p> : <>
      <p>{t("Early: ")}{evidence.totals.Early}{t(" · On Time: ")}{evidence.totals['On Time']}{t(" · Late: ")}{evidence.totals.Late}</p>
      <p>{t("Before the due date is Early; the same date is On Time; after it is Late. Calendar-day differences are calculated by the dashboard, not AI. These totals describe timing, not grades or causes.")}</p>
      {evidence.rows.length ? <div className="analysis-table" role="region" aria-label={t("Completion history table")} tabIndex={0}><table>
        <caption>{t("Eligible completed Planner assignments")}</caption>
        <thead><tr>{['Title', 'Due date', 'Completed On', 'Classification', 'Calendar days early/late'].map(label => <th scope="col" key={label}>{t(label)}</th>)}</tr></thead>
        <tbody>{evidence.rows.map((row, index) => <tr key={index}><td>{row.title}</td><td>{row.dueDate}</td><td>{row.completedOn}</td><td>{t(row.classification)}</td><td>{row.days}{row.days ? t(` ${row.classification.toLowerCase()}`) : t(' (same date)')}</td></tr>)}</tbody>
      </table></div> : <p>{t("No eligible completion records yet.")}</p>}
      {!!evidence.missing.length && <><h4>{t("Dates needed before analysis")}</h4><ul>{evidence.missing.map(task => <li key={task.id}>{task.title} — {task.completedOn ? t('Valid due and completion dates needed') : t('Completion date not recorded')}{t(". Edit this completed item in Planner to enter the actual date.")}</li>)}</ul></>}
    </>}
    <h3>{t("ANALYZE — External AI pattern review")}</h3>
    <p>{t("Generate and copy the evidence prompt into your course-approved external AI tool, then paste its response below. This dashboard makes no AI/API requests.")}</p>
    <button className="primary-button" disabled={!!initial.error || !!taskError || !evidence.rows.length} onClick={() => save({ ...data, prompt: completionPrompt(evidence) })}>{t("Generate completion-history prompt")}</button>
    {data.prompt && <div className="prompt-output">
      <label>{t("Completion-history AI prompt")}<textarea rows={12} value={data.prompt} readOnly /></label>
      <p className="field-help">{t("This saved prompt is an evidence snapshot. If Planner records change, generate a new prompt and review your response and decision against it.")}</p>
      <button className="secondary-button" onClick={async () => {
        try { await navigator.clipboard.writeText(data.prompt); setError(''); setMessage('Completion-history prompt copied.'); }
        catch { setError('Copy was unavailable. Select the prompt text and copy it manually.'); setMessage(''); }
      }}>{t("Copy completion-history prompt")}</button>
    </div>}
    {field('response', 'Paste AI completion-history response', 8)}
    <h3>{t("REVIEW & DECIDE — Your judgment")}</h3>
    {field('judgment', 'After comparing the AI analysis with your actual data and your own context, what does the evidence support, what—if anything—did AI assume, and what will you do (if anything)?', 6)}
    <button className="primary-button" disabled={!!initial.error} onClick={() => save(data)}>{t("Save student analysis")}</button>
    <p className="storage-note">{t("Save to keep your AI response, review, and decision in this browser on this device. The generated evidence prompt is also saved.")}</p>
  </section>;
}
