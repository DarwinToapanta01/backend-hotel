// src/repositories/usuario.repository.js
// Capa de Acceso a Datos — solo consultas, sin lógica de negocio

import prisma from '../config/prisma.js';

export const usuarioRepository = {

  async findById(id) {
    return prisma.usuario.findUnique({ where: { id } });
  },

  async findByEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  async create(data) {
    return prisma.usuario.create({ data });
  },

  async update(id, data) {
    return prisma.usuario.update({ where: { id }, data });
  },
};
