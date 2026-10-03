/** Built-in notification template keys (seeded as demos when missing). */
export const DEFAULT_TEMPLATES = [
  {
    key: 'system.welcome',
    channel: 'in_app',
    subject: 'Welcome',
    body: 'Welcome to {{clubName}}.',
    active: true,
    isDemo: true,
  },
  {
    key: 'membership.expiring_7d',
    channel: 'email',
    subject: 'Membership expiring in 7 days',
    body: 'Hi {{name}}, your membership expires on {{endDate}}.',
    active: true,
    isDemo: true,
  },
];

/**
 * Very small mustache-like replace: {{key}}
 * @param {string} template
 * @param {Record<string, unknown>} data
 */
export function renderTemplate(template, data = {}) {
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const val = data[key];
    return val == null ? '' : String(val);
  });
}

export default { DEFAULT_TEMPLATES, renderTemplate };
