# HotelBot — Backend API

Backend del sistema de gestión hotelera **HotelBot**, construido con **Node.js + Express** siguiendo una **arquitectura en capas** (Rutas → Controladores → Servicios → Repositorios → Base de Datos). Incluye autenticación JWT, gestión de habitaciones, reservas y un chatbot con IA (Groq/LLaMA 3.3).

---

## Estructura del Proyecto

```
proyecto-hotel-backend/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos (modelos y relaciones)
├── src/
│   ├── config/
│   │   ├── prisma.js          # Instancia global de PrismaClient
│   │   └── groq.js            # Instancia global del cliente Groq (IA)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── habitacion.controller.js
│   │   ├── reserva.controller.js
│   │   └── chatbot.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── habitacion.service.js
│   │   ├── reserva.service.js
│   │   └── chatbot.service.js
│   ├── repositories/
│   │   ├── usuario.repository.js
│   │   ├── habitacion.repository.js
│   │   ├── reserva.repository.js
│   │   └── chatbot.repository.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── habitacion.routes.js
│   │   ├── reserva.routes.js
│   │   └── chatbot.routes.js
│   ├── middlewares/
│   │   └── auth.middleware.js
│   ├── app.js                 # Configuración de Express (middlewares globales + rutas)
│   └── server.js              # Punto de entrada — levanta el servidor HTTP
├── prisma.config.ts
├── package.json
└── .gitignore
```

---

## Arquitectura en Capas

```
Frontend (Vite/React :5173)
        │  HTTP / JSON
        ▼
   [Routes]  ──► define los endpoints y aplica middlewares
        │
        ▼
[Controllers] ──► recibe la petición, extrae datos, responde JSON
        │
        ▼
  [Services]  ──► contiene la lógica de negocio y validaciones
        │
        ▼
[Repositories] ─► ejecuta las queries sobre la base de datos
        │
        ▼
 [Prisma ORM]  ──► mapea modelos a PostgreSQL
```

---

## Descripción de Archivos

### Punto de Entrada

#### `src/server.js`
Punto de entrada de la aplicación. Importa la app de Express y arranca el servidor en el puerto definido por la variable de entorno `PORT` (por defecto `3000`).

```
npm run dev  →  node --watch src/server.js
```

#### `src/app.js`
Configura la instancia de Express:
- Habilita **CORS** para el origen `http://localhost:5173` (frontend Vite).
- Habilita parseo de **JSON** en el body de las peticiones.
- Monta las 4 rutas principales bajo el prefijo `/api`.
- Define una ruta de salud en `GET /api/health`.
- Maneja rutas no encontradas (404) y errores globales (500).

---

### Rutas (`src/routes/`)

Las rutas conectan cada URL con su controlador y aplican los middlewares necesarios (autenticación y/o rol de administrador).

#### `auth.routes.js` — `/api/auth`

| Método | Ruta        | Acceso  | Descripción                        |
|--------|-------------|---------|-------------------------------------|
| POST   | `/registro` | Público | Crea una cuenta nueva de usuario    |
| POST   | `/login`    | Público | Inicia sesión y retorna un JWT      |
| GET    | `/perfil`   | 🔒 Auth | Retorna los datos del usuario logueado |

#### `habitacion.routes.js` — `/api/habitaciones`

| Método | Ruta               | Acceso       | Descripción                                   |
|--------|--------------------|--------------|-----------------------------------------------|
| GET    | `/`                | Público      | Lista todas las habitaciones                  |
| GET    | `/disponibles`     | Público      | Busca habitaciones disponibles por fecha      |
| GET    | `/:id`             | Público      | Obtiene una habitación específica             |
| POST   | `/`                | 🔒 Admin     | Crea una nueva habitación                     |
| PUT    | `/:id`             | 🔒 Admin     | Actualiza los datos de una habitación         |
| PATCH  | `/:id/estado`      | 🔒 Admin     | Cambia el estado de una habitación            |
| DELETE | `/:id`             | 🔒 Admin     | Elimina una habitación                        |

#### `reserva.routes.js` — `/api/reservas`

| Método | Ruta              | Acceso       | Descripción                                    |
|--------|-------------------|--------------|------------------------------------------------|
| GET    | `/mis-reservas`   | 🔒 Auth      | Lista las reservas del usuario autenticado     |
| POST   | `/`               | 🔒 Auth      | Crea una nueva reserva                         |
| PATCH  | `/:id/cancelar`   | 🔒 Auth      | Cancela una reserva propia                     |
| GET    | `/`               | 🔒 Admin     | Lista todas las reservas del sistema           |
| GET    | `/:id`            | 🔒 Admin     | Obtiene una reserva específica con detalles    |
| PATCH  | `/:id/estado`     | 🔒 Admin     | Cambia el estado de cualquier reserva          |

#### `chatbot.routes.js` — `/api/chatbot`

| Método | Ruta       | Acceso  | Descripción                                         |
|--------|------------|---------|------------------------------------------------------|
| POST   | `/message` | Público | Envía un mensaje al chatbot y recibe su respuesta   |

> El chatbot es **público** para que cualquier visitante del sitio (sin cuenta) pueda interactuar con él.

---

### Controladores (`src/controllers/`)

Reciben la petición HTTP, extraen los datos necesarios (body, params, query) y delegan al servicio correspondiente. Solo responden con JSON.

#### `auth.controller.js`
- **`registrar`** — Pasa `req.body` al servicio de registro, responde `201` con token y datos del usuario.
- **`login`** — Pasa credenciales al servicio, responde con token y perfil.
- **`perfil`** — Responde directamente con `req.usuario` (ya inyectado por el middleware).

#### `habitacion.controller.js`
- **`listar`** — Devuelve todas las habitaciones.
- **`buscarDisponibles`** — Lee `fechaIngreso`, `fechaSalida` y `capacidad` del query string y delega la búsqueda.
- **`obtener`** — Busca por `req.params.id`.
- **`crear`** — Crea una habitación con los datos del body.
- **`actualizar`** — Actualiza una habitación por ID.
- **`cambiarEstado`** — Actualiza únicamente el campo `estado` de una habitación.
- **`eliminar`** — Elimina una habitación por ID.

#### `reserva.controller.js`
- **`listar`** — Lista todas las reservas (admin).
- **`misReservas`** — Lista solo las reservas del usuario autenticado, usando `req.usuario.id`.
- **`obtener`** — Busca una reserva por ID.
- **`crear`** — Crea una reserva asociada al usuario autenticado.
- **`cancelar`** — Cancela una reserva verificando que pertenece al usuario.
- **`cambiarEstado`** — Cambia el estado de una reserva (admin).

#### `chatbot.controller.js`
- **`mensaje`** — Valida que el mensaje no esté vacío, genera o usa el `sessionId` del cliente para mantener el hilo de conversación, llama al servicio y retorna `{ reply, sessionId }`.

---

### Servicios (`src/services/`)

Contienen toda la **lógica de negocio** y **validaciones**. No saben nada de HTTP; solo reciben datos y retornan resultados o lanzan errores.

#### `auth.service.js`
- **`registrar`** — Verifica que el email no esté en uso, hashea la contraseña con **bcryptjs** (10 rondas de salt) y genera un **JWT** firmado con `JWT_SECRET` que expira en 7 días.
- **`login`** — Busca al usuario por email, compara la contraseña hasheada y genera el JWT si es válida.
- **`verificarToken`** — Verifica y decodifica un JWT (usado por el middleware).

#### `habitacion.service.js`
- **`listarTodas`** — Retorna todas las habitaciones ordenadas.
- **`obtenerPorId`** — Busca y lanza error si no existe.
- **`buscarDisponibles`** — Valida que las fechas sean coherentes y no estén en el pasado antes de consultar.
- **`crear`** — Verifica que no haya otra habitación con el mismo número.
- **`actualizar`** — Verifica que la habitación exista antes de actualizar.
- **`cambiarEstado`** — Valida que el estado sea uno de los 4 valores permitidos (`DISPONIBLE`, `OCUPADA`, `LIMPIEZA`, `MANTENIMIENTO`).
- **`eliminar`** — Verifica existencia antes de eliminar.

#### `reserva.service.js`
- **`crear`** — Ejecuta la lógica completa de negocio:
  1. Valida que `fechaSalida > fechaIngreso` y que no sea en el pasado.
  2. Verifica que la habitación exista.
  3. Verifica que la capacidad no sea excedida.
  4. Comprueba la disponibilidad real (sin solapamiento con otras reservas activas).
  5. Calcula `precioTotal = precioPorNoche × noches`.
  6. Crea la reserva con estado `PENDIENTE`.
- **`cancelar`** — Verifica que el usuario sea el dueño de la reserva y que no esté `COMPLETADA` o `CANCELADA`.
- **`cambiarEstado`** — Valida que el nuevo estado sea uno de los 5 valores permitidos.

#### `chatbot.service.js`
Orquesta el flujo completo del chatbot con IA:
1. Guarda el mensaje del usuario en la BD.
2. Obtiene el historial reciente de la conversación (últimos 10 mensajes).
3. Consulta las habitaciones en tiempo real para dar información actualizada al modelo.
4. Inyecta el contexto real del hotel en el **system prompt**.
5. Llama a la API de **Groq** con el modelo `llama-3.3-70b-versatile`, pasando historial + contexto + mensaje actual.
6. Guarda la respuesta del asistente en la BD.
7. Retorna la respuesta al controlador.

> El system prompt instruye al chatbot a: responder solo en español, enfocarse en temas del hotel, respetar las políticas (check-in/out, cancelaciones, mascotas, pagos) e incluir información de habitaciones en tiempo real.

---

### Repositorios (`src/repositories/`)

Son la **única capa que interactúa con Prisma/PostgreSQL**. No contienen lógica de negocio, solo queries.

#### `usuario.repository.js`
- `findById(id)` — Busca usuario por UUID.
- `findByEmail(email)` — Busca usuario por email (usado en login/registro).
- `create(data)` — Crea un nuevo usuario.
- `update(id, data)` — Actualiza un usuario.

#### `habitacion.repository.js`
- `findAll()` — Todas las habitaciones ordenadas por número.
- `findById(id)` — Habitación específica.
- `findDisponibles(fechaIngreso, fechaSalida, capacidad)` — Usa una **query compleja** que excluye habitaciones que ya tienen reservas activas (`PENDIENTE`, `CONFIRMADA` o `ACTIVA`) que se solapan con el rango de fechas solicitado.
- `create(data)` — Crea habitación.
- `update(id, data)` — Actualiza habitación.
- `updateEstado(id, estado)` — Actualiza solo el campo `estado`.
- `delete(id)` — Elimina habitación.

#### `reserva.repository.js`
- `findAll()` — Todas las reservas con datos del usuario, habitación y pago incluidos.
- `findById(id)` — Reserva específica con relaciones.
- `findByUsuarioId(usuarioId)` — Reservas de un usuario con habitación y pago.
- `create(data)` — Crea reserva con relaciones incluidas en la respuesta.
- `updateEstado(id, estado)` — Actualiza solo el estado.
- `delete(id)` — Elimina reserva.

#### `chatbot.repository.js`
- `findOrCreateConversacion(sessionId)` — Usa **upsert**: crea una conversación si no existe o la reutiliza por `sessionId`.
- `getMensajes(sessionId, limite)` — Obtiene los últimos N mensajes de una conversación, en orden cronológico.
- `guardarMensaje(sessionId, rol, contenido)` — Persiste un mensaje (del usuario o del asistente) en la BD.

---

### Middlewares (`src/middlewares/`)

#### `auth.middleware.js`
Contiene dos funciones que se encadenan como guardias en las rutas:

- **`authMiddleware`** — Lee el header `Authorization: Bearer <token>`, verifica el JWT con `authService.verificarToken()` e inyecta el payload decodificado en `req.usuario`. Retorna `401` si no hay token o es inválido.
- **`adminMiddleware`** — Se usa **después** de `authMiddleware`. Verifica que `req.usuario.rol === 'ADMIN'`. Retorna `403` si el usuario no es administrador.

---

### Configuración (`src/config/`)

#### `config/prisma.js`
Crea y exporta la instancia global de **PrismaClient** con el adaptador `PrismaPg`, que conecta a PostgreSQL usando la variable de entorno `DIRECT_URL`. Se usa como singleton importado por todos los repositorios.

#### `config/groq.js`
Crea y exporta el cliente de **Groq SDK** con la API key desde la variable `GROQ_API_KEY`. Usado exclusivamente por `chatbot.service.js`.

---

### Base de Datos (`prisma/schema.prisma`)

Define el esquema completo de la base de datos en **PostgreSQL** con los siguientes modelos:

| Modelo          | Tabla           | Descripción                                                      |
|-----------------|-----------------|------------------------------------------------------------------|
| `Usuario`       | `usuarios`      | Cuenta de un cliente o administrador. Tiene `rol` (CLIENTE/ADMIN). |
| `Habitacion`    | `habitaciones`  | Cuarto del hotel con tipo, estado, precio, capacidad y amenidades. |
| `Reserva`       | `reservas`      | Vincula un usuario con una habitación en un rango de fechas.      |
| `Pago`          | `pagos`         | Registro del pago asociado a una reserva (1:1).                   |
| `Conversacion`  | `conversaciones`| Hilo de chat identificado por `sessionId`.                        |
| `Mensaje`       | `mensajes`      | Mensaje individual dentro de una conversación (user/assistant).   |

#### Enumeraciones definidas

| Enum              | Valores posibles                                          |
|-------------------|-----------------------------------------------------------|
| `Rol`             | `CLIENTE`, `ADMIN`                                        |
| `TipoHabitacion`  | `SIMPLE`, `DOBLE`, `SUITE`, `FAMILIAR`                   |
| `EstadoHabitacion`| `DISPONIBLE`, `OCUPADA`, `LIMPIEZA`, `MANTENIMIENTO`      |
| `EstadoReserva`   | `PENDIENTE`, `CONFIRMADA`, `ACTIVA`, `COMPLETADA`, `CANCELADA` |
| `EstadoPago`      | `PENDIENTE`, `COMPLETADO`, `FALLIDO`, `REEMBOLSADO`       |
| `MetodoPago`      | `EFECTIVO`, `TARJETA`, `TRANSFERENCIA`                   |
| `RolMensaje`      | `user`, `assistant`                                       |

---

## Flujo del Chatbot

```
Frontend envía POST /api/chatbot/message
  { message: "¿Qué habitaciones tienen disponibles?", sessionId: "abc-123" }

  1. chatbot.controller → valida el mensaje, asigna sessionId
  2. chatbot.service.procesarMensaje(sessionId, mensaje)
     ├── Guarda mensaje "user" en BD
     ├── Carga historial (últimos 10 msgs)
     ├── Carga habitaciones en tiempo real desde BD
     ├── Construye system prompt con políticas + habitaciones actuales
     └── Llama a Groq API (llama-3.3-70b-versatile)
         → Guarda respuesta "assistant" en BD
         → Retorna { reply: "...", sessionId: "abc-123" }
```

---

## Flujo de Autenticación

```
1. POST /api/auth/registro  →  crea usuario, retorna JWT + perfil
2. POST /api/auth/login     →  valida credenciales, retorna JWT + perfil

3. Rutas protegidas:
   Header: Authorization: Bearer <JWT>
       │
       ▼
   authMiddleware → verifica JWT → inyecta req.usuario
       │
       ▼
   adminMiddleware (opcional) → verifica rol ADMIN
```

---

## Dependencias

| Paquete                  | Versión  | Uso                                              |
|--------------------------|----------|--------------------------------------------------|
| `express`                | ^4.21    | Framework HTTP                                   |
| `cors`                   | ^2.8     | Habilita CORS para el frontend en `:5173`        |
| `dotenv`                 | ^16.4    | Carga variables de entorno desde `.env`          |
| `@prisma/client`         | ^7.8     | ORM para PostgreSQL                              |
| `@prisma/adapter-pg`     | ^7.8     | Adaptador de conexión directa a PostgreSQL       |
| `bcryptjs`               | ^3.0     | Hasheo seguro de contraseñas                     |
| `jsonwebtoken`           | ^9.0     | Generación y verificación de tokens JWT          |
| `groq-sdk`               | ^1.1     | Cliente para la API de Groq (LLaMA 3.3)         |
| `@google/generative-ai`  | ^0.24    | SDK de Google Gemini (disponible para uso futuro)|
| `uuid`                   | ^14.0    | Generación de UUIDs para sesiones del chatbot    |
| `prisma` *(dev)*         | ^7.8     | CLI para migraciones y generación del cliente    |

---

## Comandos

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start

# Generar cliente de Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev

# Ver la BD en el navegador
npx prisma studio
```

---

## 🌐 Variables de Entorno (`.env`)

```env
PORT=3000
DATABASE_URL=postgresql://...    # URL de conexión con pooling (Prisma Accelerate)
DIRECT_URL=postgresql://...      # URL de conexión directa (adaptador PrismaPg)
JWT_SECRET=tu_clave_secreta
GROQ_API_KEY=tu_api_key_de_groq
```
