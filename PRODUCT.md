# DEUCE

Archivo y explorador de estadísticas de tenis masculino con resultados históricos y recientes. Las integraciones, criterios de elegibilidad, muestras y cobertura existentes son la fuente de verdad.

## Dirección vigente
La identidad aprobada de Apple Sports y Revolut combina fotografía deportiva licenciada, avatares circulares, tipografía expresiva uniforme y gráficos claros. La extensión actual facilita descubrir un dato verificado, abrir su jugador o partido, explorar una temporada y seguir las rondas registradas de una edición. La portada conserva el torneo observado más reciente y los descubrimientos reales. Se conservan todas las rutas y funcionalidades.

## Límites
Interfaz en español. No inventar datos, directo, rankings, coordenadas ni fotografías de partidos. No usar IA para recrear encuentros reales. Los denominadores necesarios acompañan los porcentajes. Las explicaciones de cobertura, metodología y calidad se consultan bajo demanda en Cobertura y Cómo se lee. Tema claro y oscuro persistente, teclado, móvil y movimiento reducido. Ninguna llamada nueva a la API es necesaria para este trabajo visual.

## Navegación y medios
Jugadores integra las parejas: Cara a cara no se duplica en la barra. Partidos se explora por temporada y campeonato; Torneos sigue el calendario del circuito y permite pasar de la sede a una edición y sus rondas disponibles. El cuadro registrado no reconstruye posiciones del sorteo ausentes. La cabecera es vidrio flotante, el retrato de portada es circular y la ficha incorpora fotografía real de sede y jugadores. El cierre ofrece accesos fotográficos por superficie. La galería usa imágenes licenciadas locales y vídeos incrustados de canales oficiales, cargados solo tras pulsar.

## Lectura y evidencia
Los descubrimientos del jugador incluyen muestra y acceso a sus resultados. En el calendario, oro significa campeón, plata finalista y verde azulado semifinalista, siempre con texto. Las cifras generales de récords son neutras; el color de pista corresponde a una métrica o filtro de superficie. La reproducción del partido recorre únicamente momentos verificables, sin completar puntos ausentes; el detalle del tie-break se despliega bajo demanda. Retratos y descubrimientos fotográficos reúnen crédito y licencia en un control de información. Los recortes de rostro conservan las fotografías originales.

La superficie presentada deriva de las ediciones registradas y se distingue de la condición cubierta. La corrección histórica de Madrid afecta solo a Masters 1000 desde 2002: dura cubierta hasta 2008 y tierra al aire libre desde 2009. Conserva los campos originales y enlaza la historia oficial ATP.

## Actualización diaria
La fecha de compilación no acredita una sincronización. `/api/health` informa por separado de la edad de la generación activa y de la última sincronización y publicación. En despliegues con archivo remoto, una sincronización o publicación fallida, sin fecha o con más de 36 horas degrada la salud; la antigüedad de generación mantiene su umbral de 72 horas. Los cron del servidor conservan sus horarios de las 04:00 y 05:00 UTC para sincronizar y publicar.
