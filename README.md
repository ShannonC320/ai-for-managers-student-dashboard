# AI for Managers Student Dashboard — Weeks 1–2

This React application is a progressively extensible workspace for a seven-week undergraduate business course. Week 1 Home and Profile remain in place; Week 2 adds Planner / Tasks for planning, priorities, and workload. No account, backend, paid service, or external AI API is used.

## Run it locally

1. Install **Node.js 24** from https://nodejs.org if it is not already installed. The GitHub workflow also uses Node.js 24.
2. Open a terminal in this project folder.
3. Use **pnpm 11.19.0**, matching the workflow. If pnpm is not installed, run `npm install --global pnpm@11.19.0`. Run `pnpm install --frozen-lockfile` to prepare the project using the existing dependency lockfile.
4. Run `pnpm dev`.
5. Open the local address shown in the terminal, usually `http://localhost:5173/ai-for-managers-student-dashboard/`.

Keep the terminal open while using the dashboard. Press **Ctrl+C** in the terminal when you want to stop it.

## Useful checks

- `pnpm test` runs the automated interaction and planning-rule checks.
- `pnpm build` produces the static application in `dist/`.
- `pnpm exec vite preview` serves the production build for a local check.

## Planner behavior

Add, edit, delete (with confirmation), complete, and reopen tasks. Each task has a title, due date, estimated remaining hours, and a manually selected High/Medium/Low priority. Category and notes are optional. Hours may be zero or decimal, up to 1,000 per task. Titles are limited to 160 characters, categories to 100, and notes to 1,000.

Dates use the student's local calendar. A task becomes overdue the day after its due date. Completed tasks never count as overdue or contribute to remaining workload. Upcoming includes today and every later due date. Sort by deadline or priority; completed tasks follow unfinished tasks. Sorting never changes the student's chosen priority.

Three or more unfinished deadlines across today/tomorrow are labeled **clustered**, never automatically heavy. The seven-day chart flags three deadlines on an individual date and scales bars relative to the largest displayed hour total. Labels show actual hours. Due-date totals are not a work schedule; overdue effort is separate. If you enter available time, the dashboard compares each day's estimate with that day's capacity. Blank means unknown; zero means no available time. A time-total match does not prove a plan is personally feasible. Two calendar dates are not a rolling 48-hour interval.

Each task can have multiple **Must complete first** prerequisites, separate from priority. Unfinished or missing prerequisites are flagged; saving a circular dependency is blocked. Deleting a prerequisite leaves a visible missing-reference warning so you can resolve it. **Duplicate task** opens an independent unfinished draft with a blank due date; edit it before saving. This is not an automatic recurring calendar.

## Week 2 external AI learning cycle

**AI proposes → dashboard checks → student evaluates → student decides.** The dashboard prepares prompts and reviews structured output. It never calls an AI service, embeds credentials, or presents parsing/calculation as AI. Use the instructor's approved external AI tool separately. Its availability, account requirements, usage limits and data policies are separate from this free dashboard; no paid model is required by the application. Do not paste sensitive student information into an external tool. Profile information is not included in generated prompts.

### Prepare AI Task Import

1. Paste relevant syllabus, course schedule, instructor-list or spreadsheet-style text (up to 30,000 characters), then generate and copy the prompt.
2. Paste the prompt into your approved AI tool. Copy its complete JSON response back into **AI task response** and select **Review proposed tasks**. Students copy structured text; they do not need to write code.
3. Check each proposal's source, date/year, estimated hours, suggested priority, assumptions and dependencies. Missing/invalid dates, unusual effort, possible duplicate titles and inferred fields need review. Edit the fields as necessary.
4. Check the review acknowledgment and approve individual tasks, approving prerequisites first. Reject unwanted proposals. Nothing enters Planner until approved.

The prompt supplies the exact response format: a `tasks` list with unique temporary IDs, title, category, dueDate (`YYYY-MM-DD` or null), hours (number or null), priority, notes, dependencies (temporary IDs), source excerpt and assumptions. The importer remaps temporary IDs to local task IDs. Imports accept up to 100 proposals and 100,000 response characters. Markdown JSON fences are accepted; malformed JSON is rejected with an explanation. Ask the external AI to correct format errors. A possible duplicate warning is based on a matching title and is not a guarantee that every duplicate will be detected.

### Prepare AI Planning Prompt

1. Select unfinished tasks; their prerequisites and completion status are included automatically. Enter available hours today and tomorrow (0–24 each), or leave unknown values blank.
2. Generate and copy the planning prompt. It includes current task IDs, due dates/status, student priorities, effort and dependencies, and asks for a justified sequence, assumptions and unscheduled work.
3. Paste the external AI's complete JSON response into **AI planning response**, then select **Review AI recommendation**. The expected fields are `sequence` (taskId, day: today/tomorrow, reason), `assumptions`, and `unscheduled` (taskId, reason). Invented, repeated or completed task IDs are rejected. Omitted unfinished work is explicitly listed for review.
4. Compare the unchanged **AI recommendation** with **Review your plan**. Reorder steps, change days/reasons, exclude or include work. Inspect dependency-order, deadline and capacity checks. Explain your decision, acknowledge the review, then save your accepted plan or reject the recommendation.

These decisions never change task priorities, deadlines, dependencies or other task details. Plans use each task's full estimated remaining hours; there is no task splitting, automatic scheduling, chatbot or recurring engine. Warnings support judgment and can be overridden with an explicit acknowledgment and explanation.

The latest prepared prompt/task snapshot, original recommendation and saved student decision/explanation remain locally available. This is a small latest-record review, not a history or audit system: preparing a new planning prompt replaces the previous recommendation/decision; importing a new response starts a new decision review. Task/date/capacity changes display **Needs review**. Acknowledging that notice does not rewrite the original AI context; prepare a fresh prompt for an up-to-date recommendation. Available hours expire when the local calendar date changes. Home displays the same task data and a concise planning summary.

## Storage and structure

- `src/App.jsx`: existing Home/Profile, shared course shell, and fragment navigation.
- `src/Planner.jsx`: Planner forms, task list, and planning overview.
- `src/planner.js`: validation, local date calculations, workload rules, and task persistence.
- `src/useDashboardData.js`: shared Home/Planner state and guarded local review persistence.
- `src/AITaskImport.jsx` and `src/AIPlanning.jsx`: external AI prompt and student-review flows.
- `src/PlanningControls.jsx` and `src/PlanningSummary.jsx`: shared controls and Home/capacity overview.
- `src/planningSupport.js`: structured import validation, dependencies, snapshots, prompts, and capacity/sequence checks.
- `src/styles.css`: shared branding, accessible controls, and responsive layouts.
- `src/App.test.jsx`, `src/Planner.test.jsx`, `src/AIWorkflows.test.jsx`, and `src/planningSupport.test.js`: Week 1 regression and Week 2 tests.

The original profile key remains `ai-managers-student-profile`. Tasks keep `ai-managers-student-tasks-v1` and the version-1 envelope; older tasks load with no prerequisites. New review keys are `ai-managers-task-import-review-v1` and `ai-managers-planning-review-v1`. Prepared prompts/proposal edits and saved decisions persist. Unsaved manual task edits, unprepared source/response typing and student-plan drafts do not survive a reload. Save failures display an error; unreadable records are left untouched and affected save controls are disabled until recovered. Future modules can add their own React component and storage key without replacing Profile.

Dashboard data stays in the same browser profile on the same website origin. It does not sync across tabs or devices. Clearing browser site data removes saved records. Moving from localhost to a hosted address does not transfer the local data. The AI proposal importer is not a backup/restore tool. Copying a prompt to an external AI service shares the included information with that service.

## GitHub and the public dashboard

- Repository: https://github.com/ShannonC320/ai-for-managers-student-dashboard
- GitHub Pages address: https://shannonc320.github.io/ai-for-managers-student-dashboard/
- Home: https://shannonc320.github.io/ai-for-managers-student-dashboard/#/home
- Profile: https://shannonc320.github.io/ai-for-managers-student-dashboard/#/profile
- Planner: https://shannonc320.github.io/ai-for-managers-student-dashboard/#/tasks

The dashboard is deployed through GitHub Pages. The repository and website are public. Each visitor's profile and tasks remain only in that visitor's browser; they are never committed to Git or uploaded to GitHub.

Vite's `base` is `/ai-for-managers-student-dashboard/`, so generated assets load from the repository's Pages path. Keep the existing fragment routes (`#/home`, `#/profile`, `#/tasks`); do not replace them with server-dependent routes. The app uses system fonts and has no runtime backend or external API.

## One-time deployment configuration

In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The checked-in `.github/workflows/deploy.yml` uses standard GitHub-hosted Linux runners to install the locked dependencies, run the tests, build the site, and publish `dist/`. It uses GitHub's built-in workflow token; no personal access token or paid service is required. Public repositories and standard Actions runners support this course use on GitHub Free.

Pushes to `main` deploy automatically after tests and build succeed. Pull requests targeting `main` run the checks without publishing. The workflow can also be run manually from **Actions → Test, build, and deploy dashboard → Run workflow**, selecting `main`. A failed test/build prevents that version from being published; the last successful deployment remains available.

Do not commit `node_modules/`, `dist/`, credentials, or browser data. Keep `pnpm-lock.yaml` committed and avoid regenerating it unless intentionally changing dependencies.

## Update the same dashboard for Weeks 3–7

Continue working in this existing project and repository. Do not create a new repository or Pages site each week.

1. Start with a clean working tree (`git status`); commit existing work before pulling. Run `git switch main` and `git pull --ff-only origin main`.
2. Add the next week's approved capability while preserving prior weeks and browser-storage keys.
3. Run `pnpm test` and `pnpm build`. Optionally run `pnpm exec vite preview` and open the printed address with `/ai-for-managers-student-dashboard/` to inspect the built version.
4. Review `git diff` and `git status`, then commit and push:

   ```sh
   git add src README.md
   git commit -m "Add Week 3 capability"
   git push origin main
   ```

   Stage any other intentional files explicitly if that week's work changes them. For team review, work on a feature branch and open a pull request into `main`; merging it triggers the same deployment.
5. Open the repository's **Actions** tab and wait for the workflow to succeed. Visit the same public dashboard URL, refresh, and check Home, Profile, and Planner along with the new capability.

If a push is rejected because someone else updated `main`, stop and reconcile those changes; do not force-push over your team's work. A normal deployment updates the application files, not users' saved browser records. Changing the website origin or clearing browser site data will not preserve local records automatically.

## Hosted verification

After updates, verify direct links and refresh on all three routes in a normal browser. Test profile/goals, task changes, both AI review flows and saved decisions, then refresh and check the browser console. Safari/iOS and Android date pickers and accessibility behavior should also be checked on the devices students use. See `VERIFICATION.md` for recorded checks and the student-builder pilot checklist.
