# Runbook operativo de DEUCE

Este documento describe las decisiones que deben tomarse durante una incidencia. No contiene credenciales ni sustituye las verificaciones automáticas de `docs/OPERATIONS.md`.

## Orden de diagnóstico

1. Consultar `/api/health` y después `/api/health/deep`. Anotar `deployment.commit`, `generation.version`, circuito afectado y última operación correcta.
2. Consultar `/api/metrics` con `METRICS_SECRET`. Revisar memoria de publicación, saldo seguro del proveedor, almacenamiento, edad de backup y cola de enriquecimiento.
3. Revisar `docker compose ps`, el heartbeat del scheduler y los logs estructurados. No ejecutar manualmente un cron mientras exista el lease `tennis-provider`.
4. Mantener la generación publicada: refresh, WTA, histórico y enriquecimiento escriben checkpoints; solo publicación mueve el puntero cuando todas las validaciones pasan.

Los accesos rechazados a cron y métricas emiten `security.auth.denied` con superficie, método y `requestId`. Si se configura `SECURITY_LOG_SALT`, incluyen un hash HMAC truncado para correlacionar repeticiones sin almacenar la IP. Nunca registrar cabeceras de autorización ni query strings.

## Cuota del proveedor

- `provider-quota-status` es la fuente operativa. No estimar el saldo por el número de archivos descargados.
- La reserva mínima es 200. No reducirla para terminar una carga; continuar tras el `retryAt` del proveedor.
- Prioridad: resultados ATP/WTA actuales, publicación, histórico reanudable y finalmente detalles. Un 404 de detalle queda aplazado por la cola persistente.
- Nunca compartir ni registrar `TENNIS_API_KEY`. Ante exposición, rotarla en el proveedor y en `.env.production`, reiniciar servicios y comprobar que el ledger vuelve a avanzar.

## Datos y publicación

- `archive-catalog-status` inventaría publicaciones, detalles, temporadas, cohortes y checkpoints sin abrir sus cargas.
- Una edición solo se declara incompleta cuando el ledger tiene evidencia (`missing-late-rounds`, duplicados o resultados no terminales). `uncertified-draw-size` es revisión, no un partido inventado.
- `npm run data:integrity-queue` transforma ese ledger en una cola operativa priorizada y separada por circuito. El fichero de trabajo se escribe de forma atómica en `$DEUCE_ARCHIVE_DIR/integrity/repair-queue.json` (o `.deuce-cache/integrity/repair-queue.json` en local). Las decisiones revisadas se conservan en `ops/integrity-repair-ledger.json`.
- Nunca cerrar una incidencia como `resolved` o `dismissed` sin una fuente HTTPS oficial o independiente, editor, fecha de consulta y alcance (`draw`, `result` o `status`). La cola no modifica partidos: una reparación se incorpora por el flujo normal y permanece `resolvedAwaitingPublication` hasta que la auditoría deja de detectarla.
- El índice criptográfico de publicación impide eliminar identidades y detecta correcciones de resultados/metadatos sin cargar la generación anterior completa.
- Si publicación supera memoria, conservar el puntero anterior, revisar `publish-status.memory.phases` y no aumentar el límite del contenedor sin medir la causa.
- Si producción contiene resultados más recientes que el snapshot del repositorio, reconstruirlo con `DEUCE_VERIFY_REMOTE_RELEASE=true npm run data:rebuild` desde un entorno de confianza montado sobre una copia aislada del archivo privado. Esta lectura no consume cuota del proveedor. Verificar después `data:verify`, `data:evidence` y `data:verify-publication`, confirmando que los totales por circuito nunca disminuyen.

## Recuperación

1. Detener scheduler antes de una restauración manual.
2. Elegir una copia cuyo `.sha256` y `.manifest.json` identifiquen commit y generación.
3. Ejecutar el restore drill en un directorio aislado. Debe validar manifiesto, packs, índices, circuitos e identidades.
4. Restaurar el volumen solo tras el ensayo; arrancar web en modo heartbeat, comprobar salud profunda y después reactivar el pipeline.
5. Si el código falla pero los datos están sanos, usar el rollback automático de imagen. Si los datos fallan, no promover una imagen nueva para ocultarlo.

## Mantenimiento mensual

- Comprobar restauración externa, espacio libre y retención de imágenes/logs.
- Revisar métricas p95, memoria máxima de publicación, tamaño del archivo y cola diferida.
- Rotar secretos de acceso y despliegue según la política del proveedor; confirmar que son distintos y de al menos 48 caracteres.
- Ejecutar `npm run verify`, `npm run build`, `npm run data:evidence` y `npm run test:browser` antes de cada promoción relevante.
