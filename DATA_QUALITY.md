# Integridad del archivo — 16 de octubre de 2026

## Un único universo de cálculo

`lib/data.ts` aplica `prepareMatch` y `eligibleMatch` a todos los listados, perfiles, rankings, rivalidades y selecciones analizables. Se cuentan individuales masculinos del cuadro principal, terminados, con cada set cerrado, un número de sets compatible con el formato publicado y un ganador coherente. No se cuentan abandonos, incomparecencias ni resultados incompletos. Los nombres con variantes de acentuación comparten una identidad; las excepciones explícitas se conservan en `quality.ts`.

Auditoría de la copia local: 54.303 registros, 52.592 declarados terminados, **51.112 admitidos**. Se excluyen 1.711 no completados y **1.480 finales inconsistentes**. La actualización diaria puede variar estas cifras. Los archivos fuente no se borran ni se reescriben para hacerlos coincidir con el validador.

La validación comprueba coherencia estructural. No certifica que cada resultado publicado por el proveedor sea históricamente verdadero. No se invierten automáticamente marcadores ni ganadores.

## Cincinnati 2023

`live-112019`: Alcaraz está en la primera columna; Djokovic en la segunda. Djokovic ganó 5–7, 7–6(7), 7–6(4); la orientación Alcaraz es 7–5, 6–7(7), 6–7(4). Fuente contrastada: https://www.atptour.com/es/news/cincinnati-2023-domingo-final-alcaraz-djokovic . La cinta y los totales de puntos del proveedor no coinciden: ese desglose queda oculto para revisión, sin modificar el resultado correcto.

## Puntos, estadísticas y procedencia

- El marcador de la lista de temporada es canónico: una ficha guardada anteriormente no lo sobrescribe.
- No se usa la etiqueta del proveedor «Completa». Una proyección sin puntos se describe como «Solo resultado».
- Si los puntos ganados registrados superan el total atribuido a cualquiera de los jugadores por el proveedor, se ocultan tanto la cinta como el desglose estadístico contradictorio. No se elige arbitrariamente una de las fuentes.
- Los registros consecutivos idénticos del marcador no se cuentan como puntos nuevos.
- Se conserva el marcador anterior (`score_before`) y el cierre del juego (`game_ended`). La interfaz no presenta el reinicio 0–0 como marcador del punto ganador.
- No se inventan aces, longitud de rally ni probabilidades. La altura de las barras representa presión: normal 38%, break 75%, bola de partido 95%.
- Los rankings actuales descargados con el partido se omiten; se muestran solo los identificados por la fuente como ranking al jugar.
- Las respuestas públicas y los componentes cliente no reciben `raw_fixture` ni `raw_point_tape`.

## Eras y alcance

Los eventos históricos de nivel M anteriores a 1990 son «Precursores de Masters». Los H2H indican junto a sus cifras que cuentan encuentros de DEUCE, no todos los de la carrera. Se retiran las clasificaciones ambiguas de torneos distintos conquistados y de racha de victorias sin cronología suficiente.

## Índice DEUCE

La fórmula está publicada en `lib/analytics/drama.ts` y visible en Épicos y en la ficha. Usa únicamente sets y juegos; no mezcla disponibilidad de probabilidades, duración o puntos. Mide tensión del marcador, no calidad, relevancia histórica ni prestigio. La ronda se muestra como contexto, no como peso oculto.

## API y descubrimiento

`/api/matches` devuelve 8 partidos por defecto, máximo 50. Filtros: q/search, player, round, year, tournament, surface, fiveSets, page y limit; view solo admite summary. Se rechazan parámetros desconocidos, duplicados y valores inválidos. Los torneos aceptan slug o nombre sin distinguir mayúsculas. `/partidos` muestra resultados en HTML; `/torneo/[slug]/[year]` ofrece un enlace compartible. Hay sitemap de navegación/perfiles/torneos y mapas de partidos segmentados por año, anunciados en robots.txt.

## Comprobaciones reproducibles

- `npx tsx --test tests/archive-integrity.test.ts`: regresiones de sets imposibles, ganador, abandono, Cincinnati, discrepancias de puntos, API y métricas.
- `npx tsx scripts/audit-results.ts`: cuenta incidencias de la copia local, sin llamadas al proveedor.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- Verificación HTTP de filtros, 400, ficha en revisión, robots, sitemaps, títulos y recuentos.
- Revisión visual a 1.020 px y 390 px, tabla de cinco sets, búsqueda con tilde y ejemplos ADN precargados.

La tarea diaria del servidor y el almacenamiento persistente siguen en funcionamiento; no dependen del Mac.

## Relatos y posición de los puntos

Las historias, las ediciones y los calendarios usan solo el archivo guardado y validado. Los listados no descargan nuevos detalles del proveedor. El marcador de juegos de un momento se reconstruye únicamente si todos los juegos previos tienen cierre documentado. El contador de sets resuelve el primer juego del set siguiente cuando el proveedor todavía conserva la columna del set anterior. Los recorridos indican las rondas guardadas, y «Sin registro» no equivale a «No jugó». Duración y edad se comparan exclusivamente entre registros que incluyen ese campo.
