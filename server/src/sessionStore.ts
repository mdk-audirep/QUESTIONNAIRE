import { v4 as uuid } from 'uuid';
import { MemorySnapshot, Phase, SessionState } from './types';
import { PROMPT_VERSION } from './prompt';

const sessions = new Map<string, SessionState>();

export function createSession(phase: Phase = 'collecte', promptVersion = PROMPT_VERSION): SessionState {
  const id = uuid();
  const session: SessionState = {
    id,
    promptVersion,
    phase,
    memory: {},
    summary: '',
    recentTurns: [],
    disabled: false
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function updatePhase(session: SessionState, phase?: Phase) {
  if (phase) {
    session.phase = phase;
  }
}

export function mergeMemory(session: SessionState, delta?: MemorySnapshot) {
  if (!delta) return;
  session.memory = deepMerge(session.memory, delta);
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = Array.isArray(target) ? [...(target as unknown[])] : { ...target };
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = output[key];
    if (Array.isArray(sourceValue)) {
      output[key] = sourceValue;
    } else if (sourceValue && typeof sourceValue === 'object') {
      output[key] = deepMerge(
        (targetValue && typeof targetValue === 'object' ? (targetValue as Record<string, unknown>) : {}),
        sourceValue as Record<string, unknown>
      );
    } else {
      output[key] = sourceValue;
    }
  });
  return output;
}

export function appendTurn(session: SessionState, role: 'user' | 'assistant', content: string) {
  session.recentTurns.push({ role, content });
  if (session.recentTurns.length > 5) {
    session.recentTurns.shift();
  }
  const snippet = `${role === 'user' ? 'Utilisateur' : 'Assistant'}: ${content}`;
  session.summary = `${session.summary}\n${snippet}`.trim().slice(-4000);
}

export function resetSession(sessionId: string) {
  sessions.delete(sessionId);
}
