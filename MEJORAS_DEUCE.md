# DEUCE · mejoras de producto

Actualizado el 20 de octubre de 2026. `✓` indica trabajo incorporado a esta entrega; `→` señala el siguiente paso. El archivo solo publica partidos y campos que puede verificar. «ATP 500/250» se refiere a las temporadas 2023–2026; el archivo histórico anterior a 2023 no distingue con seguridad esos dos niveles y se rotula como ATP Tour de nivel no especificado.

## Identidad y sistema visual

1. ✓ Dos familias con un papel fijo: **Bricolage Grotesque** para titulares y **Geist** para interfaz, marcadores y cifras tabulares. No sumar fuentes por pantalla.
2. ✓ Titulares más breves y grandes; dato protagonista visible antes del método o los filtros.
3. → Definir una escala tipográfica completa en tokens CSS: titular, sección, cuerpo, dato y nota; retirar tamaños sueltos de hojas heredadas.
4. → Limitar la paleta a neutrales, un acento de acción y dos colores estables para los jugadores en gráficos. El color de la superficie debe ser una señal pequeña, no un tema nuevo.
5. ✓ Unificar la altura mínima de campos y controles en 44 px y mantener foco visible.
6. → Consolidar un componente para botón primario, enlace secundario e icono; prohibir variantes de relleno inventadas en cada ruta.
7. → Consolidar un único radio para controles, otro para fotos y paneles; dejar las filas sin caja.
8. ✓ Quitar rótulos decorativos y microcopias repetidas como «Archivo de tenis» de la navegación.
9. → Usar una única familia de separadores, bordes y hovers: las listas responden con un cambio sutil de fondo, sin elevaciones ni sombras distintas.
10. → Reservar la tarjeta amplia para una historia o una fotografía; las clasificaciones largas deben ser filas compactas.
11. → Hacer que cada estado claro y oscuro tenga contraste real, sin invertir fotografías ni trasladar colores de jugador al texto corriente.
12. → Aplicar los principios útiles de Revolut a DEUCE: una promesa visual por pantalla, controles inequívocos, fotografía a escala útil, márgenes amplios y pasos siguientes claros. Mantener marca y contenido propios.

## Navegación, búsqueda y filtros

13. ✓ Reducir los destinos visibles a Inicio, Partidos, Estadísticas, Jugadores, Torneos y Cara a cara.
14. → Igualar exactamente la búsqueda global y la del archivo: mismos resultados, orden, sinónimos y comportamiento al escribir.
15. → Admitir acentos y variantes de nombres («Felix/Félix», «Jodar/Jódar»), además de errores tipográficos moderados, sin duplicar identidades.
16. → Sugerir jugador, pareja, torneo y récord desde una sola caja, con acceso por teclado y Escape.
17. ✓ Dar URL propia a cada edición de torneo y a cada lista estadística.
18. → Hacer que los filtros de año, competición, superficie, ronda y jugador se apliquen al cambiar y permanezcan en la URL.
19. → Convertir los filtros poco frecuentes en un panel compacto; mostrar arriba solo los que cambian la lectura principal.
20. → Persistir vistas guardadas solo si se explica «en este navegador» y se pueden editar y borrar sin cuenta.
21. → En móvil, dar prioridad al resultado y al dato; usar controles de pantalla completa solo para búsquedas complejas.
22. → Cerrar diálogos con Escape, devolver el foco al origen y enseñar estados vacíos que permitan limpiar el filtro.

## Alcance de datos y API

23. ✓ Descargar e incorporar **4.762 partidos ATP 500/250 validados** de 2023–2026; el snapshot reúne **176.267 partidos validados** tras ampliar el archivo ATP histórico.
24. ✓ Leer la categoría ATP 500/250 **del partido en su temporada**, porque un torneo puede cambiar de nivel entre años.
25. ✓ Incluir esos encuentros en resultados, perfiles, cara a cara, buscador, ediciones y clasificaciones compatibles.
26. ✓ Mantener Grand Slams, Masters 1000 desde 1990 y precursores anteriores diferenciados.
27. ✓ Incorporar **120.389 partidos ATP Tour históricos validados** de 1968–2022, descargados de forma reanudable y rotulados «ATP Tour · nivel no especificado» cuando la fuente no permite separar 500 y 250.
28. → Registrar por campo la cobertura real: partidos con marcador, con medidas, con minutos, con ranking histórico y con cinta fiable.
29. → Priorizar llamadas de enriquecimiento para finales, partidos excepcionales y jugadores más consultados, dentro del límite diario de Basic.
30. → Hacer visible la fecha de la última actualización del archivo y diferenciarla de la fecha del encuentro.
31. → Auditar diariamente resultados nuevos, cambios de marcador y fusiones de IDs antes de recalcular las clasificaciones.
32. → Mantener fuera de agregados los abandonos, sets sin cerrar, ganadores incoherentes y marcadores en revisión.
33. → No presentar el ranking descargado hoy como ranking de la fecha del partido.
34. ✓ Exponer cada medida **publicada** en la ficha, agrupada por saque, resto, presión y set, sin crear números a partir de campos vacíos.
35. → Documentar con claridad qué endpoints del proveedor requieren un plan superior. Con Basic no se promete la estadística en vivo de ULTRA.
36. → Mantener la ingesta en el servidor y las cintas originales fuera de respuestas masivas descargables.

## Estadísticas que merecen repetirse

37. ✓ Mantener las 94 listas preparadas por pregunta, con líder, muestra y partido que prueba el dato.
38. → Convertir cada lista importante en una frase concreta: **quién, cuánto, cuándo, en qué torneos y con cuántos casos**.
39. → Ordenar por valor editorial: remontadas de dos sets, finales en el decisivo, victorias con menos puntos, presión en el 30–30, partidas largas y cara a cara.
40. → Mostrar el denominador junto al porcentaje; un 100 % en 16 casos nunca compite visualmente con una tasa en 200.
41. → Comparar dos épocas de un jugador solo si ambos tramos tienen una muestra mínima explícita.
42. ✓ Añadir ocho listas ATP 500 y ATP 250 para títulos, finales, títulos en un torneo y victorias, sin mezclar con Masters ni con la cohorte histórica sin nivel. → Desglosar superficie cuando la muestra sea suficiente.
43. → Abrir cada clasificación desde el partido que la sostiene, y desde esa prueba regresar a la lista.
44. → Distinguir volumen y eficacia: 100 breaks convertidos no equivale a 60 % de conversión.
45. → Añadir extremos por edición: final más larga con minutos, remontada, desempate más apretado y campeón que más juegos cedió; solo cuando los campos existen.
46. → Resumir cómo cambió un partido en cinco momentos verificables, en vez de pedir leer cientos de puntos.
47. → Calcular comparativas de saque/resto únicamente sobre encuentros con ambas columnas publicadas; incluir siempre cuántos son.
48. → Para el cara a cara, separar total, finales, cinco sets, desempates y superficies con la misma pareja y el mismo periodo.
49. → En perfiles, poner al lado el récord propio en un torneo y su partido de prueba, sin adjetivos como «legendario».
50. → Permitir ordenar una lista por valor, temporada o competición sin cambiar su definición ni esconder empates.

## Fotografías y páginas clave

51. ✓ Añadir ocho retratos reales optimizados, con versiones WebP de perfil y miniatura, y autor/licencia en el registro fotográfico.
52. → Completar retratos de los jugadores más consultados antes de perseguir cobertura indiscriminada. Mismo encuadre y tamaño por contexto.
53. → Dar a la foto un papel distinto según pantalla: protagonista en una historia, identificador en un perfil, prescindible en una fila.
54. ✓ Rehacer la cabecera del partido para que entren cinco sets en móvil y destaque los sets ganados.
55. ✓ Mostrar primero en el perfil las tres cifras principales; biografía, calendario y medidas después.
56. ✓ En cada edición de torneo, abrir la final y el camino del campeón antes de la tabla completa, que se pagina.
57. → Usar fotos de pistas solo cuando sede y edición coincidan; no suplir una ausencia con otra pista ni con IA.
58. ✓ En un partido, conservar tres estados: con puntos fiables, secuencia incompleta y solo marcador. No enseñar una visualización de puntos inexistentes.
59. ✓ Permitir comparar dos partidos desde la ficha, con escalas comunes y una razón comprensible de la comparación.

## Rapidez, confianza y accesibilidad

60. ✓ Servir Récords desde un snapshot paginado preparado al compilar, sin recalcular las 94 listas al abrir la página.
61. ✓ Leer primero la ficha del partido desde el snapshot validado; en la medición local en frío pasó de unos 8 s a unos 0,3 s.
62. ✓ Separar el índice público ligero del detalle pesado: nunca enviar cinta de puntos en un listado de 25 partidos.
63. → Medir LCP, INP y CLS en producción por ruta y por móvil; fijar presupuestos para imagen hero, CSS y JavaScript.
64. → Reservar dimensiones de fotos y gráficos para evitar saltos; servir retratos al tamaño de cada uso.
65. → Añadir pruebas de contraste, 320/390/768/1024/1440 px, teclado y movimiento reducido a las comprobaciones de publicación.
66. → Usar títulos y descripciones específicos en partido, jugador, edición y estadística; mantener sitemap y canonicals actualizados.
67. → Monitorizar errores de ingesta y generación del snapshot, con última generación correcta disponible durante un fallo.
68. → Auditar cualquier reclamo «primero», «único», «récord» o «toda la carrera» contra el alcance real del archivo antes de publicarlo.

## Próximas preguntas que el archivo puede responder

69. → En cada lista, añadir una distribución sencilla (mediana y percentiles) para saber si el líder está muy lejos del resto o apenas por delante.
70. → En títulos y victorias, ofrecer la misma clasificación por temporada y por tramo de cinco años; nunca mezclar periodos sin rotularlos.
71. → Mostrar la evolución del jugador por temporada con victorias y derrotas verificadas, y un hueco visible cuando falte una edición.
72. → En perfiles, destacar el torneo donde el jugador obtuvo más victorias y enlazar las finales que sostienen esa cifra.
73. → Separar en un cara a cara Grand Slam, Masters, ATP 500, ATP 250 y ATP Tour histórico sin nivel especificado; cada subtotal debe sumar al total mostrado.
74. → Enseñar el primer, último y siguiente duelo disponible de una pareja sin presentarlo como H2H oficial de toda la carrera.
75. → Abrir el desglose de una edición con sus finalistas, campeón, camino ronda a ronda y la final más ajustada verificable.
76. → Dar a cada partido una frase comprobable de una sola idea: remontada, tie-break, duración publicada o presión medida, en ese orden.
77. → Si hay cinta fiable, mostrar una secuencia corta de breaks y bolas de partido con set y juego; el listado completo queda a petición.
78. → Detectar victorias tras salvar bolas de partido solo cuando la cinta identifica inequívocamente esas bolas; mostrar también las oportunidades examinadas.
79. → Diferenciar «más aces» de «aces por partido»: el segundo necesita mínimo de partidos con aces publicados y el denominador al lado.
80. → Para el primer saque, comparar porcentajes y puntos ganados con ese saque por separado; una tasa de entrada alta no implica eficacia.
81. → Dividir los cinco sets en volumen, efectividad y remontadas, con el tamaño de muestra en el propio titular.
82. → En finales, comparar primeras y segundas mitades de carrera solo si ambos periodos superan el mismo mínimo.
83. → Listar récords que cambiaron de dueño con año, torneo y partido, sin inventar efemérides a partir de la fecha de inicio de un torneo.
84. → Crear un índice de cobertura por temporada y competición: cuántos resultados hay y cuántos tienen cinta, minutos, ranking histórico o medidas.

## Consistencia y operación

85. → Diseñar una tabla maestra única: columna de identidad, dato tabular a la derecha, orden visible, cabecera persistente cuando la lista sea larga y una vista móvil que conserve el marcador completo.
86. → Definir un único patrón de filtro: etiqueta visible, valor actual, cambio inmediato, limpiar, URL compartible y la misma lógica en todas las rutas.
87. → Definir un único patrón de búsqueda: resultados agrupados, coincidencias resaltadas con moderación, teclado completo y tolerancia a acentos.
88. → Crear una matriz de estados de componentes (normal, hover, foco, seleccionado, desactivado, carga, vacío y error) y revisarla en claro y oscuro.
89. → Usar fotografías grandes únicamente cuando acrediten a una persona o sede concreta; ocultar el crédito del lienzo principal y mantener autor/licencia en Fotografías.
90. → Comprimir y recortar retratos por contexto, con `srcset`, proporción estable y límite de peso por miniatura y fotografía hero.
91. → Medir la primera visita sin caché en móvil para Inicio, Récords, jugador, partido y cara a cara; no llamar «rápida» a una ruta basándose en una segunda visita.
92. → Separar la ingestión diaria del cálculo/publicación del snapshot para que ninguna fase bloquee un despliegue ni supere el tiempo de la función.
93. → Hacer reanudables las escrituras de snapshots grandes: claves inmutables, lotes con límite de concurrencia y manifiesto nuevo solo al terminar.
94. → Conservar la versión validada anterior ante errores del proveedor, de Supabase o de una generación incompleta, y señalar la última actualización correcta.

### Orden sugerido

**Primero:** cerrar la coherencia visual de todas las rutas y la cobertura/denominadores visibles. **Después:** hacer sostenible la publicación diaria del archivo ampliado. **Luego:** convertir las listas de mayor valor en historias verificables, ampliar fotografías de protagonistas y añadir observabilidad de rendimiento.

Fuentes de alcance: [Live Tennis API, referencia oficial](https://docs.livetennisapi.com/reference.html). Referencia visual: [Revolut España](https://www.revolut.com/es-ES/); se trasladan principios de jerarquía y claridad, no su identidad ni sus activos.
