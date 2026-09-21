import { useRef, useState } from 'react';
import { ExternalAINotice, PromptOutput } from './PlanningControls.jsx';
import {
  WORKFLOWS_KEY, HANDLERS, TEST_SITUATIONS, TEST_OUTCOMES, ROUTES, runWorkflow, readWorkflows,
  emptyStep, emptyTest, emptyEvaluation, validStep, validTest, validEvaluation, workflowPrompt,
} from './workflows.js';

const evaluationFields = [
  ['automated', 'What did you automate or make AI-supported?'],
  ['humanControl', 'What did you intentionally keep under human control?'],
  ['testingRevealed', 'What did testing reveal?'],
  ['changes', 'What did you change or what would you change?'],
  ['rationale', 'Why is the final workflow an appropriate management decision?'],
];

function AutomationResult({ result }) {
  return <section aria-label="Automation Result"><h3>Automation Result</h3><dl>
    <dt>Guest Issue</dt><dd>{result.guestIssue}</dd>
    <dt>Issue Category</dt><dd>{result.category}</dd>
    <dt>Routed To</dt><dd>{result.routedTo}</dd>
    <dt>Human Review</dt><dd>{result.humanReview ? 'Yes' : 'No'}</dd>
    <dt>Status</dt><dd>{result.status}</dd>
  </dl></section>;
}

export default function Workflows() {
  const [initial] = useState(readWorkflows);
  const [data, setData] = useState(initial.data);
  const [step, setStep] = useState(null);
  const [test, setTest] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAIResponse] = useState('');
  const [aiFeedback, setAIFeedback] = useState(null);
  const [evaluation, setEvaluation] = useState(data.evaluation || emptyEvaluation());
  const [editingEvaluation, setEditingEvaluation] = useState(!data.evaluation);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const addStepButton = useRef(null);

  function fail(text) { setError(text); setMessage(''); }
  function save(next, success = '') {
    if (initial.error) return false;
    try {
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(next));
      setData(next); setError(''); setMessage(success); return true;
    } catch { fail('Workflows changes could not be saved. Check browser storage or available space and try again.'); return false; }
  }
  function saveWorkflowField(field, value) {
    if (save({ ...data, workflow: { ...data.workflow, [field]: value } })) setPrompt('');
  }
  function saveStep(event) {
    event.preventDefault();
    if (!validStep(step)) { fail('Complete the step/stage, what happens, who handles it, and why.'); return; }
    const saved = { ...step, id: step.id || crypto.randomUUID() };
    const steps = step.id ? data.workflow.steps.map(item => item.id === step.id ? saved : item) : [...data.workflow.steps, saved];
    if (save({ ...data, workflow: { ...data.workflow, steps } }, 'Workflow step saved.')) { setStep(null); setPrompt(''); addStepButton.current?.focus(); }
  }
  function moveStep(index, offset) {
    const steps = [...data.workflow.steps];
    [steps[index], steps[index + offset]] = [steps[index + offset], steps[index]];
    if (save({ ...data, workflow: { ...data.workflow, steps } }, 'Workflow sequence updated.')) setPrompt('');
  }
  function removeStep(id) {
    if (save({ ...data, workflow: { ...data.workflow, steps: data.workflow.steps.filter(item => item.id !== id) } }, 'Workflow step deleted.')) {
      setDeleting(null); setPrompt('');
    }
  }
  function preparePrompt() {
    if (!data.workflow.name.trim() || !data.workflow.purpose.trim() || !data.workflow.steps.length) {
      fail('Add a workflow name, purpose, and at least one saved step before preparing an AI review prompt.'); return;
    }
    setPrompt(workflowPrompt(data.workflow)); setError(''); setMessage('AI workflow review prompt prepared.');
  }
  function recordAIFeedback() {
    if (!aiResponse.trim()) { fail('Paste useful AI feedback before recording it for review.'); return; }
    setAIFeedback({ text: aiResponse.trim(), judgment: 'Further review' });
    setError(''); setMessage('AI feedback recorded temporarily for your review. It did not change the workflow.');
  }
  function saveTest(event) {
    event.preventDefault();
    if (!validTest(test)) { fail('Record the expected workflow, run the workflow, and complete the problem/exception and manager decision.'); return; }
    const saved = { ...test, id: test.id || crypto.randomUUID() };
    const tests = test.id ? data.tests.map(item => item.id === test.id ? saved : item) : [...data.tests, saved];
    if (save({ ...data, tests }, 'Workflow Test Record saved.')) setTest(null);
  }
  function executeTest() {
    if (!test.expected.trim()) { fail('Record Expected Workflow before running the workflow.'); return; }
    const result = runWorkflow(test.situation, data.rules);
    if (!result) { fail('Select a supplied situation and configure its Route To rule before running.'); return; }
    setTest({ ...test, result, outcome: '', managerDecision: '' }); setError(''); setMessage('Workflow run complete. Evaluate the generated result.');
  }
  function saveEvaluation(event) {
    event.preventDefault();
    const issue = !evaluation.acknowledged
      ? 'Affirm the manager responsibility acknowledgment before saving the Management Evaluation.'
      : !validEvaluation(evaluation) ? 'Complete all five Management Evaluation responses.' : '';
    if (issue) { fail(issue); return; }
    if (save({ ...data, evaluation: { ...evaluation } }, 'Management Evaluation saved in this browser.')) setEditingEvaluation(false);
  }

  return <main className="page workflows-page" id="main-content" tabIndex="-1">
    <div className="page-heading"><div>
      <div className="eyebrow">Undergraduate Week 5 · MAP → AUTOMATE → CONTROL → TEST</div>
      <h1>Workflows &amp; Automation</h1>
      <p>Design and test Coastal Life’s Guest Issue Response Workflow. Make automation, AI support, human control, and escalation choices visible.</p>
    </div></div>
    {initial.error && <p className="error-message" role="alert">{initial.error}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}

    <section className="panel" aria-labelledby="workflow-design-title">
      <div className="panel-heading"><div><div className="eyebrow">Map · Control</div><h2 id="workflow-design-title">Guest Issue Response Workflow</h2></div>
        <button ref={addStepButton} className="primary-button" disabled={!!initial.error || !!step} onClick={() => setStep(emptyStep())}>+ Add workflow step</button>
      </div>
      <div className="task-form-grid">
        <label>Workflow name<input value={data.workflow.name} disabled={!!initial.error} onChange={event => saveWorkflowField('name', event.target.value)} maxLength={160} placeholder="e.g., Coastal Life Guest Issue Response" /></label>
        <label>Workflow purpose<textarea value={data.workflow.purpose} disabled={!!initial.error} onChange={event => saveWorkflowField('purpose', event.target.value)} rows={3} maxLength={1000} placeholder="What should this workflow accomplish?" /></label>
      </div>
      {step && <form className="workflow-editor proposal-card" onSubmit={saveStep} aria-label={step.id ? 'Edit workflow step' : 'Add workflow step'}>
        <h3>{step.id ? 'Edit workflow step' : 'Add workflow step'}</h3>
        <div className="task-form-grid">
          <label>Step / stage<input value={step.stage} onChange={event => setStep({ ...step, stage: event.target.value })} maxLength={120} required /></label>
          <label>Who or what handles it?<select value={step.handler} onChange={event => setStep({ ...step, handler: event.target.value })}>{HANDLERS.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="span-two">What happens<textarea value={step.action} onChange={event => setStep({ ...step, action: event.target.value })} rows={3} maxLength={1500} required /></label>
          <label>Human Review? <select aria-label="Human Review?" value={step.humanReview ? 'Yes' : 'No'} onChange={event => setStep({ ...step, humanReview: event.target.value === 'Yes' })}><option>No</option><option>Yes</option></select></label>
          <label>Why?<textarea value={step.reason} onChange={event => setStep({ ...step, reason: event.target.value })} rows={3} maxLength={1000} required /></label>
        </div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStep(null)}>Cancel</button><button className="primary-button">Save workflow step</button></div>
      </form>}
      {!data.workflow.steps.length ? <div className="empty-state"><h3>No workflow steps yet</h3><p>Add steps in the sequence you want to test. The dashboard will not decide the correct workflow for you.</p></div> :
        <ol className="workflow-steps">{data.workflow.steps.map((item, index) => <li key={item.id} className="proposal-card">
          <div className="task-title-row"><h3>{index + 1}. {item.stage}</h3><span className="proposal-status">{item.handler}</span></div>
          <p>{item.action}</p><p><strong>Human review:</strong> {item.humanReview ? 'Yes' : 'No'} · <strong>Why:</strong> {item.reason}</p>
          <div className="task-actions"><button className="secondary-button" disabled={index === 0} onClick={() => moveStep(index, -1)}>Move step {index + 1} up</button><button className="secondary-button" disabled={index === data.workflow.steps.length - 1} onClick={() => moveStep(index, 1)}>Move step {index + 1} down</button><button className="text-button" onClick={() => { setStep({ ...item }); setDeleting(null); }}>Edit step {index + 1}</button><button className="remove-button" onClick={() => setDeleting(item.id)}>Delete step {index + 1}</button></div>
          {deleting === item.id && <div className="delete-confirmation"><p>Delete this workflow step? Existing test records will remain.</p><button className="remove-button" onClick={() => removeStep(item.id)}>Confirm delete</button><button className="secondary-button" onClick={() => setDeleting(null)}>Keep step</button></div>}
        </li>)}</ol>}
    </section>

    <section className="panel" aria-labelledby="automation-rules-title">
      <div className="eyebrow">Automate · Control</div><h2 id="automation-rules-title">Automation Rules</h2>
      <p>Configure each category’s routing rule. Changes save in this browser immediately. Run Workflow applies these rules; it does not execute your written workflow steps. This rule-based automation does not contact employees or complete guest issues.</p>
      {TEST_SITUATIONS.map(({ category }) => <fieldset key={category} disabled={!!initial.error}>
        <legend>{category}</legend><div className="task-form-grid">
          <label>Route To<select aria-label={`${category} Route To`} value={data.rules[category].routeTo} onChange={event => save({ ...data, rules: { ...data.rules, [category]: { ...data.rules[category], routeTo: event.target.value } } }, 'Automation rule saved.')}><option value="">Select a destination</option>{ROUTES.map(route => <option key={route}>{route}</option>)}</select></label>
          <label>Human Review<select aria-label={`${category} Human Review`} value={data.rules[category].humanReview ? 'Yes' : 'No'} onChange={event => save({ ...data, rules: { ...data.rules, [category]: { ...data.rules[category], humanReview: event.target.value === 'Yes' } } }, 'Automation rule saved.')}><option>Yes</option><option>No</option></select></label>
        </div>
      </fieldset>)}
    </section>

    <section className="panel ai-feature" aria-labelledby="ai-workflow-title">
      <div className="eyebrow">Automate · Review</div><h2 id="ai-workflow-title">Prepare AI Workflow Review Prompt</h2>
      <ExternalAINotice />
      <button className="primary-button" disabled={!!initial.error} onClick={preparePrompt}>Generate workflow review prompt</button>
      <PromptOutput value={prompt} label="AI Workflow Review Prompt" />
      <label>Paste AI workflow feedback<textarea value={aiResponse} onChange={event => setAIResponse(event.target.value)} rows={6} maxLength={100000} placeholder="Paste feedback from your approved external AI tool." /></label>
      <button className="secondary-button" onClick={recordAIFeedback}>Record feedback for review</button>
      {aiFeedback && <article className="ai-recommendation" aria-label="AI feedback under student review">
        <div className="eyebrow">AI suggestion · not accepted workflow</div><h3>Feedback under review</h3><p className="source-excerpt">{aiFeedback.text}</p>
        <label>Your judgment<select value={aiFeedback.judgment} onChange={event => setAIFeedback({ ...aiFeedback, judgment: event.target.value })}><option>Further review</option><option>Rejected / ignored</option><option>Accepted through deliberate workflow edit</option></select></label>
        <p className="muted">To accept a suggestion, deliberately edit the saved workflow above. This feedback never changes it automatically and remains temporary.</p>
      </article>}
    </section>

    <section className="panel" aria-labelledby="test-workflow-title">
      <div className="panel-heading"><div><div className="eyebrow">Test</div><h2 id="test-workflow-title">Test Workflow</h2></div><button className="primary-button" disabled={!!initial.error || !!test} onClick={() => setTest(emptyTest())}>+ Add Workflow Test Record</button></div>
      <p>Test all four guest issue situations by running them through your configured automation rules. You may save more than one record per situation when you revise and retest.</p>
      <ul className="test-situation-list">{TEST_SITUATIONS.map(({ category, issue }) => <li key={category}><strong>{category}: {issue}</strong><span>{data.tests.filter(testRecord => testRecord.situation === issue).length} test record(s)</span></li>)}</ul>
      {test && <form className="proposal-card workflow-test-form" onSubmit={saveTest} aria-label={test.id ? 'Edit Workflow Test Record' : 'Add Workflow Test Record'}>
        <h3>{test.id ? 'Edit Workflow Test Record' : 'Add Workflow Test Record'}</h3>
        <div className="task-form-grid">
          <label>Test Situation<select disabled={!!test.id} value={test.situation} onChange={event => setTest({ ...emptyTest(), situation: event.target.value })} required><option value="">Select a situation</option>{test.happened && <option>{test.situation}</option>}{TEST_SITUATIONS.map(({ category, issue }) => <option key={category} value={issue}>{category}: {issue}</option>)}</select></label>
          <label>Problem/Exception?<select disabled={!test.result && !test.happened} value={test.outcome} onChange={event => setTest({ ...test, outcome: event.target.value })} required><option value="">Select what testing showed</option>{TEST_OUTCOMES.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Expected Workflow<textarea readOnly={!!test.result || !!test.id} value={test.expected} onChange={event => setTest({ ...test, expected: event.target.value })} rows={3} required /></label>
          <div>{test.result ? <AutomationResult result={test.result} /> : test.happened ? <p>Historical student observation: {test.happened}</p> : <button type="button" className="primary-button" onClick={executeTest}>Run Workflow</button>}</div>
          <label className="span-two">Manager Decision<textarea disabled={!test.result && !test.happened} value={test.managerDecision} onChange={event => setTest({ ...test, managerDecision: event.target.value })} rows={3} required /></label>
        </div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setTest(null)}>Cancel</button><button className="primary-button">Save Workflow Test Record</button></div>
      </form>}
      <div className="workflow-test-records">{data.tests.map((item, index) => <article className="proposal-card" key={item.id}><div className="task-title-row"><h3>{item.situation}</h3><span className="proposal-status">Test {index + 1}</span></div><dl><dt>Expected Workflow</dt><dd>{item.expected}</dd></dl>{item.result ? <AutomationResult result={item.result} /> : <p>Historical student observation: {item.happened}</p>}<dl><dt>Problem/Exception?</dt><dd>{item.outcome}</dd><dt>Manager Decision</dt><dd>{item.managerDecision}</dd></dl><button className="text-button" disabled={!!test} onClick={() => setTest({ ...item })}>Edit test record</button>{item.result && <button className="secondary-button" disabled={!!test} onClick={() => setTest({ ...emptyTest(), situation: item.situation })}>Rerun situation</button>}</article>)}</div>
    </section>

    <section className="panel" aria-labelledby="management-evaluation-title">
      <div className="eyebrow">Manager judgment</div><h2 id="management-evaluation-title">Management Evaluation</h2>
      {editingEvaluation ? <form onSubmit={saveEvaluation}>
        {evaluationFields.map(([field, label]) => <label key={field}>{label}<textarea rows={3} value={evaluation[field]} onChange={event => setEvaluation({ ...evaluation, [field]: event.target.value, acknowledged: false })} required /></label>)}
        <label className="review-check"><input type="checkbox" checked={evaluation.acknowledged} onChange={event => setEvaluation({ ...evaluation, acknowledged: event.target.checked })} />I reviewed the workflow design, AI feedback I chose to use, and test results. I take responsibility for this management evaluation.</label>
        <button className="primary-button">Save Management Evaluation</button>
      </form> : <article className="accepted-plan" aria-label="Saved Management Evaluation"><h3>Completed Management Evaluation</h3><dl>{evaluationFields.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{data.evaluation[field]}</dd></div>)}</dl><button className="secondary-button" onClick={() => { setEvaluation({ ...data.evaluation, acknowledged: false }); setEditingEvaluation(true); }}>Edit Management Evaluation</button></article>}
    </section>
    <p className="storage-note">Week 5 saved work stays in this browser on this device. AI prompt, pasted feedback, and review judgment are temporary working state.</p>
  </main>;
}
