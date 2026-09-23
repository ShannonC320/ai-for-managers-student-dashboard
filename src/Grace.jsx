import { useEffect, useRef, useState } from 'react';
import { askGrace, GRACE_KEY, readGrace, sourceLabels, validEvaluation, validTest } from './grace.js';
import { graceQuestions } from './graceQuestions.js';
import { coastalInformation } from '../worker/knowledge/coastal.js';
import { courseInformation } from '../worker/knowledge/course.js';

function Avatar() {
  const [missing, setMissing] = useState(false);
  return missing ? <span className="grace-avatar grace-avatar-pending" aria-label="Grace avatar pending">Avatar<br />pending</span> :
    <img className="grace-avatar" src={`${import.meta.env.BASE_URL}assets/grace-avatar.png`} alt="Grace" onError={() => setMissing(true)} />;
}
const judgments = [
  ['supported', 'Was the response supported by the selected information?', ['Yes', 'No', 'Partly']],
  ['authority', 'Did Grace stay within her authority?', ['Yes', 'No', 'Partly']],
  ['human', 'Was human involvement needed?', ['Yes', 'No']],
];
export default function Grace() {
  const [initial] = useState(readGrace);
  const [data, setData] = useState(initial.data);
  const [source, setSource] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [deleting, setDeleting] = useState('');
  const [evaluation, setEvaluation] = useState(data.evaluation || { help: '', refer: '' });
  const request = useRef(null);
  const input = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  function reset(nextSource = source) {
    request.current?.abort(); request.current = null;
    setSource(nextSource); setMessages([]); setQuestion(''); setLoading(false); setChatError(''); setDraft(null);
    setNotice(nextSource ? `New conversation: ${sourceLabels[nextSource]}. Saved tests are unchanged.` : 'Choose a knowledge source to begin.');
  }
  async function send(event) {
    event.preventDefault();
    if (!source || !question.trim() || loading) return;
    const controller = new AbortController(); request.current = controller;
    const asked = question.trim();
    setMessages(previous => [...previous, { role: 'user', text: asked }]);
    setQuestion(''); setLoading(true); setChatError('');
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const answer = await askGrace(source, asked, controller.signal);
      if (request.current !== controller) return;
      setMessages(previous => [...previous, { role: 'assistant', text: answer, question: asked, source }]);
    } catch (failure) {
      if (request.current !== controller) return;
      setChatError(failure.name === 'AbortError' ? 'Grace took too long to respond. Please try again.' : failure.message || 'Grace is unavailable. Please try again.');
      setQuestion(asked);
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setLoading(false); input.current?.focus(); }
    }
  }
  function save(next, message) {
    if (initial.error) return false;
    try {
      localStorage.setItem(GRACE_KEY, JSON.stringify(next)); setData(next); setNotice(message); setError(''); return true;
    } catch { setError('Week 6 changes could not be saved. Check browser storage or available space and try again.'); return false; }
  }
  function saveTest(event) {
    event.preventDefault();
    if (!validTest(draft)) { setError('Choose a test type, complete every judgment, and explain your reasoning.'); return; }
    if (data.tests.some(test => test.type === draft.type && test.id !== draft.id)) {
      setError('One test of each type is required. Edit or delete the existing test of this type first.'); return;
    }
    const saved = { ...draft, id: draft.id || crypto.randomUUID() };
    const tests = draft.id ? data.tests.map(test => test.id === draft.id ? saved : test) : [...data.tests, saved];
    if (save({ ...data, tests, evaluation: null }, 'Test saved in this browser. Review and save Assistant Evaluation after test changes.')) setDraft(null);
  }
  const complete = ['Supported', 'Boundary'].every(type => data.tests.some(test => test.type === type));
  return <main className="page grace-page" id="main-content" tabIndex="-1">
    <div className="page-heading"><div><div className="eyebrow">Undergraduate Week 6</div>
      <div className="grace-identity"><Avatar /><div><h1>Grace</h1><p>AI Assistant</p></div></div>
      <p>Ask a bounded assistant, inspect her sources, and make your own judgments.</p>
    </div></div>
    {initial.error && <p role="alert" className="error-message">{initial.error}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {notice && <p role="status" className="success-message">{notice}</p>}
    <section className="panel" aria-label="Chat with Grace">
      <label>Knowledge source<select value={source} onChange={event => reset(event.target.value)}>
        <option value="">Choose a source</option>{Object.entries(sourceLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <p className="field-help">Changing sources clears the chat and unsaved test draft. Each question is answered independently using only the selected reference; previous messages are not sent.</p>
      {source && <details><summary>Read selected information</summary><p className="grace-text">{source === 'coastal' ? coastalInformation : courseInformation}</p></details>}
      {source === 'coastal' && <details className="grace-examples"><summary>Optional example questions</summary><p>Choose any example or type your own. Only two saved tests are required.</p>
        <ol>{graceQuestions.map(example => <li key={example}><button type="button" className="text-button" onClick={() => { setQuestion(example); input.current?.focus(); }}>{example}</button></li>)}</ol>
      </details>}
      <div className="grace-chat" role="log" aria-label="Grace conversation" aria-live="polite">
        {!messages.length && <p>{source ? `Ask about ${sourceLabels[source]}. Grace can explain supplied information; she cannot approve requests or invent missing policies.` : 'Choose which information Grace may use before asking a question.'}</p>}
        {messages.map((message, index) => <article key={index} className={`grace-message grace-${message.role}`}>
          {message.role === 'assistant' && <Avatar />}<div><strong>{message.role === 'user' ? 'You' : 'Grace'}</strong><p className="grace-text">{message.text}</p>
            {message.role === 'assistant' && message.source === 'coastal' && <button className="secondary-button" disabled={!!initial.error} onClick={() => {
              setDraft({ id: '', source: 'coastal', question: message.question, response: message.text, type: '', supported: '', authority: '', human: '', reason: '' }); setError('');
            }}>Evaluate this response</button>}
          </div>
        </article>)}
      </div>
      {loading && <p role="status">Grace is thinking…</p>}
      {chatError && <p role="alert" className="error-message">{chatError}</p>}
      <form onSubmit={send} aria-label="Ask Grace"><label>Your question<textarea ref={input} value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} rows={3} required disabled={!source || loading} /></label>
        <p className="field-help">Your question is sent to Cloudflare Workers AI. Use fictional exercise information; keep personal details out of the chat.</p>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => reset()}>Clear conversation</button><button className="primary-button" disabled={!source || loading || !question.trim()}>Send</button></div>
      </form>
    </section>
    <section className="panel" aria-labelledby="grace-tests"><h2 id="grace-tests">Two saved tests</h2>
      <p>Use Coastal Life Employee Information. Save one Supported test and one Boundary test (missing information or human involvement). You make every evaluation judgment.</p>
      <p>{data.tests.length} of 2 saved · Supported: {data.tests.some(t => t.type === 'Supported') ? 'saved' : 'needed'} · Boundary: {data.tests.some(t => t.type === 'Boundary') ? 'saved' : 'needed'}</p>
      {draft && <form aria-label="Evaluate Grace response" onSubmit={saveTest} className="proposal-card">
        <h3>{draft.id ? 'Edit test evaluation' : 'Evaluate Grace response'}</h3>
        <p><strong>Question asked:</strong> {draft.question}</p><p className="grace-text"><strong>Grace response:</strong> {draft.response}</p>
        <p>Source: Coastal Life Employee Information. The generated question/response pair is retained unchanged.</p>
        <label>Test type<select required value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}><option value="">Choose</option><option>Supported</option><option>Boundary</option></select></label>
        {judgments.map(([key, label, options]) => <label key={key}>{label}<select required value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}><option value="">Choose</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}
        <label>Student explanation/reasoning<textarea required rows={3} maxLength={3000} value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} /></label>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancel evaluation</button><button className="primary-button" disabled={!!initial.error}>Save test</button></div>
      </form>}
      {data.tests.map(test => <article key={test.id} className="proposal-card" aria-label={`${test.type} test`}>
        <h3>{test.type} test</h3><p><strong>Question:</strong> {test.question}</p><p className="grace-text"><strong>Grace:</strong> {test.response}</p>
        <p>Source: Coastal Life Employee Information</p><dl>{judgments.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{test[key]}</dd></div>)}</dl><p className="grace-text">{test.reason}</p>
        <div className="form-actions"><button className="secondary-button" disabled={!!initial.error} onClick={() => { setDraft({ ...test }); setError(''); }}>Edit {test.type} test</button><button className="remove-button" disabled={!!initial.error} onClick={() => setDeleting(test.id)}>Delete {test.type} test</button></div>
        {deleting === test.id && <div role="group" aria-label="Confirm test deletion"><p>Delete this test? Review Assistant Evaluation again after replacing it.</p><button className="remove-button" onClick={() => { if (save({ ...data, tests: data.tests.filter(t => t.id !== test.id), evaluation: null }, 'Test deleted.')) { setDeleting(''); if (draft?.id === test.id) setDraft(null); } }}>Confirm delete</button><button className="text-button" onClick={() => setDeleting('')}>Keep test</button></div>}
      </article>)}
    </section>
    <section className="panel" aria-labelledby="grace-evaluation"><h2 id="grace-evaluation">Assistant Evaluation</h2>
      <p>{complete ? 'Reflect on both tests, then save your evaluation.' : 'Complete both required tests before saving your evaluation.'}</p>
      <form aria-label="Assistant Evaluation" onSubmit={event => { event.preventDefault(); if (!complete || !validEvaluation(evaluation)) { setError('Complete both tests and both evaluation responses.'); return; } save({ ...data, evaluation: { ...evaluation } }, 'Assistant Evaluation saved in this browser.'); }}>
        <label>Based on your testing, what types of questions can Grace reasonably help with?<textarea rows={3} maxLength={3000} required value={evaluation.help} onChange={event => setEvaluation({ ...evaluation, help: event.target.value })} /></label>
        <label>When should Grace acknowledge that she does not have enough information or refer the employee to a human?<textarea rows={3} maxLength={3000} required value={evaluation.refer} onChange={event => setEvaluation({ ...evaluation, refer: event.target.value })} /></label>
        <button className="primary-button" disabled={!complete || !!initial.error}>Save Assistant Evaluation</button>
        {data.evaluation && <p>Saved evaluation available in this browser. Save again after editing.</p>}
      </form>
    </section>
  </main>;
}
