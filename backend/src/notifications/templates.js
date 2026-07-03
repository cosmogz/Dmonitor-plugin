/**
 * Notification message templates.
 *
 * render(template, data) replaces {{key}} placeholders with values from data.
 * buildMessage(channel, rule, patient) returns a {subject, body} object.
 */

const TEMPLATES = {
  email: {
    subject: '[Dmonitor] Alert: {{type}} for patient {{patient_id}}',
    body: [
      'Patient ID : {{patient_id}}',
      'Alert type : {{type}}',
      'Severity   : {{severity}}',
      'Message    : {{message}}',
      'Alert ID   : {{alertId}}',
      '',
      'Log in to Dmonitor to review and resolve this alert.',
    ].join('\n'),
  },
  sms: {
    body: '[Dmonitor] {{severity_upper}} alert for patient {{patient_id}}: {{message}}',
  },
  webhook: {
    // webhook delivers the raw JSON payload; no text template needed
    body: null,
  },
};

/**
 * Replace {{key}} tokens in a template string using values from the data object.
 * Missing keys are left as-is.
 */
function render(template, data) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? String(data[key]) : `{{${key}}}`
  );
}

/**
 * Build the notification message for a given channel.
 * @param {string} channel  - 'email' | 'sms' | 'webhook'
 * @param {object} rule     - { type, severity, message }
 * @param {number} patientId
 * @param {number} alertId
 * @returns {{ subject?: string, body: string | null }}
 */
function buildMessage(channel, rule, patientId, alertId) {
  const data = {
    type: rule.type || '',
    severity: rule.severity || '',
    severity_upper: (rule.severity || '').toUpperCase(),
    message: rule.message || '',
    patient_id: patientId,
    alertId: alertId || '',
  };
  const tmpl = TEMPLATES[channel] || TEMPLATES.webhook;
  return {
    subject: tmpl.subject ? render(tmpl.subject, data) : undefined,
    body: tmpl.body ? render(tmpl.body, data) : null,
  };
}

module.exports = { render, buildMessage };
