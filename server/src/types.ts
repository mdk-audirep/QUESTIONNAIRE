export type Phase = 'collecte' | 'plan' | 'sections' | 'final';

export interface MemorySnapshot {
  collecte?: {
    thematiques?: Array<{
      label: string;
      checked: boolean;
      custom?: boolean;
      sous_thematiques: Array<{
        label: string;
        checked: boolean;
        custom?: boolean;
      }>;
    }>;
  };
  [key: string]: unknown;
}

export interface SessionState {
  id: string;
  promptVersion: string;
  phase: Phase;
  memory: MemorySnapshot;
  summary: string;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  disabled: boolean;
}

export interface OpenAiCallOptions {
  session: SessionState;
  userMessage: string;
  finalOverride?: boolean;
}

export interface AssistantEnvelope {
  sessionId: string;
  promptVersion: string;
  phase: Phase;
  assistantMarkdown: string;
  memorySnapshot: MemorySnapshot;
  finalMarkdownPresent?: boolean;
  nextAction?: string;
}

export interface StartRequestBody {
  promptVersion: string;
  userMessage: string;
  memoryDelta?: MemorySnapshot;
  phaseHint?: Phase;
}

export interface ContinueRequestBody extends StartRequestBody {
  sessionId: string;
}
