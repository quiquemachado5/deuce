# Avance local: datos, fiabilidad y ajustes autorizados

Dataset `2be3b9a020e9752675c8` · 148.181 resultados · producción sin cambios.

## Qué está hecho

- Finals: 1.627 resultados válidos (818 ATP / 809 WTA). Todas las temporadas celebradas 1970–2025 ATP y 1972–2025 WTA están representadas; WTA 2020 fue cancelada. Representación no equivale a cuadro íntegro certificado.
- Fuentes originales selladas, clasificación por identidad de evento y fases separadas. Los 15 partidos WTA 2015 se recuperaron fuera de la API, que devolvía cero, contrastando cuadro oficial y otras dos páginas. No se aceptaron como fechas exactas las fechas de inicio repetidas de TennisDB.
- 440 partidos de Finals tienen estadísticas medidas guardadas. Ninguna cinta reconstruida se publica como punto observado.
- Quedan 201 llamadas del cupo; reserva 200. Descarga con checkpoints y sin reintentos ante límite.
- Seis duplicados de Miami resueltos mediante alias revisados. 41 previas retiradas del cómputo de Finals, conservando el raw.
- H2H compartido, Today móvil con pista vertical, métricas de palmarès compactas y filtro del hero alineado. Revisión visual limitada a lo pedido.

## Cómo contar las entregas sin inflarlas

Hay **100 definiciones de cálculo y 55 controles automáticos**, es decir 155 unidades técnicas. **No son 155 críticas resueltas ni 155 récords verificados**. Las 100 definiciones producen 200 selecciones por circuito: 143 calculables en la muestra y 57 bloqueadas por evidencia ausente. Ninguna está certificada como récord absoluto ni se añadió a la interfaz.

Las 100 críticas tienen este estado: **6 resueltas en local, 33 parciales y 61 pendientes**. Un control que detecta un problema no equivale a haber reparado todos sus datos.

## Límites que permanecen

- Auditoría de ediciones: 62 con incidencia de integridad, 3.081 sin certificación suficiente y 3 con completeDraw=true. Esta última bandera tampoco sustituye un censo mundial independiente.
- No existe denominador demostrado para anunciar porcentaje total ATP/WTA. Tampoco todas las fechas, rankings, puntos o formatos históricos.
- Pendientes: formatos especiales WTA 1975–77; premios de campeón sin final jugada en 1970/1971, 2001 y 2014. Se conserva la evidencia sin inventar partidos.
- La suite focalizada pasa; la suite completa mantiene bloqueos anteriores de fotografías/licencias y optimización de medios. No se han falseado licencias para obtener un resultado verde.
- RLS/secretos remotos, backups externos, restauración sin host y Core Web Vitals de usuarios reales necesitan comprobación independiente en producción. No se tocaron por el alcance local.

## Evidencia de ejecución

- Build final correcto (63 rutas), 62 pruebas focalizadas, tipos y lint correctos. Verificación del dataset y 55 controles: 0 errores bloqueantes.
- 18 visitas a 320/390/1366 px sin desbordamiento ni errores JS. Diagnóstico privado 401, readiness 200. Fresh finish reviewer: PASS.
- Presupuesto de índice: 18 consultas, p95 132,5 ms, límite 250 ms. Mide consultas locales, no carga completa ni usuarios reales.
- Nueva versión de definición/representación y cachés normalizadas. Investigación guarda versión, elegibilidad, exclusiones y hasta cinco IDs de prueba por fila.

##100 críticas: estado por punto

| # | Prioridad original | Estado | Avance y límite |
|---|---|---|---|
| 1 | Alta · P 0 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 2 | Alta · P 0 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 3 | Alta · P 0 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 4 | Alta · P 0 | Resuelto en local | Seis alias Miami canónicos; regresión y redirección de URL antigua. |
| 5 | Alta · P 0 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 6 | Alta · P 0 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 7 | Alta · P 0 | Parcial | Rachas nuevas limitadas a la muestra; no se certifica continuidad mundial. |
| 8 | Alta · P 0 | Parcial | Productos nuevos no son elegibles como récord absoluto; catálogo público anterior pendiente de certificación. |
| 9 | Alta · P 0 | Parcial | Temporada leída de source_id y no del enero civil siguiente; faltan entidades completas de edición. |
| 10 | Alta · P 0 | Parcial | Finals se resuelven por identificadores revisados; falta registro universal de series. |
| 11 | Alta · P 1 | Parcial | Fechas aproximadas excluidas de fórmulas diarias; no se han obtenido todas las fechas. |
| 12 | Alta · P 1 | Parcial | 440 partidos de Finals con mediciones guardadas; no hay cobertura universal de servicio/resto. |
| 13 | Alta · P 1 | Parcial | Cintas reconstruidas no se tratan como puntos observados; siguen faltando puntos reales. |
| 14 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 15 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 16 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 17 | Alta · P 1 | Parcial | Finals conservan archivo fuente, hash, endpoint y localizador; no cubre aún cada resultado del archivo. |
| 18 | Alta · P 1 | Parcial | Linaje por fila del nuevo paquete; no de todas las fuentes heredadas. |
| 19 | Alta · P 1 | Parcial | Consenso exige tres orígenes y editores distintos; antiguos hechos aún no recontrastados. |
| 20 | Alta · P 1 | Parcial | Dataset y productos recalculados por versión local; publicación remota no tocada. |
| 21 | Alta · P 1 | Parcial | Duraciones extremas detectadas y muestras limitadas; quedan revisiones de hechos. |
| 22 | Alta · P 1 | Parcial | Excepciones históricas Tokyo 1970 y finales WTA BO 5; faltan prosets 1975–77. |
| 23 | Alta · P 1 | Resuelto en local | Previas Q 1–Q 5 fuera del cuadro principal; walkover/abandono no generan victorias de partido terminado. |
| 24 | Alta · P 1 | Parcial | No se infieren títulos desde una final no jugada; faltan premios separados para round-robin/W-O. |
| 25 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 26 | Alta · P 1 | Parcial | Investigación exige ranking al jugar; ranking en descarga no sustituye al histórico. |
| 27 | Alta · P 1 | Parcial | Alias de detalle canónicos; falta perfil completo de caché en producción. |
| 28 | Alta · P 1 | Parcial | Claves equivalentes de selecciones normalizadas; hit-rate real pendiente. |
| 29 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 30 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 31 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 32 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 33 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 34 | Alta · P 1 | Parcial | Extracción común de IP tras proxy; falta comprobación de toda la cadena desplegada. |
| 35 | Alta · P 1 | Resuelto en local | Diagnóstico profundo autenticado; readiness público mínimo. HTTP 401/200 comprobados. |
| 36 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 37 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 38 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 39 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 40 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 41 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 42 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 43 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 44 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 45 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 46 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 47 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 48 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 49 | Alta · P 1 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 50 | Alta · P 1 | Resuelto en local | Eliminado EventCompleted no válido en JSON-LD. |
| 51 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 52 | Media · P 2 | Parcial | Finals e identidades históricas corregidas; normalizaciones de otros niveles requieren censo. |
| 53 | Media · P 2 | Parcial | 1986 WTA mantiene dos campeonatos; falta registro completo de serie/sede/patrocinador. |
| 54 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 55 | Media · P 2 | Resuelto en local | Clave semántica incluye categoría; el caso Tokyo 500/250 está cubierto por regresión. |
| 56 | Media · P 2 | Parcial | Raw de Finals sellado y correcciones versionadas; no resuelve toda la gobernanza de cambios. |
| 57 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 58 | Media · P 2 | Parcial | 100 definiciones de investigación versionadas; métricas anteriores aún requieren revisión por definición. |
| 59 | Media · P 2 | Parcial | Elegibilidad/exclusión por fórmula; falta validación editorial de comparaciones existentes. |
| 60 | Media · P 2 | Parcial | Muestras condicionadas registradas; no se ha eliminado el sesgo de disponibilidad. |
| 61 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 62 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 63 | Media · P 2 | Parcial | Contrato de país fechado; sin registros externos suficientes, bloqueado. |
| 64 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 65 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 66 | Media · P 2 | Resuelto en local | ETag incorpora versión de representación además del dataset y ámbito;304 sin cuerpo probado. |
| 67 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 68 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 69 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 70 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 71 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 72 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 73 | Media · P 2 | Parcial | Today usa scroll nativo y reduced-motion; revisión del resto de efectos no exhaustiva. |
| 74 | Media · P 2 | Parcial | Ajustes pedidos comprobados a 320/390 px; accesibilidad global sigue pendiente. |
| 75 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 76 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 77 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 78 | Media · P 2 | Parcial | Balance H2H identifica nombres/cifras a lectores; resto de tablas no auditado íntegramente. |
| 79 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 80 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 81 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 82 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 83 | Media · P 2 | Parcial | 55 controles ejecutables en verify; restauración total aún no ensayada. |
| 84 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 85 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 86 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 87 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 88 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 89 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 90 | Media · P 2 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 91 | Media · P 3 | Parcial | Today exige fecha exacta; otras efemérides históricas necesitan pruebas externas. |
| 92 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 93 | Media · P 3 | Parcial | Consenso Wikipedia exige revisión capturada; no se ha ingerido toda Wikipedia. |
| 94 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 95 | Media · P 3 | Parcial | Cálculos nuevos se realizan fuera de la navegación; no se añadieron llamadas IA por visita. |
| 96 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 97 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 98 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |
| 99 | Media · P 3 | Parcial | Cálculos privados y bloqueos explícitos; no se publican cien récords sin certificación. |
| 100 | Media · P 3 | Pendiente | Sin cierre acreditado en esta ronda; mantiene la solución propuesta en la auditoría. |

##100 ideas: calculadora y disponibilidad

Cada fila corresponde a una definición implementada. **Calculado** significa cálculo sobre la muestra, incluso si no produce candidatos; **Bloqueado** significa que falta un contrato/dato externo. El soporte matemático no prueba cobertura ni validez de un récord mundial.

| # | Definición implementada | ATP | WTA |
|---|---|---|---|
| 1 | Victorias de Grand Slam por temporada | Calculado · 100 filas | Calculado · 100 filas |
| 2 | Finales en las cuatro sedes de Grand Slam | Calculado · 8 filas | Calculado · 9 filas |
| 3 | Semifinales en las cuatro sedes de Grand Slam | Calculado · 18 filas | Calculado · 27 filas |
| 4 | Balance anual con mínimo 20 partidos | Calculado · 100 filas | Calculado · 100 filas |
| 5 | Mejora interanual de efectividad | Calculado · 100 filas | Calculado · 100 filas |
| 6 | Años consecutivos con título por nivel | Calculado · 100 filas | Calculado · 100 filas |
| 7 | Victorias en cuatro décadas | Calculado · 0 filas | Calculado · 4 filas |
| 8 | Distancia entre primera y última final | Calculado · 72 filas | Calculado · 78 filas |
| 9 | Éxito en tres superficies durante una temporada | Calculado · 36 filas | Calculado · 37 filas |
| 10 | Consistencia de cinco temporadas consecutivas | Calculado · 100 filas | Calculado · 100 filas |
| 11 | Títulos por participación en una serie | Calculado · 100 filas | Calculado · 100 filas |
| 12 | Títulos consecutivos en una serie | Calculado · 100 filas | Calculado · 100 filas |
| 13 | Finales perdidas antes del primer título | Calculado · 100 filas | Calculado · 100 filas |
| 14 | Ganadores de la última edición de torneos desaparecidos | Bloqueado | Bloqueado |
| 15 | Campeones antes y después de un cambio de sede | Bloqueado | Bloqueado |
| 16 | Intervalo entre títulos de una serie | Calculado · 100 filas | Calculado · 100 filas |
| 17 | Título en la primera participación registrada | Calculado · 100 filas | Calculado · 100 filas |
| 18 | Ronda alcanzada por participación | Calculado · 100 filas | Calculado · 100 filas |
| 19 | Campeones diferentes por torneo y década | Calculado · 100 filas | Calculado · 100 filas |
| 20 | Concentración de títulos en los tres mayores ganadores | Calculado · 100 filas | Calculado · 100 filas |
| 21 | Títulos en superficies distintas en semanas consecutivas | Calculado · 100 filas | Calculado · 100 filas |
| 22 | Primer partido tras cambiar de superficie | Calculado · 100 filas | Calculado · 100 filas |
| 23 | Racha de victorias por superficie en el archivo | Calculado · 100 filas | Calculado · 100 filas |
| 24 | Especialización con mínimo 20 partidos por superficie | Calculado · 100 filas | Calculado · 100 filas |
| 25 | Títulos indoor y outdoor en una temporada | Calculado · 13 filas | Calculado · 7 filas |
| 26 | Hierba antes y después de Wimbledon | Bloqueado | Bloqueado |
| 27 | Victoria tras derrota con margen de 10 juegos | Calculado · 100 filas | Calculado · 100 filas |
| 28 | Sets decisivos por superficie y década | Calculado · 24 filas | Calculado · 25 filas |
| 29 | Victoria con menos juegos por superficie | Calculado · 100 filas | Calculado · 100 filas |
| 30 | Cambio de tierra a hierba por días de descanso | Calculado · 100 filas | Calculado · 100 filas |
| 31 | Edad al ganar cada categoría | Calculado · 100 filas | Calculado · 100 filas |
| 32 | Victorias ante top 10 antes de los 20 | Calculado · 100 filas | Calculado · 100 filas |
| 33 | Años desde primera victoria hasta primer título | Calculado · 100 filas | Calculado · 100 filas |
| 34 | Títulos antes y después de los 30 | Calculado · 100 filas | Calculado · 100 filas |
| 35 | Duración entre primera y última victoria de Grand Slam | Calculado · 100 filas | Calculado · 100 filas |
| 36 | Temporadas con finales después de los 35 | Calculado · 100 filas | Calculado · 100 filas |
| 37 | Finales con mayor diferencia de edad | Calculado · 100 filas | Calculado · 100 filas |
| 38 | Rendimiento por edad observada | Calculado · 100 filas | Calculado · 100 filas |
| 39 | Mismo torneo ganado adolescente y veterano | Calculado · 7 filas | Calculado · 7 filas |
| 40 | Edad media de finalistas por década | Calculado · 7 filas | Calculado · 7 filas |
| 41 | Victorias ante números uno por temporada | Calculado · 100 filas | Calculado · 100 filas |
| 42 | Títulos derrotando a varios top 10 | Calculado · 100 filas | Calculado · 100 filas |
| 43 | Ranking mediano de rivales del campeón | Calculado · 100 filas | Calculado · 100 filas |
| 44 | Victorias fuera del top 100 ante top 10 | Calculado · 100 filas | Calculado · 100 filas |
| 45 | Mayor diferencia de ranking en una final | Calculado · 100 filas | Calculado · 100 filas |
| 46 | Efectividad ante top 5, 10 y 20 | Calculado · 100 filas | Calculado · 100 filas |
| 47 | Victorias frente a todos los miembros de un top 10 fechado | Bloqueado | Bloqueado |
| 48 | Racha ante top 20 en la muestra fechada | Calculado · 6 filas | Bloqueado |
| 49 | Elo medio por superficie con modelo fechado | Bloqueado | Bloqueado |
| 50 | Dificultad Elo del camino al título | Bloqueado | Bloqueado |
| 51 | Remontadas desde dos sets en contra | Calculado · 100 filas | Calculado · 100 filas |
| 52 | Remontadas del primer set por formato y ronda | Calculado · 100 filas | Calculado · 100 filas |
| 53 | Victorias tras recibir un 0–6 | Calculado · 100 filas | Calculado · 100 filas |
| 54 | Victorias con diferencia negativa de juegos | Calculado · 100 filas | Calculado · 100 filas |
| 55 | Finales con varios tie-breaks | Calculado · 100 filas | Calculado · 24 filas |
| 56 | Campeones sin perder sets en edición certificada | Calculado · 0 filas | Calculado · 0 filas |
| 57 | Campeones con todos sus partidos al set decisivo | Calculado · 0 filas | Calculado · 0 filas |
| 58 | Tie-breaks por torneo y formato | Calculado · 100 filas | Calculado · 100 filas |
| 59 | Racha de sets ganados en la muestra fechada | Calculado · 100 filas | Calculado · 100 filas |
| 60 | Margen medio de juegos en finales por década | Calculado · 7 filas | Calculado · 7 filas |
| 61 | Balance de parejas por torneo y fecha | Calculado · 100 filas | Calculado · 100 filas |
| 62 | Cambios de líder en una rivalidad | Calculado · 100 filas | Calculado · 100 filas |
| 63 | Finales de una pareja en las tres superficies | Calculado · 7 filas | Calculado · 8 filas |
| 64 | Rivales derrotados en las cuatro sedes de Grand Slam | Calculado · 20 filas | Calculado · 29 filas |
| 65 | Revancha tras perder la anterior final de una serie | Calculado · 100 filas | Calculado · 100 filas |
| 66 | Victorias seguidas ante un mismo rival | Calculado · 100 filas | Calculado · 100 filas |
| 67 | Balance opuesto en tierra y dura con mínimo 5 duelos | Calculado · 7 filas | Calculado · 6 filas |
| 68 | Duelos de la misma pareja en semanas consecutivas | Calculado · 100 filas | Calculado · 100 filas |
| 69 | Tiempo entre primer y último duelo | Calculado · 100 filas | Calculado · 100 filas |
| 70 | Rendimiento frente a zurdos y diestros | Bloqueado | Bloqueado |
| 71 | Primer campeón registrado de cada país y nivel | Bloqueado | Bloqueado |
| 72 | Finales entre compatriotas por década | Bloqueado | Bloqueado |
| 73 | Países con finalistas en las cuatro sedes de Grand Slam | Bloqueado | Bloqueado |
| 74 | Diversidad de países en cuartos por edición | Bloqueado | Bloqueado |
| 75 | Victorias entre generaciones de nacimiento | Bloqueado | Bloqueado |
| 76 | Dominio por país y década | Bloqueado | Bloqueado |
| 77 | Títulos locales y en el extranjero en una temporada | Bloqueado | Bloqueado |
| 78 | Campeones distintos por país y superficie | Bloqueado | Bloqueado |
| 79 | Países campeones ATP y WTA en una misma semana | Bloqueado | Bloqueado |
| 80 | Carreras con cambios de nacionalidad fechados | Bloqueado | Bloqueado |
| 81 | Días entre semifinal y final | Calculado · 100 filas | Calculado · 100 filas |
| 82 | Minutos acumulados antes de la final con cobertura completa | Calculado · 2 filas | Calculado · 0 filas |
| 83 | Victoria al día siguiente de disputar cinco sets | Calculado · 100 filas | Calculado · 100 filas |
| 84 | Jornadas con dos victorias individuales | Calculado · 57 filas | Calculado · 63 filas |
| 85 | Semanas consecutivas con título | Calculado · 100 filas | Calculado · 100 filas |
| 86 | Títulos tras inactividad certificada | Bloqueado | Bloqueado |
| 87 | Intervalo entre títulos en continentes distintos | Bloqueado | Bloqueado |
| 88 | Descanso entre torneos por era | Calculado · 100 filas | Calculado · 100 filas |
| 89 | Juegos acumulados hasta ganar un título | Calculado · 1 filas | Calculado · 2 filas |
| 90 | Aplazamientos con fecha prevista y real | Bloqueado | Bloqueado |
| 91 | Menor porcentaje de breaks concedidos en una edición | Calculado · 0 filas | Calculado · 2 filas |
| 92 | Victorias con menos puntos totales que el rival | Calculado · 100 filas | Calculado · 75 filas |
| 93 | Sets ganados sin afrontar bola de break | Bloqueado | Bloqueado |
| 94 | Victorias salvando puntos de partido observados | Bloqueado | Bloqueado |
| 95 | Secuencias de breaks consecutivos | Bloqueado | Bloqueado |
| 96 | Rendimiento al servir para cerrar un partido | Bloqueado | Bloqueado |
| 97 | Tie-breaks remontados desde cinco puntos abajo | Bloqueado | Bloqueado |
| 98 | Longitud observada de intercambios por superficie | Bloqueado | Bloqueado |
| 99 | Ventaja del sacador por régimen reglamentario | Bloqueado | Bloqueado |
| 100 | Registro de hitos certificados | Bloqueado | Bloqueado |

## Fuentes principales de Finals

- [Archivo oficial ATP 1970–1999](https://www.nittoatpfinals.com/en/heritage/results-1970-1999)
- [Libro oficial WTA Finals](https://wtafiles.wtatennis.com/pdf/publications/WTAMG25_WTA Finals.pdf)
- [Cuadro oficial WTA 2015](https://wtafiles.wtatennis.com/pdf/draws/2015/808/MDS.pdf)
- [Contraste Sport12x 2015](https://www.sport12x.com/en/statistics/tennis/wta-tour-championships?seas=2015)
- [Contraste TennisDB 2015: marcadores, sin aceptar sus fechas de inicio repetidas](https://tennis-db.com/wta/tournaments/balldontlie_wta%3A99/wta-finals?season=2015)

Tres URLs no implican tres orígenes independientes: el nuevo consenso requiere emparejar tres editores con tres raíces distintas. Estas fuentes se guardan como evidencia revisable, no como verdad permanente.
