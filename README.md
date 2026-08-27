# CounterGank Backend NoSQL Standard Project

Backend desarrollado con [NestJS](https://nestjs.com/) y [MongoDB](https://www.mongodb.com/) (vía Mongoose), pensado como base estándar para aplicaciones con persistencia NoSQL, configuración en runtime y arquitectura modular escalable.

## Stack

- **NestJS 11** con adaptador **Fastify**
- **MongoDB** a través de **Mongoose** (ODM)
- **Redis** opcional para cache (degradación graceful sin Redis, vía `ioredis`)
- **Doppler** para gestión de secretos (dev/staging)
- **Biome** para lint/format
- **Jest** para unit + e2e tests
- **Scalar** + **Swagger UI** para documentación de API
- **@nestjs/event-emitter** para eventos

## Características

- **Parameter Store**: gestión de configuración en runtime (`@Parameter` decorator, resolución L1 → env → Redis → default, admin API).
- **Cache**: capa de cache con `ICACHE_SERVICE`, fallback in-memory sin Redis.
- **Entity CRUD**: creación y consulta de entidades con cache y validación.
- **Encode**: hashing con bcrypt (`EncodeService`).
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

| Variable | Requerida | Default | Descripción |
|----------|:---------:|---------|-------------|
| `NODE_ENV` | ✅ | — | `local`, `development`, `test`, `qa`, `production` |
| `VERSION` | ✅ | — | Versión de la app (inyectada por Makefile) |
| `DATABASE_HOST` | ✅ | — | Host de MongoDB |
| `DATABASE_PORT` | ✅ | — | Puerto de MongoDB |
| `DATABASE_NAME` | ✅ | — | Nombre de la base de datos |
| `DATABASE_USER` | ✅ | — | Usuario de MongoDB |
| `DATABASE_PASSWORD` | ✅ | — | Password de MongoDB (via Doppler) |
| `ENCRYPTION_PASSWORD` | ✅ | — | Clave de cifrado (via Doppler) |
| `ENCRYPTION_SALT` | ✅ | — | Salt para bcrypt (via Doppler) |
| `HOST` | ❌ | `0.0.0.0` | Host de escucha |
| `PORT` | ❌ | `3000` | Puerto HTTP |
| `LOG_LEVEL` | ❌ | `info` | Nivel de log (`silent` en test) |
| `LOG_PRETTY` | ❌ | auto | `false` para deshabilitar pino-pretty |
| `DEBUG` | ❌ | — | Modo debug |
| `REDIS_URL` | ❌ | — | URL de Redis (cache) |
| `ADMIN_API_TOKEN` | ❌ | — | Token del admin API (401 si no está) |
| `ENTITY_CACHE_TTL_MS` | ❌ | — | Override en runtime del TTL de cache |
| `EXAMPLE_MICROSERVICE_ENABLED` | ❌ | — | `true`/`false` — habilita el microservicio de ejemplo |
| `EXAMPLE_MICROSERVICE_HOST` | ❌ | — | Host del microservicio |
| `EXAMPLE_MICROSERVICE_PORT` | ❌ | — | Puerto del microservicio |

Los secretos sensibles (`DATABASE_PASSWORD`, `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`) se gestionan con Doppler y **no** deben versionarse.

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
doppler secrets set ENCRYPTION_SALT=tu_salt
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
VERSION=v1.2.0 make docker-ghcr-up

# Logs
make docker-ghcr-logs

# Bajar
make docker-ghcr-down
```

La imagen de producción usa `npm ci --omit=dev` y ejecuta `node dist/src/main.js`. Requiere `NODE_ENV=production` para funcionar correctamente.

Ver `docker-compose.ghcr.yml` y el workflow `.github/workflows/release-docker-image.yml` (se dispara con tags `v*`).

## CI/CD

El proyecto tiene dos workflows:

### CI (`.github/workflows/ci.yml`)
Se ejecuta en PRs a `main` y `develop`:
- **commitlint**: valida formato de commits convencionales
- **lint**: Biome lint y format check
- **build**: compila el proyecto
- **test**: unit tests
- **e2e**: tests end-to-end contra `mongo:7`

### Release Docker Image (`.github/workflows/release-docker-image.yml`)
Se ejecuta al push de tags `v*`:
- Build de la imagen de producción (target `production`)
- Push a GHCR con el tag de versión

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

# Watch mode
npm run test:watch
```

Los e2e corren contra MongoDB real (servicio `mongo:7` en CI, o `MongoMemoryServer` local). Helpers en `test/helpers/` (`mock.ts`, `mongo.ts`).

Archivos de test:
- `test/app.e2e-spec.ts` — endpoints de app
- `test/entity.e2e-spec.ts` — CRUD de entidades
- `test/parameter-admin.e2e-spec.ts` — admin de parámetros
- `src/**/*.spec.ts` — unit tests por módulo

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run start` | Servidor producción |
| `npm run start:dev` | Servidor con watch |
| `npm run start:debug` | Debug mode con watch |
| `npm run start:prod` | Producción via node (`dist/main`) |
| `npm run build` | Compilar |
| `npm run format` | Formatear con Biome |
| `npm run lint` | Lint (Biome) |
| `npm run lint:fix` | Lint con auto-fix |
| `npm run test` | Unit tests |
| `npm run test:local` | Tests del último commit |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | E2E tests |
| `npm run test:ci` | Tests para CI |
| `npm run test:watch` | Watch mode |
| `npm run install:skills` | Reinstalar agent skills |

## Makefile

```bash
make help          # Lista todos los targets
make install       # Instalar dependencias (npm ci)
make dev           # Dev server (con Doppler si está)
make test          # Unit tests
make test-e2e      # E2E tests
make lint          # Lint
make docker-up     # Dev local (build)
make docker-down   # Bajar contenedores
make docker-build  # Build imágenes Docker
make docker-redeploy # Down + build + up
make docker-ghcr-up   # Producción (pull GHCR)
make docker-ghcr-down # Bajar producción
make docker-health    # Estado de contenedores
```

## Estructura del proyecto

```
src/
├── app/                    # AppController (/, /health, microservice)
│   ├── controller/         # Controllers y specs
│   ├── service/            # Services y specs
│   ├── api-docs/           # Decoradores de documentación
│   ├── class/              # Clases (Version)
│   ├── dto/                # DTOs (request/response)
│   └── mocks/              # Mocks para tests
├── common/                 # Código compartido
│   ├── api-docs/           # Decoradores comunes
│   ├── cache/              # CacheModule + CacheService
│   ├── class/              # Clases base (Message)
│   ├── dto/                # DTOs comunes (error-response)
│   ├── enums/              # Enums (event patterns)
│   ├── errors/             # DomainError + error base
│   ├── filters/            # AllExceptionsFilter
│   ├── middleware/          # TraceIdMiddleware
│   ├── pipes/              # ValidationPipe
│   └── utils/              # Helpers de entorno
├── config/                 # Configuración
│   ├── parameters/         # Parameter Store (decorator, store, admin)
│   ├── custom-module-options/ # Opciones de ConfigModule, Mongoose
│   └── custom-providers/   # Factory providers (microservicios)
├── encode/                 # EncodeService (bcrypt)
├── entity/                 # Entity module (CRUD)
│   ├── controller/         # EntityController
│   ├── service/            # EntityService
│   ├── repository/         # EntityRepository (Mongoose)
│   ├── entities/           # Entity class
│   ├── dto/                # DTOs
│   ├── mocks/              # Mock factories
│   └── api-docs/           # Decoradores
├── main.ts                 # Bootstrap (Fastify, CORS, versioning, Swagger/Scalar)
test/
├── helpers/                # mock.ts, mongo.ts
├── app.e2e-spec.ts         # App endpoints e2e
├── entity.e2e-spec.ts      # Entity CRUD e2e
└── parameter-admin.e2e-spec.ts # Parameter admin e2e
scripts/
└── upgrade-package-version.js  # Semver bump
.claude/                    # Claude config
├── commands/               # Custom commands
└── settings.json           # Settings
.github/
├── workflows/              # ci.yml, release-docker-image.yml
├── actions/                # setup-node (composite)
└── pull_request_template.md
openspec/
├── specs/                  # Specs del proyecto
└── changes/                # Cambios SDD activos y archivados
```

## Git Hooks

El proyecto usa Husky con 3 hooks:

- **commit-msg**: valida commits convencionales (commitlint)
- **pre-commit**: ejecuta lint-staged (Biome format + lint)
- **pre-push**: ejecuta `npm test` antes de push

## Git workflow

El flujo de ramas sigue la skill `git-environment-flow`:

```
feature → develop → release/x.y.z → staging → main → backmerge develop
```

### Flujo de release

1. **Cut**: branch `release/x.y.z` desde `develop` (scope congelado)
2. **Stage**: merge a `staging`, tag `vX.Y.Z-rcN`
3. **Release**: merge a `main`, tag `vX.Y.Z`
4. **Backmerge**: `main` → `develop`
5. **Cleanup**: eliminar branch `release/x.y.z`

### Flujo de hotfix

1. Branch `hotfix/*` desde `main`
2. Merge a `main`, tag `vX.Y.Z` (patch)
3. Backmerge a `develop` (NO a staging — staging recibe el fix en el próximo release)

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
