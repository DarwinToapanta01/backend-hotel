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
      },
    };
  },

  verificarToken(token) {
    return jwt.verify(token, JWT_SECRET);
  },
};
