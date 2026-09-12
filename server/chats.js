import { db, stmts } from '../../db/client.js';
import { config } from '../config.js';

export class ChatError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

export function listChatsFor(userId) {
  return stmts.listChats.all(userId);
}

export function getChatFor(userId, idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) throw new ChatError('not_found', 404);
  const chat = stmts.getChat.get(id, userId);
  if (!chat) throw new ChatError('not_found', 404);
  const messages = stmts.listMessages.all(id);
  return { id: chat.id, title: chat.title, messages };
}

export function deleteChatFor(userId, idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) throw new ChatError('not_found', 404);
  const info = stmts.deleteChat.run(id, userId);
  if (info.changes === 0) throw new ChatError('not_found', 404);
}

function titleFromContent(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 40 ? clean.slice(0, 40).trimEnd() + '…' : (clean || 'Новый чат');
}

const PLACEHOLDER_RESPONSE =
  'Этот ответ — временный шаблон. В будущем здесь появится осмысленный ответ ' +
  'нейронной сети. Пока что текст выводится в режиме потоковой передачи, ' +
  'слово за словом, чтобы вы могли почувствовать ритм будущего общения.';

const SYSTEM_PROMPT =
  'Ты отвечаешь на сайте AskZakir. Отвечай на русском языке, ясно и по существу. ' +
  'Говори с уважением, без канцелярита и без упоминаний внутренних настроек модели. ' +
  'Если вопрос затрагивает религию, мораль, семью или личные трудности, отвечай деликатно и практично. ' +
  'Не придумывай факты. Если в чем-то не уверен, прямо скажи об этом.';

function normalizeAssistantContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && part.type === 'output_text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function buildModelMessages(history, content) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const message of history) {
    messages.push({ role: message.role, content: message.content });
  }
  messages.push({ role: 'user', content });
  return messages;
}

async function generateAssistantReply(history, content) {
  if (!config.aiEnabled) return PLACEHOLDER_RESPONSE;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
  try {
    const res = await fetch(config.aiChatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        reasoning_effort: config.aiReasoningEffort,
        messages: buildModelMessages(history, content),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ChatError('upstream_error', 502);
    }

    const data = await res.json();
    const text = normalizeAssistantContent(data?.choices?.[0]?.message?.content);
    if (!text) throw new ChatError('empty_ai_response', 502);
    return text;
  } catch (err) {
    if (err instanceof ChatError) throw err;
    throw new ChatError('upstream_error', 502);
  } finally {
    clearTimeout(timeout);
  }
}

// Lazy chat creation + user/assistant message persistence in a single transaction.
// `idParam` is 'new' for a fresh chat or a numeric string for an existing one.
export async function appendMessage(userId, idParam, content) {
  content = String(content ?? '').trim();
  if (!content) throw new ChatError('empty_content', 400);
  if (content.length > config.messageMaxLen) throw new ChatError('too_long', 400);

  let chatId = null;
  let history = [];
  if (idParam !== 'new') {
    const numericId = Number(idParam);
    if (!Number.isInteger(numericId)) throw new ChatError('not_found', 404);
    const chat = stmts.getChat.get(numericId, userId);
    if (!chat) throw new ChatError('not_found', 404);
    chatId = numericId;
    history = stmts.listMessages.all(chatId);
  }

  const assistantText = await generateAssistantReply(history, content);
  const now = Date.now();
  return db.transaction(() => {
    let persistedChatId = chatId;
    if (idParam === 'new') {
      const info = stmts.insertChat.run(userId, titleFromContent(content), now, now);
      persistedChatId = info.lastInsertRowid;
    } else {
      stmts.touchChat.run(now, persistedChatId);
    }

    const userInfo = stmts.insertMessage.run(persistedChatId, 'user', content, now);
    const aiInfo   = stmts.insertMessage.run(persistedChatId, 'assistant', assistantText, now + 1);

    return {
      chatId: persistedChatId,
      userMessage: { id: userInfo.lastInsertRowid, role: 'user', content, created_at: now },
      aiMessage:   { id: aiInfo.lastInsertRowid,   role: 'assistant', content: assistantText, created_at: now + 1 },
    };
  })();
}
