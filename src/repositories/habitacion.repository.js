// src/repositories/habitacion.repository.js
// Capa de Acceso a Datos — solo consultas, sin lógica de negocio

import prisma from '../config/prisma.js';

export const habitacionRepository = {

  async findAll() {
    return prisma.habitacion.findMany({
      orderBy: { numero: 'asc' },
    });
  },

  async findById(id) {
    return prisma.habitacion.findUnique({
      where: { id },
    });
  },

  async findDisponibles(fechaIngreso, fechaSalida, capacidad) {
    // Busca habitaciones que NO tengan reservas activas en ese rango de fechas
    return prisma.habitacion.findMany({
      where: {
        estado: 'DISPONIBLE',
        capacidad: { gte: capacidad ?? 1 },
        reservas: {
          none: {
            estado: { in: ['PENDIENTE', 'CONFIRMADA', 'ACTIVA'] },
            AND: [
              { fechaIngreso: { lt: fechaSalida } },
              { fechaSalida: { gt: fechaIngreso } },
            ],
          },
        },
      },
      orderBy: { precioPorNoche: 'asc' },
    });
  },

  async create(data) {
    return prisma.habitacion.create({ data });
  },

  async update(id, data) {
    return prisma.habitacion.update({
      where: { id },
      data,
    });
  },

  async updateEstado(id, estado) {
    return prisma.habitacion.update({
      where: { id },
      data: { estado },
    });
  },

  async delete(id) {
    return prisma.habitacion.delete({ where: { id } });
  },
};
