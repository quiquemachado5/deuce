# Marcadores, tablas y lectura del partido · 21 octubre 2026

## Cambios

- `SetScoreboard` unifica portada, partido y finales de torneo. Cabecera de jugador alineada a la izquierda, total al final, números ganadores en color de superficie y desempates pequeños en línea. No hay celdas ganadoras rellenas ni retratos duplicados. El ganador conserva su nombre accesible.
- `MatchMeasures` agrupa servicio, resto y puntos: valores enfrentados, denominadores publicados y carriles con escala común. Los porcentajes usan 0–100; los recuentos comparten máximo entre los dos jugadores. Las dobles faltas y los errores consideran mejor el valor menor. Los campos ausentes permanecen ausentes.
- El resumen sustituye «Así se decidió» por juegos ganados y medidas disponibles. Se retira la pastilla «Roto».
- Tablas con separadores rectos y hover interior redondeado. El catálogo deja de fijar sus categorías al hacer scroll. Se retiran 65 reglas de los tres marcadores anteriores.
- Cabecera opaca, pie plano, selección de ediciones agrupada, fotos de torneo sin pies de presentación ni breadcrumb sobre la imagen. País en texto, sin banderas en perfiles o comparación. Comparación móvil en dos columnas de cifras.
- Doce fotografías licenciadas nuevas (2024–2026), con archivos WebP, nombres distintos para evitar versiones antiguas en CDN y recortes de rostro independientes. No se reemplazan fotografías históricas por imágenes inventadas. Autor y licencia siguen disponibles bajo demanda.

## Datos

Se contrastan 17 resultados truncados de Roland Garros 2024 con el cuadro oficial FFT y documentación ATP. Las correcciones exigen ID, jugadores, torneo y año coincidentes. No convierten retiradas ni walkovers en partidos terminados. Los puntos y medidas de un resultado truncado no se aprovechan para reconstruir el partido corregido. Cada referencia aparece en el registro del partido.

Tres listas nuevas, con definición y partidos de evidencia:

- Victorias con menos juegos que el rival.
- Victorias después de ceder un set 0–6.
- Finales ganadas cediendo cuatro juegos o menos.

Las reglas pasan a `2026-10-verified-results-v4`. Se preservan la comprobación de cobertura de publicación y los cron diarios del servidor.

## Verificación

- 47 pruebas unitarias y 33 de navegador pasan.
- Lint, TypeScript y compilación de producción pasan.
- Validación de 176.282 partidos locales, 93 listas y 11 finales contrastadas.
- 275 entradas líderes contrastadas con sus partidos de evidencia, incluidas las tres listas nuevas.
- Capturas agrupadas de partido, medidas, torneo, catálogo, comparación, portada y pie; claro/oscuro y móvil/escritorio. Una corrección conjunta y una confirmación.
- Pruebas de desbordamiento a 320, 390, 768, 1024 y 1440 px; Axe en los flujos cubiertos; portada, lista y partido legibles sin JavaScript.

## Límites reales

Las 12 fotografías nuevas no sustituyen toda la fototeca. Algunas ediciones antiguas conservan lagunas de la fuente: la descarga histórica por páginas estaba completa en las temporadas auditadas, pero contiene resultados no terminados o sin marcador. Hace falta contrastar esas ediciones individualmente con cuadros oficiales; no se afirma cobertura completa. El partido Ruud–Djokovic de cuartos de Roland Garros 2024 no se añade como encuentro jugado: Djokovic se retiró antes del partido.
