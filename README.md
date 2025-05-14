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

## Uso de microservicios

El backend puede conectarse a microservicios externos si la variable `*_MICROSERVICE_ENABLED` está en `true`. La conexión se realiza automáticamente al iniciar la aplicación.

## Scripts

- `npm run start`: Inicia el servidor en modo desarrollo.
- `npm run build`: Compila el proyecto.
- `npm run test`: Ejecuta las pruebas unitarias.
- También puedes utilizar el script `scripts/docker-redeploy.sh` para construir y desplegar el proyecto usando Docker.

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