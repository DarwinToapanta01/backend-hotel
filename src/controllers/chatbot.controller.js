// src/controllers/chatbot.controller.js
// Capa de Controladores — recibe el mensaje, delega al servicio, responde

import { chatbotService } from '../services/chatbot.service.js';
import { v4 as uuidv4 } from 'uuid';

export const chatbotController = {

  async mensaje(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
      }

      // Usar sessionId del cliente o generar uno nuevo
      const session = sessionId ?? uuidv4();

      const reply = await chatbotService.procesarMensaje(session, message);

      res.json({ reply, sessionId: session });
    } catch (error) {
      console.error('Error en chatbot:', error);
      res.status(500).json({ error: 'Error al procesar el mensaje' });
    }
  },
};
