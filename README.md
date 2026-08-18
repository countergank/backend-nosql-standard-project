# CounterGank Backend NoSQL Standard Project

Backend desarrollado con [NestJS](https://nestjs.com/) y [MongoDB](https://www.mongodb.com/) (vía Mongoose), pensado como base estándar para aplicaciones con persistencia NoSQL, configuración en runtime y arquitectura modular escalable.

## Stack

- **NestJS 11** con adaptador **Fastify**
- **MongoDB** a través de **Mongoose** (ODM)
- **Redis** opcional para cache (degradación graceful sin Redis)
- **Doppler** para gestión de secretos
- **Biome** para lint/format
- **Jest** para unit + e2e tests
- **Scalar** + **Swagger UI** para documentación de API

## Características

- **Parameter Store**: gestión de configuración en runtime (`@Parameter` decorator, resolución L1 → env → Redis → default, admin API).
- **Cache**: capa de cache con `ICACHE_SERVICE`, fallback in-memory sin Redis.
- **Entity CRUD**: creación y consulta de entidades con cache y validación.
- **Microservicios**: integración opcional con microservicios externos vía `ClientProxy`, controlada por env vars.
- **Observabilidad**: logger estructurado (`nestjs-pino`), `x-trace-id`, health check.
- **Errores tipados**: `DomainError` con códigos HTTP estables (401/404/409/422/500).

## Requisitos

- Node.js **22** (ver `.nvmrc`)
- MongoDB **6+** (o `docker compose` con Mongo incluido)
- Redis **7** (opcional)
- Docker + Docker Compose (para desarrollo con contenedores)

## Instalación

```bash
# Instalar dependencias
npm ci

# Configurar variables de entorno
cp .env.example .env
# Completar los valores en .env (o usar Doppler)
```

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NODE_ENV` | ✅ | `development`, `test` o `production` |
| `HOST` | ✅ | Host de escucha (default `0.0.0.0`) |
| `PORT` | ✅ | Puerto HTTP (default `3001`) |
| `DATABASE_HOST` | ✅ | Host de MongoDB |
| `DATABASE_PORT` | ✅ | Puerto de MongoDB |
| `DATABASE_NAME` | ✅ | Nombre de la base de datos |
| `DATABASE_USER` | ✅ | Usuario de MongoDB |
| `DATABASE_PASSWORD` | ✅ | Password de MongoDB (via Doppler) |
| `ENCRYPTION_PASSWORD` | ✅ | Clave de cifrado (via Doppler) |
| `EXAMPLE_MICROSERVICE_ENABLED` | ✅ | `true`/`false` — habilita el microservicio de ejemplo |
| `EXAMPLE_MICROSERVICE_HOST` | ✅ | Host del microservicio |
| `EXAMPLE_MICROSERVICE_PORT` | ✅ | Puerto del microservicio |
| `REDIS_URL` | ❌ | URL de Redis (opcional, cache) |
| `ADMIN_API_TOKEN` | ❌ | Token del admin API (401 si no está) |
| `ENTITY_CACHE_TTL_MS` | ❌ | Override en runtime del TTL de cache |

Los secretos sensibles (`DATABASE_PASSWORD`, `ENCRYPTION_PASSWORD`) se gestionan con Doppler y **no** deben versionarse.

## Doppler Setup

El proyecto usa [Doppler](https://www.doppler.com/) para secretos. Instalar el CLI:

```bash
curl -sLf https://dl.doppler.com/cli/install.sh | sh
```

```bash
doppler login
doppler init
doppler secrets set DATABASE_PASSWORD=tu_password
doppler secrets set ENCRYPTION_PASSWORD=tu_password
```

El target `make dev` detecta Doppler automáticamente y usa `doppler run` si está disponible.

### Migración desde `.env`

Si tenés secretos en un `.env` existente, importalos a Doppler:

```bash
doppler secrets set DATABASE_USER=usuario
doppler secrets set DATABASE_PASSWORD=password

# O importar todas las líneas no comentadas de .env
grep -v '^#' .env | grep -v '^\s*$' | while IFS='=' read -r key value; do
  doppler secrets set "$key=$value"
done
```

Las variables no secretas (`HOST`, `PORT`, `NODE_ENV`, etc.) pueden quedarse en `.env` o pasarse como variables de entorno directamente.

## Ejecutar

```bash
# Desarrollo local (con hot reload)
make dev

# O directamente
npm run start:dev
```

## Docker

```bash
# Desarrollo local (build de la imagen con target development)
make docker-up

# Logs
make docker-logs

# Bajar
make docker-down

# Redesplegar (down + build + up)
make docker-redeploy
```

### Imagen de producción (GHCR)

La imagen de producción se publica en GitHub Container Registry (`ghcr.io/countergank/backend-nosql-standard-project`) y se levanta con un compose aparte:

```bash
# Pull de la imagen pre-buildeada de GHCR (sin build local)
make docker-ghcr-up

# Logs
make docker-ghcr-logs

# Bajar
make docker-ghcr-down
```

Ver `docker-compose.ghcr.yml` y el workflow `.github/workflows/release-docker-image.yml` (se dispara con tags `v*`).

## Documentación de API

- **Scalar** (interactivo): http://localhost:3001/reference/
- **Swagger UI** (clásico): http://localhost:3001/docs

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Versión del servicio |
| GET | `/health` | Health check (MongoDB) |
| POST | `/message-microservice/:pattern` | Proxy a microservicio (si está habilitado) |
| POST | `/v1/entity/create` | Crear entidad |
| GET | `/v1/entity` | Listar entidades |
| GET | `/v1/entity/:id` | Obtener entidad por id |
| GET | `/v1/admin/parameters` | Listar parámetros (admin) |
| GET | `/v1/admin/parameters/:group` | Parámetros por grupo (admin) |
| PUT | `/v1/admin/parameters/:key` | Actualizar parámetro (admin) |

## Pruebas

```bash
# Unit tests
npm test

# Solo el último commit
npm run test:local

# Cobertura
npm run test:cov

# E2E tests (requiere MongoDB)
npm run test:e2e
```

Los e2e corren contra MongoDB real (servicio `mongo:7` en CI, o `MongoMemoryServer` local). Helpers en `test/helpers/` (`mock.ts`, `mongo.ts`).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run start:dev` | Servidor con watch |
| `npm run build` | Compilar |
| `npm run lint` | Lint (Biome) |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run install:skills` | Reinstalar agent skills |

## Makefile

```bash
make help          # Lista todos los targets
make dev           # Dev server (con Doppler si está)
make test          # Unit tests
make test-e2e      # E2E tests
make lint          # Lint
make docker-up     # Dev local (build)
make docker-ghcr-up # Producción (pull GHCR)
```

## Estructura del proyecto

```
src/
├── app/                 # AppController (/, /health, microservice)
├── common/              # Errores, cache, filtros, middlewares, pipes
├── config/              # ConfigModule, env validation, parameters, microservices
├── entity/              # Entity module (controller, service, repository, dto, schema)
test/
├── helpers/             # mock.ts, mongo.ts
├── *.e2e-spec.ts        # Tests e2e
openspec/
├── specs/               # Specs del proyecto
└── changes/             # Cambios SDD activos y archivados
```

## Git workflow

El flujo de ramas sigue la skill `git-environment-flow`:

```
feature → develop → release/x.y.z → staging → main
```

Los PRs apuntan a `develop`. Tags de release: `vX.Y.Z` en main, `vX.Y.Z-rcN` en staging.

## Agent Skills

Skills instaladas desde [countergank/skills](https://github.com/countergank/skills):

- **nestjs-backend**: patrones y mejores prácticas NestJS
- **github-conventions**: commits, PRs, branches
- **git-environment-flow**: flujo de ramas de entorno

Reinstalar: `npm run install:skills`

## Contribución

1. Crear rama `feat/`, `fix/`, `chore/` etc. desde `develop`
2. Hacer cambios con commits convencionales
3. Asegurar que `npm test` y `npm run lint` pasen
4. Abrir PR a `develop`

---

**Autor:** Leandro Javier Cepeda
**Licencia:** MIT
