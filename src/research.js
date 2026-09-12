export const RESEARCH_KEY = 'ai-managers-student-research-v1';
export const VERIFICATION_STATUSES = ['Pending', 'Verified', 'Partly verified', 'Not verified'];

export function makeEmptyRecord() {
  return {
    id: '',
    question: '',
    area: '',
    claim: '',
    source: '',
    sourceUrl: '',
    finding: '',
    status: 'Pending',
  };
}

export function validateResearchRecord(record) {
  if (!record || typeof record !== 'object') return 'Invalid record.';
  if (typeof record.question !== 'string' || !record.question.trim()) return 'Enter a research question or topic.';
  if (typeof record.area !== 'string' || !record.area.trim()) return 'Enter a research area or category.';
  if (typeof record.claim !== 'string' || !record.claim.trim()) return 'Enter a claim to verify.';
  if (typeof record.status !== 'string' || !VERIFICATION_STATUSES.includes(record.status)) return 'Select a valid verification status.';
  if (typeof record.sourceUrl !== 'string') return 'Source URL must be a string.';
  
  if (record.question.trim().length > 500) return 'Research question must be 500 characters or fewer.';
  if (record.area.trim().length > 100) return 'Research area must be 100 characters or fewer.';
  if (record.claim.trim().length > 2000) return 'Claim must be 2,000 characters or fewer.';
  if (record.sourceUrl && record.sourceUrl.trim().length > 500) return 'Source URL must be 500 characters or fewer.';

  // If status is not Pending, source and finding are required
  if (record.status !== 'Pending') {
    if (typeof record.source !== 'string' || !record.source.trim()) return 'Enter verification source information.';
    if (typeof record.finding !== 'string' || !record.finding.trim()) return 'Enter what you found after checking the source.';
    if (record.source.trim().length > 2000) return 'Source information must be 2,000 characters or fewer.';
    if (record.finding.trim().length > 2000) return 'Finding must be 2,000 characters or fewer.';
  } else {
    // Pending records allow empty source and finding, but validate if present
    if (typeof record.source !== 'string') return 'Source must be a string.';
    if (typeof record.finding !== 'string') return 'Finding must be a string.';
    if (record.source && record.source.trim().length > 2000) return 'Source information must be 2,000 characters or fewer.';
    if (record.finding && record.finding.trim().length > 2000) return 'Finding must be 2,000 characters or fewer.';
  }

  return '';
}

export function readResearchRecords() {
  try {
    const saved = window.localStorage.getItem(RESEARCH_KEY);
    if (!saved) return { records: [], error: '' };
    const data = JSON.parse(saved);
    if (data.version !== 1 || !Array.isArray(data.records)) throw new Error('Invalid saved records');
    const ids = new Set();
    for (const record of data.records) {
      if (!record || typeof record.id !== 'string' || !record.id || ids.has(record.id)) throw new Error('Invalid record');
      if (validateResearchRecord(record)) throw new Error('Invalid record');
      ids.add(record.id);
    }
    return { records: data.records, error: '' };
  } catch {
    return { records: [], error: 'Saved research records could not be read. Your stored data has not been replaced. Restore browser storage access or recover the saved data, then reload.' };
  }
}

export function writeResearchRecords(records) {
  window.localStorage.setItem(RESEARCH_KEY, JSON.stringify({ version: 1, records }));
}
