import { t } from './i18n.js';
export default function WorkspaceIntro({ coastal = false, children }) {
  return <section className={`workspace-intro ${coastal ? 'coastal-intro' : ''}`} aria-label={coastal ? t('Coastal Life Management Application') : t('Student Dashboard')}>
    <h2>{coastal ? t('Coastal Life Management Application') : t('Student Dashboard')}</h2>
    <p>{children}</p>
  </section>;
}
