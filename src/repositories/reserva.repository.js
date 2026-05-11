// src/repositories/reserva.repository.js
// Capa de Acceso a Datos — solo consultas, sin lógica de negocio

import prisma from '../config/prisma.js';

export const reservaRepository = {

  async findAll() {
    return prisma.reserva.findMany({
      include: { usuario: true, habitacion: true, pago: true },
      orderBy: { creadoEn: 'desc' },
    });
  },

  async findById(id) {
    return prisma.reserva.findUnique({
      where: { id },
      include: { usuario: true, habitacion: true, pago: true },
    });
  },

  async findByUsuarioId(usuarioId) {
    return prisma.reserva.findMany({
      where: { usuarioId },
      include: { habitacion: true, pago: true },
      orderBy: { creadoEn: 'desc' },
    });
  },

  async create(data) {
    return prisma.reserva.create({
      data,
      include: { habitacion: true, usuario: true },
    });
  },

  async updateEstado(id, estado) {
    return prisma.reserva.update({
      where: { id },
      data: { estado },
    });
  },

  async delete(id) {
    return prisma.reserva.delete({ where: { id } });
  },
};
