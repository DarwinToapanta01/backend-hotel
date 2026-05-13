// src/services/auth.service.js
// Capa de Lógica de Negocio — registro, login y JWT

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usuarioRepository } from '../repositories/usuario.repository.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '7d';

export const authService = {

  async registrar({ nombre, email, password, telefono }) {
    // Verificar si el email ya existe
    const existe = await usuarioRepository.findByEmail(email);
    if (existe) throw new Error('Ya existe una cuenta con ese email');

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear el usuario
    const usuario = await usuarioRepository.create({
      nombre,
      email,
      password: passwordHash,
      telefono,
      rol: 'CLIENTE',
    });

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
      },
    };
  },

  async login({ email, password }) {
    // Buscar usuario
    const usuario = await usuarioRepository.findByEmail(email);
    if (!usuario) throw new Error('Credenciales incorrectas');

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) throw new Error('Credenciales incorrectas');

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
      },
    };
  },

  async actualizarPerfil(usuarioId, { nombre, telefono, passwordActual, nuevaPassword }) {
    const usuario = await usuarioRepository.findById(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado');

    const dataToUpdate = {};
    if (nombre) dataToUpdate.nombre = nombre;
    if (telefono !== undefined) dataToUpdate.telefono = telefono;

    if (passwordActual && nuevaPassword) {
      const passwordValida = await bcrypt.compare(passwordActual, usuario.password);
      if (!passwordValida) throw new Error('La contraseña actual es incorrecta');
      dataToUpdate.password = await bcrypt.hash(nuevaPassword, 10);
    }

    const usuarioActualizado = await usuarioRepository.update(usuarioId, dataToUpdate);

    // No generamos un nuevo token por defecto, a menos que cambie rol o email.
    // Solo retornamos la info actualizada.
    return {
      usuario: {
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol,
        telefono: usuarioActualizado.telefono,
      },
    };
  },

  verificarToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },
};
