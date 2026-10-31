# DEUCE: publicación, seguridad y recuperación

## Contrato de publicación

1. Rama revisada: ejecutar `npm run test`, `npm run lint`, `npm run build`, `npm run typecheck`, `npm run data:verify`, `npm run data:evidence`, `npm run data:restore-drill`, `npm run test:browser`.
2. Comprobar propietario/proyecto con `vercel project inspect --non-interactive --scope quiquemachado5s-projects`: debe ser `prj_zm1hdxkgG9NOOiTGkpwilP7H7nFO` / `deuce`.
3. Preparar producción sin dominio: `vercel deploy --prod --skip-domain --scope quiquemachado5s-projects`. No promover una preview con variables distintas.
4. Contrastar con el dominio público: volumen, catálogo, cobertura estadística por año, versión, partidos recientes, evidencia, comparador, filtros y el único tema claro aprobado. La copia local puede tener menos enriquecimiento que producción; no es su sustituto.
5. Solo con controles correctos: `vercel promote URL --scope quiquemachado5s-projects`. Conservar el identificador de la versión anterior.
6. Integrar el mismo código en `main` mediante PR después de CI. Requerir el check `verify`, rama al día, una aprobación, sin force-push ni borrado. La existencia del YAML no activa por sí sola protección de rama: verificarlo en GitHub. La release debe usar un entorno `production` con aprobador requerido.
7. Aumentar los mínimos de `ops/release-baseline.json` tras una release validada; nunca reducirlos para hacer pasar un fallo.

## Supervisión externa

`production-health.yml` consulta `/api/health/deep` cada media hora desde GitHub Actions, una vez presente en la rama por defecto. Comprueba HTTP, estado, antigüedad (72 h), volumen, catálogo, respaldo, almacenamiento y versión. Repite un fallo antes de declararlo. Crea una sola incidencia abierta identificada por marcador y autor, permanece silencioso si no cambia y la cierra al recuperarse. Las notificaciones dependen de las preferencias de GitHub del propietario; no se ha contratado correo/SMS ni un drain de logs. GitHub puede retrasar ejecuciones programadas; no es un SLA de disponibilidad.

`/api/health` es liveness rápida y no toca la base de datos. `/api/health/deep` puede tardar más y devuelve la versión de la aplicación, SHA/ID/URL del despliegue, generación de datos, fallback y capacidad del archivo. Cada respuesta incluye `X-Request-Id`; los logs JSON permiten seguir ese identificador sin registrar consultas de usuarios.

`npm run monitor:check` es una comprobación de solo lectura y no crea incidencias. La alerta detecta efectos de un cron fallido por antigüedad, no confirma por sí sola cada invocación del cron ni el consumo del proveedor.

## Recuperación

`npm run data:restore-drill` copia únicamente `data/reading` a un directorio temporal nuevo, registra SHA-256, restaura a otro directorio nuevo y comprueba todos los archivos, identificadores, manifiesto, páginas estadísticas y referencias de jugadores. No sobrescribe producción, el árbol de trabajo, secretos ni datos ajenos. La ubicación aparece al terminar. Este ensayo verifica una generación publicada incluida en el despliegue, NO una copia física completa de Supabase.

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

La publicación nueva particiona partidos por circuito y década, conserva solo la generación activa y la inmediatamente anterior y detiene refresh en `storage-reserve` al superar `DEUCE_ARCHIVE_MAX_BYTES` (1,5 GB por defecto). Esa retención no sustituye un backup. PITR es un servicio con coste: activarlo requiere aprobación explícita del propietario.

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
