import { useState, useEffect, useRef } from 'react';
import { validateResearchRecord, VERIFICATION_STATUSES, makeEmptyRecord } from './research.js';

export default function Research({ records, saveRecords, researchError }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(null);
  const questionInput = useRef(null);
  const addButton = useRef(null);

  useEffect(() => { if (draft) questionInput.current?.focus(); }, [draft?.id, draft === null]);

  function commit(next, success) {
    try {
      saveRecords(next);
      setError('');
      setMessage(success);
      return true;
    } catch {
      setError('Research records could not be saved in this browser. Your changes have not been applied. Check browser storage or available space and try again.');
      setMessage('');
      return false;
    }
  }

  function closeForm() {
    setDraft(null);
    setError('');
    addButton.current?.focus();
  }

  function save(event) {
    event.preventDefault();
    const validation = validateResearchRecord(draft);
    if (validation) {
      setError(validation);
      return;
    }
    const record = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      question: draft.question.trim(),
      area: draft.area.trim(),
      claim: draft.claim.trim(),
      source: draft.source.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      finding: draft.finding.trim(),
    };
    const next = draft.id
      ? records.map(item => item.id === draft.id ? record : item)
      : [...records, record];
    if (commit(next, 'Research record saved in this browser.')) {
      closeForm();
    }
  }

  function field(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  }

  return (
    <main className="page research-page" id="main-content" tabIndex="-1">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Week 3 · Research & Verification</div>
          <h1>Research & Verification</h1>
          <p>Evaluate claims, check sources, and record what you found. Retain responsibility for your judgment.</p>
        </div>
        <button
          ref={addButton}
          className="primary-button"
          disabled={!!researchError || !!draft}
          onClick={() => {
            setDraft(makeEmptyRecord());
            setError('');
            setMessage('');
            setDeleting(null);
          }}
        >
          + Add research record
        </button>
      </div>

      {researchError && <p className="error-message" role="alert">{researchError}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      {draft && (
        <section className="panel research-editor" aria-labelledby="editor-title">
          <h2 id="editor-title">{draft.id ? 'Edit research record' : 'Add a research record'}</h2>
          <p className="muted">Research question, area, and claim are always required. Source and finding are optional while Pending; they become required when you select a verification outcome.</p>
          <form onSubmit={save}>
            <div className="research-form-grid">
              <label className="span-two">
                Research question or topic (required)
                <input
                  ref={questionInput}
                  name="question"
                  value={draft.question}
                  onChange={field}
                  placeholder="e.g., Should Coastal Life expand into vacation rental management in Charleston?"
                  required
                  maxLength={500}
                />
              </label>

              <label>
                Research area or category (required)
                <input
                  name="area"
                  value={draft.area}
                  onChange={field}
                  placeholder="e.g., Market demand, Competition, Rules and restrictions"
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Verification status (required)
                <select name="status" value={draft.status} onChange={field} required>
                  {VERIFICATION_STATUSES.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <small>Pending: you have not yet verified this claim. Once you check a source, select Verified, Partly verified, or Not verified.</small>
              </label>

              <label className="span-two">
                Claim to check (required)
                <textarea
                  name="claim"
                  value={draft.claim}
                  onChange={field}
                  placeholder="State the specific claim you are investigating."
                  rows={3}
                  required
                  maxLength={2000}
                />
              </label>

              <label className="span-two">
                Verification source {draft.status === 'Pending' ? '(optional)' : '(required)'}
                <textarea
                  name="source"
                  value={draft.source}
                  onChange={field}
                  placeholder="Describe where you checked this claim. Include author, publication, date, and relevant details."
                  rows={3}
                  maxLength={2000}
                />
                <small>{draft.status === 'Pending' ? 'Optional while pending.' : 'Required for this status.'}</small>
              </label>

              <label className="span-two">
                Source URL (optional)
                <input
                  name="sourceUrl"
                  value={draft.sourceUrl}
                  onChange={field}
                  placeholder="e.g., https://example.com/article"
                  maxLength={500}
                />
                <small>Not all sources have URLs. Document the source in the field above.</small>
              </label>

              <label className="span-two">
                What you found after checking the source {draft.status === 'Pending' ? '(optional)' : '(required)'}
                <textarea
                  name="finding"
                  value={draft.finding}
                  onChange={field}
                  placeholder="Describe what the source actually established. Be specific about what supports or does not support the claim."
                  rows={3}
                  maxLength={2000}
                />
                <small>{draft.status === 'Pending' ? 'Optional while pending.' : 'Required for this status.'} This is your judgment based on what the source actually says, not what the source claims or what you hoped to find.</small>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Save record
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel research-panel" aria-labelledby="records-title">
        <div className="panel-heading">
          <h2 id="records-title">Saved research records</h2>
          <span className="muted">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>

        {!records.length ? (
          <div className="empty-state">
            <h3>No research records yet</h3>
            <p>Create your first record to begin researching and verifying claims.</p>
          </div>
        ) : (
          <ul className="research-list">
            {records.map(record => (
              <li key={record.id} className="research-item">
                <div className="research-header">
                  <h3>{record.question}</h3>
                  <span className={`verification-badge verification-${record.status.toLowerCase().replace(' ', '-')}`}>
                    {record.status}
                  </span>
                </div>

                <div className="research-meta">
                  <span className="research-area">{record.area}</span>
                </div>

                <div className="research-content">
                  <div className="research-section">
                    <h4>Claim</h4>
                    <p className="research-text">{record.claim}</p>
                  </div>

                  {(record.source || record.finding || record.sourceUrl) && (
                    <div className="research-section">
                      <h4>Verification</h4>
                      {record.source && (
                        <div>
                          <span className="research-label">Source:</span>
                          <p className="research-text">{record.source}</p>
                        </div>
                      )}
                      {record.sourceUrl && (
                        <div>
                          <span className="research-label">URL:</span>
                          <p className="research-text">
                            <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {record.sourceUrl}
                            </a>
                          </p>
                        </div>
                      )}
                      {record.finding && (
                        <div>
                          <span className="research-label">Finding:</span>
                          <p className="research-text">{record.finding}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="research-actions">
                  <button
                    className="text-button"
                    disabled={!!draft}
                    onClick={() => {
                      setDraft({ ...record });
                      setError('');
                      setMessage('');
                      setDeleting(null);
                    }}
                    aria-label={`Edit research record: ${record.question}`}
                  >
                    Edit
                  </button>
                  <button
                    className="remove-button"
                    disabled={!!draft}
                    onClick={() => {
                      setDeleting(record.id);
                      setMessage('');
                    }}
                    aria-label={`Delete research record: ${record.question}`}
                  >
                    Delete
                  </button>
                </div>

                {deleting === record.id && (
                  <div className="delete-confirmation">
                    <p>Delete this research record? This cannot be undone.</p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setDeleting(null);
                      }}
                    >
                      Keep record
                    </button>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => {
                        if (commit(records.filter(item => item.id !== record.id), 'Research record deleted.')) {
                          setDeleting(null);
                        }
                      }}
                    >
                      Confirm delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="storage-note">Saved only in this browser on this device. Clearing site data removes your research records. No account or cloud sync.</p>
    </main>
  );
}
