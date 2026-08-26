# Proposal: E2E Tests for All Endpoints — COU-225

## Intent
Completar la cobertura e2e de TODOS los endpoints del servidor, garantizando que cada ruta tenga sus escenarios de happy path y error.

## Scope

### In Scope
- Agregar test e2e para `POST /message-microservice/:pattern` (único endpoint sin cobertura)
- Verificar cobertura completa de los 9 endpoints
- Mantener consistencia con Fastify adapter

### Out of Scope
- Cambiar lógica de negocio
- Agregar tests unitarios adicionales
- Configurar cobertura de microservicios reales

## Approach
1. Inventariar endpoints vs cobertura e2e existente
2. Identificar gaps (solo microservice endpoint)
3. Agregar test del microservice (comportamiento con microservice disabled → 500 APP_ERROR)
4. Verificar e2e completa (unit + e2e + lint)

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Microservice endpoint tiene dependencia de ClientProxy | Low | En test env, EXAMPLE_MICROSERVICE_ENABLED=false → el endpoint lanza APP_ERROR sin cliente |
EOF