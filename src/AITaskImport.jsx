import { t } from './i18n.js';
import { useState } from 'react';
import { approvedTask, emptyImport, parseProposals, proposalWarnings, taskImportPrompt } from './planningSupport.js';
import { DependencyPicker, ExternalAINotice, PromptOutput } from './PlanningControls.jsx';

export default function AITaskImport({ tasks, commit, today, disabled }) {
  const [data, setData] = useState(emptyImport);
  const [source, setSource] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const locked = disabled;

  const candidates = [
    ...tasks,
    ...data.proposals.filter(
      proposal =>
        proposal.status === 'pending' &&
        !tasks.some(task => task.id === proposal.id)
    )
  ];

  function save(next) {
    setData(next);
    return true;
  }

  function update(id, fields) {
    return save({
      ...data,
      proposals: data.proposals.map(proposal =>
        proposal.id === id ? { ...proposal, ...fields } : proposal
      )
    });
  }

  function prepare() {
    if (!source.trim()) {
      setError('Paste task information before preparing the prompt.');
      return;
    }

    const prompt = taskImportPrompt(source, today);

    save({
      ...emptyImport(),
      source,
      prompt
    });

    setResponse('');
    setError('');
    setMessage(
      'New prompt prepared. Copy it to your approved AI tool, then return here with the response.'
    );
  }

  function parse() {
    try {
      const proposals = parseProposals(response);

      save({
        ...data,
        response,
        proposals
      });

      setError('');
      setMessage(
        'Proposed Tasks are ready for review. No tasks have been added to the Planner.'
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  function approve(proposal) {
    try {
      const task = approvedTask(proposal, tasks);

      if (commit([...tasks, task], 'Reviewed task added to Planner.')) {
        update(proposal.id, { status: 'approved' });
        setError('');
        setMessage(`Approved: ${task.title}`);
      }
    } catch (failure) {
      setError(failure.message);
    }
  }

  function startNewImport() {
    setData(emptyImport());
    setSource('');
    setResponse('');
    setError('');
    setMessage(
      'Ready for a new task import. Your saved Planner tasks were kept.'
    );
  }

  return (
    <details className="panel ai-feature">
      <summary>{t("Prepare AI Task Import")}</summary>

      <ExternalAINotice />

      <p>{t("Turn syllabus, course schedule, instructor-list, workplace, or spreadsheet-style text into proposals using an external AI tool. Review the result here before adding anything to Planner.")}</p>

      {error && (
        <p className="error-message" role="alert">
          {t(error)}
        </p>
      )}

      {message && (
        <p role="status" className="success-message">
          {t(message)}
        </p>
      )}

      <label>{t("Task information")}<textarea
          value={source}
          onChange={event => setSource(event.target.value)}
          rows={5}
          maxLength={30000}
          placeholder={t("Paste the relevant academic or workplace task information here. Remove sensitive information first.")}
        />
      </label>

      <button
        className="primary-button"
        type="button"
        disabled={locked}
        onClick={prepare}
      >{t("Generate task-import prompt")}</button>

      <PromptOutput value={data.prompt} label={t("Task-import prompt")} />

      <label>{t("AI task response")}<textarea
          value={response}
          onChange={event => setResponse(event.target.value)}
          rows={5}
          maxLength={100000}
          placeholder={t("Paste the complete JSON response from your AI tool. You do not need to write code.")}
        />
      </label>

      <p className="muted">{t("Parsing checks the response format; it is not AI. Task-import source, prompt, AI response, and unapproved proposals are temporary. Refreshing the page or starting a new task import clears them. Approved Planner tasks remain saved.")}</p>

      <div className="task-actions">
        <button
          className="secondary-button"
          disabled={locked}
          type="button"
          onClick={parse}
        >{t("Review proposed tasks")}</button>

        {(source || data.prompt || response || data.proposals.length > 0) && (
          <button
            className="remove-button"
            disabled={locked}
            type="button"
            onClick={startNewImport}
          >{t("Start new task import")}</button>
        )}
      </div>

      {data.proposals.length > 0 && (
        <section aria-label={t("Proposed Tasks")} className="proposals">
          <h2>{t("Proposed Tasks")}</h2>

          <p>{t("Check dates, effort, priority, sources, and prerequisites. Approve prerequisites first. Each approval adds one task; rejecting a proposal does not delete a saved task.")}</p>

          {data.proposals.map(proposal => {
            const isSaved = tasks.some(task => task.id === proposal.id);
            const status = isSaved ? 'approved' : proposal.status;

            return (
              <section
                key={proposal.id}
                className="proposal-card"
                aria-label={t(`Proposal ${proposal.externalId}`)}
              >
                <div className="panel-heading">
                  <h3>
                    {proposal.externalId}:{' '}
                    {proposal.title || t('Untitled proposal')}
                  </h3>

                  <span className="proposal-status">{t(status)}</span>
                </div>

                {status === 'pending' ? (
                  <>
                    <p className="source-excerpt">
                      <strong>{t("Source excerpt:")}</strong>{' '}
                      {proposal.source || t('Not supplied')}
                    </p>

                    <ul className="review-flags">
                      {proposalWarnings(
                        proposal,
                        candidates,
                        today
                      ).map((warning, index) => (
                        <li key={index}>{t(warning)}</li>
                      ))}
                    </ul>

                    <div className="task-form-grid">
                      <label className="span-two">{t("Proposed title")}<input
                          value={proposal.title}
                          maxLength={160}
                          onChange={event =>
                            update(proposal.id, {
                              title: event.target.value,
                              reviewed: false
                            })
                          }
                        />
                      </label>

                      <label>{t("Proposed category")}<input
                          value={proposal.category}
                          maxLength={100}
                          onChange={event =>
                            update(proposal.id, {
                              category: event.target.value,
                              reviewed: false
                            })
                          }
                        />
                      </label>

                      <label>{t("Proposed due date")}<input
                          type="date"
                          min="1900-01-01"
                          max="9999-12-31"
                          value={proposal.dueDate}
                          onChange={event =>
                            update(proposal.id, {
                              dueDate: event.target.value,
                              reviewed: false
                            })
                          }
                        />
                      </label>

                      <label>{t("Proposed hours")}<input
                          type="number"
                          min="0"
                          max="1000"
                          step="any"
                          value={proposal.hours}
                          onChange={event =>
                            update(proposal.id, {
                              hours: event.target.value,
                              reviewed: false
                            })
                          }
                        />
                      </label>

                      <label>{t("Proposed priority")}<select
                          value={proposal.priority}
                          onChange={event =>
                            update(proposal.id, {
                              priority: event.target.value,
                              reviewed: false
                            })
                          }
                        >
                          <option value="">{t("Choose priority")}</option>
                          {['High', 'Medium', 'Low'].map(priority => (
                            <option key={priority} value={priority}>{t(priority)}</option>
                          ))}
                        </select>
                      </label>

                      <label className="span-two">{t("Proposed notes")}<textarea
                          value={proposal.notes}
                          maxLength={1000}
                          rows={2}
                          onChange={event =>
                            update(proposal.id, {
                              notes: event.target.value,
                              reviewed: false
                            })
                          }
                        />
                      </label>
                    </div>

                    <DependencyPicker
                      tasks={candidates}
                      currentId={proposal.id}
                      value={proposal.dependencies}
                      onChange={dependencies =>
                        update(proposal.id, {
                          dependencies,
                          reviewed: false
                        })
                      }
                    />

                    <label className="review-check">
                      <input
                        type="checkbox"
                        checked={proposal.reviewed}
                        onChange={event =>
                          update(proposal.id, {
                            reviewed: event.target.checked
                          })
                        }
                      />{t("I checked this proposal against the source and reviewed every flag.")}</label>

                    <div className="task-actions">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={locked}
                        onClick={() => approve(proposal)}
                      >{t("Approve task ")}{proposal.externalId}
                      </button>

                      <button
                        className="remove-button"
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (
                            update(proposal.id, {
                              status: 'rejected'
                            })
                          ) {
                            setError('');
                            setMessage(
                              `Rejected proposal ${proposal.externalId}. No task was saved.`
                            );
                          }
                        }}
                      >{t("Reject task ")}{proposal.externalId}
                      </button>
                    </div>
                  </>
                ) : (
                  <p>
                    {status === 'approved'
                      ? t('Approved proposal. Manage the saved task in Your tasks.')
                      : t('Rejected proposal. Nothing was added to Planner.')}
                  </p>
                )}
              </section>
            );
          })}
        </section>
      )}
    </details>
  );
}
