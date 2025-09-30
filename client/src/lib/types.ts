export type Phase = 'collecte' | 'plan' | 'sections' | 'final';

export interface SubThematic {
  id: string;
  label: string;
  checked: boolean;
  custom?: boolean;
}

export interface Thematic {
  id: string;
  label: string;
  checked: boolean;
  custom?: boolean;
  subthemes: SubThematic[];
}

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

export interface AssistantResponseEnvelope {
  sessionId: string;
  promptVersion: string;
  phase: Phase;
  assistantMarkdown: string;
  memorySnapshot: MemorySnapshot;
  finalMarkdownPresent?: boolean;
  nextAction?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  phase: Phase;
}
