export const WORKFLOWS_KEY = 'ai-managers-student-workflows-v1';

export const HANDLERS = ['Automation', 'AI Support', 'Human'];
export const TEST_SITUATIONS = [
  'Wi-Fi outage',
  'AC failure',
  'Water coming through a ceiling',
  'Broken bedroom lamp',
];
export const TEST_OUTCOMES = [
  'Workflow behaved as intended',
  'Wrong routing',
  'Unclear step',
  'Inappropriate automation',
  'Missing human review',
  'Escalation/control issue',
  'Another exception',
];

export const emptyWorkflows = () => ({
  version: 1,
  workflow: { name: '', purpose: '', steps: [] },
  tests: [],
  evaluation: null,
});

export const emptyStep = () => ({
  id: '', stage: '', action: '', handler: 'Human', humanReview: false, reason: '',
});

export const emptyTest = () => ({
  id: '', situation: '', expected: '', happened: '', outcome: '', managerDecision: '',
});

export const emptyEvaluation = () => ({
  automated: '', humanControl: '', testingRevealed: '', changes: '', rationale: '', acknowledged: false,
});

const strings = (value, keys) => value && keys.every(key => typeof value[key] === 'string');

export function validStep(step) {
  return strings(step, ['id', 'stage', 'action', 'handler', 'reason']) &&
    HANDLERS.includes(step.handler) && typeof step.humanReview === 'boolean' &&
    [step.stage, step.action, step.reason].every(value => value.trim());
}

export function validTest(test) {
  return strings(test, ['id', 'situation', 'expected', 'happened', 'outcome', 'managerDecision']) &&
    TEST_SITUATIONS.includes(test.situation) && TEST_OUTCOMES.includes(test.outcome) &&
    [test.expected, test.happened, test.managerDecision].every(value => value.trim());
}

export function validEvaluation(evaluation) {
  return strings(evaluation, ['automated', 'humanControl', 'testingRevealed', 'changes', 'rationale']) &&
    evaluation.acknowledged === true &&
    ['automated', 'humanControl', 'testingRevealed', 'changes', 'rationale'].every(key => evaluation[key].trim());
}

export function validWorkflows(data) {
  const workflow = data?.workflow;
  return data?.version === 1 && strings(workflow, ['name', 'purpose']) &&
    Array.isArray(workflow.steps) && workflow.steps.every(step => validStep(step) && step.id) &&
    new Set(workflow.steps.map(step => step.id)).size === workflow.steps.length &&
    Array.isArray(data.tests) && data.tests.every(test => validTest(test) && test.id) &&
    new Set(data.tests.map(test => test.id)).size === data.tests.length &&
    (data.evaluation === null || validEvaluation(data.evaluation));
}

export function readWorkflows() {
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY);
    const data = raw ? JSON.parse(raw) : emptyWorkflows();
    if (!validWorkflows(data)) throw new Error('Invalid saved data');
    return { data, error: '' };
  } catch {
    return {
      data: emptyWorkflows(),
      error: 'Saved Workflows data could not be read. It has not been overwritten. Restore browser storage access or recover the data, then reload.',
    };
  }
}

export function workflowPrompt(workflow) {
  const steps = workflow.steps.map((step, index) =>
    `${index + 1}. ${step.stage}\nWhat happens: ${step.action}\nHandled by: ${step.handler}\nHuman review: ${step.humanReview ? 'Yes' : 'No'}\nWhy: ${step.reason}`
  ).join('\n\n');
  return `Review this proposed Coastal Life Guest Issue Response Workflow.\n\nWorkflow name: ${workflow.name}\nPurpose: ${workflow.purpose}\n\nOrdered steps:\n${steps}\n\nIdentify possible:\n- automation opportunities;\n- unnecessary or risky automation;\n- places AI support could add value;\n- unclear workflow steps;\n- missing human-review or approval points;\n- exception or escalation risks;\n- missing steps or control weaknesses.\n\nAI is reviewing and proposing, not making the final management decision. Do not rewrite the workflow or assume every step should be automated. Clearly distinguish suggestions from established facts and explain the reasoning for each suggestion. The student will evaluate the suggestions and decide whether to edit the workflow.`;
}
