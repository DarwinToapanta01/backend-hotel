// src/app.js
// Configuración principal de Express

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import habitacionRoutes from './routes/habitacion.routes.js';
import reservaRoutes from './routes/reserva.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';

const app = express();

// Middlewares globales
app.use(cors({ origin: 'http://localhost:5173' })); // Puerto de Vite
app.use(express.json());

// Rutas — Capa de Controladores
app.use('/api/auth', authRoutes);
app.use('/api/habitaciones', habitacionRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'HotelBot API funcionando' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
