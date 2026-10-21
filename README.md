# DEUCE

Archivo editorial de tenis masculino con Next.js. Los resultados y las estadísticas describen los partidos de este archivo, no necesariamente toda una carrera.

## Desarrollo sin credenciales

Requiere Node.js 24 y npm. La preparación de datos usa `node:module.registerHooks` y los archivos históricos incluidos en el repositorio.

```sh
npm ci
npm run build
npm run verify
npm run start
```

El build prepara un snapshot **real** local y las biografías; no publica en Supabase ni llama a la API del proveedor para descargar nuevos datos. `NEXT_PUBLIC_USE_MOCK_DATA` ausente significa datos reales. El modo demo solo puede habilitarse explícitamente en desarrollo/pruebas locales y no se permite en builds ni publicaciones.

Para trabajar en las páginas después del primer build, `npm run dev`. `.env.example` documenta las variables. No se necesita una base de datos para trabajar con la copia incluida. No introducir credenciales de producción para pruebas ordinarias.

## Pruebas

```sh
npm run test
npm run lint
npm run typecheck
npm run data:verify
npx playwright install chromium
npm run test:browser
```

Las pruebas de navegador arrancan la compilación de producción en `127.0.0.1:3100`; necesitan un build reciente. Si ya hay Chrome instalado, puede usarse `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`. No apuntan a producción ni ejecutan sincronizaciones autenticadas.

Para verificar explícitamente una publicación, `PLAYWRIGHT_BASE_URL=https://deuce-archive.vercel.app npm run test:browser`. Este modo no arranca un servidor local; solo navega y realiza lecturas, incluida una solicitud de cron sin autorización que debe rechazarse.

La automatización de GitHub comprueba pruebas, lint, dependencias de producción, build, integridad del snapshot y navegación/accesibilidad. No despliega ni utiliza secretos. Activar este workflow no sustituye configurar los checks obligatorios en la protección de la rama.

## Datos y publicación

- `data/archive`: fuentes recuperadas. No modificar para corregir una presentación.
- `data/reading`: artefactos derivados. Regenerar con `npm run data:prepare`.
- `lib/surface.ts`: moqueta y desconocido son categorías independientes; nunca se asumen como dura.
- `lib/dataset-summary.ts`: cobertura y puertas de publicación. Exige al menos 100.000 partidos reales, extremos temporales, IDs únicos y controla pérdidas superiores al 10 % frente al manifiesto anterior.
- `lib/revista/snapshot.ts`: aumentar `RULES_VERSION` al cambiar cálculos y `SNAPSHOT_SCHEMA` al cambiar contratos. La identidad incluye el día editorial para las listas dependientes de fecha.
- `/cobertura`: medidas disponibles por año, superficies y versión de datos.
- `/api/overview`: lee el manifiesto; no reabre todo el archivo histórico.

Los cron existentes siguen protegidos por `CRON_SECRET`. No ejecutar manualmente una sincronización o publicación en producción sin verificar primero equipo/proyecto, generación de origen, diferencias de datos y estado de la base de datos.

Los lectores rechazan snapshots remotos incompatibles o incompletos para no reintroducir superficies erróneas ni mezclar generaciones. Hasta disponer de una generación compatible se utiliza el snapshot empaquetado. La copia offline comprobada tiene 176.263 partidos; la primera publicación reconstruida con la configuración de producción conservó los 176.267 partidos y 94 estadísticas existentes. El build de producción verifica el manifiesto remoto y bloquea pérdidas de partidos o de cobertura medida; no utiliza una copia degradada silenciosamente.

## Estado y versiones

`/api/health` devuelve versión, origen (`bundled` o `remote`), antigüedad y `healthy`/`degraded`; responde 503 si no puede abrir la generación. `degraded` significa respaldo remoto o más de 72 horas sin generar datos, no que el servidor haya dejado de responder. No contiene secretos ni detalles internos de la base de datos.

Las APIs públicas incluyen `datasetVersion` y `X-DEUCE-Dataset-Version`. Dentro de cada lectura se utiliza una generación coherente; distintas páginas/CDN pueden revalidarse en momentos distintos. La cobertura y los avisos indican qué copia se está leyendo. Un endpoint de diagnóstico no constituye por sí solo un sistema de alertas.

## Recuperación pendiente

Este repositorio se recuperó desde un despliegue, no desde el ordenador original. Ese artefacto excluía `scripts/`, `tests/`, `supabase/` y documentación. Las pruebas actuales son nuevas; **no son las pruebas originales recuperadas**. Se retiraron nueve comandos `sync:*` que apuntaban a archivos ausentes para no presentar herramientas inexistentes como operativas.

Falta recuperar scripts administrativos originales, esquema/migraciones, políticas y procedimiento de restauración. No se han inventado migraciones ni cambiado permisos de la base de datos. Mantener el archivo original del otro ordenador hasta completar esa recuperación.

## Seguridad y limitaciones

Next y su configuración ESLint están fijados a 16.3.8. La verificación actual de dependencias de producción no presenta avisos; persisten avisos en herramientas de desarrollo que requieren una migración revisada de Tailwind/compilación, no un `audit fix --force` automático. No ejecutar el servidor de desarrollo expuesto a Internet.

Las cabeceras incluyen `nosniff`, política de referencia, restricciones de permisos y CSP limitada a framing, objetos y base URL. Esto **no es una CSP estricta para scripts**. Su implantación, WAF, rate limits distribuidos y revisión RLS siguen pendientes.

Ver [IMPLEMENTATION.md](IMPLEMENTATION.md) para el estado del plan y trabajo restante.
