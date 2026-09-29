import { t } from './i18n.js';
import { useState, useEffect, useRef } from 'react';
import WorkspaceIntro from './WorkspaceIntro.jsx';
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
          <div className="eyebrow">{t("Week 3 · Research & Verification")}</div>
          <h1>{t("Research & Verification")}</h1>
          <p>{t("Evaluate claims, check sources, and record what you found. Retain responsibility for your judgment.")}</p>
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
        >{t("+ Add research record")}</button>
      </div>

      <WorkspaceIntro>{t("Use this workspace for any paper, project, product, or claim. Add a research record, check a source, and record what the evidence supports.")}</WorkspaceIntro>
      <details className="panel supplied-information"><summary>{t("Coastal Life Management Application — Research example")}</summary>
        <p>{t("Example question: Should Coastal Life expand into vacation rental management in Charleston?")}</p>
        <p>{t("Possible research areas: market demand, competition, and rules and restrictions. Use the same records below to investigate claims and verify sources. Records can belong to any research topic.")}</p>
      </details>
      {researchError && <p className="error-message" role="alert">{t(researchError)}</p>}
      {error && <p className="error-message" role="alert">{t(error)}</p>}
      {message && <p className="success-message" role="status">{t(message)}</p>}

      {draft && (
        <section className="panel research-editor" aria-labelledby="editor-title">
          <h2 id="editor-title">{draft.id ? t('Edit research record') : t('Add a research record')}</h2>
          <p className="muted">{t("Research question, area, and claim are always required. Source and finding are optional while Pending; they become required when you select a verification outcome.")}</p>
          <form onSubmit={save}>
            <div className="research-form-grid">
              <label className="span-two">{t("Research question or topic (required)")}<input
                  ref={questionInput}
                  name="question"
                  value={draft.question}
                  onChange={field}
                  placeholder={t("e.g., What evidence supports the claim I am researching?")}
                  required
                  maxLength={500}
                />
              </label>

              <label>{t("Research area or category (required)")}<input
                  name="area"
                  value={draft.area}
                  onChange={field}
                  placeholder={t("e.g., Market demand, Competition, Rules and restrictions")}
                  required
                  maxLength={100}
                />
              </label>

              <label>{t("Verification status (required)")}<select name="status" value={draft.status} onChange={field} required>
                  {VERIFICATION_STATUSES.map(value => (
                    <option key={value} value={value}>{t(value)}</option>
                  ))}
                </select>
                <small>{
                  t({
                    Pending: 'Pending: verification is incomplete. Check a source before selecting a final status.',
                    Verified: 'Verified: the source supports the full claim.',
                    'Partly verified': 'Partly verified: only part of the claim is supported or qualifications remain.',
                    'Not verified': 'Not verified: the evidence does not adequately support the claim.',
                  }[draft.status])
                }</small>
              </label>

              <label className="span-two">{t("Claim to check (required)")}<textarea
                  name="claim"
                  value={draft.claim}
                  onChange={field}
                  placeholder={t("State the specific claim you are investigating.")}
                  rows={3}
                  required
                  maxLength={2000}
                />
              </label>

              <label className="span-two">{t("Verification source ")}{draft.status === 'Pending' ? t('(optional)') : t('(required)')}
                <textarea
                  name="source"
                  value={draft.source}
                  onChange={field}
                  placeholder={t("Describe where you checked this claim. Include author, publication, date, and relevant details.")}
                  rows={3}
                  maxLength={2000}
                />
                <small>{draft.status === 'Pending' ? t('Optional while pending.') : t('Required for this status.')}</small>
              </label>

              <label className="span-two">{t("Source URL (optional)")}<input
                  name="sourceUrl"
                  value={draft.sourceUrl}
                  onChange={field}
                  placeholder={t("e.g., https://example.com/article")}
                  maxLength={500}
                />
                <small>{t("Not all sources have URLs. Document the source in the field above.")}</small>
              </label>

              <label className="span-two">{t("What you found after checking the source ")}{draft.status === 'Pending' ? t('(optional)') : t('(required)')}
                <textarea
                  name="finding"
                  value={draft.finding}
                  onChange={field}
                  placeholder={t("Describe what the source actually established. Be specific about what supports or does not support the claim.")}
                  rows={3}
                  maxLength={2000}
                />
                <small>{draft.status === 'Pending' ? t('Optional while pending.') : t('Required for this status.')}{t(" This is your judgment based on what the source actually says, not what the source claims or what you hoped to find.")}</small>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>{t("Cancel")}</button>
              <button className="primary-button" type="submit">{t("Save record")}</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel research-panel" aria-labelledby="records-title">
        <div className="panel-heading">
          <h2 id="records-title">{t("Saved research records")}</h2>
          <span className="muted">{records.length}{t(" record")}{records.length !== 1 ? t('s') : ''}</span>
        </div>

        {!records.length ? (
          <div className="empty-state">
            <h3>{t("No research records yet")}</h3>
            <p>{t("Create your first record to begin researching and verifying claims.")}</p>
          </div>
        ) : (
          <ul className="research-list">
            {records.map(record => (
              <li key={record.id} className="research-item">
                <div className="research-header">
                  <h3>{record.question}</h3>
                  <span className={`verification-badge verification-${record.status.toLowerCase().replace(' ', '-')}`}>
                    {t(record.status)}
                  </span>
                </div>

                <div className="research-meta">
                  <span className="research-area">{record.area}</span>
                </div>

                <div className="research-content">
                  <div className="research-section">
                    <h4>{t("Claim")}</h4>
                    <p className="research-text">{record.claim}</p>
                  </div>

                  {(record.source || record.finding || record.sourceUrl) && (
                    <div className="research-section">
                      <h4>{t("Verification")}</h4>
                      {record.source && (
                        <div>
                          <span className="research-label">{t("Source:")}</span>
                          <p className="research-text">{record.source}</p>
                        </div>
                      )}
                      {record.sourceUrl && (
                        <div>
                          <span className="research-label">{t("URL:")}</span>
                          <p className="research-text">
                            <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {record.sourceUrl}
                            </a>
                          </p>
                        </div>
                      )}
                      {record.finding && (
                        <div>
                          <span className="research-label">{t("Finding:")}</span>
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
                    aria-label={t(`Edit research record: ${record.question}`)}
                  >{t("Edit")}</button>
                  <button
                    className="remove-button"
                    disabled={!!draft}
                    onClick={() => {
                      setDeleting(record.id);
                      setMessage('');
                    }}
                    aria-label={t(`Delete research record: ${record.question}`)}
                  >{t("Delete")}</button>
                </div>

                {deleting === record.id && (
                  <div className="delete-confirmation">
                    <p>{t("Delete this research record? This cannot be undone.")}</p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setDeleting(null);
                      }}
                    >{t("Keep record")}</button>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => {
                        if (commit(records.filter(item => item.id !== record.id), 'Research record deleted.')) {
                          setDeleting(null);
                        }
                      }}
                    >{t("Confirm delete")}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="storage-note">{t("Saved only in this browser on this device. Clearing site data removes your research records. No account or cloud sync.")}</p>
    </main>
  );
}
