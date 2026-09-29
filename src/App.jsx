import { useEffect, useState } from 'react';
import Planner from './Planner.jsx';
import Research from './Research.jsx';
import Analysis from './Analysis.jsx';
import Workflows from './Workflows.jsx';
import Grace from './Grace.jsx';
import FinalIntegration from './FinalIntegration.jsx';
import useDashboardData from './useDashboardData.js';
import PlanningSummary from './PlanningSummary.jsx';
import { LANGUAGE_KEY, readLanguage, setLanguage, t } from './i18n.js';

export const STORAGE_KEY = 'ai-managers-student-profile';

const emptyProfile = {
  name: '',
  major: '',
  academicYear: '',
  goals: [''],
};

const academicYears = ['First year', 'Sophomore', 'Junior', 'Senior', 'Other'];

function pageFromLocation() {
  const page = window.location.hash.slice(2);
  return ['home', 'profile', 'tasks', 'research', 'analysis', 'workflows', 'assistant', 'final'].includes(page) ? page : 'home';
}

function readProfile() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyProfile;
    const profile = JSON.parse(saved);
    return {
      name: typeof profile.name === 'string' ? profile.name : '',
      major: typeof profile.major === 'string' ? profile.major : '',
      academicYear: typeof profile.academicYear === 'string' ? profile.academicYear : '',
      goals:
        Array.isArray(profile.goals) &&
        profile.goals.some(goal => typeof goal === 'string')
          ? profile.goals.filter(goal => typeof goal === 'string')
          : [''],
    };
  } catch {
    return emptyProfile;
  }
}

function Home({ profile, onOpenProfile, onOpenPlanner, dashboard }) {
  const firstName = profile.name.trim().split(/\s+/)[0];

  return (
    <main className="page" id="main-content" tabIndex="-1">
      <section className="welcome-card">
        <div className="eyebrow">{t("AI for Managers · Your course workspace")}</div>
        <h1>{firstName ? t(`Welcome, ${firstName}.`) : t('Welcome to your dashboard.')}</h1>
        <p>{t("Keep your academic goals in view and turn upcoming assignments into a manageable plan. Your workspace grows with you throughout the seven-week course.")}</p>
        <p>{t("Start with Profile, then add your work in Planner. Use Research to check claims, Analysis to review evidence, Workflows to test automation, and Grace to practice asking a bounded assistant.")}</p>
        <button
          className="primary-button"
          type="button"
          onClick={onOpenProfile}
        >
          {profile.name ? t('View your profile') : t('Set up your profile')}
        </button>
      </section>

      <PlanningSummary
        dashboard={dashboard}
        onOpenPlanner={onOpenPlanner}
      />

      <section
        className="foundation-card"
        aria-labelledby="foundation-title"
      >
        <div className="card-icon" aria-hidden="true">01</div>
        <div>
          <h2 id="foundation-title">{t("A foundation built to grow")}</h2>
          <p>{t("Add your academic information and goals in Profile. Your details stay in this browser on this device.")}</p>
        </div>
      </section>

      <section className="foundation-card planner-home-card">
        <div className="card-icon" aria-hidden="true">02</div>
        <div>
          <div className="eyebrow">{t("Planning, Priorities & Workload")}</div>
          <h2>{t("Build your next plan")}</h2>
          <p>{t("Bring deadlines, priorities, and estimated effort together. Spot busy days and decide what needs your attention first.")}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenPlanner}
          >{t("Open Planner")}</button>
        </div>
      </section>
    </main>
  );
}

function Profile({ profile, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [isEditing, setIsEditing] = useState(!profile.name);
  const [savedMessage, setSavedMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => setDraft(profile), [profile]);

  function updateField(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  }

  function updateGoal(index, value) {
    setDraft({
      ...draft,
      goals: draft.goals.map((goal, i) => (i === index ? value : goal)),
    });
  }

  function addGoal() {
    setDraft({ ...draft, goals: [...draft.goals, ''] });
  }

  function removeGoal(index) {
    const goals = draft.goals.filter((_, i) => i !== index);
    setDraft({ ...draft, goals: goals.length ? goals : [''] });
  }

  function saveProfile(event) {
    event.preventDefault();

    const cleaned = {
      ...draft,
      name: draft.name.trim(),
      major: draft.major.trim(),
      goals: draft.goals.map(goal => goal.trim()).filter(Boolean),
    };

    if (!cleaned.name || !cleaned.major || !cleaned.academicYear) {
      setSaveError(
        'Enter your name, major, and academic year. Spaces alone do not count.'
      );
      return;
    }

    if (!cleaned.goals.length) cleaned.goals = [''];

    if (!onSave(cleaned)) {
      setSaveError(
        'Your profile could not be saved. Check browser storage or available space and try again.'
      );
      return;
    }

    setSaveError('');
    setDraft(cleaned);
    setIsEditing(false);
    setSavedMessage('Profile saved in this browser.');
  }

  if (!isEditing) {
    const goals = profile.goals.filter(Boolean);

    return (
      <main className="page" id="main-content" tabIndex="-1">
        <div className="page-heading">
          <div>
            <div className="eyebrow">{t("Student profile")}</div>
            <h1>{t("Your academic snapshot")}</h1>
            <p>{t("Basic information that helps make this dashboard yours.")}</p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setSavedMessage('');
              setIsEditing(true);
            }}
          >{t("Edit profile")}</button>
        </div>

        {savedMessage && (
          <p className="success-message" role="status">
            {t(savedMessage)}
          </p>
        )}

        <section className="profile-card">
          <div className="profile-initial" aria-hidden="true">
            {profile.name.charAt(0).toUpperCase() || t('S')}
          </div>

          <div className="profile-name">
            <span>{t("Student")}</span>
            <h2>{profile.name || t('Name not added')}</h2>
          </div>

          <dl className="details-grid">
            <div>
              <dt>{t("Major")}</dt>
              <dd>{profile.major || t('Not added')}</dd>
            </div>
            <div>
              <dt>{t("Academic year")}</dt>
              <dd>{profile.academicYear ? t(profile.academicYear) : t('Not added')}</dd>
            </div>
          </dl>

          <div className="goals-display">
            <h3>{t("Academic goals")}</h3>
            {goals.length ? (
              <ul>
                {goals.map((goal, index) => (
                  <li key={`${goal}-${index}`}>{goal}</li>
                ))}
              </ul>
            ) : (
              <p>{t("No goals added yet.")}</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page" id="main-content" tabIndex="-1">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">{t("Student profile")}</div>
          <h1>{profile.name ? t('Edit your profile') : t('Create your profile')}</h1>
          <p>{t("Add the basics below. You can return and change them at any time.")}</p>
        </div>
      </div>

      {saveError && (
        <p className="error-message" role="alert">
          {t(saveError)}
        </p>
      )}

      <form className="profile-form" onSubmit={saveProfile}>
        <div className="form-grid">
          <label>{t("Full name")}<input
              name="name"
              value={draft.name}
              onChange={updateField}
              placeholder={t("e.g., Jordan Lee")}
              required
            />
          </label>

          <label>{t("Major")}<input
              name="major"
              value={draft.major}
              onChange={updateField}
              placeholder={t("e.g., Business Administration")}
              required
            />
          </label>

          <label>{t("Academic year")}<select
              name="academicYear"
              value={draft.academicYear}
              onChange={updateField}
              required
            >
              <option value="">{t("Select your year")}</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{t(year)}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="goals-fieldset">
          <legend>{t("Academic goals")}</legend>
          <p className="field-help">{t("Add short statements about what you hope to achieve academically.")}</p>

          {draft.goals.map((goal, index) => (
            <div className="goal-row" key={index}>
              <label
                className="sr-only"
                htmlFor={`goal-${index}`}
              >{t("Academic goal ")}{index + 1}
              </label>

              <input
                id={`goal-${index}`}
                value={goal}
                onChange={event => updateGoal(index, event.target.value)}
                placeholder={t("e.g., Become more confident evaluating AI tools")}
                maxLength="140"
              />

              <button
                className="remove-button"
                type="button"
                onClick={() => removeGoal(index)}
                aria-label={t(`Remove goal ${index + 1}`)}
              >{t("Remove")}</button>
            </div>
          ))}

          <button
            className="add-button"
            type="button"
            onClick={addGoal}
          >{t("+ Add another goal")}</button>
        </fieldset>

        <div className="form-actions">
          {profile.name && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setDraft(profile);
                setSaveError('');
                setIsEditing(false);
              }}
            >{t("Cancel")}</button>
          )}

          <button className="primary-button" type="submit">{t("Save profile")}</button>
        </div>
      </form>
    </main>
  );
}

export default function App() {
  const [language, updateLanguage] = useState(readLanguage);
  const [languageError, setLanguageError] = useState('');
  const [activePage, setActivePage] = useState(pageFromLocation);
  const [profile, setProfile] = useState(readProfile);
  const dashboard = useDashboardData();

  useEffect(() => {
    if (
      !['#/home', '#/profile', '#/tasks', '#/research', '#/analysis', '#/workflows', '#/assistant', '#/final'].includes(
        window.location.hash
      )
    ) {
      window.history.replaceState(null, '', '#/home');
    }

    function followBrowserHistory() {
      if (window.location.hash === '#main-content') return;
      setActivePage(pageFromLocation());
    }

    window.addEventListener('popstate', followBrowserHistory);
    window.addEventListener('hashchange', followBrowserHistory);

    return () => {
      window.removeEventListener('popstate', followBrowserHistory);
      window.removeEventListener('hashchange', followBrowserHistory);
    };
  }, []);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    document.title = `${t(
      activePage === 'final' ? 'Final Integration' : activePage === 'assistant' ? 'AI Assistant' : activePage === 'workflows' ? 'Workflows' : activePage === 'analysis' ? 'Analysis' : activePage === 'tasks'
        ? 'Planner'
        : activePage === 'research'
          ? 'Research'
          : activePage === 'profile'
            ? 'Profile'
            : 'Home'
    )} | ${t('AI for Managers Student Dashboard')}`;

  }, [activePage, language]);
  useEffect(() => { document.getElementById('main-content')?.focus(); }, [activePage]);

  function navigate(page) {
    if (page === activePage) return;
    window.history.pushState(null, '', `#/${page}`);
    setActivePage(page);
  }

  function saveProfile(nextProfile) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextProfile)
      );
      setProfile(nextProfile);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={event => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >{t("Skip to main content")}</a>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">{t("AI")}</div>
          <div>
            <span>{t("AI for Managers")}</span>
            <strong>{t("Student Dashboard")}</strong>
          </div>
        </div>

        <nav aria-label={t("Main navigation")}>
          <button
            className={activePage === 'home' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('home')}
            aria-current={activePage === 'home' ? 'page' : undefined}
          >
            <span aria-hidden="true">⌂</span>{t(" Home")}</button>

          <button
            className={activePage === 'profile' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('profile')}
            aria-current={activePage === 'profile' ? 'page' : undefined}
          >
            <span aria-hidden="true">○</span>{t(" Profile")}</button>

          <button
            className={activePage === 'tasks' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('tasks')}
            aria-current={activePage === 'tasks' ? 'page' : undefined}
          >
            <span aria-hidden="true">☷</span>{t(" Planner / Tasks")}</button>

          <button
            className={activePage === 'research' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('research')}
            aria-current={activePage === 'research' ? 'page' : undefined}
          >
            <span aria-hidden="true">🔍</span>{t(" Research")}</button>
          <button
            className={activePage === 'analysis' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('analysis')}
            aria-current={activePage === 'analysis' ? 'page' : undefined}
          >
            <span aria-hidden="true">▤</span>{t(" Analysis")}</button>
          <button
            className={activePage === 'workflows' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('workflows')}
            aria-current={activePage === 'workflows' ? 'page' : undefined}
          >
            <span aria-hidden="true">⇄</span>{t(" Workflows")}</button>
          <button className={activePage === 'assistant' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('assistant')} aria-current={activePage === 'assistant' ? 'page' : undefined}><span aria-hidden="true">🗨</span>{t("AI Assistant")}</button>
          <button className={activePage === 'final' ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('final')} aria-current={activePage === 'final' ? 'page' : undefined}><span aria-hidden="true">✓</span>{t('Final Integration')}</button>
        </nav>

        <div className="week-badge">
          <span>{t("Course workspace")}</span>
          <strong>{t("Weeks 1–7 of 7")}</strong>
        </div>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <label className="language-control">{t("English / Español")}<select aria-label={t("Interface language")} value={language} onChange={event => {
              const next = event.target.value;
              setLanguage(next); updateLanguage(next);
              try { localStorage.setItem(LANGUAGE_KEY, next); setLanguageError(''); }
              catch { setLanguageError('Language changed for this visit, but could not be saved in this browser.'); }
            }}><option value="en" lang="en">{t("English")}</option><option value="es" lang="es">{t("Español")}</option></select>
          </label>
          <span className="header-location">{t("Student workspace ")}<span aria-hidden="true">/</span>{' '}
            <strong>
              {activePage === 'final' ? t('Final Integration') : activePage === 'assistant' ? t('AI Assistant') : activePage === 'workflows' ? t('Workflows') : activePage === 'analysis' ? t('Analysis') : activePage === 'home'
                ? t('Home')
                : activePage === 'profile'
                  ? t('Profile')
                  : activePage === 'research'
                    ? t('Research')
                    : t('Planner')}
            </strong>
          </span>

          <button
            className="student-chip"
            type="button"
            onClick={() => navigate('profile')}
            aria-label={t(`Open profile for ${profile.name || 'Student'}`)}
          >
            <span aria-hidden="true">
              {profile.name.charAt(0).toUpperCase() || t('S')}
            </span>
            {profile.name || t('Student')}
          </button>
        </header>
        {languageError && <p role="alert" className="error-message">{t(languageError)}</p>}

        {activePage === 'home' ? (
          <Home
            profile={profile}
            dashboard={dashboard}
            onOpenProfile={() => navigate('profile')}
            onOpenPlanner={() => navigate('tasks')}
          />
        ) : activePage === 'profile' ? (
          <Profile profile={profile} onSave={saveProfile} />
        ) : activePage === 'tasks' ? (
          <Planner dashboard={dashboard} />
        ) : activePage === 'analysis' ? (
          <Analysis dashboard={dashboard} />
        ) : activePage === 'final' ? (
          <FinalIntegration />
        ) : activePage === 'assistant' ? (
          <Grace />
        ) : activePage === 'workflows' ? (
          <Workflows dashboard={dashboard} />
        ) : (
          <Research
            records={dashboard.records}
            saveRecords={dashboard.saveResearchRecords}
            researchError={dashboard.researchError}
          />
        )}
      </div>
    </div>
  );
}
