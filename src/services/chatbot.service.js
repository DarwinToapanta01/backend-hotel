import { xaiClient } from '../config/xai.js';
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
- Piscina, gimnasio y restaurante disponibles

REGLAS IMPORTANTES:
- Solo respondes preguntas relacionadas con el hotel
- Cuando menciones precios usa el formato $XX.XX por noche
- Sé breve: máximo 3-4 oraciones por respuesta
- NUNCA inventes información de reservas

ACCIONES DISPONIBLES — cuando el usuario lo solicite, responde EXACTAMENTE con el JSON indicado:

1. CREAR RESERVA — cuando tenga habitacionId, fechas y personas:
ACCION:{"tipo":"CREAR_RESERVA","habitacionId":"ID","fechaIngreso":"YYYY-MM-DD","fechaSalida":"YYYY-MM-DD","numPersonas":N}

2. VER MIS RESERVAS — cuando pregunte por sus reservas o historial:
ACCION:{"tipo":"VER_RESERVAS"}

3. CONSULTAR ESTADO — cuando pregunte por una reserva específica (necesita ID):
ACCION:{"tipo":"CONSULTAR_RESERVA","reservaId":"ID_O_CODIGO"}

4. CANCELAR RESERVA — cuando quiera cancelar (necesita confirmación primero):
ACCION:{"tipo":"CANCELAR_RESERVA","reservaId":"ID"}

5. MODIFICAR FECHAS — cuando quiera cambiar fechas de una reserva:
ACCION:{"tipo":"MODIFICAR_RESERVA","reservaId":"ID","fechaIngreso":"YYYY-MM-DD","fechaSalida":"YYYY-MM-DD"}

FLUJOS IMPORTANTES:
- Para cancelar: primero muestra sus reservas, pide confirmación con el ID, luego cancela
- Para modificar: pide el ID de la reserva y las nuevas fechas
- Si el usuario no está autenticado, dile que debe iniciar sesión para gestionar reservas
- Los IDs de reserva son los primeros 8 caracteres en mayúsculas que el sistema muestra

ROL DEL USUARIO ACTUAL: {ROL_USUARIO}
- Si el rol es ADMIN: el usuario puede ver TODAS las reservas del hotel y ya tienes esa información en RESERVAS DEL USUARIO
- Si el rol es CLIENTE: solo puede ver y gestionar sus propias reservas
- Si no está autenticado: pídele que inicie sesión

HABITACIONES DISPONIBLES AHORA:
{HABITACIONES_DISPONIBLES}

RESERVAS DEL USUARIO:
{RESERVAS_USUARIO}
`;

export const chatbotService = {

  async procesarMensaje(sessionId, mensaje, usuarioId, usuarioRol) {
    // 1. Guardar mensaje del usuario
    await chatbotRepository.guardarMensaje(sessionId, 'user', mensaje);

    // 2. Obtener historial reciente
    const historial = await chatbotRepository.getMensajes(sessionId, 12);

    // 3. Contexto de habitaciones disponibles
    const habitaciones = await habitacionRepository.findAll();
    const resumenHabitaciones = habitaciones
      .filter(h => h.estado === 'DISPONIBLE')
      .map(h =>
        `- ID:${h.id} | Hab.${h.numero} (${h.tipo}): $${h.precioPorNoche}/noche, ` +
        `capacidad ${h.capacidad} personas` +
        (h.amenidades?.length ? `, amenidades: ${h.amenidades.join(', ')}` : '')
      ).join('\n') || 'No hay habitaciones disponibles en este momento.';

    // 4. Contexto de reservas del usuario
    let resumenReservas = 'El usuario no está autenticado.';
    let reservasUsuario = [];
    if (usuarioId) {
      if (usuarioRol === 'ADMIN') {
        // Admin ve todas las reservas del hotel
        reservasUsuario = await reservaRepository.findAll();
        if (reservasUsuario.length === 0) {
          resumenReservas = 'No hay reservas en el sistema.';
        } else {
          resumenReservas = reservasUsuario.map(r =>
            `- ID:${r.id.slice(0, 8).toUpperCase()} | Huésped: ${r.usuario.nombre} | ` +
            `Hab.${r.habitacion.numero} | ` +
            `${new Date(r.fechaIngreso).toLocaleDateString('es-EC')} → ${new Date(r.fechaSalida).toLocaleDateString('es-EC')} | ` +
            `Estado: ${r.estado} | Total: $${parseFloat(r.precioTotal).toFixed(2)}`
          ).join('\n');
        }
      } else {
        // Cliente solo ve sus propias reservas
        reservasUsuario = await reservaRepository.findByUsuarioId(usuarioId);
        if (reservasUsuario.length === 0) {
          resumenReservas = 'El usuario no tiene reservas activas.';
        } else {
          resumenReservas = reservasUsuario.map(r =>
            `- ID:${r.id.slice(0, 8).toUpperCase()} | Hab.${r.habitacion.numero} | ` +
            `${new Date(r.fechaIngreso).toLocaleDateString('es-EC')} → ${new Date(r.fechaSalida).toLocaleDateString('es-EC')} | ` +
            `Estado: ${r.estado} | Total: $${parseFloat(r.precioTotal).toFixed(2)}`
          ).join('\n');
        }
      }
    }

    // 5. Construir prompt
    const systemPrompt = SYSTEM_PROMPT
      .replace('{HABITACIONES_DISPONIBLES}', resumenHabitaciones)
      .replace('{RESERVAS_USUARIO}', resumenReservas)
      .replace('{ROL_USUARIO}', usuarioRol ?? 'no autenticado');

    // 6. Historial para Groq
    const mensajesHistorial = historial.slice(0, -1).map(m => ({
      role: m.rol,
      content: m.contenido,
    }));

    // 7. Llamar a xAI
    const completion = await xaiClient.chat.completions.create({
      model: 'grok-4.3',
      messages: [
        { role: 'system', content: systemPrompt },
        ...mensajesHistorial,
        { role: 'user', content: mensaje },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    let respuesta = completion.choices[0].message.content;

    // 8. Detectar y ejecutar acciones
    if (respuesta.includes('ACCION:')) {
      try {
        const jsonStr = respuesta.split('ACCION:')[1].trim();
        const accion = JSON.parse(jsonStr);
        respuesta = await ejecutarAccion(accion, usuarioId, reservasUsuario);
      } catch (err) {
        console.error('Error ejecutando acción del chatbot:', err);
        respuesta = 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.';
      }
    }

    // 9. Guardar respuesta
    await chatbotRepository.guardarMensaje(sessionId, 'assistant', respuesta);

    return respuesta;
  },
};

async function ejecutarAccion(accion, usuarioId, reservasUsuario) {
  if (!usuarioId) {
    return '🔒 Para gestionar reservas necesitas iniciar sesión primero. ¿Te gustaría registrarte o iniciar sesión?';
  }

  switch (accion.tipo) {

    case 'CREAR_RESERVA': {
      const habitacion = await habitacionRepository.findById(accion.habitacionId);
      if (!habitacion) return '❌ No encontré esa habitación. Por favor verifica la información.';

      const noches = Math.ceil(
        (new Date(accion.fechaSalida) - new Date(accion.fechaIngreso)) / (1000 * 60 * 60 * 24)
      );
      const precioTotal = parseFloat(habitacion.precioPorNoche) * noches;

      const reserva = await reservaRepository.create({
        usuarioId,
        habitacionId: accion.habitacionId,
        fechaIngreso: new Date(accion.fechaIngreso),
        fechaSalida: new Date(accion.fechaSalida),
        numPersonas: accion.numPersonas,
        estado: 'PENDIENTE',
        precioTotal,
        notas: 'Reserva creada por chatbot',
      });

      return `✅ ¡Reserva creada exitosamente!

📋 Código: **${reserva.id.slice(0, 8).toUpperCase()}**
🏨 Habitación ${reserva.habitacion.numero} (${habitacion.tipo})
📅 Check-in: ${new Date(accion.fechaIngreso).toLocaleDateString('es-EC')} a las 14:00
📅 Check-out: ${new Date(accion.fechaSalida).toLocaleDateString('es-EC')} a las 12:00
🌙 ${noches} noche${noches > 1 ? 's' : ''}
💰 Total: $${precioTotal.toFixed(2)}
📌 Estado: Pendiente de confirmación

Puedes ver tus reservas en la sección **Mis Reservas**. ¿Necesitas algo más?`;
    }

    case 'VER_RESERVAS': {
      if (reservasUsuario.length === 0) {
        return '📋 No tienes reservas registradas aún. ¿Te gustaría hacer una nueva reserva?';
      }

      const lista = reservasUsuario.map(r => {
        const noches = Math.ceil(
          (new Date(r.fechaSalida) - new Date(r.fechaIngreso)) / (1000 * 60 * 60 * 24)
        );
        return `• **${r.id.slice(0, 8).toUpperCase()}** — Hab. ${r.habitacion.numero} | ${new Date(r.fechaIngreso).toLocaleDateString('es-EC')} → ${new Date(r.fechaSalida).toLocaleDateString('es-EC')} (${noches} noche${noches > 1 ? 's' : ''}) | $${parseFloat(r.precioTotal).toFixed(2)} | **${r.estado}**`;
      }).join('\n');

      return `📋 Tus reservas:\n\n${lista}\n\n¿Deseas cancelar o modificar alguna? Dime el código de la reserva.`;
    }

    case 'CONSULTAR_RESERVA': {
      const codigo = accion.reservaId.toUpperCase();
      const reserva = reservasUsuario.find(r =>
        r.id.slice(0, 8).toUpperCase() === codigo ||
        r.id.toUpperCase() === codigo
      );

      if (!reserva) {
        return `❌ No encontré una reserva con el código **${codigo}**. Escribe "ver mis reservas" para ver tus códigos.`;
      }

      const noches = Math.ceil(
        (new Date(reserva.fechaSalida) - new Date(reserva.fechaIngreso)) / (1000 * 60 * 60 * 24)
      );

      return `🔍 Detalles de tu reserva **${reserva.id.slice(0, 8).toUpperCase()}**:

🏨 Habitación ${reserva.habitacion.numero} (${reserva.habitacion.tipo})
📅 Check-in: ${new Date(reserva.fechaIngreso).toLocaleDateString('es-EC')} a las 14:00
📅 Check-out: ${new Date(reserva.fechaSalida).toLocaleDateString('es-EC')} a las 12:00
🌙 ${noches} noche${noches > 1 ? 's' : ''}
💰 Total: $${parseFloat(reserva.precioTotal).toFixed(2)}
📌 Estado: **${reserva.estado}**
${reserva.notas ? `📝 Notas: ${reserva.notas}` : ''}

¿Deseas modificar las fechas o cancelar esta reserva?`;
    }

    case 'CANCELAR_RESERVA': {
      const codigo = accion.reservaId.toUpperCase();
      const reserva = reservasUsuario.find(r =>
        r.id.slice(0, 8).toUpperCase() === codigo ||
        r.id.toUpperCase() === codigo
      );

      if (!reserva) {
        return `❌ No encontré la reserva **${codigo}**. Escribe "ver mis reservas" para ver tus códigos.`;
      }

      if (['COMPLETADA', 'CANCELADA'].includes(reserva.estado)) {
        return `⚠️ La reserva **${codigo}** no puede cancelarse porque está en estado **${reserva.estado}**.`;
      }

      await reservaRepository.updateEstado(reserva.id, 'CANCELADA');

      return `✅ Tu reserva **${codigo}** ha sido cancelada exitosamente.

🏨 Habitación ${reserva.habitacion.numero}
📅 Fechas: ${new Date(reserva.fechaIngreso).toLocaleDateString('es-EC')} → ${new Date(reserva.fechaSalida).toLocaleDateString('es-EC')}

Si necesitas hacer una nueva reserva, con gusto te ayudo. 😊`;
    }

    case 'MODIFICAR_RESERVA': {
      const codigo = accion.reservaId.toUpperCase();
      const reserva = reservasUsuario.find(r =>
        r.id.slice(0, 8).toUpperCase() === codigo ||
        r.id.toUpperCase() === codigo
      );

      if (!reserva) {
        return `❌ No encontré la reserva **${codigo}**. Escribe "ver mis reservas" para ver tus códigos.`;
      }

      if (['COMPLETADA', 'CANCELADA'].includes(reserva.estado)) {
        return `⚠️ La reserva **${codigo}** no puede modificarse porque está en estado **${reserva.estado}**.`;
      }

      const ingreso = new Date(accion.fechaIngreso);
      const salida = new Date(accion.fechaSalida);

      if (ingreso >= salida) {
        return '⚠️ La fecha de salida debe ser posterior a la de ingreso. Por favor verifica las fechas.';
      }
      if (ingreso < new Date()) {
        return '⚠️ La fecha de ingreso no puede ser en el pasado.';
      }

      const habitacion = await habitacionRepository.findById(reserva.habitacionId);
      const noches = Math.ceil((salida - ingreso) / (1000 * 60 * 60 * 24));
      const nuevoPrecio = parseFloat(habitacion.precioPorNoche) * noches;

      await reservaRepository.updateEstado(reserva.id, reserva.estado);
      await import('../config/prisma.js').then(({ default: prisma }) =>
        prisma.reserva.update({
          where: { id: reserva.id },
          data: {
            fechaIngreso: ingreso,
            fechaSalida: salida,
            precioTotal: nuevoPrecio,
          },
        })
      );

      return `✅ Fechas modificadas exitosamente en la reserva **${codigo}**:

🏨 Habitación ${reserva.habitacion.numero}
📅 Nuevo check-in: ${ingreso.toLocaleDateString('es-EC')} a las 14:00
📅 Nuevo check-out: ${salida.toLocaleDateString('es-EC')} a las 12:00
🌙 ${noches} noche${noches > 1 ? 's' : ''}
💰 Nuevo total: $${nuevoPrecio.toFixed(2)}

¿Hay algo más en que pueda ayudarte?`;
    }

    default:
      return 'No pude entender la acción solicitada. ¿Puedes reformular tu pregunta?';
  }
}
