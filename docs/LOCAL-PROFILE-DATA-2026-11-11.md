# Revisión local — perfil, fotografías y cálculo automático

Estado: solo local, sin commit, push ni despliegue. Vista de perfil: `/propuestas/nadal`; plantilla femenina: `/propuestas/jugadores/serena-williams?tour=wta`.

## Perfil

Historial sin leyenda ni menú de año; navegación por flechas y categorías separadas por circuito. Semifinal usa terracota, distinta de octavos. Palmarés móvil reúne trofeo y número, participaciones, balance y años separados por comas. Rivales amplía seis a doce y retira el botón. Años y selector de vista de temporadas alineados. El marcador de racha reserva 204px en escritorio y190px móvil; las 27 selecciones de Nadal midieron190px a390px. Parallax solo fotográfico; materiales suaves adaptados a variables de tema.

## Fotografías

`data/media-review/top200-2026-11-11.json`: 100 ATP +100 WTA revisados,186 sustituciones entre las últimas ejecuciones,14 conservadas,0 archivos ausentes. Las conservadas no se contabilizan como renovadas: incluyen la foto de Nadal aprobada por el usuario, material histórico identificado y la fotografía institucional conjunta de Barbara y Kathy Jordan. Esta última no se presenta como un retrato individual verificado. Las fuentes y créditos se guardan por imagen en `lib/player-photo-reviewed.json`. Variantes640/1024px y miniaturas280px evitan descargar el original en listados y móviles.

## Estadísticas

Cinco listas nuevas, calculadas para cada circuito: victorias, finales, títulos, victorias sin perder set y remontadas del primer set de Grand Slam en una temporada. Cada jugador aparece una sola vez con su mejor año; empate: temporada más reciente. Solo cuadro principal y resultados completos elegibles; no se cuentan walkovers ni abandonos. Las cifras pueden diferir de publicaciones que cuenten avances sin jugar. Cada fila conserva los partidos que sustentan su cifra.

Snapshot local v26 `15dd0b11e68a81a08d9e`:146.560 partidos,127 listas ATP y sus listas WTA. Se conservaron todos los resultados, personas, rondas y fechas frente al snapshot anterior. Las cinco nuevas listas están disponibles en Récords, por ejemplo `/records?dato=grand-slam-victorias-temporada`.

## Wikimedia y autonomía

200 identidades contrastadas con Wikipedia/Wikidata;198 fechas de nacimiento exactas. La primera reconstrucción completó edades en7.558 partidos con fecha exacta, sin sobrescribir edades del proveedor. Se conserva QID, revisión permanente y procedencia de cada dato añadido.

La nueva tarea autenticada `/api/cron/wikipedia` consulta como máximo4 peticiones públicas por ciclo, en lotes seriales. Descubrimiento de hasta10 personas por circuito; revisiones aceptadas cada90 días y ausencias cada30 días. Un429, maxlag o fallo conserva el contexto previo. Ninguna página de usuario consulta estas APIs.

Al desplegar estos cambios, el planificador diario ejecutará ATP/WTA→contexto Wikimedia opcional→publicación validada. La publicación recalcula récords, perfiles y palmarés, y cambia el puntero solo tras validar la generación completa. El fallo de Wikimedia no impide publicar resultados. La programación existente es22:05UTC, con recuperación de ejecuciones omitidas y reserva del proveedor; no requiere una sesión de Codex abierta.

La consulta real de Live Tennis API devolvió964 llamadas restantes en el momento de comprobarla (cupo observado1000). Un sondeo posterior de `/matches/216535/statistics` devolvió403 `upgrade_required`: el plan actual no permite esa superficie. No se contrató ninguna ampliación. La tarea de enriquecimiento existente aplaza durante siete días las capacidades que devuelven403. Los cinco récords nuevos no consumen llamadas adicionales.

## Límites que permanecen abiertos

Siguen pendientes tres marcadores históricos: Australia ATP1974, US Open ATP1972 y US Open WTA1969. No se han marcado como resueltos ni completado por deducción. La revisión de cobertura se vinculó a la nueva versión tras verificar que los resultados no cambiaron. Un cuadro sin certificación suficiente no equivale automáticamente a un partido ausente.

## Comprobación acotada

24 pruebas dirigidas de historial, cuotas, búsqueda y nuevos cálculos; tres de planificador; tipos y lint dirigidos. Perfil sin desbordamiento a320/390/1366px. Plantilla WTA, nuevo récord y endpoint protegido comprobados. Auditoría de archivos:0 fotografías/variantes ausentes. Revisión visual externa: ambos hallazgos resueltos (atmósfera estática y contraste de materiales).

## Ampliación v15 de biografías y contraste

Se consultaron de nuevo las200 entidades identificadas en cuatro lotes públicos, y se ampliaron los campos aceptados a mano de juego(P741), revés y altura en centímetros(P2048). Nunca se usa lateralidad general(P552) como sustituto de la mano de juego. Se aceptan198 cumpleaños,183 manos de juego,118 tipos de revés y194 alturas; las cantidades solo se normalizan desde metros o centímetros y se descartan valores ambiguos o fuera de rango.

El contraste reproducible `build/review-wikimedia-context.ts` informa258 coincidencias,241 campos ausentes en el índice bruto del proveedor(125 cumpleaños y116 reveses; varios ya se completaban mediante la capa Wikimedia),0 discrepancias con campos existentes y4 biografías con contradicciones internas en Wikidata. Esos campos ambiguos no se incorporan. El informe completo está en `data/integrity/wikimedia-biography-review-2026-11-11.json`. Cada refresco automático registra también el contraste del lote consultado, sin sobrescribir al proveedor. La altura queda como metadato contrastado, no se introduce como una nueva métrica visible sin diseño específico.

La ficha móvil de palmarés se recompuso con foto lateral, selector nativo integrado en el nombre, trofeo/recuento y balance a la derecha y años al pie. Historial, rivales y controles recuperan material blanco; el escritorio conserva su composición. Verificación visual a320/390/1366px y cambio real de torneo mediante el selector. No se despliega esta revisión.
