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
    res.json({ usuario: req.usuario });
  },
};
