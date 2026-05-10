import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../container-runner.js', () => ({
  killContainer: vi.fn(),
}));

vi.mock('../../session-manager.js', () => ({
  writeSessionMessage: vi.fn(),
}));

import { killContainer } from '../../container-runner.js';
import { writeSessionMessage } from '../../session-manager.js';

// Import the module to register the delivery action
import './index.js';

// Access the registered handler via the delivery action registry
import { getDeliveryAction } from '../../delivery.js';

const mockSession = {
  id: 'sess-test-123',
  agent_group_id: 'ag-test',
  messaging_group_id: 'mg-test',
  thread_id: null,
  status: 'active' as const,
  container_status: 'running' as const,
  session_mode: 'shared' as const,
  created_at: new Date().toISOString(),
};

describe('end_session delivery handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is registered as a delivery action', () => {
    const handler = getDeliveryAction('end_session');
    expect(handler).toBeDefined();
  });

  it('calls killContainer with session id and reason', async () => {
    const handler = getDeliveryAction('end_session')!;
    await handler({ reason: 'context full' }, mockSession as any, null as any);

    expect(killContainer).toHaveBeenCalledWith('sess-test-123', 'context full');
  });

  it('writes resume_prompt as inbound message with processAfter delay', async () => {
    const handler = getDeliveryAction('end_session')!;
    await handler(
      { reason: 'rotating', resume_prompt: 'Continue curation' },
      mockSession as any,
      null as any,
    );

    expect(killContainer).toHaveBeenCalledWith('sess-test-123', 'rotating');
    expect(writeSessionMessage).toHaveBeenCalledWith(
      'ag-test',
      'sess-test-123',
      expect.objectContaining({
        kind: 'chat',
        content: expect.stringContaining('Continue curation'),
        processAfter: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
      }),
    );
  });

  it('does NOT write inbound message when resume_prompt absent', async () => {
    const handler = getDeliveryAction('end_session')!;
    await handler({ reason: 'done' }, mockSession as any, null as any);

    expect(killContainer).toHaveBeenCalled();
    expect(writeSessionMessage).not.toHaveBeenCalled();
  });

  it('is idempotent — second call is safe', async () => {
    const handler = getDeliveryAction('end_session')!;
    await handler({ reason: 'first' }, mockSession as any, null as any);
    await handler({ reason: 'second' }, mockSession as any, null as any);

    expect(killContainer).toHaveBeenCalledTimes(2);
  });
});
