import { Phase, AssistantResponseEnvelope, MemorySnapshot } from './types';

const PROMPT_VERSION = 'qmpie_v3_2025-09-30';

interface BasePayload {
  memoryDelta?: MemorySnapshot;
  phaseHint?: Phase;
}

interface StartPayload extends BasePayload {
  userMessage: string;
}

interface ContinuePayload extends BasePayload {
  sessionId: string;
  userMessage: string;
}

export async function startSession(payload: StartPayload): Promise<AssistantResponseEnvelope> {
  const response = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, promptVersion: PROMPT_VERSION })
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as AssistantResponseEnvelope;
}

export async function continueSession(payload: ContinuePayload): Promise<AssistantResponseEnvelope> {
  const response = await fetch('/api/continue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, promptVersion: PROMPT_VERSION })
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as AssistantResponseEnvelope;
}

export async function finalizeSession(payload: ContinuePayload): Promise<AssistantResponseEnvelope> {
  const response = await fetch('/api/final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, promptVersion: PROMPT_VERSION })
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as AssistantResponseEnvelope;
}

async function buildError(response: Response) {
  let message = response.statusText;
  try {
    const data = await response.json();
    if (data?.message) {
      message = data.message;
    }
  } catch (error) {
    // ignore
  }
  return { message, status: response.status };
}
