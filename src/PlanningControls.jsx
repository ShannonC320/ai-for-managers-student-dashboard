import { useState } from 'react';

export function DependencyPicker({ tasks, value = [], onChange, currentId }) {
  const options = tasks.filter(task => task.id !== currentId);
  const missing = value.filter(id => !options.some(task => task.id === id));
  function toggle(id) { onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]); }
  return <fieldset className="dependency-picker"><legend>Must complete first</legend><p className="muted">Prerequisites are separate from priority. Select all that apply.</p>
    {!options.length && !missing.length && <p className="muted">No other tasks yet.</p>}
    <div className="checklist">{options.map(task => <label key={task.id}><input type="checkbox" checked={value.includes(task.id)} onChange={() => toggle(task.id)} />{task.title || 'Untitled proposal'}{task.completed ? ' (completed)' : ''}</label>)}
      {missing.map(id => <label className="danger-text" key={id}><input type="checkbox" checked onChange={() => toggle(id)} />Missing or invalid prerequisite: {id} — uncheck to remove</label>)}
    </div>
  </fieldset>;
}

export function PromptOutput({ value, label }) {
  const [message, setMessage] = useState('');
  if (!value) return null;
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage('Prompt copied. Paste it into your approved AI tool.'); }
    catch { setMessage('Copy was unavailable. Select the prompt text below and copy it manually.'); }
  }
  return <div className="prompt-output"><label>{label}<textarea readOnly value={value} rows={6} onFocus={event => event.target.select()} /></label><button className="secondary-button" type="button" onClick={copy}>Copy prompt</button>{message && <p role="status">{message}</p>}</div>;
}

export function ExternalAINotice() {
  return <p className="external-ai-notice">Use your course-approved AI tool separately. This dashboard does not call an AI service. Copying information into that tool shares it with that service; omit sensitive information and check course policy. No profile information is included automatically. AI output can contain mistakes and assumptions.</p>;
}
