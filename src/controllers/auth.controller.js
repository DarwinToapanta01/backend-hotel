// src/controllers/auth.controller.js
// Capa de Controladores — recibe HTTP, delega a servicios, responde JSON

import { authService } from '../services/auth.service.js';

export const authController = {

  async registrar(req, res) {
    try {
      const resultado = await authService.registrar(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const resultado = await authService.login(req.body);
      res.json(resultado);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  async perfil(req, res) {
    try {
      const { usuarioRepository } = await import('../repositories/usuario.repository.js');
      const usuario = await usuarioRepository.findById(req.usuario.id);
      res.json({ 
        usuario: { 
          id: usuario.id, 
          nombre: usuario.nombre, 
          email: usuario.email, 
          rol: usuario.rol, 
          telefono: usuario.telefono 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el perfil' });
    }
  },

  async actualizarPerfil(req, res) {
    try {
      // req.usuario.id viene del middleware
      const resultado = await authService.actualizarPerfil(req.usuario.id, req.body);
      res.json({ mensaje: 'Perfil actualizado exitosamente', ...resultado });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
