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

// Placeholder until Phase 1 wires Gemini into the message flow.
const PLACEHOLDER_RESPONSE =
  'Этот ответ — временный шаблон. В будущем здесь появится осмысленный ответ ' +
  'нейронной сети. Пока что текст выводится в режиме потоковой передачи, ' +
  'слово за словом, чтобы вы могли почувствовать ритм будущего общения.';

// Lazy chat creation + user/assistant message persistence in a single transaction.
// `idParam` is 'new' for a fresh chat or a numeric string for an existing one.
export function appendMessage(userId, idParam, content) {
  content = String(content ?? '').trim();
  if (!content) throw new ChatError('empty_content', 400);
  if (content.length > config.messageMaxLen) throw new ChatError('too_long', 400);

  const now = Date.now();
  return db.transaction(() => {
    let chatId;
    if (idParam === 'new') {
      const info = stmts.insertChat.run(userId, titleFromContent(content), now, now);
      chatId = info.lastInsertRowid;
    } else {
      const numericId = Number(idParam);
      if (!Number.isInteger(numericId)) throw new ChatError('not_found', 404);
      const chat = stmts.getChat.get(numericId, userId);
      if (!chat) throw new ChatError('not_found', 404);
      chatId = numericId;
      stmts.touchChat.run(now, chatId);
    }

    const userInfo = stmts.insertMessage.run(chatId, 'user', content, now);
    const aiInfo   = stmts.insertMessage.run(chatId, 'assistant', PLACEHOLDER_RESPONSE, now + 1);

    return {
      chatId,
      userMessage: { id: userInfo.lastInsertRowid, role: 'user', content, created_at: now },
      aiMessage:   { id: aiInfo.lastInsertRowid,   role: 'assistant', content: PLACEHOLDER_RESPONSE, created_at: now + 1 },
    };
  })();
}
