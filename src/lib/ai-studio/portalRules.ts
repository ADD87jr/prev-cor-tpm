export function isPortalFeedbackAllowed(offerStatus: string, feedbackType: string): boolean {
  const normalizedStatus = String(offerStatus || '').trim().toLowerCase();
  const normalizedType = String(feedbackType || '').trim().toLowerCase();

  if (normalizedType === 'approve' || normalizedType === 'reject') {
    return normalizedStatus === 'sent';
  }

  return true;
}
