// src/services/chatbot.service.js
// Capa de Lógica de Negocio — orquestación del chatbot con Groq

import { groqClient } from '../config/groq.js';
import { chatbotRepository } from '../repositories/chatbot.repository.js';
import { habitacionRepository } from '../repositories/habitacion.repository.js';
import { reservaRepository } from '../repositories/reserva.repository.js';

const SYSTEM_PROMPT = `
Eres el asistente virtual del Hotel HotelBot. Tu nombre es "HotelBot".
Eres amable, profesional y conciso. Respondes siempre en español.

INFORMACIÓN DEL HOTEL:
- Nombre: Hotel HotelBot
- Dirección: Av. Principal 123, Quito, Ecuador
- Teléfono: +593 2 123-4567
- Email: info@hotelbot.com
- Check-in: 14:00 | Check-out: 12:00
- Cancelaciones gratuitas hasta 24h antes del ingreso
- Métodos de pago: efectivo, tarjeta y transferencia bancaria
- Mascotas no permitidas
- Desayuno incluido en suites
- Piscina, gimnasio y restaurante disponibles para todos los huéspedes

REGLAS IMPORTANTES:
- Solo respondes preguntas relacionadas con el hotel
- Cuando menciones precios usa el formato $XX.XX por noche
- Sé breve: máximo 3-4 oraciones por respuesta
- NUNCA digas que has creado o confirmado una reserva a menos que el sistema te confirme que fue exitosa
- Si el usuario quiere reservar, pídele: fechas de ingreso (YYYY-MM-DD), fechas de salida (YYYY-MM-DD) y número de personas
- Cuando tengas todos los datos necesarios para una reserva, responde EXACTAMENTE con este formato JSON y nada más:
  RESERVA_DATOS:{"habitacionId":"ID","fechaIngreso":"YYYY-MM-DD","fechaSalida":"YYYY-MM-DD","numPersonas":N}

HABITACIONES DISPONIBLES AHORA:
{HABITACIONES_DISPONIBLES}
`;

export const chatbotService = {

  async procesarMensaje(sessionId, mensaje, usuarioId) {
    // 1. Guardar mensaje del usuario en BD
    await chatbotRepository.guardarMensaje(sessionId, 'user', mensaje);

    // 2. Obtener historial reciente
    const historial = await chatbotRepository.getMensajes(sessionId, 10);

    // 3. Obtener habitaciones disponibles para dar contexto real
    const habitaciones = await habitacionRepository.findAll();
    const resumenHabitaciones = habitaciones.length > 0
      ? habitaciones
        .filter(h => h.estado === 'DISPONIBLE')
        .map(h =>
          `- ID:${h.id} | Hab.${h.numero} (${h.tipo}): $${h.precioPorNoche}/noche, ` +
          `capacidad ${h.capacidad} personas` +
          (h.amenidades?.length ? `, amenidades: ${h.amenidades.join(', ')}` : '')
        ).join('\n')
      : 'No hay habitaciones disponibles en este momento.';

    // 4. Construir prompt con contexto real
    const systemPrompt = SYSTEM_PROMPT.replace('{HABITACIONES_DISPONIBLES}', resumenHabitaciones);

    // 5. Construir historial para Groq
    const mensajesHistorial = historial.slice(0, -1).map(m => ({
      role: m.rol,
      content: m.contenido,
    }));

    // 6. Llamar a Groq
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

    let respuesta = completion.choices[0].message.content;

    // 7. Detectar si el bot quiere crear una reserva
    if (respuesta.includes('RESERVA_DATOS:') && usuarioId) {
      try {
        const jsonStr = respuesta.split('RESERVA_DATOS:')[1].trim();
        const datos = JSON.parse(jsonStr);

        // Crear la reserva en la BD
        const reserva = await reservaRepository.create({
          usuarioId,
          habitacionId: datos.habitacionId,
          fechaIngreso: new Date(datos.fechaIngreso),
          fechaSalida: new Date(datos.fechaSalida),
          numPersonas: datos.numPersonas,
          estado: 'PENDIENTE',
          precioTotal: await calcularPrecio(datos.habitacionId, datos.fechaIngreso, datos.fechaSalida),
          notas: 'Reserva creada por chatbot',
        });

        respuesta = `✅ ¡Reserva creada exitosamente! 
📋 Número de reserva: ${reserva.id.slice(0, 8).toUpperCase()}
🏨 Habitación ${reserva.habitacion.numero}
📅 Check-in: ${new Date(datos.fechaIngreso).toLocaleDateString('es-EC')}
📅 Check-out: ${new Date(datos.fechaSalida).toLocaleDateString('es-EC')}
💰 Total: $${parseFloat(reserva.precioTotal).toFixed(2)}

Tu reserva está pendiente de confirmación. ¿Hay algo más en que pueda ayudarte?`;

      } catch (err) {
        respuesta = 'Lo siento, hubo un error al crear la reserva. Por favor intenta de nuevo o contacta a recepción.';
        console.error('Error creando reserva desde chatbot:', err);
      }
    } else if (respuesta.includes('RESERVA_DATOS:') && !usuarioId) {
      respuesta = 'Para realizar una reserva necesitas iniciar sesión primero. ¿Te gustaría registrarte o iniciar sesión?';
    }

    // 8. Guardar respuesta del asistente en BD
    await chatbotRepository.guardarMensaje(sessionId, 'assistant', respuesta);

    return respuesta;
  },
};

async function calcularPrecio(habitacionId, fechaIngreso, fechaSalida) {
  const habitacion = await habitacionRepository.findById(habitacionId);
  const noches = Math.ceil(
    (new Date(fechaSalida) - new Date(fechaIngreso)) / (1000 * 60 * 60 * 24)
  );
  return parseFloat(habitacion.precioPorNoche) * noches;
}