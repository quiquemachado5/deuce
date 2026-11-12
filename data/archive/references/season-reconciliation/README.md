# Reconciliación web del 10 de noviembre de 2026

Esta carpeta conserva las fuentes consultadas para reparar la cola de resultados, sin llamadas a Live Tennis API. Los archivos originales del proveedor permanecen intactos. Las correcciones aplicables están en `lib/verified-season-results.json`, con circuito, temporada, identificador, torneo, ronda, ambas personas, marcador orientado, estado terminal, fuentes y fecha de revisión. No se añaden puntos ni mediciones a partir de un resultado.

## Fuentes y evidencias

- `manifest.json`: temporadas del archivo Sackmann, conservadas por Aneeshers, fijadas al commit `83733587353df8a41f2fd4f516147d5aa83f5a8d`.
- `secondary-manifest.json`: temporadas de TennisMyLife. Su material WTA puede proceder de archivos ya publicados; no se considera una corroboración independiente por sí solo.
- `independent-manifest.json`: publicaciones de resultados y cuotas de minmaxxxer en Hugging Face, con identificación de los archivos y huellas SHA-256.
- `draws/`: cuadros publicados por la WTA; PDF original, texto extraído y manifiesto. `ocr-evidence.jsonl.gz` conserva las lecturas de las páginas cuyo texto no era extraíble. Los puntos de desempate proceden del archivo de resultados cuando el PDF solo permite corroborar los juegos.
- `official-archive/`: cuadros históricos oficiales de Wimbledon y documentos de la RFET. El cuadro RFET de Madrid 125 demuestra que el evento del 6–12 de abril de 2026 no pertenece al Mutua Madrid WTA 1000.
- `tennisx/`: páginas históricas de Tennis-X, con huellas. Permiten contrastar correcciones de TennisMyLife que difieren de la transcripción antigua.
- `html/`: páginas oficiales efectivamente recuperadas. Los errores HTTP, incluidos los límites 429 de la WTA, se conservan en el manifiesto y no se presentan como resultados verificados.
- `tnt/`: cuadros de TNT Sports, conservados comprimidos con huellas SHA-256. Se cotejan pareja, ganador y todos los juegos con la temporada de referencia; una coincidencia de apellido por sí sola no se acepta.
- `manual-review.json`: revisiones de resultados concretos con dos fuentes, nombres originales como condición de aplicación y marcador orientado. Incluye ediciones de Auckland que comenzaron en diciembre del año anterior al de su publicación oficial.
- `verified-evidence.json`: candidatos y pruebas que sustentan las referencias. Solo se aplican los candidatos que superan las validaciones terminales; `rejected.json` conserva los rechazados.
- `independent-dataset/`: material de investigación de Open Tennis Data, con procedencia. Sus etiquetas de cuadro no se aceptan automáticamente: se observaron clasificaciones que requieren verificación adicional.

## Reglas corregidas

Wimbledon utilizó desempates a ocho iguales entre 1971 y 1978, excepto en el set decisivo. El Abierto de Australia de 1982 acortó a tres sets las rondas tercera y cuarta. Algunas ediciones australianas comenzaron en diciembre del año anterior; la regla de formato respeta esa fecha. Los cuadros masculinos principales de Grand Slam conservan cinco sets salvo excepciones documentadas. Los desempates de partido del Grampians Trophy de 2021 y de las rondas finales del Gippsland Trophy y Yarra Valley Classic se almacenan aparte de los juegos, para no sumar puntos como juegos.

Una retirada documentada resuelve el estado del encuentro, pero no se convierte en una victoria estadística. Una fuente que todavía conserva un marcador imposible no permite completar el encuentro por deducción. Los cuadros sin tamaño certificado permanecen separados de los resultados pendientes.

## Comprobación local

`node --import ./build/register.mjs --import tsx build/verify-web-reconciliation.ts`

La verificación comprueba las huellas de los archivos por temporada, la unicidad, la separación de circuitos y la existencia de evidencia. Las pruebas `tests/season-reconciliation.test.ts` comprueban además los marcadores, las orientaciones inversas, los estados terminales y las excepciones históricas.
