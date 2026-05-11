// src/routes/chatbot.routes.js
import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller.js';

const router = Router();

// Pública — no requiere autenticación para que cualquier visitante pueda chatear
router.post('/message', chatbotController.mensaje);

export default router;
