# Clínica Digital · Laboratorio JMeter

Implementación Next.js de la API ficticia de Clínica Digital con cinco misiones, códigos firmados, perfiles locales, constancia, monitor HTTP y documentación interactiva.

```sh
npm install
npm run dev
```

Abre la dirección indicada en la terminal. Panel: `/`. Guía y probador: `/docs`.

La documentación completa de instalación, endpoints, JMeter, arquitectura, persistencia y pruebas está en [docs/README.md](docs/README.md).

```sh
npm run lint
npm run build
# Con servidor ejecutándose en localhost:3001:
node scripts/check-api.mjs
```

Configura `SECRETO` en `.env.local` para cambiar la firma. Las citas son simuladas y el monitor es temporal por proceso; los perfiles y códigos se guardan en localStorage del navegador.



esto es una prueba