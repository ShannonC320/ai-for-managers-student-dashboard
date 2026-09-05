# Week 2 verification — September 5, 2026

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
