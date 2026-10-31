# Plan de implementación de la auditoría

21/10/2026. Trabajo por entregas verificables; no interpretar este archivo como una afirmación de que toda la auditoría esté resuelta.

## Primera entrega: publicada

- Límite compartido de 16 lecturas del archivo comprimido; overview desde manifiesto.
- Next 16.3.8 y actualizaciones compatibles de dependencias; árbol de producción sin avisos en el chequeo realizado.
- Datos reales por defecto; rechazo de demo en producción y en publicación.
- Puertas de volumen, años, pérdida de datos e identificadores duplicados.
- Superficies moqueta/desconocido en importación, agregados, filtros y fichas.
- Snapshot con esquema/reglas versionados, resumen de cobertura e identidad por día editorial.
- Reconstrucción local real y comprobación de integridad.
- Página pública de cobertura por temporada y superficie.
- Filtros persistentes en estados vacíos y explicación del ranking histórico ausente.
- Búsqueda de torneos/ediciones; sugerencias conservadoras de nombres; índice de texto de partidos reutilizado por generación en memoria.
- Semántica y contraste de fichas; gráfico con enlaces agrupados y descripción textual.
- Cabeceras básicas de seguridad.
- Pruebas unitarias, de navegador y workflow de CI sin secretos ni despliegue automático.
- README y configuración de ejemplo; retirada documentada de comandos a scripts no recuperados.

## Verificación local de esta entrega

- Compilación de producción, TypeScript y ESLint: correctos.
- 10 pruebas unitarias y 7 recorridos de navegador: correctos.
- Integridad de 176.263 partidos y 90 listas preparadas comprobada.
- Lectura en frío con límite de 128 archivos abiertos: completa, sin `EMFILE`.
- Auditoría npm: 0 vulnerabilidades en dependencias de producción; 9 en desarrollo (7 altas y 2 moderadas), pendientes de migración revisada.
- Axe sin infracciones en las fichas comprobadas en claro/oscuro y en la página de cobertura; capturas revisadas en móvil. Esto no certifica todas las páginas ni sustituye pruebas con lectores de pantalla.
- Las guías de revisión React y verificación de Vercel orientaron las comprobaciones de semántica, contraste y recorridos interfaz/API/datos.
- Primera entrega publicada el 21/10/2026 tras verificar 176.267 partidos y 94 estadísticas con la configuración remota. Los 7 recorridos de navegador también pasaron contra el dominio público.

## Segunda entrega: coherencia y diagnóstico

- Manifiesto, partidos y agregados de jugadores se seleccionan como una generación completa. Si falta una pieza esencial remota, se utiliza íntegramente la copia incluida.
- Una página de ranking remota incompleta se recalcula con los partidos de esa misma generación, sin introducir filas antiguas.
- Caché del cuaderno identificada por versión/origen; búsqueda, listados, fichas, destacados y sitemap de partidos leen datos publicados.
- Metadatos y cabecera `X-DEUCE-Dataset-Version` en las APIs para contrastar resultados.
- Aviso visible de respaldo en portada, estadísticas, fichas y cobertura. Las cachés CDN pueden actualizarse en momentos diferentes: no se promete simultaneidad global entre páginas.
- `/api/health`: versión, origen, antigüedad y estado. Más de 72 horas o un respaldo por fallo remoto produce `degraded`; archivo inaccesible produce HTTP 503. No se ha contratado ni configurado un servicio de alertas.
- Consultas de lectura remota con límite de espera; build de producción bloqueado si pierde partidos o cobertura estadística medida frente al manifiesto publicado.
- Pruebas de fallos parciales, datos corruptos, cambio de versión, edición de torneo, persistencia de filtros y concordancia entre siete APIs.
- Verificación del código `96d3ace`: 16 pruebas unitarias y 8 de navegador, build, TypeScript, lint y chequeo de datos correctos. [GitHub Actions también completó todas las comprobaciones](https://github.com/quiquemachado5/deuce/actions/runs/39580883785).

## Próxima entrega: fiabilidad avanzada

- Recuperar herramientas originales y esquema; revisar grants/RLS, backups y restauración con acceso al proyecto correcto.
- Conservar la conciliación en cada release: la primera publicación mantuvo 176.267 partidos, 94 estadísticas y los 50 partidos recientes comprobados.
- Revisar los 42 grupos candidatos a conflictos; no borrar ni fusionar por coincidencia de nombres.
- Reglas de desempate por torneo/época y corpus histórico más amplio.
- Orden de rachas con fechas y rondas fiables; documentar cortes por datos ausentes.
- Ampliar los ensayos de fallo a múltiples instancias y cachés CDN.
- Cálculo de estadísticas filtradas por métrica; índice preparado de entidades; medición frío/caliente.
- Particionar artefactos para reducir memoria y trazado de funciones.
- Timeouts consistentes, supervisión de cron, edad del dataset y alarmas accionables.
- Resolver avisos de desarrollo mediante migración compatible y revisada.

## Experiencia y descubrimiento

- Comparador de jugadores con cohortes equivalentes, no totales engañosos.
- Lista completa de evidencia para cada cifra.
- Colecciones y favoritos locales; cuenta opcional solo después de validar utilidad.
- Fotografías de cabecera con mayor resolución y encuadres coherentes.
- Navegación de secciones en móvil, más pruebas de zoom/lector de pantalla y de navegadores.
- Sitemap particionado, canonical normalizada, datos estructurados apropiados y guías editoriales.
- Medición de búsquedas útiles, consulta de evidencia y recurrencia, con minimización de datos personales.

## Funciones posteriores que requieren decisiones o permisos

- Exportaciones CSV y reutilización: revisar licencias del proveedor.
- Compartir tarjetas con cobertura, fuente y versión; extender el compartir existente.
- Ediciones/cuadros e historias curadas con fuentes verificadas.
- Canal de correcciones con moderación y seguimiento.
- Cuentas, sincronización y correo: elegir política de datos, autenticación y consentimientos.
- WTA/dobles: nueva cobertura y reglas, no solo cambiar etiquetas.
- Lenguaje natural: traducir preguntas a consultas comprobables; no inventar estadísticas.
- Monetización, servicios de pago o aplicación nativa: decidir después de medir demanda.

## Puerta de release

No promocionar solo porque compila: ejecutar build, pruebas, verificación del archivo, comparación del dataset remoto, revisión del diff y una preview del mismo entorno de datos. Conservar la generación anterior para rollback. La prueba local no acredita la configuración del WAF ni los permisos reales de la base de datos.

## Tercera entrega: producto, diseño y operaciones (21/10/2026)

- Rediseño compartido de portada, cabecera, tarjetas, clasificaciones, filtros, cobertura y fichas: tipografía del sistema, superficies neutras, espacios amplios, radios y estados coherentes, claro/oscuro y movimiento reducido. Inspiración Apple/Revolut, identidad DEUCE.
- `/comparar`: dos jugadores, temporada, superficie, competición, edad publicada y mínimo de muestra; datos ausentes explícitos y acceso a toda la muestra. Autocompletado sin enviar el directorio entero al navegador.
- `/records/evidencia`: listas completas paginadas detrás de cada entrada, identidad y filtros comprobados contra la generación activa; diferencia entre partidos, puntos, juegos y oportunidades.
- Índice por jugador/año/ID, selección acotada por generación, caché entre paginaciones y cálculo por métrica con agregados diferidos.
- Fechas de fuente y rondas antes que IDs en cronología; resultados inválidos cortan rachas. Reglas de desempate históricas documentadas. Recuperados Federer–Djokovic (Wimbledon 2019) y Rinderknech–Otte (2021), antes excluidos por su 13–12.
- `/cobertura/revision`: 42 grupos candidatos, 15 con marcadores distintos y 27 con mismo marcador/fechas distintas. No se han borrado ni fusionado partidos.
- Supabase: revisión real de grants/RLS/RPC; hardening aplicado, pruebas por rol correctas y sin errores/advertencias posteriores en advisor. Se recuperó del historial la migración original de las dos tablas de archivo; NO el esquema histórico completo de los demás servicios.
- Workflow de monitor externo con incidencias deduplicadas, recuperación y mínimos de volumen/catálogo; se activa al integrarse en `main`, sujeto a GitHub Actions y preferencias de notificación.
- Ensayo de copia y restauración de los artefactos publicados con SHA-256, sin tocar producción. No equivale a PITR de Supabase.
- Verificación local: 22 pruebas unitarias, 12 recorridos de navegador (incluido axe en claro/oscuro), build/TypeScript/lint, integridad y 266 entradas de evidencia entre 90 estadísticas. Copia local: 176.265 partidos; producción conserva enriquecimiento adicional y se valida aparte.
- No se implementa el punto 5: favoritos, colecciones, cuentas ni nueva navegación móvil.

### Pendientes que no deben presentarse como resueltos

- Contraste documental y resolución de los 42 grupos; rankings históricos 2023–2025 ausentes de la base disponible (solo hay snapshots remotos desde agosto de 2026).
- Backups físicos/PITR: la CLI necesita sesión autorizada; no se ha restaurado ni certificado la base completa.
- Activación efectiva de protección de `main`: necesita sesión de administración en GitHub; el navegador integrado está sin autenticar. No confundir CI configurada con protección activada.
- WAF/rate limiting distribuido, CSP estricta, avisos del proveedor/costes y los avisos de dependencias de desarrollo siguen fuera de esta entrega.

Procedimientos, fuentes y límites: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Cuarta entrega: frescura, capacidad y regresión (31/10/2026)

- Cobertura ya no presenta una publicación ausente como «sin partidos nuevos»: muestra la fecha de la generación validada y un aviso de respaldo.
- Liveness rápida separada de diagnóstico profundo; versión de aplicación/SHA/despliegue, request IDs, logs estructurados, Web Vitals y errores de cliente.
- Búsqueda con mínimo, 429, límite de CPU, caché e índice por generación; nombres del comparador bajo demanda, sin directorio completo en el HTML cliente.
- Publicación de partidos particionada por ATP/WTA y década, retención de dos generaciones, informe de capacidad y reserva de escritura a 1,5 GB.
- Puerta WTA adicional, portada consciente del día editorial, promesa ATP/WTA corregida, canonical/sitemaps enriquecidos y JSON-LD de sitio/dataset.
- Vídeo principal reducido de 17,0 a 5,7 MB y móvil de 4,8 a 1,0 MB; presupuestos de build y regresión visual en cinco anchos, preferencia oscura y movimiento reducido.
- Trampas y retorno de foco, reflow equivalente al 200 %, Axe, LCP, CSP/SRI/cabeceras, eliminación de código/estilos/dependencias muertos y excepciones ESLint locales.
- Build, 103 pruebas unitarias, integridad de 176.370 partidos/122 listas, 362 evidencias y simulacro de restauración verificados localmente.

### Incidente que impide recuperar datos recientes

Supabase agotó el disco escribiendo WAL y PostgreSQL permanece en recuperación sin aceptar conexiones, aunque la API de gestión diga `ACTIVE_HEALTHY`. La producción conserva una generación más nueva que el repositorio, pero no puede publicarla ni exportarla mientras la base esté caída. La migración de capacidad está preparada, no aplicada.

### Configuración externa aún necesaria

- Recuperar o ampliar el almacenamiento de Supabase; después aplicar y verificar la migración de capacidad.
- Confirmar backups y aprobar, si se desea, el coste de PITR antes de activarlo.
- Activar Vercel Firewall distribuido para las APIs públicas.
- Proteger `main` con `verify`, rama actualizada, una aprobación, sin force-push/borrado, y exigir aprobación del entorno `production`.
- Una CSP de nonce sin `unsafe-inline` exigiría abandonar la prerenderización de las rutas afectadas; queda como decisión de arquitectura, no como cambio silencioso.
