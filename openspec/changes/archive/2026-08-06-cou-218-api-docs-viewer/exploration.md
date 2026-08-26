# Exploration: API Documentation Viewer — COU-218

## Current State
- `@nestjs/swagger` v11 with `DocumentBuilder` + `SwaggerModule.setup('/docs', ...)`
- Basic Swagger UI at `/docs` with title, description, version
- No interactive features, dark mode, or modern UX

## Alternatives Evaluated

| Tool | NestJS Package | Self-hosted | UI Quality | Try-it | Notes |
|------|---------------|-------------|------------|--------|-------|
| **Scalar** | `@scalar/nestjs-api-reference` | ✅ OSS | ⭐⭐⭐⭐⭐ | ✅ Built-in | Modern, dark/light themes, interactive, client code gen |
| **Redoc** | `nestjs-redoc` (community) | ✅ OSS | ⭐⭐⭐⭐ | ❌ Read-only | Beautiful reference docs, no try-it console |
| **Stoplight Elements** | Manual setup | ✅ OSS | ⭐⭐⭐⭐ | ✅ | Heavy, good for API portals |
| **Swagger UI** (current) | `@nestjs/swagger` | ✅ | ⭐⭐⭐ | ✅ | Dated UX, no dark mode |

## Recommendation: Scalar

**Why:**
1. Drop-in replacement — `@scalar/nestjs-api-reference` wraps the same OpenAPI doc
2. Modern interactive UI with dark/light themes
3. Built-in "Try It" + client code generation
4. Active maintenance, MIT license
5. Minimal config — just add `ApiReference` middleware alongside existing Swagger

**Integration path:**
```bash
npm i @scalar/nestjs-api-reference
```
```ts
// In main.ts, after SwaggerModule.createDocument():
app.use('/reference', apiReference({ spec: { content: swaggerDocument } }));
```
Keep Swagger UI at `/docs` for backward compat, add Scalar at `/reference` initially, then deprecate `/docs`.
