# Proposal: Test Directory Refactor — COU-222

## Intent
Mejorar la cobertura e2e del servidor, eliminar httpyac (redundante) y reorganizar los helpers de test en funciones por archivo.

## Scope

### In Scope
- Eliminar `test/httpyac/` (request `GET /` duplicado con `app.e2e-spec.ts`)
- Agregar e2e para entity CRUD (`test/entity.e2e-spec.ts`)
- Agregar test `/health` a `app.e2e-spec.ts`
- Migrar `app.e2e-spec.ts` a Fastify adapter (consistencia con producción)
- Separar helpers en `mock.ts` y `mongo.ts` (eliminar barrel `index.ts`)

### Out of Scope
- Cambiar lógica de negocio (salvo el bug de `existsByName` encontrado)
- Cambiar la config de Jest
- Agregar coverage reports

## Approach
1. Explorar el estado actual de tests y endpoints del servidor
2. Identificar gaps de cobertura e2e
3. Eliminar httpyac
4. Crear e2e de entity + /health
5. Separar helpers
6. Verificar: unit tests + e2e + lint

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| e2e nuevo destapa bugs de producción | Medium | Corregir el bug (ya ocurrió: existsByName) |
| MongoMemoryServer vs Docker en CI | Low | CI usa mongo:7 service; local usa MongoMemoryServer |
