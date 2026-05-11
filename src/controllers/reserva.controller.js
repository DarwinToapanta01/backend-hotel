// src/controllers/reserva.controller.js
import { reservaService } from '../services/reserva.service.js';

export const reservaController = {

  async listar(req, res) {
    try {
      const reservas = await reservaService.listarTodas();
      res.json(reservas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async misReservas(req, res) {
    try {
      const reservas = await reservaService.listarPorUsuario(req.usuario.id);
      res.json(reservas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtener(req, res) {
    try {
      const reserva = await reservaService.obtenerPorId(req.params.id);
      res.json(reserva);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  async crear(req, res) {
    try {
      const reserva = await reservaService.crear(req.usuario.id, req.body);
      res.status(201).json(reserva);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async cancelar(req, res) {
    try {
      const reserva = await reservaService.cancelar(req.params.id, req.usuario.id);
      res.json(reserva);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async cambiarEstado(req, res) {
    try {
      const reserva = await reservaService.cambiarEstado(req.params.id, req.body.estado);
      res.json(reserva);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
