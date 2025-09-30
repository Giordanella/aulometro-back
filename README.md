# Aulómetro Back-end (Node.js + Express + Sequelize)

API REST para gestión de aulas, usuarios y reservas con flujo de aprobación. Este README documenta cómo configurar ambientes (dev/test/prod), correr el proyecto, ejecutar pruebas, y el diseño de la funcionalidad de reservas.

## Stack

- Node.js + Express 5
- Sequelize 6
  - Dev/Test: SQLite (rápido, sin dependencias externas)
  - Producción: MySQL
- JWT para auth
- Jest para tests

## Estructura relevante

- `src/`
  - `app.js`: servidor Express y montaje de rutas
  - `config/db.js`: instancia de Sequelize
  - `config/roles.js`: roles de usuario
  - `config/reservas.js`: constantes de reservas y utilidades
  - `models/`: modelos Sequelize (`user`, `aula`, `reserva`)
  - `services/`: lógica de negocio (`auth`, `user`, `aula`, `reserva`)
  - `controllers/`: controladores Express
  - `routes/`: rutas Express (`/auth`, `/users`, `/aulas`, `/busqueda`, `/reservas`)
  - `middlewares/authMiddleware.js`: validación JWT/rol
- `Tests/`: pruebas Jest (servicios y modelos)
- `.env`, `.env.test`: variables de entorno
- `package.json`: scripts y configuración Jest

## Variables de entorno

Configuralas en `.env` (desarrollo), `.env.test` (tests) y `.env`/secrets para producción. Claves soportadas por `src/config/db.js`:

- `DB_DIALECT`: `sqlite` | `mysql` (por defecto `mysql` si no se define)
- Para SQLite:
  - `DB_STORAGE`: ruta del archivo (por ej. `./dev.sqlite`) o `:memory:`
- Para MySQL:
  - `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`
- `PORT`: puerto HTTP (por defecto 3000 si no se define)
- `FRONTEND_URL`: origen permitido en CORS (por ejemplo `http://localhost:5173`)
- `JWT_SECRET`: secreto para firmar tokens

Ejemplo `.env` (desarrollo con SQLite persistente):

```
DB_DIALECT=sqlite
DB_STORAGE=./dev.sqlite
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-strong-secret
```

Ejemplo `.env.prod` (producción con MySQL):

```
DB_DIALECT=mysql
DB_NAME=aulometro
DB_USER=<user>
DB_PASS=<password>
DB_HOST=<host>
DB_PORT=3306
PORT=3000
FRONTEND_URL=https://aulometro-front.example.com
JWT_SECRET=<super-secret>
```

Ejemplo `.env.test` (tests; por defecto en memoria con SQLite):

```
DB_DIALECT=sqlite
DB_STORAGE=:memory:
PORT=3999
FRONTEND_URL=http://localhost:5173
JWT_SECRET=testing-secret
```

> Importante: no apuntes las pruebas a la base de datos de producción. Por defecto los tests usan SQLite en memoria. Si preferís MySQL para tests, comentá las líneas de SQLite y definí `DB_NAME`, `DB_USER`, etc. en `.env.test`.

## Instalación y ejecución

1) Instalar dependencias

```
npm install
```

2) Ejecutar en desarrollo

```
npm run dev
```

3) Ejecutar en modo producción (local)

```
npm start
```

La conexión a base de datos se toma según `DB_DIALECT`:

- Dev/Test: `sqlite` (no requiere servidor externo)
- Prod: `mysql` (recomendado para producción)

Actualmente se usa `sequelize.sync()` para crear tablas automáticamente en dev/test. En producción, se recomienda reemplazar `sync` por migraciones administradas (sequelize-cli o umzug) para cambios controlados de esquema.

## Pruebas (Jest)

- Script de test (configurado): usa `dotenv -e .env.test` y `--runInBand` para ejecutar en serie y aislar entornos.

```
npm test
```

- Ubicación de tests: `Tests/**` y archivos `*.test.js`/`*.spec.js`.
- Evita carreras sobre la DB: `--runInBand` ejecuta suites en serie.
- Debug de recursos abiertos: `npm test -- --detectOpenHandles`.

### Aislamiento de base de datos de test

- `package.json` configura `npm test` para cargar `.env.test` (con `dotenv-cli`).
- Por defecto, `.env.test` usa SQLite en memoria: no se necesita ningún servicio externo y es muy rápido.
- Opcional: si querés usar MySQL para tests, definí `DB_DIALECT=mysql` y usá una base exclusiva de testing.

Ejemplo de `docker-compose.yml` (opcional):

```
services:
  mysql-test:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: aulometro_test
    ports:
      - "3307:3306"
```

Luego apunta `.env.test` a `DB_HOST=127.0.0.1` y `DB_PORT=3307`.

## Autenticación y roles

- `login` devuelve JWT (24h). Rutas protegidas usan `Authorization: Bearer <token>`.
- Roles:
  - `DOCENTE`: docentes
  - `DIRECTIVO`: directivos
  - `AUTHENTICATED`: cualquier usuario logueado
  - `PUBLIC`: rutas públicas

## Funcionalidad de reservas

Modelo `Reserva` (`src/models/reserva.js`):
- `aulaId`, `solicitanteId`, `aprobadoPorId?`
- `diaSemana` (1=lunes .. 7=domingo)
- `horaInicio`, `horaFin` (TIME, se normaliza `HH:mm` -> `HH:mm:ss`)
- `estado`: `PENDIENTE`, `APROBADA`, `RECHAZADA`, `CANCELADA`
- Validación: `horaFin > horaInicio`

Rutas (`src/routes/reservas.js`):
- POST `/reservas` (DOCENTE): crea reserva simple o batch
  - Simple: `{ aulaId, diaSemana, horaInicio, horaFin, observaciones? }`
  - Batch: `{ aulaId, reservas: [{ diaSemana, horaInicio, horaFin, observaciones? }, ...] }`
- GET `/reservas/propias` (DOCENTE): reservas del usuario autenticado
- GET `/reservas/pendientes` (DIRECTIVO): reservas en estado pendiente
- POST `/reservas/:id/aprobar` (DIRECTIVO)
- POST `/reservas/:id/rechazar` (DIRECTIVO) `{ motivo? }`
- POST `/reservas/:id/cancelar` (DOCENTE dueño)
- GET `/reservas/disponibilidad` (AUTHENTICATED): query `{ aulaId, diaSemana, horaInicio, horaFin }` → `{ available, conflicts }`
- GET `/reservas/:id` (AUTHENTICATED)

Reglas de disponibilidad:
- Solo bloquean disponibilidad reservas `APROBADAS`.
- Conflicto de franja cuando `[inicioA, finA)` solapa con `[inicioB, finB)` (`inicioA < finB && inicioB < finA`).
- Franjas adyacentes (fin == inicio) están permitidas.

Flujo de aprobación:
- Docente crea reserva(s) → `PENDIENTE`.
- Directivo aprueba/rechaza. Al aprobar se revalida conflicto por si se ocupó el hueco mientras tanto.

Batch atómico (transaccional):
- `crearReservaMultiple` valida solapamientos internos (mismo día) antes de tocar la DB.
- Crea todas las franjas en una transacción; si alguna falla, se hace rollback.

DTOs de entrada/salida (`src/dtos/dtos.js`):
- `parseCreateReservaDTO`, `parseCreateReservaBatchDTO`: validan y normalizan input.
- `toReservaDTO`: estandariza salida para el front.

## Despliegue a producción

- Variables de entorno seguras (`JWT_SECRET`, credenciales MySQL)
- CORS: `FRONTEND_URL` al dominio del front
- DB: preferible migraciones en vez de `sequelize.sync()` en prod
- Logging/observabilidad (recomendable): morgan, Winston, etc.
- Asegurar cabeceras y reverse proxy (Nginx/Cloud, HTTPS)

## Troubleshooting

- “Your test suite must contain at least one test”: agrega al menos un test a la suite.
- “A worker process has failed to exit gracefully”: corre con `--detectOpenHandles` y revisa conexiones abiertas o timers.
- Errores de permiso en DB durante tests: evita `sync({ force: true })` o usa una DB de test con suficientes privilegios.
- No ejecutes `npm test` apuntando a producción.

## Endpoints de ejemplo

Los endpoints protegidos requieren `Authorization: Bearer <token>` obtenido en `/login`.

### Auth
- POST `/login` (PUBLIC)
  - Body:
    ```json
    { "email": "doc@test.com", "password": "123456" }
    ```
  - Respuesta: `{ token, user }`

### Users (requiere DIRECTIVO, salvo `/users/current`)
- GET `/users/current` (AUTHENTICATED): usuario actual del token
- GET `/users` (DIRECTIVO): lista todos
- GET `/users/docentes` (DIRECTIVO): lista usuarios con rol DOCENTE
- GET `/users/:id` (DIRECTIVO)
- POST `/users` (DIRECTIVO)
  - Body:
    ```json
    { "name": "Nuevo", "email": "nuevo@test.com", "password": "123456", "role": "DOCENTE" }
    ```
- PUT `/users/:id` (DIRECTIVO)
  - Body (ej.):
    ```json
    { "name": "Nombre Actualizado" }
    ```
- DELETE `/users/:id` (DIRECTIVO)

### Aulas
- GET `/aulas` (AUTHENTICATED)
- GET `/aulas/:id` (AUTHENTICATED)
- POST `/aulas` (DIRECTIVO)
  - Body:
    ```json
    { "numero": 112, "ubicacion": "P1", "capacidad": 30, "computadoras": 10, "tieneProyector": true }
    ```
- PUT `/aulas/:id` (DIRECTIVO)
  - Body (ej.):
    ```json
    { "capacidad": 32 }
    ```
- DELETE `/aulas/:id` (DIRECTIVO)

### Búsqueda
- GET `/busqueda/aulas` (AUTHENTICATED)
  - Query (ej.): `?numero=210&ubicacion=P2&capacidadMin=10&computadorasMin=0&tieneProyector=true`

### Reservas
- POST `/reservas` (DOCENTE)
  - Simple:
    ```json
    { "aulaId": 1, "diaSemana": 4, "horaInicio": "16:00", "horaFin": "18:00", "observaciones": "Clase" }
    ```
  - Batch:
    ```json
    { "aulaId": 1, "reservas": [
      { "diaSemana": 1, "horaInicio": "12:30", "horaFin": "14:30" },
      { "diaSemana": 4, "horaInicio": "16:00", "horaFin": "18:00" }
    ]}
    ```
- GET `/reservas/propias` (DOCENTE)
- GET `/reservas/pendientes` (DIRECTIVO)
- POST `/reservas/:id/aprobar` (DIRECTIVO)
- POST `/reservas/:id/rechazar` (DIRECTIVO)
  - Body opcional: `{ "motivo": "No disponible" }`
- POST `/reservas/:id/cancelar` (DOCENTE dueño)
- GET `/reservas/disponibilidad` (AUTHENTICATED)
  - Query (ej.): `?aulaId=1&diaSemana=4&horaInicio=16:00&horaFin=18:00`
