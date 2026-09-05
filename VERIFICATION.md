# Bounded Week 2 AI-supported planning revision — September 5, 2026

## Current automated and build results

**51 tests pass across four Vitest files.** All original 28 regression cases remain; two assertions were updated only for the intentionally replaced heavy-workload rule. Vite production build passes. No dependency or lockfile changes, paid services, external API calls, credentials, backend, authentication or Week 3 features were added.

Coverage includes Week 1 fields/goals/edit/save/cancel/persistence/navigation; all existing task CRUD/filter/sort/date validation; prompt generation and prerequisite closure; proposal parsing/edit/reject/approve; missing/invalid fields and duplicate-title warnings; dependency creation/cycles/missing references; independent duplication; unknown/zero/known capacity; sequence/deadline conflicts; invented/duplicate/completed plan IDs; omissions; original AI vs student order; reordering/exclusion/inclusion/reasons; explicit acceptance/rejection; stale recommendations; Home totals; legacy storage; reload/remount persistence; corrupt records and failed writes.

## Current browser results

Interactive development-browser checks used explicitly labeled QA samples, not a live external AI model. The existing Jane Smith profile remained intact. The sample proposal import saved nothing before approval; source/notes editing, prerequisite-first approval and rejection worked. A deliberately flawed sample recommendation scheduled dependent work first and 2.5 hours into a 2-hour budget; the dashboard flagged both conflicts. The student reordered work and moved the dependent task to tomorrow, saved an explanation/decision, then loaded a fresh document on the same origin. Original AI order and saved student plan persisted separately. Editing the task's effort produced **Needs review** in Planner and Home.

Populated review screens fit 1440px desktop, 390px phone and 320px narrow-phone viewports, with no horizontal document overflow. The narrow layouts stack AI and student panels; controls remain separate and labeled. These are Chromium viewport checks, not physical-device or full accessibility certification.

The old 8-hour/3-task heavy-workload claim is removed. Three deadlines are explicitly clustered; capacity comparisons use supplied daily hours or state that available time is unknown. No recommendation silently edits task fields. New review records retain only the latest exchange and decision, not a complete history.

## Public deployment of this revision

- Application commit: `4dbd4e9` — pushed to the existing `main` branch.
- Successful test/build/deploy run: https://github.com/ShannonC320/ai-for-managers-student-dashboard/actions/runs/33998163841
- Same public site: https://shannonc320.github.io/ai-for-managers-student-dashboard/
- An independent HTTPS request returned 200 and the new repository-prefixed assets (`index-BNVrwgyk.js`, `index-CnmE1mdt.css`). No Pages/workflow settings needed changing.
- Public Chromium checks preserved the previous QA profile, two goals and legacy completed task. Profile goal add/remove/edit/save and full page navigation confirmed persistence.
- On the public site, generated/copied an import prompt, approved sample proposals with a prerequisite, generated a planning prompt, imported a deliberately flawed sample plan, observed dependency/capacity warnings, reordered/moved work, and saved a student explanation. A fresh document load retained original AI order and the distinct approved plan.
- Completing the prerequisite and editing effort/priority triggered **Needs review**. Duplicate opened an independent draft requiring a new date; cancel left the original intact. Home reflected the revised shared data. Direct Home/Profile/Planner document navigation worked.
- The production console log was empty after these checks. Hosted content also showed no horizontal overflow at the available 459px content width. Broader 320/390/1440 checks were performed locally as described above.
- Samples exist only in the QA browser's local storage; none are seeded in source or distributed to students. External AI response fixtures test software behavior, not the quality of a live model.

## Student-builder pilot required before course acceptance

1. In your normal browser, verify your existing name, major, year and multiple goals; edit/save and refresh. Verify old tasks still exist.
2. Use **Prepare AI Task Import** with a real, non-sensitive assignment excerpt and your course-approved external AI tool. Include one ambiguous date or missing estimate. Check that you can copy/paste without writing JSON yourself; evaluate every source/date/estimate/priority/dependency flag, edit one proposal, reject one and approve another. Confirm nothing is silently saved.
3. Link a lower-priority reading as a prerequisite of higher-priority work. Try a circular link and resolve it. Duplicate an assignment, change its due date/details, and confirm the original remains unchanged.
4. Use **Prepare AI Planning Prompt** with a realistic today/tomorrow time budget. Inspect what will be shared, obtain a real AI response, and judge whether its reasoning, assumptions and unscheduled work are useful. Compare importance with sequence; do not assume AI order is correct.
5. Reorder/exclude/revise a recommendation and save an explanation. Confirm original AI output stays separate; refresh. Try rejection too. Change task hours/deadline/completion and confirm **Needs review** appears.
6. Compare three tasks totaling 2.5 hours against blank, zero, 2-hour and 3-hour availability. Check clustered deadlines versus effort, and remember due-date buckets are not a work schedule. Check overdue work and Home totals.
7. Use direct Home/Profile/Planner links and refresh on the public site. Check Safari/iOS or Android, keyboard-only navigation, screen-reader announcements and 200% zoom on target devices.

The software tests exercise representative structured responses. They cannot establish the quality of a particular external model's recommendations or replace this instructional pilot. External-tool accounts, limits and privacy policies remain separate from the dashboard. Browser-local data has no backup or cross-device/multi-tab synchronization; QA records are local browser samples, not shipped defaults.

## Historical baseline verification

The sections below record the original implementation and first deployment. Their old workload thresholds and then-outstanding deployment checks are historical and are superseded by the bounded revision above.

# Original Week 2 verification — September 5, 2026

## Automated checks

28 Vitest tests pass across `src/App.test.jsx` and `src/Planner.test.jsx`.

- Week 1: Home, Profile, all academic fields, multiple goals, removing the final goal, edit/cancel/save, persistence across remounts, personalized greeting, identity shortcut, and navigation/history.
- Week 2: add, edit, complete, reopen, cancel deletion, confirm deletion, persistence across remounts, and unchanged profile storage.
- Views: upcoming includes today, overdue excludes completed tasks, completed filtering, and sorting without modifying priorities.
- Workload: totals, decimal hours, exact 8-hour and 3-deadline boundaries, completed exclusions, overdue totals, and seven-day aggregation.
- Dates: month/year rollover, leap days, daylight-saving calendar arithmetic, invalid dates, and due-today status.
- Inputs: blank/whitespace title, required fields, zero and fractional hours, invalid/negative/nonfinite/oversized hours, field limits, Unicode and literal markup.
- Resilience: failed profile/task writes retain drafts and existing data; corrupt task storage is not overwritten; malformed profile fields do not crash rendering.

The Vite production build succeeds. No dependencies were added or updated.

## Browser checks

Checked in the Codex in-app Chromium browser using the development server and a separate production preview origin.

- Home and Profile displayed the existing saved student profile; the profile was not changed during browser QA.
- Checked desktop (1440px), phone (390px), and narrow phone (320px) layouts, including Profile editing and the Planner form. Also inspected Home at 768px.
- Fixed a narrow-phone horizontal scrollbar caused by the original body minimum width. Profile editing and Planner document widths now match the available 305px content width in a 320px viewport with a scrollbar.
- Native required-field validation blocked an empty task form. Native calendar selection and manual priority selection worked.
- In the isolated production preview at port 4173, saved a clearly labeled QA task, refreshed the actual page, and verified persistence and the 8-hour workload flag.
- Completed the task and verified the workload flag cleared. Edited its priority and hours, refreshed, and verified the edited values and completed status persisted.
- Confirmed populated Planner content fits a 390px viewport without horizontal overflow.
- No production-preview console errors or warnings were recorded. An earlier development import error was fixed before the final browser checks.

The isolated production-preview browser storage contains one completed QA sample. It is not seeded in the application, is not included in the build, and does not affect the existing student data at port 5173 or any future hosted origin.

## Remaining manual checks before deployment

- Try the intended student browsers, especially Safari/iOS and Android date pickers; only the in-app Chromium browser was exercised here.
- Check keyboard navigation, screen-reader announcements, and 200% zoom on the target devices. This is not a full accessibility audit.
- Review whether the transparent workload thresholds fit the course expectations. They are generic review flags, not individualized capacity calculations.
- Configure the correct GitHub Pages repository base path, then test actual hosted Home/Profile/Planner links and refresh persistence.
- Explain that storage is browser/device/origin-specific, has no cloud backup or multi-tab synchronization, and does not transfer automatically from localhost to a hosted address.

Hosting, GitHub workflows, authentication, AI APIs, and later-week capabilities were not added.

## GitHub Pages deployment verification — September 5, 2026

This later deployment step adds hosting configuration only; the Week 1–2 application source and browser-storage behavior are unchanged.

- Public repository: https://github.com/ShannonC320/ai-for-managers-student-dashboard
- Public dashboard: https://shannonc320.github.io/ai-for-managers-student-dashboard/
- Vite asset base: `/ai-for-managers-student-dashboard/`.
- GitHub Pages source: GitHub Actions. Pushes to `main` test, build, and deploy; pull requests test and build without deploying.
- Original deployment run: https://github.com/ShannonC320/ai-for-managers-student-dashboard/actions/runs/33980933049 — succeeded on attempt 2. The first attempt reached publishing before Pages was enabled; rerunning the failed job after enabling Pages resolved the 404.
- All 28 local tests and the production build passed again. GitHub's fresh Linux install, tests, build, artifact upload, and Pages publishing also succeeded.
- Independent public HTTPS request returned 200 with repository-prefixed JavaScript and CSS asset URLs.
- Interactive checks at the public HTTPS address (not localhost): profile create/edit; multiple goals and removing an empty goal field; saved fields/goals after refresh; personalized Home; task create/edit; manual priority change; decimal hours; completion; workload flag and completed-work exclusion; task persistence after refresh.
- Direct `#/home`, `#/profile`, and `#/tasks` links each rendered correctly after refresh.
- No production console errors or warnings were recorded in the available Chromium browser.
- The public URL was also launched in the user's normal default browser, and the user confirmed: "Yes, it loads correctly." That external window cannot be inspected by the connected browser tools; this confirmation complements the automated public-site checks. Safari/mobile-device checks remain recommended.

The browser used for public-site QA contains a clearly labeled QA profile and one completed QA task in its own local storage. These records are not application defaults, repository contents, or shared team data. Opening the public site in a different browser starts with that browser's own records.
