// src/repositories/chatbot.repository.js
// Capa de Acceso a Datos — persistencia del historial de conversaciones

import prisma from '../config/prisma.js';

export const chatbotRepository = {

  async findOrCreateConversacion(sessionId) {
    return prisma.conversacion.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
    });
  },

  async getMensajes(sessionId, limite = 10) {
    const conversacion = await prisma.conversacion.findUnique({
      where: { sessionId },
      include: {
        mensajes: {
          orderBy: { creadoEn: 'desc' },
          take: limite,
        },
      },
    });
    // Devuelve en orden cronológico
    return conversacion?.mensajes.reverse() ?? [];
  },

  async guardarMensaje(sessionId, rol, contenido) {
    const conversacion = await this.findOrCreateConversacion(sessionId);
    return prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        rol,
        contenido,
      },
    });
  },
};
