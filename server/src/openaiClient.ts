import OpenAI from 'openai';
import { env } from './env';
import { SYSTEM_PROMPT } from './prompt';
import { OpenAiCallOptions } from './types';
import { appendTurn } from './sessionStore';

const client = env.openaiEnabled ? new OpenAI({ apiKey: env.apiKey }) : null;

interface CallResult {
  content: string;
  finalMarkdownPresent: boolean;
}

export async function callOpenAi({ session, userMessage, finalOverride }: OpenAiCallOptions): Promise<CallResult> {
  if (!env.openaiEnabled || !client) {
    const content =
      "L'API OpenAI est désactivée : vérifiez la configuration des variables OPENAI_API_KEY et VECTOR_STORE_ID.";
    appendTurn(session, 'assistant', content);
    return { content, finalMarkdownPresent: false };
  }

  const messages = buildMessages(session, userMessage);

  const request: OpenAI.Beta.Responses.ResponseCreateParamsStreaming = {
    model: 'gpt-5-mini',
    reasoning: { effort: 'high' },
    stream: true,
    parallel_tool_calls: true,
    tool_choice: 'auto',
    messages,
    tools: [
      { type: 'file_search' },
      { type: 'web_search' }
    ],
    tool_resources: {
      file_search: {
        vector_store_ids: env.vectorStoreId ? [env.vectorStoreId] : []
      }
    }
  };

  if (finalOverride) {
    request.verbosity = 'high';
    request.max_output_tokens = 20000;
  }

  const stream = await client.responses.stream(request);
  let aggregated = '';

  stream.on('event', (event) => {
    if (event.type === 'response.output_text.delta') {
      aggregated += event.delta;
    }
  });

  const final = await stream.finalResponse();
  if (!aggregated && final.output_text?.length) {
    aggregated = final.output_text.join('');
  }

  appendTurn(session, 'assistant', aggregated);

  return {
    content: aggregated,
    finalMarkdownPresent: aggregated.includes('```markdown')
  };
}

function buildMessages(session: OpenAiCallOptions['session'], userMessage: string) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  messages.push({ role: 'system', content: SYSTEM_PROMPT });

  if (session.summary) {
    messages.push({
      role: 'system',
      content: `Résumé de session (mémoire compacte) :\n${session.summary}`
    });
  }

  if (Object.keys(session.memory).length) {
    messages.push({
      role: 'system',
      content: `Mémoire structurée (JSON) : ${JSON.stringify(session.memory)}`
    });
  }

  session.recentTurns.forEach((turn) => {
    messages.push({ role: turn.role, content: turn.content });
  });

  messages.push({ role: 'user', content: userMessage });
  appendTurn(session, 'user', userMessage);

  return messages;
}
