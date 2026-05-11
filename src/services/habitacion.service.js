// src/services/habitacion.service.js
// Capa de Lógica de Negocio — reglas y validaciones de habitaciones

import { habitacionRepository } from '../repositories/habitacion.repository.js';

export const habitacionService = {

  async listarTodas() {
    return habitacionRepository.findAll();
  },

  async obtenerPorId(id) {
    const habitacion = await habitacionRepository.findById(id);
    if (!habitacion) throw new Error('Habitación no encontrada');
    return habitacion;
  },

  async buscarDisponibles(fechaIngreso, fechaSalida, capacidad) {
    // Validación de fechas
    const ingreso = new Date(fechaIngreso);
    const salida = new Date(fechaSalida);

    if (isNaN(ingreso) || isNaN(salida)) {
      throw new Error('Las fechas proporcionadas no son válidas');
    }
    if (ingreso >= salida) {
      throw new Error('La fecha de salida debe ser posterior a la de ingreso');
    }
    if (ingreso < new Date()) {
      throw new Error('La fecha de ingreso no puede ser en el pasado');
    }

    return habitacionRepository.findDisponibles(ingreso, salida, capacidad);
  },

  async crear(data) {
    // Validar que el número de habitación no esté duplicado
    const todas = await habitacionRepository.findAll();
    const existe = todas.some((h) => h.numero === data.numero);
    if (existe) throw new Error(`Ya existe una habitación con el número ${data.numero}`);

    return habitacionRepository.create({
      ...data,
      precioPorNoche: parseFloat(data.precioPorNoche),
      capacidad: parseInt(data.capacidad),
    });
  },

  async actualizar(id, data) {
    await this.obtenerPorId(id); // Verifica que existe
    return habitacionRepository.update(id, data);
  },

  async cambiarEstado(id, estado) {
    const estadosValidos = ['DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado inválido. Use: ${estadosValidos.join(', ')}`);
    }
    return habitacionRepository.updateEstado(id, estado);
  },

  async eliminar(id) {
    await this.obtenerPorId(id); // Verifica que existe
    return habitacionRepository.delete(id);
  },
};
