# Undergraduate Week 7 — Final Integration + Managing AI

The `#/final` route follows AI Assistant. Course progress reads **Weeks 1–7 of 7**. Home and W1–W6 logic, storage keys, source material, and Grace authority remain unchanged.

## Student Dashboard assessment

Eight scenarios, each with four responses and one best management response:

1. Verify an AI-supported supplier claim against its original source.
2. Escalate a workflow exception outside approved conditions.
3. Distinguish an observed pattern from an established cause.
4. Acknowledge missing approved assistant information and refer appropriately.
5. Review priorities and authority before approving an AI-proposed plan change.
6. Automate routine routing within defined rules, controls, and exception handling.
7. Obtain evidence and authorized human review before a consequential decision.
8. Retain human managerial accountability for AI-supported decisions.

The five capability summaries cover Planning & Approval (5, 8), Research & Verification (1), Analysis & Evidence (3, 7), Automation & Human Control (2, 6), and AI Assistant Boundaries (4). A capability is demonstrated when its associated decisions align; otherwise review is recommended. There is no passing score or grading threshold.

Submission requires eight responses. Each question shows correct/incorrect feedback and a concise principle explanation. All radio selections remain editable. Revising one answer leaves the other seven unchanged. Until resubmission, feedback explicitly refers to the saved submission, including the previous response for any changed question. Resubmission recalculates every result and capability without attempt limits or a forced reset.

## Coastal Life application

The approved Oceanview Condo ceiling-staining scenario includes the uncertain current moisture condition, initial routine-maintenance routing, 90% occupancy, 4.3 rating, $1,260 maintenance costs, seven complaints, and the limited significance of the prior inspection. An open, collapsible information area explains workflow and Grace boundaries.

Four parts capture the student's judgment:

1. Classify reported facts, unknown current conditions, and system capabilities/limits.
2. Review the prior note, metrics, workflow routing, and Grace's approved information.
3. Choose a human-control approach and briefly justify it.
4. Record the next action, brief reason, and human accountability.

Only three short written responses are required, each limited to 400 characters. Selected choices are also displayed as wrapping text so their full wording remains readable at narrow widths. Completing the application checks completeness, not whether one final action is universally correct. Assessment performance never gates access. Completed work stays editable.

## Storage and translation

`ai-managers-final-integration-v1` stores a version-1 envelope with current assessment answers, the latest submitted answer snapshot and result, Coastal Life responses, and completion state. Draft changes save immediately. Editing completed Coastal Life work marks it as a draft until saved complete again. Storage failures are reported and can be retried; unreadable or unsupported saved records are preserved and not overwritten.

English/Spanish content in `finalIntegrationContent.js` joins the existing `spanish.js` dictionary and `t()` display architecture. Stable IDs and numeric choices are stored, never translated labels. Student text is never translated. Switching language preserves current answers, submitted results, and Coastal Life responses.

## Verification

The Week 7 test file explicitly covers all eight four-choice scenarios; navigation/progress and workspace separation; incomplete submission; correctness/explanations; all capability mappings; repeated single-answer revisions; draft and submitted persistence across remount/navigation; editable Coastal Life completion; translation without data mutation; and storage-failure protection.

Validation on September 29, 2026: all **157 tests across 12 files passed**, including the 151 existing W1–W6/Grace/Worker regressions, and the Vite production build passed. Browser verification covered desktop 1280×900 and narrow 390×844 / 320×800 layouts, no horizontal page overflow, labeled native controls, keyboard assessment operation, a 7/8 → 8/8 individual-answer revision and reload, Spanish translation, and Coastal Life completion. Worker source is unchanged and requires no deployment.

GitHub Pages deployment and live verification are reported with the final delivery.
