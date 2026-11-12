# Auditoría total de DEUCE

Fecha: 11 de noviembre de 2026. Auditoría del código y del snapshot local, con comprobaciones públicas de solo lectura. **Las recomendaciones de este informe no se han implementado.** Los ajustes visuales solicitados se han mantenido en local.

## Dictamen ejecutivo

DEUCE tiene una presentación cuidada, separación explícita ATP/WTA y una arquitectura de publicación más seria de lo que sugiere una web personal: generaciones inmutables, validaciones, límites de consumo, cachés acotadas, copias y restauraciones monitorizadas. Su principal debilidad es que la amplitud visual del producto supera lo que puede demostrar sobre la cobertura de sus datos. Un récord correcto sobre una selección incompleta puede convertirse en una afirmación histórica incorrecta si se presenta como absoluto. Antes de añadir más funcionalidades, hay que cerrar cuatro frentes: **universo de cobertura verificable, identidad de ediciones/encuentros, procedencia reproducible y consistencia operativa de la publicación**. Después deben venir los productos estadísticos precalculados y el SEO basado en entidades certificadas.

### Alcance y límites

- Snapshot local: `569fc90581a7f7aadfe3`, generado el 10/11/2026 a las 20:49:32 UTC. Recuento directo de las particiones publicadas de individuales con resultado consistente.
- Producción consultada: generación activa `60be75eb14cd5a4aed32`, 144.987 resultados. El snapshot local tiene 1.573 más: son versiones distintas, no una prueba de pérdida de datos en producción.
- Se inspeccionaron código de lectura, normalización, publicación, validación, metadatos, seguridad y scripts operativos; se navegaron las superficies modificadas en escritorio y móvil.
- No se accedió a credenciales, no se consumieron llamadas de Live Tennis API, no se ejecutaron ataques, no se modificó producción y no se midieron consultas SQL de la instancia real.
- No hay en esta revisión datos de Search Console, CrUX/RUM de 28 días, logs de tráfico completos ni `EXPLAIN ANALYZE`. No se inventan posiciones SEO, visitas potenciales, Core Web Vitals ni porcentajes globales de cobertura.
- **C = comprobado**, **R = riesgo derivado del diseño**, **M = pendiente de medir**. P0 bloquea afirmaciones/publicaciones afectadas; P1 se aborda antes de crecer; P2 mejora sostenibilidad; P3 es oportunidad. Complejidad B: hasta 2 jornadas; M: 3–7; A: más de una semana. Son rangos de planificación, no presupuestos cerrados.

## Estado real medido

| Indicador sobre los resultados publicados | ATP | WTA |
|---|---:|---:|
| Resultados | 73.263 | 73.297 |
| Fecha exacta del partido identificada como tal | 10.037 · 13,70 % | 9.486 · 12,94 % |
| Ranking de ambos participantes | 58.244 · 79,50 % | 57.829 · 78,90 % |
| Edad de ambos participantes | 62.952 · 85,93 % | 63.352 · 86,43 % |
| Duración presente | 49.710 · 67,85 % | 13.417 · 18,30 % |
| Estadísticas de partido presentes | 690 · 0,94 % | 217 · 0,30 % |
| Secuencia punto a punto presente | 523 · 0,71 % | 121 · 0,17 % |
| Marcador por juegos presente | 100 % | 100 % |
| URL en los campos de fuente/contexto de la proyección publicada | 1,68 % | 1,56 % |

El barrido estructural adicional no encontró nombres vacíos, rankings presentes no positivos ni juegos con forma inválida o enteros negativos. Todas las filas tienen una de cuatro superficies: ATP dura 37.376, tierra 22.424, hierba 12.325 y moqueta 1.138; WTA dura 40.300, tierra 20.345, hierba 11.455 y moqueta 1.197. Esto acredita presencia/estructura, no verifica la superficie real de cada encuentro.

Presencia no significa exactitud, comparabilidad ni validación independiente. El último indicador **no mide toda la trazabilidad interna**: los originales del proveedor pueden conservar la procedencia aunque la proyección de lectura no incluya una URL. Tampoco tener un marcador implica que esté certificado el cuadro entero.

| Categoría publicada | Resultados |
|---|---:|
| ATP Grand Slam | 27.571 |
| ATP Masters 1000 | 20.183 |
| ATP 500 | 6.995 |
| ATP 250 | 18.514 |
| WTA Grand Slam | 25.617 |
| WTA 1000 | 13.587 |
| WTA 500 | 11.100 |
| WTA 250 | 22.993 |

Hay 3.022 ediciones en el producto de auditoría: **3 certificadas completas, 74 marcadas incompletas y 2.945 sin certificación suficiente**. Las 2.945 no equivalen a 2.945 cuadros con partidos ausentes. El informe de reconciliación mantiene 10 conflictos y 3 filas pendientes. Trece ediciones no tienen final en ese producto; hay que distinguir ausencia, torneo en curso, cancelación y otro formato.

### Puntuaciones de madurez, no certificaciones

| Área | Nota | Justificación |
|---|---:|---|
| Producto y coherencia visual | 7/10 | Identidad propia y marcador compartido; los prototipos y excepciones móviles aún requieren consolidación. |
| Cobertura demostrable | 3/10 | Mucho resultado almacenado, pero falta un censo externo de encuentros esperados. |
| Identidad y trazabilidad | 4/10 | Versionado y originales son una base buena; las entidades y citas por fila son incompletas. |
| Estadística histórica | 4/10 | Se calculan muchos indicadores; la selección y los campos disponibles condicionan sus conclusiones. |
| Arquitectura y mantenimiento | 6/10 | Productos precalculados, aislamiento y presupuestos ya existen; hay deuda de claves e invalidación. |
| Operación y recuperación | 6/10 | Copias/restauraciones con evidencia positiva; estados operativos contradictorios. |
| SEO técnico | 6/10 | Canonicals, sitemaps y JSON-LD presentes; falta demostrar calidad e indexación a escala. |
| Seguridad | Sin nota global | Hay controles observables; sin revisar configuración real, logs y pruebas autorizadas no procede certificarla. |
| Performance | Sin nota CWV | Hay indicios de rotación de caché y parseo costoso; falta RUM y carga representativa. |

## 1. Datos y fuentes

**Gravedad alta · P0/P1 · Complejidad A.** No se puede responder honestamente «qué porcentaje del circuito está cubierto» con el número de filas importadas. Para ATP, WTA y porcentaje faltante global la respuesta actual es **no determinado**. Hace falta el denominador: circuitos, disciplinas, categorías históricas, fases, ediciones celebradas y partidos efectivamente disputados.

El backfill de producción informa 263/263 cohortes históricas descargadas. Eso demuestra la terminación de ese plan de descargas, **no la totalidad del tenis histórico**. Una API puede devolver un archivo completo respecto a su propio catálogo y seguir careciendo de competiciones.

Hay discontinuidades que merecen investigación prioritaria: WTA 2018 contiene 1.070 resultados frente a 2.435 en 2017 y 2.292 en 2019; ATP aumenta de 1.022 en 2008 a 2.599 en 2009, coherente con un cambio de alcance de categorías que debe documentarse. Estos saltos no permiten estimar automáticamente partidos faltantes. Los campos de rankings publicados de ATP 2023–2026 deben revisarse de forma específica: el manifiesto inspeccionado no aporta rankings de ambos jugadores en esas cohortes.

**Solución propuesta:** un registro de cobertura por `edición × circuito × disciplina × fase × regla histórica`. Estados separados: esperada, celebrada, cancelada, importada, reconciliada y certificada. Para cada partido: identificador del proveedor, objeto original, hash, localizador de fila, fecha de captura, versión del transformador y citas de verificación. Guardar una corrección como nueva versión, nunca como una sobrescritura sin historia.

Las tres fuentes solicitadas por el propietario deben comprobarse como **tres procedencias independientes**, con coincidencia de edición, ronda, jugadores y marcador. Tres sitios que copian el mismo proveedor no son tres verificaciones. Wikipedia/Wikidata sirven para descubrir alias, entidades, biografía y bibliografía; las tablas de récords y publicaciones de X deben tratarse como pistas, no como datos certificados por repetición.

## 2. Duplicados e identidad

**Alta · P0 · M/A.** No hay IDs duplicados en las particiones leídas. Eso no excluye un mismo encuentro con IDs distintos. Aparecen diez grupos candidatos al agrupar circuito, torneo, año, ronda y pareja. Seis corresponden a Miami 2026 con una fila `reference-*` y otra `live-*`, marcador coincidente y diferente precisión de fecha: requieren reconciliación antes de que sus recuentos se consideren fiables.

Ejemplo reproducible: `reference-miami-2026-ms010` y `live-218144`, octavos Etcheverry–Paul, mismo 1–6, 3–6; una fecha representa el inicio del torneo y la otra el encuentro. Un deduplicador que exija fecha idéntica no los une. En cambio, **no se deben borrar automáticamente los otros candidatos**: Tokyo WTA 2015 incluye categorías 250 y 500; Australia 1977 incluye dos ediciones; Chennai 2012 y Brisbane 2018 muestran inicios de torneo en diciembre que plantean una confusión entre año natural y temporada.

El sistema antifallos debe resolver primero `event_id`, `edition_id` y `participant_id`, conservar cada observación original y producir un único hecho canónico. Coincidencia exacta se resuelve de forma determinista; coincidencia parcial genera un candidato con razones y bloqueo editorial. La clave no puede ser «ciudad + año». Debe haber pruebas de falsos positivos: Australia 1977, dos torneos en Tokyo, París ATP/WTA, fases previas y round robin.

## 3. Validación de resultados

**Alta · P0/P1 · M.** Ya existen validadores de sets, reglas históricas, formatos y secuencias de puntos. Sería incorrecto proponer un validador que solo acepte sets modernos 6–4/7–6. Se han localizado duraciones candidatas a revisión: ATP `archive-170400` con 1.146 minutos; WTA `wta-archive-992973` con 1.094 y `wta-archive-1003679` con 1. Son alertas, no errores demostrados ni motivos para inventar un reemplazo.

Contrato propuesto de validación automática, por capas:

| Capa | Validaciones necesarias | Comportamiento |
|---|---|---|
| Estructura | ID, circuito, participantes distintos, enteros no negativos, tipos/unidades | Rechazar entrada inválida, conservar original. |
| Reglamento | BO3/BO5 según edición/fase, sets de ventaja, tie-break/match tie-break y cambios por fecha | Aplicar reglas versionadas; nunca reglas actuales a todo el pasado. |
| Estado | Terminado, retirada, descalificación, walkover, suspendido, cancelado | No exigir un marcador final de un resultado no terminado. |
| Coherencia | Ganador y sets compatibles; set a set; puntos suficientes si existe secuencia | Bloquear publicación afectada y registrar causa. |
| Temporal | Partido dentro de ventana de edición; año deportivo distinto del inicio de diciembre; precisión conocida | No convertir inicio de torneo en fecha exacta. |
| Ranking/edad | Ranking positivo y coherente con fecha; edad respecto a nacimiento; ausente no equivale a cero | Alertas por límites plausibles; revisión de excepciones históricas. |
| Duración | Unidad, valores extremos, partido multijornada, ausencia | Alertar con evidencia; no imputar por media. |
| Cuadro | BYE, qualifier, lucky loser, retiros, enlaces entre rondas, formatos de grupos | Verificar topología, no solo «N participantes menos uno». |
| Estadística | Aces ≤ puntos de servicio cuando ambos existen; ganados ≤ disputados; agregados compatibles | No mezclar totales de partido con los de un jugador o set. |
| Regresión | Reproducir campeones, H2H y muestras testigo contra fuentes oficiales | No promover una generación que altere referencias sin explicación. |

## 4. Modelo de datos

**Alta · P1 · A.** `lib/types.ts` modela un partido como dos jugadores y un ganador 1/2 con circuito ATP/WTA opcional. Es adecuado para el producto actual de individuales, pero **no incorpora dobles, mixto o equipos sin ampliación estructural**. Challenger, ITF y junior tampoco son simplemente nuevas etiquetas ATP/WTA.

Modelo evolutivo propuesto: `Person`, `Participant` (individual/equipo), `Membership`, `CompetitionSeries`, `Edition`, `Draw`, `Stage`, `Match`, `Set`, `RankingObservation`, `RuleVersion`, `SourceObservation`, `CanonicalDecision` y `MetricDefinition`. Género de competición, disciplina y circuito son dimensiones distintas. Davis/BJK Cup necesitan eliminatorias de equipos y partidos dentro de ellas; Juegos Olímpicos son una competición propia; exhibiciones deben poder excluirse de récords oficiales. Mantener las proyecciones actuales durante una migración incremental, sin rehacer la interfaz ni tirar el archivo inmutable.

## 5. SEO técnico

**Alta · P1 · M/A.** Existen `robots.txt`, índices de sitemap, canonical, metadatos por entidad y rutas en inglés. La presencia de esos archivos no demuestra que Google indexe bien el sitio. Las facetas de jugador, circuito, año, superficie y competición pueden producir muchas URLs equivalentes o pobres. La pareja de Comparar y su orden inverso necesitan una política explícita; también las variantes españolas/inglesas y los parámetros históricos de cuadro/categoría.

Propuesta: inventario generado de rutas con estado HTTP, entidad canónica, idioma, índice/noíndice y cardinalidad; indexar solo páginas con valor propio y contenido verificable. Vacíos reales: 404/410 o página útil noindex, no una ficha «200» sin entidad. Paginación con enlaces rastreables y canonical propio cuando muestra contenido diferente. Sitemaps con `lastmod` de cambio real, no fecha del build. Preservar acceso a recursos necesarios y no bloquear en robots una URL que deba procesar `noindex`.

Google recomienda controlar expresamente el rastreo de navegación facetada; no conviene dejar que todas las combinaciones se conviertan en páginas SEO. [Guía oficial de navegación facetada](https://developers.google.com/crawling/docs/faceted-navigation).

No se superará a ATP por autoridad oficial ni a Flashscore por cobertura en directo a base de metadatos. La oportunidad es responder mejor consultas históricas reproducibles, con entidades estables, resultados legibles y evidencia enlazada. No se ha medido autoridad de dominio ni demanda real.

## 6. Schema

| Tipo | Estado/uso recomendable | Restricción |
|---|---|---|
| SportsEvent | Ya se genera para encuentros | Fecha exacta solo cuando se conoce; distinguir edición y serie con IDs estables. |
| Person / ProfilePage | Ya presente para perfiles | No presentar una nacionalidad, nacimiento o identidad inferida como hecho. |
| SportsOrganization | ATP/WTA aparecen como organizadores | Revisar edición: federación, sede y organizador no siempre coinciden. |
| BreadcrumbList / ItemList | Helpers existentes | Coincidir con enlaces visibles y entidades canónicas. |
| Dataset | Recomendado en cobertura/dataset publicado | Versión, alcance, licencia efectiva, procedencia y fecha; no prometer descarga si no existe. |
| Article | Solo para piezas editoriales reales | Autor, publicación y fuentes; un listado de resultados no es una noticia. |
| FAQPage | No prioritario | Solo preguntas visibles auténticas; no añadirlo para esperar resultados enriquecidos. |

**Error concreto comprobado · P1 · B:** `lib/seo-metadata.ts` emite `eventStatus: https://schema.org/EventCompleted`. Ese miembro no figura en la enumeración vigente `EventStatusType`. La propuesta es retirar ese valor o expresar el estado con una propiedad/vocabulario válido, y validar todas las plantillas JSON-LD; no se ha cambiado el código en esta ronda. [Enumeración oficial EventStatusType](https://schema.org/EventStatusType).

La semántica de `SportsEvent` debe corresponder al encuentro real. El código ya evita publicar una fecha de inicio del torneo como fecha exacta del partido, una decisión que debe preservarse. [Schema.org SportsEvent](https://schema.org/SportsEvent).

## 7. Estructura SEO y crecimiento

Potencial cualitativo, no previsión de visitas:

| Familia | Potencial | Dificultad | Prioridad / condición |
|---|---|---|---|
| Edición + cuadro + final | Alto | Media | P1 con cuadro certificado. |
| Récord con definición, periodo y resultados testigo | Alto | Alta | P1 tras certificar elegibilidad. |
| Perfil + carrera por torneos | Alto | Alta | P1, con carrera/muestra bien distinguidas. |
| Rivalidad + competición/periodo | Alto | Alta | P1 evitando miles de parejas sin valor. |
| Temporada y finales por circuito | Medio/alto | Media | P2 con categorías históricas. |
| Superficie + década | Medio | Media | P2 con cobertura suficiente. |
| País y generaciones | Medio | Media | P2, nacionalidad por fecha cuando cambie. |
| Archivo de torneos desaparecidos/renombrados | Medio | Media | P2, entidad histórica diferenciada. |
| Páginas automáticas de filtros arbitrarios | Incierto | Coste de rastreo alto | No indexar por defecto. |

Validar demanda con Search Console y una herramienta de palabras clave antes de multiplicar páginas. El contenido diferencial debe anteceder a la generación masiva de URLs.

## 8. Velocidad y Core Web Vitals

**Alta · P1 · M.** No se han medido LCP, CLS o INP de usuarios reales. Las comprobaciones públicas dieron respuestas correctas en unos cientos de milisegundos desde este entorno; son muestras aisladas de descarga y **no un p75 de TTFB ni una auditoría móvil**. Objetivos de referencia: p75 LCP ≤2,5 s, INP ≤200 ms y CLS ≤0,1, separados por dispositivo. [Umbrales oficiales](https://web.dev/articles/defining-core-web-vitals-thresholds).

Los indicios concretos están en las cachés de producción: `matchDetails` acumulaba 22.560 fallos frente a 5.260 aciertos y 22.432 expulsiones; `compactSelections`, 41.251 fallos frente a 599 aciertos; particiones del navegador, 7.379 expulsiones. Son contadores acumulados sin ventana temporal: prueban rotación, **no atribuyen por sí solos la latencia de una visita**. `remoteArtifacts` estaba al límite de 16 entradas con unos 3,3 MB de un presupuesto de 48 MiB: ajustar solo bytes no corrige un límite de cardinalidad.

Priorizar trazas de `/match`, `/comparar` y filtros: generación activa, tiempo de descarga, descompresión, parseo, selección y render. Precalcular perfiles/ediciones/pares frecuentes por versión; conservar productos compactos y obtener el detalle bajo demanda. El parseo síncrono de gzip/JSON puede bloquear el proceso en fallos de caché; medirlo antes de moverlo a workers o formatos indexados. Controlar bytes de HTML, RSC y JS por ruta, no el peso total de `.next/static`.

## 9. Base de datos y escala x10

**Alta · P1 · A.** La persistencia inspeccionada no es una tabla analítica de 146.560 partidos con SQL por cada vista: utiliza objetos JSONB/versiones y proyecciones comprimidas. Pedir un índice SQL sobre `winner_id` sin cambiar esa estructura no arreglaría el cuello de botella actual.

Lo que probablemente rompe primero al crecer x10: publicación monolítica, memoria al descomprimir/parsear, claves de caché de alta cardinalidad, reconstrucción de estadísticas y cantidad de objetos históricos. Es una hipótesis arquitectónica sustentada en el código; falta una prueba de carga. El snapshot de lectura ronda 80 MB comprimidos y las imágenes locales 170 MB, no todos se envían al navegador.

Medir RSS, pausas del event loop, CPU de build/publicación y p95/p99 con 1–1,5 millones de filas sintéticas **identificadas como pruebas**. Si se incorpora un almacén relacional analítico: índices `(tour, discipline, edition_id, round_order)`, `(participant_id, date, match_id)`, `(pair_id, date)` y productos por temporada/torneo/superficie. Justificarlos con planes reales y frecuencia, no crear todos indiscriminadamente. Mantener originales y decisiones fuera de la tabla derivada.

## 10. Seguridad OWASP

| Superficie | Evidencia y riesgo | Prioridad / propuesta |
|---|---|---|
| SQL injection | No se demostró un vector; hay cliente de persistencia y funciones SQL controladas | P1: revisar funciones/RPC y consultas dinámicas en la instancia real. |
| XSS | CSP limita orígenes pero permite `unsafe-inline`; textos externos/JSON-LD son fronteras relevantes | P1: inventario de sinks, escape de JSON, nonces/hashes donde sean viables. |
| CSRF | Cron autenticado por token, no una sesión de usuario normal | P2: mutaciones operativas por POST, autenticación y rechazo de caché; no declarar vulnerabilidad solo por GET. |
| SSRF | Descargadores de fotos/fuentes y seguimientos de redirects son fronteras de red | P1: allowlists, límites, validación tras cada redirect y bloqueo de redes privadas. |
| Open redirect | No se ha probado un caso explotable | P1: probar parámetros de retorno/idioma contra rutas internas permitidas. |
| Clickjacking | HSTS, X-Frame-Options DENY y `frame-ancestors 'none'` observados | Mantener y verificar también respuestas de error/proxy. |
| Abuso de API | Límites en memoria por proceso; confianza en IP depende del proxy | P1: límite en proxy/edge, identidad coherente y presupuesto global. |
| Exposición operativa | `/api/health/deep` público devuelve estado detallado de operación/capacidad/cuota | P1: salud pública mínima; diagnóstico detallado autenticado. |
| Dependencias/secretos | No se inspeccionaron secretos ni se hizo análisis completo de dependencias | P1: SBOM, alertas y prueba de rotación; nada de claves en frontend/build logs. |
| RLS/autorización | Migraciones de endurecimiento y revocaciones presentes | P1: comprobar políticas y roles efectivos; un archivo SQL no demuestra el estado desplegado. |

No se ha demostrado una brecha, ni esta revisión equivale a un pentest. Usar controles verificables, no «seguridad total». La protección SSRF debe cubrir también redirects y resolución de nombres. [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## 11. Bots, scraping y protección de costes

**Alta · P1 · M.** Cualquier dato que una persona pueda leer públicamente puede recopilarse. Robots.txt expresa preferencias, no es control de acceso. Ocultar una API no protege una base reconstruible mediante miles de páginas. Tampoco interesa bloquear Google ni la investigación legítima para impedir toda copia.

Separar lectura humana, crawlers verificados y extracción intensiva. Limitar concurrencia, combinaciones costosas y bytes por cliente; descargar del proveedor solo en jobs autorizados con reserva persistente de llamadas. Cloudflare/WAF puede aportar límites y protección de origen si se configura realmente; Turnstile solo para acciones costosas/sospechosas, no para cada visita. Fingerprinting invasivo no es la primera medida. Evitar pagar un segundo stack si proxy y límites actuales cubren la necesidad. No hay forma honesta de garantizar «nadie copiará mis datos públicos».

## 12. Copias y política 3-2-1

**Estado positivo comprobado por telemetría:** backup del 11/11 a las 03:22 UTC con restauración validada; simulacro del 09/11 a las 21:00 UTC también válido. El script exige remoto, checksum y validación de restauración. Por tanto, sería falso decir que DEUCE no tiene backups.

**Riesgo alto · P1 · M:** falta demostrar independencia del dominio de fallo, cifrado y recuperación sin credenciales del servidor perdido. `rclone --immutable` evita sobrescribir en esa operación; no equivale a retención WORM del proveedor. La configuración real de cifrado/retención remota no fue acreditada en esta auditoría.

Objetivo propuesto 3-2-1: originales y datos canónicos + copia local separada + copia cifrada en otro proveedor/cuenta; catálogo de hashes y claves guardadas fuera del host. RPO ≤24 h para archivo, ≤6 h para correcciones editoriales; RTO ≤4 h para servir última generación válida y ≤24 h para reanudar ingestión. Son objetivos a demostrar con un simulacro, no capacidades ya medidas. Retención propuesta: 7 diarias, 4 semanales y 12 mensuales dentro de un presupuesto de almacenamiento.

## 13. Recuperación de desastres

| Escenario | ¿Qué evidencia hay? | Qué falta demostrar |
|---|---|---|
| Borrado accidental | Originales/versiones y copias verificadas | Restauración selectiva de una edición sin revertir correcciones posteriores. |
| Corrupción de generación | Validación, puntero activo y fallback | Detectar corrupción semántica válida en JSON y rollback consistente en todas las rutas. |
| Host desaparece | Remoto y scripts de arranque existen | Host vacío + DNS/TLS + secretos externos, sin leer disco antiguo. |
| Ransomware | Remoto reduce dependencia de disco local | Copia con credenciales/retención que el host comprometido no pueda destruir. |
| Proveedor cae | Fallback y archivos inmutables | Plan alternativo de alojamiento/almacenamiento con ensayo y tiempo medido. |
| Error humano en corrección | Versionado ofrece recuperación técnica | Revisión y registro de decisiones antes de promover métricas históricas. |

## 14. Monitorización y publicación diaria

**Alta · P0/P1 · M.** La comprobación profunda pública devuelve `degraded` por el scheduler: cinco intentos de publicación acabaron en timeout. Sin embargo, `dailyUpdate.publication` registra éxito a las 23:46 UTC, posterior al último intento de las 23:40. La generación activa existe. **La conclusión no es «la web no publica nada»: es que la verdad operativa está desalineada.** Una operación puede continuar en servidor después de que el cliente deje de esperar; necesita ID de ejecución, estado persistente y acuse reconciliable, no reintentos ciegos.

Ya hay monitorización de host, cuotas, fases y restauración. Completar con alertas accionables: generación servida vs construida, filas añadidas/corregidas por circuito, latencia por fase, publicaciones sin confirmar, edad de fuente vs edad de publicación, errores 5xx, RSS/event loop, disco y restauración. `/api/health` debe ser liveness; readiness debe verificar generación y dependencias necesarias. No confundir «heartbeat sano» con «datos publicados hoy».

UptimeRobot/Better Stack sirven para comprobaciones externas; Sentry para excepciones si se limita información personal y muestreo; Prometheus/Grafana para métricas si el mantenimiento lo justifica. No se recomienda contratar los cuatro. Elegir una alerta externa y explotar primero los eventos operativos existentes.

## 15. Calidad y política de evidencia

Separar calidad de adquisición, de identidad, de partido, de cuadro y de métrica. Un cero en «pendientes de importación» no es cero en conflictos ni certificación histórica. Los 74 incompletos y 10 conflictos deben mantenerse visibles en cobertura, resumidos y con alcance; resolverlos no consiste en ocultarlos ni en convertir `unknown` a `true`.

Pipeline propuesto: adquirir → preservar original → normalizar → reconciliar identidades → validar reglamento → contrastar → certificar edición → calcular métricas elegibles → comparar regresiones → publicar atómicamente. Cada paso produce un artefacto y causa de rechazo. Las correcciones externas requieren fuentes independientes, revisiones guardadas y pruebas sobre métricas afectadas. Para automatizar Wikipedia: usar ID de revisión, referencias citadas y diferenciación de afirmación original/transcrita; no raspar tablas en cada visita.

## 16. Récords: la principal deuda de producto

No se ha contrastado individualmente cada cifra del catálogo contra un censo independiente; esta revisión acredita riesgos de cálculo y casos testigo, no certifica todos los récords.

**Alta · P0 · A.** Los récords absolutos y las rachas son sensibles a partidos ausentes, competiciones excluidas, empates, estados no terminados y fecha aproximada. Haber importado 263 cohortes WTA no certifica un récord. La profundidad también es desigual: menos del 1 % de resultados tiene estadísticas de partido, y el punto a punto aún menos.

Ejemplo testigo: la propuesta local Federer–Nadal muestra 34 encuentros y 12–22. La ATP documenta 40 y 16–24. La diferencia es compatible con el alcance del archivo —ATP Finals y categorías anteriores a la ventana cubierta— y **no debe etiquetarse automáticamente como seis partidos perdidos dentro de una cohorte**. Debe poder explicarse exactamente qué encuentros se incluyen/excluyen. [Historial oficial ATP de la rivalidad](https://www.atptour.com/en/news/federer-nadal).

Definir para cada récord: universo, circuito, disciplina, periodo, regla de elegibilidad, mínimo de muestra, política de empates, versión y lista testigo reproducible. Certificado global solo si el denominador está cerrado; en otro caso «máximo documentado de esta selección». Las advertencias de cobertura pueden concentrarse en Cobertura, como desea el propietario, pero la afirmación visible no debe inducir a creer que la muestra es toda la carrera. Rachas no deben saltar por encima de partidos desconocidos como si no existieran.

## 17. Comparativa competitiva

Comparación funcional cualitativa basada en las páginas citadas; no benchmark de velocidad ni de tráfico:

| Referente | Qué hace mejor | Ventaja potencial de DEUCE | Qué adoptar / evitar |
|---|---|---|---|
| [Tennis Abstract](https://www.tennisabstract.com/charting/meta.html) | Profundidad analítica y proyecto de datos de golpes | ATP/WTA histórico más fácil de explorar visualmente | Definiciones y datos reproducibles; no confundir muestra de charting con censo. |
| [Ultimate Tennis Statistics](https://www.ultimatetennisstatistics.com/about) | Amplitud de rankings, líneas temporales, Elo y récords masculinos | Integrar ATP/WTA con una experiencia móvil coherente | Métricas explicadas; evitar una clasificación GOAT sin supuestos transparentes. |
| [ATP Tour](https://www.atptour.com/en/news/federer-nadal) | Autoridad institucional y contexto oficial masculino | Navegación histórica transversal y evidencia de fuentes múltiples | Usar referencias oficiales; no fingir que un recuento parcial es la cifra ATP. |
| [WTA](https://www.wtatennis.com/stats) | Servicio/resto y contexto oficial femenino | Igual prioridad editorial para carreras femeninas históricas | Separar criterios y mínimos; no trasladar categorías ATP literalmente a WTA. |
| [Flashscore](https://www.flashscore.com/tennis/) | Calendario, resultados actuales y amplitud de competiciones | Archivo explicable, sin ruido de apuestas | Descubrimiento y navegación rápida; evitar competir en todo el directo. |
| [Sofascore](https://www.sofascore.com/tennis) | Lectura de estados y contexto visual de partidos | Investigación histórica y procedencia persistente | Interacción clara; no inventar gráficos de dominio sin datos suficientes. |

No hay evidencia para afirmar hoy que DEUCE supera a estos servicios en completitud, precisión o tiempos. Su diferenciación puede ser **cada afirmación histórica demostrable y navegable**, además de su diseño.

## 18. Experiencia de investigador

| Persona | Pregunta que debe poder resolver | Carencia prioritaria |
|---|---|---|
| Periodista | «¿Puedo citar esta cifra y reconstruirla después?» | URL/versionado de consulta, definición y fuentes persistentes. |
| Estadístico | «¿Qué filas excluye el denominador?» | Exportación versionada, nulls, precisión de fechas y reglas explícitas. |
| Entrenador | «¿Es comparable el rendimiento ante rivales de nivel similar?» | Ranking/Elo fechado, sesgo de selección y muestra suficiente. |
| Analista profesional | «¿El dato existía antes del partido?» | Tiempos de observación para evitar fuga de información futura. |
| Historiador | «¿Es el mismo torneo tras renombrarse o mudarse?» | Entidades históricas, calendarios y bibliografía por edición. |

No hace falta un chatbot para cubrir estas necesidades. Un filtro reproducible y una buena definición valen más que un resumen convincente de cifras incompletas.

## 19. Cien datasets diferenciales

El [anexo de 100 ideas](IDEAS-100.md) distingue lo calculable con marcadores, lo que exige fechar resultados, lo que necesita rankings, lo que exige puntos y lo que requiere nuevas fuentes. No se presentan como 100 estadísticas ya disponibles. Las primeras familias deben construirse sobre ediciones certificadas, no sobre todo el archivo indiscriminadamente.

## 20. IA útil, con límites

1. Resolver candidatos de identidad proponiendo equivalencias y razones, sin aplicar fusiones irreversibles.
2. Priorizar anomalías: cambios de duración, categorías, nombres, calendarios y marcadores; la decisión final debe quedar registrada.
3. Convertir documentos oficiales/PDF en observaciones estructuradas con página, fragmento y hash, no en hechos sin procedencia.
4. Traducir preguntas a filtros/métricas existentes y enseñar la consulta ejecutada; nunca inventar una agregación oculta.
5. Descubrir candidatos a récord mediante cálculos deterministas y usar IA solo para explicar lo que el cálculo acredita.
6. Redactar borradores de «Tal día como hoy» desde acontecimientos certificados, con aprobación editorial o reglas estrictas de publicación.

No enviar la base completa a un modelo por visita. Cachear por versión, imponer presupuesto mensual y medir precisión en un conjunto testigo. Proteger frente a instrucciones incrustadas en páginas/PDF externos. «Tres fuentes dicen lo mismo» debe comprobarse en código y evidencia, no por una afirmación del modelo.

## 21. Las cien críticas y qué impide ser referente mundial

El [anexo de 100 críticas priorizadas](CRITICAS-100.md) contiene problemas comprobados, riesgos y mediciones pendientes, con impacto, respuesta y complejidad. No son cien vulnerabilidades demostradas.

Lo que impide hoy ser el mejor archivo histórico no es la falta de otra animación. Es no poder contestar de forma reproducible estas preguntas: **qué universo se cubre; por qué dos observaciones representan el mismo partido; cómo se demuestra el resultado; qué datos hacen elegible una cifra; y si el proceso que la publica terminó realmente**. Hasta cerrar eso, más indicadores pueden aumentar la apariencia de autoridad más rápido que la autoridad real.

## Orden de implementación recomendado

| Orden | Entregable | Prioridad | Impacto | Complejidad | Criterio para darlo por cerrado |
|---|---|---|---|---|---|
| 1 | Reconciliar estado de publicación y scheduler | P0 | Alto | M | Un ID de job explica éxito/timeout; sin estados contradictorios ni duplicación de trabajo. |
| 2 | Resolver seis pares Miami y fronteras de temporada/edición | P0 | Alto | M | Una fila canónica por encuentro, originales preservados, regresiones explicadas. |
| 3 | Universo y matriz de cobertura independiente | P0 | Alto | A | Denominadores por edición/fase; porcentaje calculable y desconocidos explícitos. |
| 4 | Contratos de récord y certificación | P0 | Alto | A | Cada récord tiene universo, pruebas y resultados testigo; rachas no atraviesan huecos. |
| 5 | Procedencia reproducible por fila/decisión | P1 | Alto | A | De una cifra a sus filas, de una fila a original/hash y transformador. |
| 6 | Restauración completa en host vacío | P1 | Alto | M | RPO/RTO medidos y claves disponibles fuera del servidor. |
| 7 | Diagnóstico privado, límites compartidos y SSRF | P1 | Alto | M | Pruebas de acceso/IP/red/redirect, coste máximo bajo abuso. |
| 8 | Trazas y optimización de caché/productos | P1 | Alto | M | p75/p95 por ruta mejora; RSS y costes dentro de presupuesto. |
| 9 | Inventario SEO y entidades canónicas | P1 | Alto | M/A | Una URL indexable por intención útil y equivalente ES/EN real. |
| 10 | Métricas nuevas sobre muestras certificadas | P2 | Medio/alto | M | 10 métricas diferenciales, verificadas y citables antes de otras 100. |

### Próximos 1 / 3 / 10 días

- **Día 1:** congelar cifras absolutas afectadas; diagnosticar publicación con IDs/timestamps; abrir los seis pares Miami y generar inventario de denominadores, sin borrar candidatos automáticamente.
- **Día 3:** una cohorte piloto cerrada (por ejemplo GS de un año ATP y WTA), procedencia fila a fila, conjunto testigo y reconciliación de resultados. Medir `/match` y `/comparar`; probar recuperación en máquina limpia.
- **Día 10:** ampliar certificación según resultados, integrar contratos de métricas y alertas, desplegar mejoras de caché demostradas y cerrar URLs SEO prioritarias. No prometer certificar 59 años completos en diez días sin estimar documentación y excepciones.

### Evidencia conservada y cómo repetirla

El archivo [evidencia.json](evidencia.json) guarda los recuentos de esta revisión y el estado público resumido, sin credenciales. Los campos se cuentan directamente en `data/reading/matches-{atp|wta}-<década>s.json.gz`; fecha exacta exige `context.dateLabel === 'Fecha del partido'`, no solo que exista una fecha. Contrastar con `manifest.json.gz`, `audit.json.gz` y `reconciliation.json.gz`. Usar la misma versión al comparar recuentos; un import posterior cambia el denominador.

Fuentes de código principales: `lib/types.ts`, `lib/quality.ts`, `lib/historical-rules.ts`, `lib/archive-tour-dedupe.ts`, `lib/tournament-identity.ts`, `lib/provenance.ts`, `lib/revista/read-records.ts`, `lib/http-cache.ts`, `lib/rate-limit.ts`, `lib/seo-metadata.ts`, `app/api/cron/publish/route.ts`, `supabase/migrations/`, `ops/scheduler-core.mjs` y `ops/vps/backup.sh`.

**Corrección histórica adicional:** Australian Championships es la denominación histórica del Australian Open, no un torneo femenino que deje de ser Grand Slam por llamarse distinto. Se ha eliminado su tarjeta duplicada del directorio local, conservando sus 58 resultados; queda pendiente una reconciliación formal de identidad, no un borrado del pasado. [ITF: Grand Slam tournaments](https://www.itftennis.com/en/tours/grand-slam-tournaments/).

## Cierre de la revisión visual local

Compilación de producción, tipos, lint de los archivos afectados y cinco pruebas dirigidas correctos. Navegación de siete rutas a 390/1.366 px sin desbordamientos ni errores de página; comprobación adicional a 320 px con movimiento reducido. Pelota de marca verificada en topbar/footer en cuatro Grand Slams × tres temporadas. Revisión independiente de acabado: **PASS**; aislamiento del color de marca y visibilidad del foco en la transición móvil resueltos. No se ha hecho commit, push ni despliegue. Las recomendaciones anteriores siguen siendo propuestas.
