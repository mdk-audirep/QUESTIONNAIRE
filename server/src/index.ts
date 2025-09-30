import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { env } from './env';
import { PROMPT_VERSION } from './prompt';
import {
  createSession,
  getSession,
  mergeMemory,
  updatePhase
} from './sessionStore';
import { callOpenAi } from './openaiClient';
import {
  AssistantEnvelope,
  ContinueRequestBody,
  Phase,
  StartRequestBody
} from './types';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

class EnvMissingError extends Error {}

const phaseEnum: [Phase, Phase, Phase, Phase] = ['collecte', 'plan', 'sections', 'final'];

const startSchema = z.object({
  promptVersion: z.string(),
  userMessage: z.string().min(1),
  memoryDelta: z.any().optional(),
  phaseHint: z.enum(phaseEnum).optional()
});

const continueSchema = startSchema.extend({
  sessionId: z.string().min(8)
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', openaiEnabled: env.openaiEnabled, missingKeys: env.missingKeys });
});

app.post('/api/start', async (req, res) => {
  try {
    guardEnv();
    const body = startSchema.parse(req.body) as StartRequestBody;

    if (body.promptVersion !== PROMPT_VERSION) {
      return res.status(409).json({ message: 'Version du prompt incompatible. Lancez /start à nouveau.' });
    }

    const session = createSession('collecte', body.promptVersion);
    mergeMemory(session, body.memoryDelta);
    updatePhase(session, body.phaseHint);

    const result = await callOpenAi({ session, userMessage: body.userMessage });
    const phase = detectPhase(result.content) ?? session.phase;
    updatePhase(session, phase);

    const envelope: AssistantEnvelope = {
      sessionId: session.id,
      promptVersion: body.promptVersion,
      phase,
      assistantMarkdown: result.content,
      memorySnapshot: session.memory,
      finalMarkdownPresent: result.finalMarkdownPresent,
      nextAction: 'ask_user'
    };

    res.json(envelope);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/continue', async (req, res) => {
  try {
    guardEnv();
    const body = continueSchema.parse(req.body) as ContinueRequestBody;
    const session = getSession(body.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session inconnue. Relancez /start.' });
    }

    if (body.promptVersion !== session.promptVersion) {
      return res.status(409).json({ message: 'Version du prompt obsolète. Démarrez une nouvelle session.' });
    }

    mergeMemory(session, body.memoryDelta);
    updatePhase(session, body.phaseHint);

    const result = await callOpenAi({ session, userMessage: body.userMessage });
    const phase = detectPhase(result.content) ?? session.phase;
    updatePhase(session, phase);

    const envelope: AssistantEnvelope = {
      sessionId: session.id,
      promptVersion: session.promptVersion,
      phase,
      assistantMarkdown: result.content,
      memorySnapshot: session.memory,
      finalMarkdownPresent: result.finalMarkdownPresent,
      nextAction: 'ask_user'
    };

    res.json(envelope);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/final', async (req, res) => {
  try {
    guardEnv();
    const body = continueSchema.parse(req.body) as ContinueRequestBody;
    const session = getSession(body.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session inconnue. Relancez /start.' });
    }

    if (body.promptVersion !== session.promptVersion) {
      return res.status(409).json({ message: 'Version du prompt obsolète. Démarrez une nouvelle session.' });
    }

    mergeMemory(session, body.memoryDelta);
    updatePhase(session, 'final');

    const result = await callOpenAi({ session, userMessage: body.userMessage, finalOverride: true });
    updatePhase(session, 'final');

    const envelope: AssistantEnvelope = {
      sessionId: session.id,
      promptVersion: session.promptVersion,
      phase: 'final',
      assistantMarkdown: result.content,
      memorySnapshot: session.memory,
      finalMarkdownPresent: result.finalMarkdownPresent,
      nextAction: 'persist_and_render'
    };

    res.json(envelope);
  } catch (error) {
    handleError(res, error);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  handleError(res, err);
});

app.listen(env.port, () => {
  console.log(`QuestionnaireMasterPIE server ready on port ${env.port}`);
});

function detectPhase(markdown: string): Phase | null {
  const normalized = markdown.toLowerCase();
  if (normalized.includes('phase finale') || normalized.includes('phase final')) return 'final';
  if (normalized.includes('phase sections') || normalized.includes('phase section')) return 'sections';
  if (normalized.includes('phase plan')) return 'plan';
  if (normalized.includes('phase collecte')) return 'collecte';
  return null;
}

function handleError(res: express.Response, error: unknown) {
  if (error instanceof EnvMissingError) {
    return res.status(503).json({ message: "Configuration manquante : définissez OPENAI_API_KEY et VECTOR_STORE_ID." });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Requête invalide', details: error.issues });
  }
  console.error(error);
  return res.status(500).json({ message: 'Erreur interne du serveur' });
}

function guardEnv() {
  if (!env.openaiEnabled) {
    throw new EnvMissingError('OPENAI configuration missing');
  }
}
