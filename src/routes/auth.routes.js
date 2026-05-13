// src/routes/auth.routes.js
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/registro', authController.registrar);
router.post('/login', authController.login);
router.get('/perfil', authMiddleware, authController.perfil);
router.patch('/perfil', authMiddleware, authController.actualizarPerfil);

export default router;
