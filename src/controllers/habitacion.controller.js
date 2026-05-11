// src/controllers/habitacion.controller.js
// Capa de Controladores — recibe HTTP, delega a servicios, responde JSON

import { habitacionService } from '../services/habitacion.service.js';

export const habitacionController = {

  async listar(req, res) {
    try {
      const habitaciones = await habitacionService.listarTodas();
      res.json(habitaciones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async buscarDisponibles(req, res) {
    try {
      const { fechaIngreso, fechaSalida, capacidad } = req.query;
      if (!fechaIngreso || !fechaSalida) {
        return res.status(400).json({ error: 'fechaIngreso y fechaSalida son requeridas' });
      }
      const habitaciones = await habitacionService.buscarDisponibles(
        fechaIngreso,
        fechaSalida,
        capacidad ? parseInt(capacidad) : 1
      );
      res.json(habitaciones);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async obtener(req, res) {
    try {
      const habitacion = await habitacionService.obtenerPorId(req.params.id);
      res.json(habitacion);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  async crear(req, res) {
    try {
      const habitacion = await habitacionService.crear(req.body);
      res.status(201).json(habitacion);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async actualizar(req, res) {
    try {
      const habitacion = await habitacionService.actualizar(req.params.id, req.body);
      res.json(habitacion);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async cambiarEstado(req, res) {
    try {
      const { estado } = req.body;
      const habitacion = await habitacionService.cambiarEstado(req.params.id, estado);
      res.json(habitacion);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async eliminar(req, res) {
    try {
      await habitacionService.eliminar(req.params.id);
      res.json({ mensaje: 'Habitación eliminada correctamente' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
