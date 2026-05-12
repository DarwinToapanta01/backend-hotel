// src/controllers/chatbot.controller.js
import { chatbotService } from '../services/chatbot.service.js';
import { authService } from '../services/auth.service.js';
import { v4 as uuidv4 } from 'uuid';

export const chatbotController = {

  async mensaje(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      }

      const session = sessionId ?? uuidv4();

      // Intentar obtener el usuario del token si viene en el header
      let usuarioId = null;
      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = authService.verificarToken(token);
          usuarioId = payload.id;
        } catch {
          // Token inválido, continuar sin usuario
        }
      }

      const reply = await chatbotService.procesarMensaje(session, message, usuarioId);

      res.json({ reply, sessionId: session });
    } catch (error) {
      console.error('Error en chatbot:', error);
      res.status(500).json({ error: 'Error al procesar el mensaje' });
    }
  },
};