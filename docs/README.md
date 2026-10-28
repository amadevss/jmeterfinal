# Clínica Digital en Next.js

## Inicio

Requiere Node.js 20.9 o superior. Ejecutar `npm install`, `npm run dev` y abrir http://localhost:3000. Si el puerto está ocupado, usar el puerto que indique Next.js. Producción: `npm run build` y `npm start`. La documentación interactiva está en `/docs`, y el panel en `/`.

Configurar `SECRETO` en `.env.local` o en el entorno del servidor. El valor predeterminado es `clinica-digital-2026`, igual al original; cambiarlo invalida códigos e IDs previos. No exponerlo con NEXT_PUBLIC_. No hay dependencia del servidor Python.

## Funcionalidad replicada

Los 500 registros ficticios se extrajeron del generador original con semilla 27, sin modificar la carpeta de la API. Se conservan los códigos HMAC SHA-256 de cinco caracteres, los IDs firmados de citas, las cinco misiones y los folios. Los nombres se normalizan quitando acentos, mayúsculas y espacios sobrantes. El probador envía el nombre sin acentos por compatibilidad con encabezados HTTP.

| Método | Ruta | Contrato |
| --- | --- | --- |
| GET | /api/salud | Estado y 500 registros |
| GET | /api/derechohabientes?limite=5 | Limite entero 1–50; 422 si inválido |
| GET | /api/derechohabientes/{curp} | 200 misión 1 o 404 misión 2 |
| POST | /api/citas | JSON con curp, especialidad, fecha, hora: 201 misión 3; JSON roto: 400 misión 4; campos inválidos: 422; CURP desconocida: 404 |
| GET | /api/citas/{id} | Reconoce ID firmado; 404 si inválido |
| PUT | /api/citas/{id} | Los cuatro campos, devuelve estado reprogramada |
| PATCH | /api/citas/{id} | especialidad, fecha y/o hora; 400 sin cambios |
| DELETE | /api/citas/{id} | 204 sin cuerpo |
| GET | /api/protegido | Authorization: Bearer clinica123; 200 misión 5 o 401 |
| POST | /soap | ConsultarDerechohabiente, XML; 200 o SOAP Fault 500 |
| GET | /api/simular/{codigo} | Códigos 200–599; 204, 205 y 304 sin cuerpo por restricciones de Response |
| GET | /api/simular/lento?ms=3000 | Espera entre 0 y 8000 ms |
| GET | /api/misiones | Las cinco misiones |
| POST | /api/misiones/verificar | participante y codigo; 200 válido o 400 inválido |
| POST | /api/misiones/constancia | participante y codigos; folio si están los cinco, 400 con faltan si incompleto |
| GET | /api/peticiones | Hasta 200 entradas recientes; filtro opcional participante |
| GET | /datos/curps_500.csv | CSV descargable con encabezados y 500 filas |

Las respuestas de misiones incluyen `mision.numero`, `mision.titulo`, `mision.codigo`, `X-Mision` y `X-Mision-Codigo` si se envía X-Participante. Sin nombre se entrega un aviso y no se firma el código.

## Progreso y monitor

Selecciona el participante antes de registrar códigos. Cada código se verifica en el servidor. El navegador guarda `{nombre,codigos}` en `cd:user:<nombre normalizado>`; `cd:last-user` conserva el último perfil. Cambiar de nombre recupera el avance asociado sin borrar los demás. Se puede pegar el código o pulsarlo en el monitor. Los códigos de otro participante se rechazan. Cuando hay cinco códigos se solicita `/api/misiones/constancia`; el folio solo se muestra si el servidor los verifica. localStorage es modificable por el usuario y no representa autenticación. No se sincroniza entre navegadores o equipos; limpiar sus datos elimina el avance.

El monitor se actualiza cada 2 segundos, permite pausar, filtrar por participante o errores y abrir el cuerpo de respuesta pulsando la ruta. Guarda método, ruta, fecha, duración del handler, estado, participante, código y hasta 6000 caracteres de respuesta. No almacena cuerpos enviados ni Authorization. Excluye su propio sondeo. Retiene 500 entradas en memoria global del proceso, devuelve 200 y se reinicia junto con el servidor. No agrega tráfico de varias instancias serverless. Para un despliegue con monitor compartido se requiere Redis o una base de datos. No es un benchmark: el tiempo del monitor excluye red y parte del trabajo de Next.js.

Se replicó el CRUD **simulado** original: las citas no se almacenan, PUT/PATCH no persisten y DELETE no invalida el ID. No hay cuentas, datos reales ni base de datos. El monitor es público para el laboratorio. `/docs` reemplaza Swagger con una guía y un probador integrado de todos los endpoints; no se replica `/redoc` ni `/openapi.json`.

## Entrega JMeter

Descarga `/jmeter/Entrega_Final_TUNOMBRE.jmx`: es la plantilla original, no un ejercicio resuelto. Configura protocolo `http`, servidor `localhost`, puerto de Next.js y participante. Usa la CURP del panel. Agrega las cinco peticiones y aserciones 200, 404, 201, 400 y 200. Usa Content-Type application/json en POST y Authorization Bearer clinica123 en la misión 5. Para los errores esperados usa «Ignorar el estado» en la aserción de respuesta.

El PDF solicita captura de constancia con nombre y folio, archivo .jmx y captura de reporte resumen, además de explicar la ejecución y los códigos HTTP. El portal permite imprimir la constancia. No se enviaron entregables a Cypher ni se realizó una prueba de carga de JMeter.

## Verificación

`npm run lint`, `npm run build`. Con el servidor iniciado: `node scripts/check-api.mjs`; por defecto usa http://localhost:3001, o configura BASE_URL. Comprueba las cinco misiones, códigos y nombres, rechazo de otro participante, constancia completa e incompleta, CRUD simulado, validación 422, token 401, simuladores, SOAP válido y Fault, CSV, monitor y páginas. No altera archivos del usuario ni necesita servicios externos.

## Estructura

- `lib/api.ts`: contrato HTTP, firmas y registro temporal.
- `lib/shared.ts`: misiones, normalización y tipos compartidos.
- `lib/derechohabientes.json`: datos ficticios originales.
- `app/api/[...path]/route.ts`, `app/soap/route.ts`, `app/datos/curps_500.csv/route.ts`: handlers Next.js.
- `app/ui/dashboard.tsx`: perfiles locales, misiones, constancia y monitor.
- `app/docs/`: documentación y probador real de endpoints.
- `public/jmeter/`: plantilla original descargable.
- `scripts/check-api.mjs`: pruebas HTTP de integración.

Se consultaron las guías locales de route handlers, server/client components y cacheComponents de Next.js instalado. Con cacheComponents habilitado se usa el runtime Node predeterminado, sin las opciones de segmento runtime/dynamic incompatibles.
