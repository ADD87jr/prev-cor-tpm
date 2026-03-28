import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: mockExecute,
  })),
}));

describe('AI Studio portal route POST', () => {
  const routeModulePath = '../../src/app/api/ai-studio/portal/[id]/route';

  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('blocks approve when offer status is draft', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 101, offerStatus: 'draft' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { POST } = await import(routeModulePath);

    const request = new Request('http://localhost/api/ai-studio/portal/token-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', clientName: 'Test', message: 'ok' }),
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ id: 'token-1' }),
    });

    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('status sent');
    expect(data.offerStatus).toBe('draft');
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('allows approve when offer status is sent', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 102, offerStatus: 'sent' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { POST } = await import(routeModulePath);

    const request = new Request('http://localhost/api/ai-studio/portal/token-2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', clientName: 'Test', message: 'ok' }),
    });

    const response = await POST(request as any, {
      params: Promise.resolve({ id: 'token-2' }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.feedbackType).toBe('approve');
    expect(mockExecute).toHaveBeenCalledTimes(5);
  });
});
