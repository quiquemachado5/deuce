# DEUCE

Archivo editorial ATP y WTA construido con Next.js 16. Los resultados y estadísticas describen únicamente los partidos documentados por la generación publicada; una ausencia nunca se interpreta como un cero ni como un día sin tenis.

## Desarrollo sin credenciales

Requiere Node.js 24 y npm. La copia validada incluida permite desarrollar sin Supabase ni la API del proveedor.

```sh
npm ci
npm run build
npm run verify
npm run start
```

El build prepara el snapshot local, valida medios y compila con Webpack para emitir integridad SRI. No publica ni descarga partidos. `NEXT_PUBLIC_USE_MOCK_DATA` solo puede habilitarse explícitamente en desarrollo o pruebas; una release lo rechaza.

## Verificación

```sh
npm run test
npm run lint
npm run typecheck
npm run data:verify
npm run data:evidence
npm run data:restore-drill
npm run build
npm run budgets:verify
npx playwright install chromium
npm run test:browser
```

Las pruebas de navegador arrancan el build en `127.0.0.1:3100`. Para una comprobación de solo lectura de producción: `PLAYWRIGHT_BASE_URL=https://deuce-archive.vercel.app npm run test:browser`.

CI comprueba pruebas, lint, dependencias de producción, build, presupuestos de HTML/CSS/JS/vídeo, datos, restauración, accesibilidad y regresión visual. El workflow no activa por sí mismo la protección de `main` ni despliega.

## Datos y publicación

- `data/archive`: fuentes recuperadas; no se editan para corregir una vista.
- `data/reading`: generación local derivada y validada.
- `lib/revista/snapshot.ts`: contrato, reglas, particiones por circuito/década y resumen de cobertura.
- `lib/revista/publish-snapshot.ts`: publicación inmutable; el puntero se cambia solo después de escribir todos los artefactos.
- `/cobertura`: alcance, antigüedad e historial diario de lo publicado.

La copia incluida contiene 176.370 partidos y 122 listas. Una generación remota compatible se selecciona completa —manifiesto, partidos, jugadores y competición— o se descarta completa. La publicación bloquea pérdidas de partidos, WTA o cobertura medida, conserva la generación actual y la anterior y poda artefactos más antiguos.

## Salud, diagnóstico y versiones

- `/api/health`: liveness rápida; no abre Supabase ni el archivo completo.
- `/api/health/deep`: generación activa, antigüedad, fallback, almacenamiento y metadatos del despliegue.
- Las APIs públicas envían `datasetVersion`, `X-DEUCE-Dataset-Version` y `X-Request-Id`.
- Los eventos y Web Vitals se registran como JSON estructurado, sin texto de búsquedas ni mensajes de error del usuario.

Cobertura avisa cuando está mostrando la copia empaquetada y no presenta la falta de una publicación nueva como «sin partidos nuevos».

## Incidente actual de datos

El 31/10/2026 el proyecto Supabase `rmiltvmwdmfqzuoipfqs` figura `ACTIVE_HEALTHY`, pero PostgreSQL rechaza conexiones durante su recuperación. Los logs contienen `No space left on device` al escribir `pg_wal` y después `Hot standby mode is disabled`. Hasta recuperar capacidad, la web solo puede servir su última generación validada y no se debe ejecutar la migración de control de capacidad.

La solución operativa requiere liberar o ampliar almacenamiento desde Supabase y confirmar backups/PITR antes de una restauración. PITR es una opción de pago y no se activa desde este repositorio sin aprobación expresa. El procedimiento está en [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Rendimiento, accesibilidad y diseño

La búsqueda exige dos caracteres, limita frecuencia y CPU y reutiliza un índice por generación. El comparador descarga nombres bajo demanda. Los vídeos de portada pesan como máximo 7 MB en escritorio y 1,5 MB en móvil. CI cubre 320, 390, 768, 1024 y 1440 px, reflow al 200 %, teclado, reducción de movimiento y Axe.

DEUCE mantiene un único tema claro aprobado. Se retiraron controles oscuros incompletos para no prometer una apariencia no diseñada; la preferencia oscura del sistema conserva deliberadamente el mismo aspecto.

## Seguridad y límites externos

Se aplican HSTS, `nosniff`, aislamiento de origen, framing denegado, política de permisos, CSP, SRI y bloqueo de atributos JavaScript inline. Next necesita pequeños scripts inline para hidratar páginas estáticas, por lo que `script-src` conserva `unsafe-inline`; una política basada en nonce exigiría render dinámico y se debe decidir junto con la estrategia de caché.

La API tiene validación, mínimos de consulta, 429 y un límite por instancia. El límite distribuido debe completarse en Vercel Firewall. También siguen siendo configuración externa: protección obligatoria de `main`, aprobación del entorno de producción, capacidad de Supabase y certificación de PITR.

Ver [IMPLEMENTATION.md](IMPLEMENTATION.md) para el alcance técnico y [docs/OPERATIONS.md](docs/OPERATIONS.md) para publicación y recuperación.
