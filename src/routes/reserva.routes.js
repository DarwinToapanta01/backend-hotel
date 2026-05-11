// src/routes/reserva.routes.js
import { Router } from 'express';
import { reservaController } from '../controllers/reserva.controller.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/mis-reservas', authMiddleware, reservaController.misReservas);
router.post('/', authMiddleware, reservaController.crear);
router.patch('/:id/cancelar', authMiddleware, reservaController.cancelar);

// Solo admin
router.get('/', authMiddleware, adminMiddleware, reservaController.listar);
router.get('/:id', authMiddleware, adminMiddleware, reservaController.obtener);
router.patch('/:id/estado', authMiddleware, adminMiddleware, reservaController.cambiarEstado);

export default router;
