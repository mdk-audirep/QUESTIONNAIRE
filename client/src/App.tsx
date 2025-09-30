import { FormEvent, KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';
import { ChatMessage } from './components/ChatMessage';
import { ThematicSelector } from './components/ThematicSelector';
import {
  Message,
  Phase,
  Thematic,
  MemorySnapshot
} from './lib/types';
import {
  startSession,
  continueSession,
  finalizeSession
} from './lib/api';
import './styles/app.css';

const DEFAULT_THEMATICS: Array<Omit<Thematic, 'id'>> = [
  {
    label: 'Satisfaction client',
    checked: true,
    subthemes: [
      { id: 'accueil', label: 'Accueil & relation', checked: true },
      { id: 'delais', label: 'Délais & réactivité', checked: true },
      { id: 'digital', label: 'Parcours digital', checked: false }
    ]
  },
  {
    label: 'Notoriété & image',
    checked: false,
    subthemes: [
      { id: 'spontanee', label: 'Notoriété spontanée', checked: false },
      { id: 'assist', label: 'Image perçue', checked: false }
    ]
  },
  {
    label: 'Offre & prix',
    checked: false,
    subthemes: [
      { id: 'prix', label: 'Sensibilité prix', checked: false },
      { id: 'innov', label: 'Nouvelles offres', checked: false }
    ]
  }
];

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function createDefaultThematics(): Thematic[] {
  return DEFAULT_THEMATICS.map((thematic) => ({
    id: makeId(),
    label: thematic.label,
    checked: thematic.checked,
    subthemes: thematic.subthemes.map((sub) => ({
      ...sub,
      id: `${thematic.label}-${sub.id}`
    }))
  }));
}

function buildMemoryDelta(thematics: Thematic[]): MemorySnapshot {
  return {
    collecte: {
      thematiques: thematics.map((item) => ({
        label: item.label,
        checked: item.checked,
        custom: item.custom,
        sous_thematiques: item.subthemes.map((sub) => ({
          label: sub.label,
          checked: sub.checked,
          custom: sub.custom
        }))
      }))
    }
  };
}

function extractMarkdownFence(content: string): string | null {
  const fence = content.match(/```markdown\n?([\s\S]*?)```/i);
  return fence ? fence[1].trim() : null;
}

const INITIAL_PHASE: Phase = 'collecte';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(INITIAL_PHASE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thematics, setThematics] = useState<Thematic[]>(() => createDefaultThematics());
  const [finalMarkdown, setFinalMarkdown] = useState('');

  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'collecte':
        return 'Collecte des informations';
      case 'plan':
        return 'Construction du sommaire';
      case 'sections':
        return 'Rédaction section par section';
      case 'final':
        return 'Assemblage final du questionnaire';
      default:
        return '';
    }
  }, [phase]);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setPhase(INITIAL_PHASE);
    setMessages([]);
    setInputValue('');
    setError(null);
    setFinalMarkdown('');
    setThematics(createDefaultThematics());
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!inputValue.trim() || isSending) {
        return;
      }

      const text = inputValue.trim();
      const userMessage: Message = {
        id: makeId(),
        role: 'user',
        content: text,
        phase
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsSending(true);
      setError(null);

      const memoryDelta = buildMemoryDelta(thematics);

      try {
        const payload = {
          userMessage: text,
          memoryDelta,
          phaseHint: phase as Phase
        };

        const envelope = sessionId
          ? phase === 'final'
            ? await finalizeSession({ ...payload, sessionId })
            : await continueSession({ ...payload, sessionId })
          : await startSession(payload);

        setSessionId(envelope.sessionId);
        setPhase(envelope.phase);

        const assistantMessage: Message = {
          id: makeId(),
          role: 'assistant',
          content: envelope.assistantMarkdown,
          phase: envelope.phase
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (envelope.finalMarkdownPresent) {
          const extracted = extractMarkdownFence(envelope.assistantMarkdown);
          if (extracted) {
            setFinalMarkdown(extracted);
            if (hiddenInputRef.current) {
              hiddenInputRef.current.value = extracted;
            }
          }
        }
      } catch (apiError) {
        if (apiError && typeof apiError === 'object' && 'message' in apiError) {
          setError(String((apiError as { message: string }).message));
        } else {
          setError('Une erreur est survenue.');
        }
      } finally {
        setIsSending(false);
      }
    },
    [inputValue, isSending, phase, sessionId, thematics]
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h2>Thématiques & sous-thématiques</h2>
          <p>Sélectionnez ou ajoutez les axes à explorer. Ils seront mémorisés à chaque échange.</p>
        </div>
        <ThematicSelector thematics={thematics} onChange={setThematics} />
        <div className="phase-indicator">Étape actuelle : {phaseLabel}</div>
        <button type="button" className="secondary" onClick={resetSession}>
          Démarrer / Réinitialiser
        </button>
      </aside>
      <main className="chat-area">
        <div className="chat-header">
          <h1>QuestionnaireMasterPIE</h1>
          <span className="phase-indicator">{phaseLabel}</span>
        </div>
        <section className="chat-messages" aria-live="polite">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </section>
        <form className="chat-input" onSubmit={handleSubmit}>
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message ici..."
          />
          {error ? <div role="alert">{error}</div> : null}
          <div className="chat-actions">
            <button type="submit" className="primary" disabled={isSending}>
              Envoyer
            </button>
            <span>{isSending ? 'Génération en cours...' : 'Ctrl/⌘ + Entrée pour envoyer'}</span>
          </div>
        </form>
        <div className="hidden-input-wrapper">
          <input ref={hiddenInputRef} type="hidden" id="finalMarkdown" value={finalMarkdown} readOnly />
        </div>
      </main>
    </div>
  );
}
