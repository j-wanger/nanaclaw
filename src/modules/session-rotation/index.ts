import { registerDeliveryAction } from '../../delivery.js';
import { killContainer } from '../../container-runner.js';
import { writeSessionMessage } from '../../session-manager.js';
import { log } from '../../log.js';
import type { Session } from '../../types.js';

async function handleEndSession(content: Record<string, unknown>, session: Session): Promise<void> {
  const reason = (content.reason as string) || 'end_session';
  const resumePrompt = content.resume_prompt as string | undefined;

  log.info('Agent requested session end', {
    sessionId: session.id,
    agentGroupId: session.agent_group_id,
    reason,
    hasResumePrompt: !!resumePrompt,
  });

  killContainer(session.id, reason);

  if (resumePrompt) {
    writeSessionMessage(session.agent_group_id, session.id, {
      id: `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'chat',
      timestamp: new Date().toISOString(),
      platformId: session.agent_group_id,
      channelType: 'agent',
      threadId: null,
      content: JSON.stringify({
        text: resumePrompt,
        sender: 'system',
        senderId: 'system',
      }),
      processAfter: new Date(Date.now() + 5000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, ''),
    });

    log.info('Resume prompt written for re-wake', {
      sessionId: session.id,
      delayMs: 5000,
    });
  }
}

registerDeliveryAction('end_session', handleEndSession);
