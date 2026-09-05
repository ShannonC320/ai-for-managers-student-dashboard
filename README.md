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

The today-and-tomorrow review flag appears at 8 or more estimated hours OR 3 or more unfinished deadlines across those two calendar dates. Overdue work is reported separately. Each day in the next-seven-days chart uses the same thresholds for that date. Bars show hours relative to 8 hours and stop at that width; labels show the actual total. The chart groups effort by deadline, not by scheduled work time. Two calendar dates are not a rolling 48-hour interval. These are transparent rules, not AI predictions or personalized capacity assessments.

## Storage and structure

- `src/App.jsx`: existing Home/Profile, shared course shell, and fragment navigation.
- `src/Planner.jsx`: Planner forms, task list, and planning overview.
- `src/planner.js`: validation, local date calculations, workload rules, and task persistence.
- `src/styles.css`: shared branding, accessible controls, and responsive layouts.
- `src/App.test.jsx` and `src/Planner.test.jsx`: Week 1 regression and Week 2 tests.

The original profile key remains `ai-managers-student-profile`. Tasks use a separate `ai-managers-student-tasks-v1` key with a versioned data envelope. Save failures preserve the editable draft and display an error. Unreadable task data is left untouched; task creation is disabled until the stored data/access is recovered. Future modules can add their own React component and storage key without replacing Profile.

Data stays in the same browser profile on the same website origin. It does not sync across tabs or devices. Clearing browser site data removes saved records. Moving from localhost to a hosted address does not transfer the local data. There is no backup/import tool in this Week 2 scope. Do not use the planner for sensitive or irreplaceable records.

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

After the first deployment and future updates, verify direct links and refresh on all three routes in a normal browser. Test profile/goals and task changes, save and refresh, and check the browser console. Safari/iOS and Android date pickers and accessibility behavior should also be checked on the devices students use. See `VERIFICATION.md` for the Week 2 implementation checks; it is not proof of a hosted deployment.
