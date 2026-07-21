# CounterGank Backend NoSQL Standard Project

Este proyecto es un backend desarrollado con [NestJS](https://nestjs.com/) y [MongoDB](https://www.mongodb.com/) (a través de Mongoose), diseñado para servir como base estándar para aplicaciones que requieren arquitectura de microservicios y persistencia NoSQL.

## Características principales

- **NestJS** como framework principal para la estructura modular y escalable.
- **MongoDB** como base de datos NoSQL, usando Mongoose para la integración ODM.
- **Microservicios**: Soporte para integración y comunicación con microservicios externos, habilitados/deshabilitados por variables de entorno.
- **Configuración centralizada** usando `@nestjs/config`.
- **Logger personalizado** para trazabilidad y debugging.
- **Pruebas unitarias** con Jest.
- **Estructura limpia** y desacoplada para facilitar la extensión y el mantenimiento.

## Estructura del proyecto

```
src/
├── app/
│   ├── controller/
│   ├── service/
│   ├── class/
│   └── errors/
├── common/
│   ├── class/
│   ├── logger.ts
│   └── utils/
├── config/
│   ├── custom-module-options/
│   ├── custom-providers/
│   └── ...
├── entity/
│   └── ...
test/
├── helpers.ts
.env
```

## Configuración

El comportamiento del backend y la conexión a microservicios se controla mediante variables de entorno. Ejemplo de configuración en `.env`:

```env
MONGO_URI=mongodb://localhost:27017/countergank
EXAMPLE_MICROSERVICE_ENABLED=true
EXAMPLE_MICROSERVICE_HOST=127.0.0.1
EXAMPLE_MICROSERVICE_PORT=4000
NODE_ENV=development
npm_package_name=countergank-backend
npm_package_version=1.0.0
```

## Doppler Setup

Este proyecto usa [Doppler](https://www.doppler.com/) para gestionar secretos de forma segura. Los secretos sensibles (como `DATABASE_PASSWORD` y `ENCRYPTION_PASSWORD`) se inyectan en runtime mediante `doppler run`, sin escribirse en disco ni embebidos en la imagen Docker.

### Requisitos previos

- Crear una cuenta en [Doppler](https://dashboard.doppler.com/)
- Instalar el CLI: `curl -FsSL https://dl.doppler.com/cli/install.sh | sh`

### Configuración inicial

```bash
# 1. Login en Doppler
doppler login

# 2. Inicializar el proyecto (desde la raíz del repo)
doppler init

# 3. Configurar los secretos necesarios
doppler secrets set DATABASE_PASSWORD=tu_password
doppler secrets set ENCRYPTION_PASSWORD=tu_password
doppler secrets set MONGO_URI=mongodb://localhost:27017/countergank
doppler secrets set NODE_ENV=development

# 4. Verificar que funciona
doppler run node -e "console.log(process.env.DATABASE_PASSWORD)"
```

### Desarrollo local

```bash
# Con Doppler instalado (recomendado)
make dev

# Sin Doppler (fallback automático con warning)
make dev
```

El target `dev` del Makefile detecta automáticamente si Doppler está instalado y usa `doppler run` si está disponible, o cae en fallback directo con un mensaje de advertencia.

### Docker

```bash
# La imagen de producción usa doppler run como CMD
docker compose up

# El token se pasa desde el host
DOPPLER_TOKEN=tu_token docker compose up
```

### Migración desde `.env`

Si tenés secretos existentes en archivos `.env`, importalos a Doppler:

```bash
# Importar secretos individuales
doppler secrets set DATABASE_USER=usuario
doppler secrets set DATABASE_PASSWORD=password

# O importar desde archivo .env (sin las líneas de comentarios)
grep -v '^#' .env | grep -v '^\s*$' | while IFS='=' read -r key value; do
  doppler secrets set "$key=$value"
done
```

**Nota**: Las variables no secretas (`VERSION`, `HOST`, `PORT`, `NODE_ENV`, etc.) pueden quedarse en `.env` o pasarse como variables de entorno directamente.

## Uso de microservicios

El backend puede conectarse a microservicios externos si la variable `*_MICROSERVICE_ENABLED` está en `true`. La conexión se realiza automáticamente al iniciar la aplicación.

## Agent Skills

Este proyecto incluye skills de agentes AI instalados desde [countergank/skills](https://github.com/countergank/skills):

- **nestjs-backend**: Patrones y mejores prácticas para desarrollo NestJS
- **github-conventions**: Convenciones de commits, PRs y branching
- **git-environment-flow**: Flujo de ramas de entorno y promoción

Las skills se instalan en `.agents/skills/` (no `.opencode/skills/`). Para reinstalar:

```bash
npm run install:skills
```

**Nota**: El CLI `npx skills` instala en `.agents/skills/` para OpenCode. Si usás otros agentes (Claude Code, etc.), pueden usar `.claude/skills/` (excluido de git via `.gitignore`).

## Scripts

- `npm run start`: Inicia el servidor en modo desarrollo.
- `npm run build`: Compila el proyecto.
- `npm run test`: Ejecuta las pruebas unitarias.
- `npm run install:skills`: Reinstala las skills del agente AI.

## Pruebas

Las pruebas unitarias están ubicadas en la carpeta `test/` y junto a los controladores/servicios. Se utiliza Jest como framework de testing.

## Extensión

Puedes agregar nuevos microservicios siguiendo el patrón de `MicroserviceFactory` y agregando las variables de entorno correspondientes.

## Requisitos

- Node.js >= 18.x
- MongoDB >= 4.x

## Contribución

1. Haz un fork del repositorio.
2. Crea una rama para tu feature o fix.
3. Haz tus cambios y asegúrate de que las pruebas pasen.
4. Haz un pull request.

---

**Autor:** Leandro Javier Cepeda  
**Licencia:** MIT