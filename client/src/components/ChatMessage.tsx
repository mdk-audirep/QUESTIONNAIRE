import { memo, useMemo } from 'react';
import { Message } from '../lib/types';
import { renderMarkdown } from '../lib/markdown';
import clsx from 'clsx';

interface ChatMessageProps {
  message: Message;
}

const phaseLabels: Record<Message['phase'], string> = {
  collecte: 'Phase Collecte',
  plan: 'Phase Plan',
  sections: 'Phase Sections',
  final: 'Phase Finale'
};

function ChatMessageComponent({ message }: ChatMessageProps) {
  const html = useMemo(() => renderMarkdown(message.content), [message.content]);

  return (
    <div
      className={clsx('chat-message', message.role, {
        'is-assistant': message.role === 'assistant',
        'is-user': message.role === 'user'
      })}
    >
      <div className="chat-message__meta">
        <span className="chat-message__role">{message.role === 'assistant' ? 'Assistant' : 'Vous'}</span>
        <span className="chat-message__phase">{phaseLabels[message.phase]}</span>
      </div>
      <div className="chat-message__body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
