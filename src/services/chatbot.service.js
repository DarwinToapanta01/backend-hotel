// src/services/chatbot.service.js
// Capa de Lógica de Negocio — orquestación del chatbot con Groq

import { groqClient } from '../config/groq.js';
import { chatbotRepository } from '../repositories/chatbot.repository.js';
import { habitacionRepository } from '../repositories/habitacion.repository.js';

const SYSTEM_PROMPT = `
Eres el asistente virtual del Hotel HotelBot. Tu nombre es "HotelBot".
Eres amable, profesional y conciso. Respondes siempre en español.

REGLAS:
- Solo respondes preguntas relacionadas con el hotel (habitaciones, reservas, precios, servicios, políticas).
- Si te preguntan algo fuera del contexto del hotel, redirige amablemente la conversación.
- Cuando menciones precios, usa el formato $XX.XX por noche.
- Si el usuario quiere hacer una reserva, pídele: fechas de ingreso y salida, número de personas.
- Sé breve: máximo 3-4 oraciones por respuesta.

POLÍTICAS DEL HOTEL:
- Check-in: 14:00 | Check-out: 12:00
- Cancelaciones gratuitas hasta 24h antes del ingreso.
- Se acepta efectivo, tarjeta y transferencia bancaria.
- Mascotas no permitidas.
- Desayuno incluido en suites.

INFORMACIÓN ACTUAL DEL HOTEL (en tiempo real):
{HABITACIONES_DISPONIBLES}
`;

export const chatbotService = {

  async procesarMensaje(sessionId, mensaje) {
    // 1. Guardar mensaje del usuario en BD
    await chatbotRepository.guardarMensaje(sessionId, 'user', mensaje);

    // 2. Obtener historial reciente
    const historial = await chatbotRepository.getMensajes(sessionId, 10);

    // 3. Obtener habitaciones para dar contexto real
    const habitaciones = await habitacionRepository.findAll();
    const resumenHabitaciones = habitaciones.length > 0
      ? habitaciones.map((h) =>
        `- Habitación ${h.numero} (${h.tipo}): $${h.precioPorNoche}/noche, ` +
        `capacidad ${h.capacidad} personas, estado: ${h.estado}` +
        (h.amenidades?.length ? `, amenidades: ${h.amenidades.join(', ')}` : '')
      ).join('\n')
      : 'No hay información de habitaciones disponible en este momento.';

    // 4. Construir prompt con contexto real
    const systemPrompt = SYSTEM_PROMPT.replace(
      '{HABITACIONES_DISPONIBLES}',
      resumenHabitaciones
    );

    // 5. Construir historial para Groq
    const mensajesHistorial = historial.slice(0, -1).map((m) => ({
      role: m.rol,
      content: m.contenido,
    }));

    // 6. Llamar a Groq con historial + contexto
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...mensajesHistorial,
        { role: 'user', content: mensaje },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const respuesta = completion.choices[0].message.content;

    // 7. Guardar respuesta del asistente en BD
    await chatbotRepository.guardarMensaje(sessionId, 'assistant', respuesta);

    return respuesta;
  },
};