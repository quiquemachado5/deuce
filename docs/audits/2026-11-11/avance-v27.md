# Revisión local v27 — fotografías y resultados

Alcance: únicamente local. Sin llamadas a Live Tennis API, commit, push ni despliegue.

## Biblioteca de imágenes

- 1.085 fotografías WebP distintas catalogadas después de retirar 166 imágenes ajenas al objetivo o variantes del mismo original.
- Cada entrada conserva fuente, autor, condiciones de licencia, dimensiones originales/locales y hashes SHA-256 del origen descargado y del archivo local.
- Miniaturas de 480 px para Licencias: 22,8 MB en conjunto, frente a 211,6 MB de imágenes principales (un 89 % menos de transferencia por imagen, con variaciones según fotografía).
- Resolución mínima del original: 1.000 × 600; derivados de hasta 1.400 px, carga diferida y paginación en Licencias. Se comprobaron todos los archivos: ninguno ausente o corrupto.
- Distribución: Roland Garros 542, US Open 247, Wimbledon 110, Australian Open 82, Miami 41, ATP Finals 37, Cincinnati 24, Barcelona 2.
- **Límite importante:** la asociación a una categoría de Commons no certifica que una foto corresponda a una final, a una persona o a un circuito concretos. El catálogo no equivale a cubrir todas las ediciones del archivo. Solo cinco asociaciones jugador/torneo/año/circuito revisadas visualmente se activan como imágenes específicas de edición.
- ATP Finals: fotografía oficial del interior de la Inalpi Arena de Turín. WTA Finals: fotografía oficial de Indian Wells, sede indicada por WTA para 2026. Una sede actual no se presenta como prueba de la sede histórica de cualquier edición.
- Si una final no tiene imagen utilizable, el contenedor fotográfico vacío se retira y el resultado conserva una altura natural.

## Reconciliación de resultados

53 resultados añadidos con tres dominios de contraste por caso: seis partidos completos, 42 incomparecencias y cinco abandonos. No se han inferido estadísticas ni secuencias de puntos. Las incomparecencias no tienen sets inventados ni cuentan como victorias jugadas. Se conservan 124 páginas/documentos de evidencia comprimidos con hash; otras 30 URL no pudieron archivarse directamente (403, timeout u otras restricciones), aunque su evidencia se revisó mediante búsqueda/lectura web. Tres páginas concordantes no garantizan que sus proveedores de datos sean independientes.

El dataset local pasa de 148.181 partidos terminados y 4.718 estados terminales a 148.187 y 4.765 respectivamente. Las incidencias confirmadas de ediciones bajan de 62 a 16. Todos los agregados se recalcularon con los nuevos resultados. Versión: `41e351d8a6e54939db3e`.

**No se certifica completitud global.** Persisten 16 incidencias: rondas sobrantes en Roma/US Open 2026 y Australia 2023, identidad de las ediciones de Adelaida 2023 y Australia 1977, formatos por equipos de ATP Cup, posibles finales no disputadas y cuatro resultados históricos en revisión. Exigen separar identidad, formato y ausencia real; no se han ocultado ni convertido en partidos ficticios. Las ediciones sin certificación tampoco se han marcado completas por disponer únicamente de cuartos, semifinales y final.

## Comparación

Se sustituye la franja flotante por un díptico fotográfico continuo: cifras en las esquinas exteriores superiores, identidad de cada jugador abajo y contexto común fuera de las fotografías. Sombreado superior localizado para contraste y degradado inferior para nombres. El revisor visual aprobó escritorio y móvil tras corregir el solapamiento de la cifra de Nadal con el rostro.

## Comprobaciones

- 10 pruebas focalizadas de resultados, separación ATP/WTA, navegación y relato de edición: correctas.
- Tipos y lint de archivos afectados: correctos; scripts nuevos pasan comprobación sintáctica.
- Verificación del dataset publicado: 53/53 referencias presentes una sola vez, circuito/año/torneo y tres fuentes conservados; seis partidos completos y 47 terminales.
- Navegador: Comparar, ambas Finals y Licencias a 390 y 1.366 px; respuestas 200, imágenes cargadas, sin desbordamiento horizontal ni excepciones de página.
- Build de producción correcto. Evidencia de esta sesión en `/tmp/deuce-v27-*`.
