// src/services/reserva.service.js
// Capa de Lógica de Negocio — reglas de reservas, cálculo de precios

import { reservaRepository } from '../repositories/reserva.repository.js';
import { habitacionRepository } from '../repositories/habitacion.repository.js';

export const reservaService = {

  async listarTodas() {
    return reservaRepository.findAll();
  },

  async listarPorUsuario(usuarioId) {
    return reservaRepository.findByUsuarioId(usuarioId);
  },

  async obtenerPorId(id) {
    const reserva = await reservaRepository.findById(id);
    if (!reserva) throw new Error('Reserva no encontrada');
    return reserva;
  },

  async crear(usuarioId, { habitacionId, fechaIngreso, fechaSalida, numPersonas, notas }) {
    // 1. Validar fechas
    const ingreso = new Date(fechaIngreso);
    const salida = new Date(fechaSalida);

    if (ingreso >= salida) throw new Error('La fecha de salida debe ser posterior a la de ingreso');
    if (ingreso < new Date()) throw new Error('La fecha de ingreso no puede ser en el pasado');

    // 2. Verificar que la habitación existe
    const habitacion = await habitacionRepository.findById(habitacionId);
    if (!habitacion) throw new Error('Habitación no encontrada');

    // 3. Verificar capacidad
    if (numPersonas > habitacion.capacidad) {
      throw new Error(`La habitación soporta máximo ${habitacion.capacidad} personas`);
    }

    // 4. Verificar disponibilidad en esas fechas
    const disponibles = await habitacionRepository.findDisponibles(ingreso, salida, 1);
    const estaDisponible = disponibles.some((h) => h.id === habitacionId);
    if (!estaDisponible) {
      throw new Error('La habitación no está disponible en las fechas seleccionadas');
    }

    // 5. Calcular precio total
    const noches = Math.ceil((salida - ingreso) / (1000 * 60 * 60 * 24));
    const precioTotal = parseFloat(habitacion.precioPorNoche) * noches;

    // 6. Crear la reserva
    return reservaRepository.create({
      usuarioId,
      habitacionId,
      fechaIngreso: ingreso,
      fechaSalida: salida,
      numPersonas: parseInt(numPersonas),
      precioTotal,
      notas,
      estado: 'PENDIENTE',
    });
  },

  async cancelar(id, usuarioId) {
    const reserva = await this.obtenerPorId(id);

    // Solo el dueño de la reserva o un admin puede cancelarla
    if (reserva.usuarioId !== usuarioId) {
      throw new Error('No tienes permiso para cancelar esta reserva');
    }

    // No se puede cancelar una reserva ya completada
    if (['COMPLETADA', 'CANCELADA'].includes(reserva.estado)) {
      throw new Error(`No se puede cancelar una reserva en estado ${reserva.estado}`);
    }

    return reservaRepository.updateEstado(id, 'CANCELADA');
  },

  async cambiarEstado(id, estado) {
    const estadosValidos = ['PENDIENTE', 'CONFIRMADA', 'ACTIVA', 'COMPLETADA', 'CANCELADA'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado inválido. Use: ${estadosValidos.join(', ')}`);
    }
    await this.obtenerPorId(id);
    return reservaRepository.updateEstado(id, estado);
  },
};
