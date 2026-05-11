// src/routes/habitacion.routes.js
import { Router } from 'express';
import { habitacionController } from '../controllers/habitacion.controller.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Públicas
router.get('/', habitacionController.listar);
router.get('/disponibles', habitacionController.buscarDisponibles);
router.get('/:id', habitacionController.obtener);

// Solo admin
router.post('/', authMiddleware, adminMiddleware, habitacionController.crear);
router.put('/:id', authMiddleware, adminMiddleware, habitacionController.actualizar);
router.patch('/:id/estado', authMiddleware, adminMiddleware, habitacionController.cambiarEstado);
router.delete('/:id', authMiddleware, adminMiddleware, habitacionController.eliminar);

export default router;
