# Palmarés y estadísticas contrastadas · revisión local

Todo permanece en local. No se han modificado resultados ni publicado en Netcup.

## Interfaz

- `/propuestas/nadal`: fondo del palmarés a todo el ancho con degradado gradual hacia el color de la página; sin esquinas exteriores en móvil ni escritorio.
- En móvil, «Ver torneo» pertenece a la columna de información. La fotografía ocupa la altura completa; desaparece la franja blanca inferior.
- `/records`: nuevo bloque «Hitos de una carrera», con siete hitos ATP y cuatro WTA. Las fuentes se abren bajo demanda y la navegación a perfiles conserva el circuito.
- Sin peticiones a Wikipedia ni Live Tennis durante la visita; los hitos se renderizan en servidor desde el registro local.

## Criterio de incorporación

`lib/verified-statistics.json` conserva once cifras históricas, su definición, periodo, unidad y 33 observaciones en 22 páginas distintas. Cada cifra tiene tres páginas coincidentes de tres publicaciones y orígenes editoriales distintos. Las revisiones de Wikipedia se obtuvieron mediante su API pública y se enlazan por `oldid`.

`statisticVerification` rechaza menos de tres páginas, URLs duplicadas con seguimiento, reutilización de una misma publicación/origen, diferencias de cifra, alcance o unidad, fuentes sin fecha, revisiones no fijadas y propuestas pendientes. Es una validación de observaciones revisadas, **no un sistema que infiera consenso contando números sueltos en HTML**. Tampoco demuestra independencia estadística entre todo lo que publica internet. La revisión editorial debe comprobar posibles copias y republicaciones.

Los hitos describen periodos cerrados; no afirman que una marca siga siendo un récord mundial en cualquier fecha futura. El hecho histórico queda conservado aunque otro jugador lo supere. Una corrección futura exige volver a revisar las fuentes y mantener el historial de cambios.

## Reconciliación reproducible

```sh
npm run data:references:verify
```

Lee la generación local activa, no llama a APIs ni modifica partidos. Guarda `data/research/verified-statistics-audit-2026-11-11.json`. Devuelve error si una referencia pierde las tres comprobaciones o alguna de las cuatro reconciliaciones deja de coincidir.

En la generación `15dd0b11e68a81a08d9e`, con 146.560 partidos:

| Comprobación | Referencia | Recalculado |
| --- | ---: | ---: |
| Federer · finales consecutivas de Grand Slam, Wimbledon 2005–US Open 2007 | 10 | 10 |
| Federer · semifinales consecutivas, Wimbledon 2004–Australia 2010 | 23 | 23 |
| Federer · cuartos consecutivos, Wimbledon 2004–Roland Garros 2013 | 36 | 36 |
| Nadal · títulos de Roland Garros, 2005–2022 | 14 | 14 |

La secuencia sigue el calendario de los Grand Slams, no únicamente las participaciones de un jugador. Se evita que una ausencia una dos rachas; Wimbledon 2020 se considera cancelado y Roland Garros 2020 se ordena después del US Open. Las comprobaciones se aíslan por circuito y no cuentan dos veces una edición.

## Investigación de OnlyRogerCanFly

La cronología directa de X devolvió HTTP 403. Se consultaron artículos accesibles que citan publicaciones concretas de la cuenta; no se revisó ni se declara revisado todo su historial.

La pista sobre los 16 títulos de Vilas en 1977 se contrastó con Tennis.com y Wikipedia y se incorporó como hecho individual, sin trasladar automáticamente todas las afirmaciones del artículo. Otras cinco líneas de investigación permanecen fuera del registro publicado: derrotas con punto de partido a favor, victorias rápidas en tierra, efectividad indoor, cómputos históricos de partidos de Grand Slam y títulos ATP 500 desde 2009. Sus enlaces y condiciones están en `data/research/discovery-queue-2026-11-11.json`.

También se guardaron discrepancias concretas: una fecha final errónea en la ficha de Guinness de las diez finales de Federer, diferencias de redondeo del balance 112–4 de Nadal y diferencias sobre el mes inicial de la racha de Evert. Estas páginas no se usan para certificar un dato que no respaldan exactamente.

## Comprobación acotada

- Móvil 320/390 y escritorio 1366: sin desbordamiento en los dos bloques; selector de torneo largo y enlaces de fuentes comprobados.
- Cinco pruebas de reglas de verificación y reconciliación; tipos y lint de los archivos afectados.
- Sin reconstruir todo el dataset ni ejecutar pruebas ajenas a esta modificación.
