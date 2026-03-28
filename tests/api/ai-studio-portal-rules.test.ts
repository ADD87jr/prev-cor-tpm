import { describe, it, expect } from 'vitest';
import { isPortalFeedbackAllowed } from '@/lib/ai-studio/portalRules';

describe('AI Studio portal feedback rules', () => {
  it('allows approve only when offer is sent', () => {
    expect(isPortalFeedbackAllowed('sent', 'approve')).toBe(true);
    expect(isPortalFeedbackAllowed('draft', 'approve')).toBe(false);
    expect(isPortalFeedbackAllowed('accepted', 'approve')).toBe(false);
  });

  it('allows reject only when offer is sent', () => {
    expect(isPortalFeedbackAllowed('sent', 'reject')).toBe(true);
    expect(isPortalFeedbackAllowed('draft', 'reject')).toBe(false);
    expect(isPortalFeedbackAllowed('rejected', 'reject')).toBe(false);
  });

  it('keeps comments and revision allowed for all statuses', () => {
    expect(isPortalFeedbackAllowed('draft', 'comment')).toBe(true);
    expect(isPortalFeedbackAllowed('accepted', 'comment')).toBe(true);
    expect(isPortalFeedbackAllowed('draft', 'revision')).toBe(true);
    expect(isPortalFeedbackAllowed('accepted', 'revision')).toBe(true);
  });

  it('normalizes case and trims values', () => {
    expect(isPortalFeedbackAllowed(' Sent ', ' APPROVE ')).toBe(true);
    expect(isPortalFeedbackAllowed(' Draft ', ' Reject ')).toBe(false);
  });
});
