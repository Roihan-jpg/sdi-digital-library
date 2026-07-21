import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reportFilterSchema, reportKindSchema, schoolIdentitySchema } from './report.schema.js';

describe('report validation', () => {
  it('accepts supported reports and rejects reversed periods', () => {
    assert.equal(reportKindSchema.parse('digital-activity'), 'digital-activity');
    assert.throws(() => reportKindSchema.parse('secret-configuration'));
    assert.throws(() => reportFilterSchema.parse({ from: '2026-07-20', to: '2026-07-01' }));
  });
  it('normalizes optional school identity values', () => {
    const value = schoolIdentitySchema.parse({ schoolName: 'SD Islam Tompokersan', schoolAddress: '', schoolPhone: '', schoolEmail: '', schoolLogoPath: '' });
    assert.equal(value.schoolAddress, null);
    assert.equal(value.schoolEmail, null);
  });
});
