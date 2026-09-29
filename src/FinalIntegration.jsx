import { useState } from 'react';
import { t } from './i18n.js';
import WorkspaceIntro from './WorkspaceIntro.jsx';
import { copy, questions, capabilities, statements, classifications, reviews, interventions, owners } from './finalIntegrationContent.js';
import { FINAL_KEY, readFinal, assess, coastalComplete } from './finalIntegration.js';

export default function FinalIntegration() {
  const [initial] = useState(readFinal);
  const [data, setData] = useState(initial.data);
  const [saveError, setSaveError] = useState(false);
  const [assessmentError, setAssessmentError] = useState(false);
  const [coastalError, setCoastalError] = useState(false);
  function save(next) {
    if (initial.error) return false;
    setData(next);
    try { localStorage.setItem(FINAL_KEY, JSON.stringify(next)); setSaveError(false); return true; }
    catch { setSaveError(true); return false; }
  }
  const changed = data.submitted && questions.some(q => data.answers[q.id] !== data.submitted.answers[q.id]);
  function submit(event) {
    event.preventDefault();
    if (questions.some(q => data.answers[q.id] === undefined)) { setAssessmentError(true); return; }
    setAssessmentError(false);
    save({ ...data, submitted: { answers: { ...data.answers }, result: assess(data.answers) } });
  }
  function updateCoastal(id, value) { setCoastalError(false); save({ ...data, coastal: { ...data.coastal, [id]: value }, coastalCompleted: false }); }
  function select(id, label, options) {
    const selected = options.find(o => o.id === data.coastal[id]);
    return <div className="final-field" key={id}><label htmlFor={`final-${id}`}>{t(label)}</label>
      <select id={`final-${id}`} value={data.coastal[id] || ''} onChange={e => updateCoastal(id, e.target.value)}>
        <option value="">{t(copy.choose)}</option>{options.map(o => <option key={o.id} value={o.id}>{t(o.label)}</option>)}
      </select>
      {selected && <p className="final-selection" aria-hidden="true">{t(selected.label)}</p>}
    </div>;
  }
  function text(id, label) {
    return <label className="final-field" htmlFor={`final-${id}`}>{t(label)}<textarea id={`final-${id}`} rows="2" maxLength={400} value={data.coastal[id] || ''} onChange={e => updateCoastal(id, e.target.value)} /></label>;
  }
  return <main className="page final-page" id="main-content" tabIndex="-1">
    <div className="page-heading"><div><div className="eyebrow">{t(copy.eyebrow)}</div><h1>{t(copy.nav)}</h1><p>{t(copy.intro)}</p></div></div>
    <p className="local-notice">{t(copy.storage)}</p>
    {initial.error && <p role="alert">{t(copy.readError)}</p>}
    {saveError && <div role="alert"><p>{t(copy.storageError)}</p><button type="button" className="secondary-button" onClick={() => save(data)}>{t(copy.retry)}</button></div>}
    <WorkspaceIntro>{t(copy.purpose)}</WorkspaceIntro>
    <section className="profile-card" aria-labelledby="final-assessment-title">
      <h2 id="final-assessment-title">{t(copy.assessment)}</h2>
      <form onSubmit={submit}>
        <fieldset className="final-controls" disabled={initial.error}>
          {questions.map((q, index) => <fieldset className="final-question" key={q.id}>
            <legend>{index + 1}. {t(q.prompt)}</legend>
            {q.options.map((option, i) => <label className="final-option" key={i}><input type="radio" name={`final-${q.id}`} value={i} checked={data.answers[q.id] === i} onChange={() => { setAssessmentError(false); save({ ...data, answers: { ...data.answers, [q.id]: i } }); }} /><span>{t(option)}</span></label>)}
            {data.submitted && <div className="final-feedback" data-testid={`feedback-${q.id}`}><strong>{t(data.submitted.answers[q.id] === q.correct ? copy.correct : copy.incorrect)}</strong>
              {data.answers[q.id] !== data.submitted.answers[q.id] && <p>{t(copy.submitted)}: {t(q.options[data.submitted.answers[q.id]])}</p>}
              <p>{t(q.explanation)}</p></div>}
          </fieldset>)}
          {assessmentError && <p role="alert">{t(copy.incomplete)}</p>}
          <button className="primary-button" type="submit">{t(copy.submit)}</button>
        </fieldset>
      </form>
      {data.submitted && <section className="final-result" aria-labelledby="final-result-title" aria-live="polite">
        <h3 id="final-result-title">{t(copy.assessment)}</h3>
        <p>{t(`${data.submitted.result.total} of 8 management decisions aligned with the course principles.`)}</p>
        <p>{t(changed ? copy.pending : copy.previous)}</p>
        <h4>{t(copy.summary)}</h4><ul>{capabilities.map((capability, i) => <li key={capability} data-testid={`capability-${i}`}><strong>{t(capability)}</strong>: {t(data.submitted.result.capabilities[i] ? copy.demonstrated : copy.review)}</li>)}</ul>
      </section>}
    </section>
    <WorkspaceIntro coastal>{t(copy.coastalIntro)}</WorkspaceIntro>
    <div className="profile-card">
      <details className="final-scenario" open><summary>{t(copy.scenarioTitle)}</summary>
        {[copy.scenario, copy.routing, copy.metrics, copy.limits, copy.prior, copy.workflow, copy.grace].map(p => <p key={p}>{t(p)}</p>)}
        <p><strong>{t(copy.question)}</strong></p>
      </details>
      <p>{t(copy.short)}</p>
      <form onSubmit={event => { event.preventDefault(); if (!coastalComplete(data.coastal)) { setCoastalError(true); return; } setCoastalError(false); save({ ...data, coastalCompleted: true }); }}>
        <fieldset className="final-controls" disabled={initial.error}>
          <fieldset className="final-question"><legend>{t(copy.situation)}</legend><p>{t(copy.classify)}</p>{statements.map(s => select(s.id, s.label, classifications))}</fieldset>
          <fieldset className="final-question"><legend>{t(copy.information)}</legend><p>{t(copy.informationHelp)}</p>{reviews.map(r => select(r.id, r.label, r.options))}</fieldset>
          <fieldset className="final-question"><legend>{t(copy.human)}</legend>{select('intervention', copy.humanLabel, interventions)}{text('justification', copy.justification)}</fieldset>
          <fieldset className="final-question"><legend>{t(copy.final)}</legend>{text('action', copy.action)}{text('reason', copy.reason)}{select('owner', copy.accountable, owners)}</fieldset>
          <p>{t(copy.principle)}</p>
          {coastalError && <p role="alert">{t(copy.required)}</p>}
          <button type="submit" className="primary-button">{t(copy.save)}</button>
          {!saveError && Object.keys(data.coastal).length > 0 && <p role="status">{t(data.coastalCompleted ? copy.saved : copy.draft)}</p>}
        </fieldset>
      </form>
    </div>
  </main>;
}
