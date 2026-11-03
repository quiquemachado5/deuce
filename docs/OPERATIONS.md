# DEUCE: publicación, seguridad y recuperación

## Contrato de publicación

1. Rama revisada: ejecutar `npm run test`, `npm run lint`, `npm run build`, `npm run typecheck`, `npm run data:verify`, `npm run data:wta:audit`, `npm run data:evidence`, `npm run data:restore-drill`, `npm run test:browser`.
2. La compilación ejecuta `data:ensure`: reutiliza una generación compatible, restaura un snapshot HTTPS configurado o reconstruye desde los archivos fuente compactos. Debe alcanzar los mínimos ATP y WTA de `ops/release-baseline.json` y la versión de reglas indicada allí.
3. En el VPS, `ops/vps/deploy.sh` asocia la imagen al SHA de Git y no termina hasta que `/api/health/deep` acredita ese commit, la versión de datos, los mínimos por circuito, almacenamiento y heartbeat del scheduler. Un estado degradado bloquea la release.
4. Contrastar con el dominio público: volumen, catálogo, cobertura estadística por año, versión, partidos recientes, evidencia, comparador y filtros.
5. Integrar el mismo código en `main` mediante PR después de CI. Requerir el check `verify`, rama al día, una aprobación, sin force-push ni borrado. La existencia del YAML no activa por sí sola protección de rama: verificarlo en GitHub.
6. Aumentar los mínimos de `ops/release-baseline.json` tras una release validada; nunca reducirlos para hacer pasar un fallo.

## Supervisión externa

`production-health.yml` consulta `/api/health/deep` cada media hora desde GitHub Actions, una vez presente en la rama por defecto. Reutiliza la misma política que el despliegue: comprueba HTTP, estado, antigüedad, volumen total, mínimos ATP/WTA, coherencia de sus sumas, catálogo, versión de reglas y datos, commit, almacenamiento y scheduler. Crea una sola incidencia abierta identificada por marcador y autor, permanece silencioso si no cambia y la cierra al recuperarse. Las notificaciones dependen de las preferencias de GitHub del propietario; GitHub puede retrasar ejecuciones programadas y no constituye un SLA de disponibilidad.

`/api/health` es liveness rápida y no toca el archivo. `/api/health/deep` puede tardar más y devuelve la versión de la aplicación, SHA/ID/URL del despliegue, generación de datos, totales por circuito, fallback, capacidad y estado del scheduler. El scheduler persiste en `.deuce-archive/.scheduler/state.json` un heartbeat y el estado separado de ATP, WTA y publicación. Cada etapa transitoria reintenta a 1, 5, 15 y 60 minutos; los bloqueos por cuota o reserva esperan al siguiente ciclo diario. La publicación solo se ejecuta cuando ATP y WTA han terminado correctamente.

`npm run monitor:check` es una comprobación de solo lectura y no crea incidencias. La alerta detecta efectos de un cron fallido por antigüedad, no confirma por sí sola cada invocación del cron ni el consumo del proveedor.

El scheduler conserva el `retryAt` comunicado por el proveedor. Si ATP, WTA o el histórico agotan la cuota, reanuda esa misma publicación después del reinicio diario sin esperar al pipeline del día siguiente. El histórico prioriza 2019 hacia atrás y consulta los códigos WTA propios de cada era (`W`, `T1`–`T5`, `PM`, `P`, `I`, además de `G` y `F`); el filtro de publicación sigue admitiendo únicamente individuales Grand Slam, WTA 1000, WTA 500 y WTA 250.

Para una recuperación local reanudable del tramo prioritario se usa `npm run data:wta:backfill:historical`. Los checkpoints quedan en `.deuce-cache/wta`; una interrupción no publica cohortes incompletas ni repite las ya cerradas.

Antes de consumir cuota histórica, `npm run data:wta:derive -- --years=2020,2021,2022` reutiliza respuestas amplias `archive-YYYY-A` ya verificadas y las separa por el `level` original del proveedor. Conserva cada fila sin remapear torneos o marcadores, registra `scope: derived-from-YYYY-A`, escribe de forma atómica y se niega a sobrescribir una cohorte existente con contenido diferente.

`npm run data:wta:audit` no consulta al proveedor: recorre únicamente los checkpoints versionados de las 263 cohortes previstas, exige `complete: true`, circuito WTA, año/nivel coherentes, totales e identificadores únicos y resume el progreso por era. También impide retroceder respecto a `ops/wta-history-baseline.json`: sus mínimos deben subir y cada cohorte nueva debe desaparecer de la lista exacta de pendientes permitidas tras comprobarla; nunca se rebajan para hacer pasar CI. `--require-complete` se reserva para cerrar la migración histórica; el gate ordinario valida con rigor lo ya descargado sin bloquear las cohortes todavía pendientes.

## Recuperación

`npm run data:restore-drill` crea un `tar.gz`, calcula SHA-256, lo extrae en un directorio temporal y comprueba todos los archivos, identificadores, manifiesto, páginas estadísticas y referencias de jugadores. Para ensayar una copia real del volumen, ejecutar `DEUCE_RESTORE_ARCHIVE=/ruta/deuce-archive-fecha.tar.gz npm run data:restore-drill`; también valida el `.sha256` adyacente, el manifiesto físico, cada pack por hash, sus mapeos y todas las particiones de partidos. Nunca sobrescribe producción ni el árbol de trabajo.

`ops/vps/backup.sh` conserva copias locales rotatorias y, si `DEUCE_BACKUP_REMOTE` está definido, sube el archivo y su checksum mediante `rclone` a S3, B2, SFTP u otro remoto configurado. Una copia externa solo cuenta como recuperable después de ejecutar el restore drill contra un archivo descargado desde ese remoto.

### Snapshot reproducible sin historial Git pesado

Los ficheros comprimidos por temporada y cohorte de `data/archive/wta` son la fuente WTA compacta y versionada. `data/reading` es una generación derivada: `npm run build` la reconstruye cuando no cumple los mínimos y, en una máquina local, restaura al final la copia de trabajo para evitar diffs de decenas de MB. De este modo otro ordenador puede clonar el mismo commit y producir la misma entrada ATP/WTA sin descargar de nuevo la API.

Para conservar una generación ya compilada, ejecutar `npm run data:snapshot:export -- --output=/ruta/inmutable/<commit>`. `snapshot-manifest.json` registra commit fuente, versión, reglas, conteos por circuito, tamaño y SHA-256 de cada fichero. Tras publicar ese directorio por HTTPS, configurar `DEUCE_SNAPSHOT_MANIFEST_URL` y `DEUCE_EXPECTED_SNAPSHOT_COMMIT`; la compilación Docker restaura y valida el snapshot dentro de su etapa efímera. Si no está disponible o no supera la política, reconstruye desde las fuentes compactas. No introducir credenciales en la URL ni commitear el directorio exportado.

Para un incidente de código: usar una generación anterior conocida con `vercel rollback ID --scope quiquemachado5s-projects`, comprobar `/api/health`, `/api/health/deep` y las APIs públicas. Rollback pausa la autoasignación de despliegues; `vercel promote` la restablece. No ejecutar como simulacro contra producción.

Para un incidente de base de datos: primero confirmar backups/PITR disponibles en el proyecto `rmiltvmwdmfqzuoipfqs`, fecha de recuperación y recursos afectados. Ensayar en un destino aislado antes de restaurar producción. No se ha certificado PITR: la conexión MCP permite SQL/advisors pero la CLI no tiene sesión para listar backups. Nunca entregar tokens en el chat ni reutilizar secretos de producción localmente.

## Incidente de capacidad de Supabase — 31/10/2026

Síntoma confirmado: el panel marca el proyecto como `ACTIVE_HEALTHY`, pero SQL devuelve `57P03 database system is not accepting connections / Hot standby mode is disabled`. Los logs previos muestran `53100 No space left on device` al crear archivos temporales de `pg_wal`. La web conserva disponibilidad mediante el snapshot incluido, pero no puede ingerir ni publicar partidos nuevos.

Orden de recuperación:

1. Pausar cualquier invocación manual de refresh/publicación; los cron ya fallan sin cambiar el puntero activo.
2. En Supabase, comprobar Disk y WAL. Ampliar capacidad o abrir incidencia de soporte; no borrar objetos a ciegas mientras PostgreSQL no acepta conexiones.
3. Verificar backup diario y, si se ha contratado, el punto PITR anterior a la falta de espacio. Restaurar primero en un destino aislado.
4. Cuando SQL acepte conexiones, inspeccionar tablas, advisors y tamaño de `deuce_archive_objects` antes de escribir.
5. Aplicar `20261031103000_archive_capacity_guard.sql`, comprobar que `deuce_archive_storage_report()` solo sea ejecutable por `service_role` y ejecutar una publicación controlada.
6. Confirmar que `/api/health/deep` cambia a `remote`, que Cobertura muestra la nueva hora y que ATP/WTA no pierden volumen.

### Recuperación sin cambiar a Pro

Un proyecto Free que ha llenado por completo el disco puede dejar PostgreSQL sin
capacidad para arrancar o podar sus propias tablas. En ese estado no se debe
presentar el proyecto como recuperable mediante borrados desde la aplicación:
la [documentación de tamaño de base de datos de Supabase](https://supabase.com/docs/guides/platform/database-size)
indica que la salida soportada en el mismo proyecto es ampliar disco. Si no se
autoriza ese gasto, la alternativa operativa es un destino Free nuevo (si la
cuenta dispone de un proyecto) o retirar el archivo remoto de Supabase.

La salida sin coste elegida es un Blob privado de Vercel. El plan Hobby incluye
1 GB y, si se supera la cuota, Vercel suspende Blob en vez de generar un cargo.
El código reserva 200 MB y detiene la ingestión al llegar a 800 MB.

1. Crear un Blob privado en el proyecto de Vercel y conectarlo a producción y
   preview. Vercel inyecta `BLOB_STORE_ID` y las credenciales OIDC.
2. Descargar las variables para una siembra local sin imprimirlas y ejecutar
   `npm run data:verify && npm run storage:seed`. La siembra publica primero
   todos los objetos versionados y cambia `reading-v2-manifest` al final.
3. Desplegar con Blob conectado. `/api/health/deep` debe indicar archivo remoto
   configurado, alcanzable y con menos de `DEUCE_ARCHIVE_MAX_BYTES`.
4. Ejecutar una publicación controlada y verificar versión, 176.370 partidos o
   más, ATP/WTA, estadísticas y fallback. Conservar activa y anterior.
5. Retirar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` del despliegue solo después
   de confirmar que refresh, WTA y publicación completan mediante Blob.

El adaptador prioriza Blob cuando `BLOB_STORE_ID` o `BLOB_READ_WRITE_TOKEN`
están presentes y conserva Supabase únicamente para una transición reversible.
El lease de los cron usa ETags y escrituras condicionales, evitando dos
publicaciones simultáneas sin necesitar otra base de datos.

Si no hay un proyecto Free disponible, la contingencia sin coste es publicar
un delta comprimido de la temporada actual como artefacto estático versionado y
fusionarlo durante la generación del despliegue. No se deben hacer commits
diarios de los 67 MB de `data/reading`, porque inflarían el historial Git; solo
el delta pequeño y validado puede entrar en ese flujo.

La publicación nueva particiona partidos por circuito y década, conserva solo la generación activa y la inmediatamente anterior y detiene refresh en `storage-reserve` al superar `DEUCE_ARCHIVE_MAX_BYTES` (800 MB con Blob por defecto). Esa retención no sustituye un backup. PITR es un servicio con coste: activarlo requiere aprobación explícita del propietario.

## Límites y protección perimetral

Las rutas de búsqueda y jugadores validan longitud, limitan carga y responden 429 mediante un token bucket por instancia. En producción debe existir además una regla distribuida en Vercel Firewall para `/api/search`, `/api/players` y `/api/telemetry`; el repositorio no puede demostrar esa configuración. Registrar la regla y su fecha aquí cuando se aplique.

La CSP usa SRI para scripts externos, impide framing, objetos, atributos JavaScript inline y orígenes no declarados. `unsafe-inline` permanece únicamente en `script-src` porque la hidratación estática de Next inserta scripts inline. Eliminarlo exige nonces por petición y convertir las páginas afectadas en dinámicas; no hacer ese cambio sin medir CDN y TTFB.

## Seguridad verificada el 21/10/2026

Se inspeccionaron tablas, políticas, grants y definiciones RPC reales. Nueve tablas públicas tienen RLS. Las seis tablas internas sin política están cerradas por diseño y no requieren inventar políticas públicas.

La migración `20261021102027_harden_deuce_public_access` hace que `rankings_current` respete permisos del invocante, retira mutaciones de clientes públicos y ejecución pública de cuatro RPC internas, fija `search_path` vacío y preserva permisos de `service_role`. Se ejecutaron assertions de lectura como `anon`, `authenticated` y `service_role`. El advisor posterior no muestra errores ni advertencias; mantiene seis avisos informativos de RLS sin política. Esto no certifica todos los servicios externos ni reemplaza un pentest.

## Criterios históricos y límites

Las fechas del proveedor pueden representar el inicio del torneo: se prioriza `context.date` y, en fechas iguales, la ronda antes que el ID. Una racha se corta ante un resultado inválido; las ausencias no se pueden reconstruir. No se afirma una cronología exacta cuando falta evidencia.

El final 13–12 en el quinto set se admite para Wimbledon 2019–2021; cuenta como un tie-break. [Fuente oficial: Wimbledon, compendio 2021](https://www.wimbledon.com/pdf/Wimbledon_Compendium_2021v3.pdf). Australian Open usa objetivo de 10 puntos en el quinto set desde 2019: [anuncio oficial](https://ausopen.com/articles/news/final-set-tiebreaks-australian-open-2019). Se aplica objetivo 10 a quinto set Grand Slam desde 2022, con [reglas oficiales ITF](https://www.itftennis.com/media/5986/grand-slam-rulebook-2026-f2.pdf). Los periodos no documentados siguen sin objetivo inferido. No se ha completado una matriz exhaustiva de todos los formatos anteriores a 1975.

El [anuncio conjunto de marzo de 2022](https://ausopen.com/articles/news/grand-slams-jointly-adopt-10-point-final-set-tiebreak) documenta la transición de los cuatro Grand Slams. Para US Open se usa la fecha de 1975 del [artículo retrospectivo oficial de 2020](https://www.usopen.org/en_US/news/articles/2020-09-02/the_us_open_introduced_the_tiebreak_set_50_years_ago_today.html); otro artículo oficial anterior menciona 1976, por lo que cualquier cinta de ese límite exige contraste adicional. No se reconstruyen puntos históricos ausentes.

`/cobertura/revision` enumera candidatos por año/torneo/ronda/jugadores y separa coincidencias de marcador y fecha. No fusiona ni elimina. La comprobación con fuentes independientes de todos los grupos está pendiente. La tabla remota de rankings contiene 31 fechas entre 06/08/2026 y 21/10/2026: NO cubre 2023–2025 y no permite rellenar legítimamente esos años. Se necesita una fuente histórica verificable y con licencia adecuada antes de importar.

## Evidencia y comparador

Cada clasificación enlaza una lista paginada con los filtros originales. La identidad de la entrada se valida contra el cálculo de la generación activa; no se acepta como prueba una cifra que el usuario escriba en la URL. Para tie-breaks, puntos y juegos se explicita que el denominador no es el número de partidos. Para rachas se muestra el tramo. Las comprobaciones recorren las tres primeras entradas de cada estadística; no sustituyen un corpus histórico independiente.

El comparador aplica los mismos filtros, muestra exclusiones y cobertura de edad/ranking, y no destaca diferencias con muestras inferiores al umbral. No estima edades ni declara al jugador con mayor porcentaje como mejor. Sin cuentas, favoritos ni colecciones.

## Diseño

Sistema propio `app/design-system.css`: tipografía del sistema, escala editorial, superficies neutras, contraste, controles redondeados, tarjetas y movimiento reducido. Referencias visuales: [Apple](https://www.apple.com/) y [Revolut](https://www.revolut.com/), sin sus marcas ni fuentes propietarias. Las imágenes mantienen las fuentes/créditos del proyecto.
