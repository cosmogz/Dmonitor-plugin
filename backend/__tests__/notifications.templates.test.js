const { render, buildMessage } = require('../src/notifications/templates');

describe('notification templates', () => {
  describe('render()', () => {
    test('replaces {{key}} tokens', () => {
      expect(render('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
    });

    test('leaves missing keys as-is', () => {
      expect(render('Value: {{missing}}', {})).toBe('Value: {{missing}}');
    });

    test('returns empty string for falsy template', () => {
      expect(render(null, {})).toBe('');
      expect(render('', {})).toBe('');
    });

    test('handles multiple tokens', () => {
      const result = render('{{a}}-{{b}}-{{a}}', { a: 'X', b: 'Y' });
      expect(result).toBe('X-Y-X');
    });
  });

  describe('buildMessage()', () => {
    const rule = { type: 'hypoglycemia', severity: 'warning', message: 'Glucose low: 60 mg/dL' };

    test('email includes subject and body', () => {
      const msg = buildMessage('email', rule, 42, 7);
      expect(msg.subject).toContain('hypoglycemia');
      expect(msg.subject).toContain('42');
      expect(msg.body).toContain('60 mg/dL');
      expect(msg.body).toContain('Patient ID');
    });

    test('sms body is short and includes severity', () => {
      const msg = buildMessage('sms', rule, 42, 7);
      expect(msg.subject).toBeUndefined();
      expect(msg.body).toContain('WARNING');
      expect(msg.body).toContain('42');
      expect(msg.body).toContain('60 mg/dL');
    });

    test('webhook returns null body', () => {
      const msg = buildMessage('webhook', rule, 42, 7);
      expect(msg.body).toBeNull();
    });

    test('critical severity uppercase in sms', () => {
      const critRule = { type: 'severe_hypoglycemia', severity: 'critical', message: 'Glucose critically low' };
      const msg = buildMessage('sms', critRule, 1, 1);
      expect(msg.body).toContain('CRITICAL');
    });
  });
});
