import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listChatsFor,
  getChatFor,
  deleteChatFor,
  appendMessage,
  ChatError,
} from '../services/chats.js';

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get('/', (req, res) => {
  res.json({ chats: listChatsFor(req.user.id) });
});

chatsRouter.get('/:id', (req, res, next) => {
  try {
    res.json({ chat: getChatFor(req.user.id, req.params.id) });
  } catch (err) {
    if (err instanceof ChatError) return res.status(err.status).json({ error: err.code });
    next(err);
  }
});

chatsRouter.delete('/:id', (req, res, next) => {
  try {
    deleteChatFor(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof ChatError) return res.status(err.status).json({ error: err.code });
    next(err);
  }
});

chatsRouter.post('/:id/messages', (req, res, next) => {
  try {
    res.json(appendMessage(req.user.id, req.params.id, req.body?.content));
  } catch (err) {
    if (err instanceof ChatError) return res.status(err.status).json({ error: err.code });
    next(err);
  }
});
