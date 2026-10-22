# DEUCE

Archivo y explorador de estadísticas de tenis masculino con resultados históricos y recientes. Las integraciones, criterios de elegibilidad, muestras y cobertura existentes son la fuente de verdad.

## Dirección vigente
La identidad aprobada de Apple Sports y Revolut combina fotografía deportiva licenciada, avatares circulares, tipografía expresiva uniforme y gráficos claros. La extensión actual facilita descubrir un dato verificado, abrir su jugador o partido, explorar una temporada y seguir las rondas registradas de una edición. La portada conserva el torneo observado más reciente y los descubrimientos reales. Se conservan todas las rutas y funcionalidades.

## Límites
Interfaz en español. No inventar datos, directo, rankings, coordenadas ni fotografías de partidos. No usar IA para recrear encuentros reales. Los denominadores necesarios acompañan los porcentajes. Las explicaciones de cobertura, metodología y calidad se consultan bajo demanda en Cobertura y Cómo se lee. Tema claro y oscuro persistente, teclado, móvil y movimiento reducido. La reconciliación de resultados consulta la API principal y conserva las referencias de cualquier corrección externa verificada.

## Navegación y medios
Jugadores integra las parejas: Cara a cara no se duplica en la barra. Partidos se explora por temporada y campeonato; Torneos sigue el calendario del circuito y permite pasar de la sede a una edición y sus rondas disponibles. El cuadro registrado no reconstruye posiciones del sorteo ausentes. La cabecera es opaca y flotante, la portada usa fotografía de sede a todo el ancho y un retrato compacto y la ficha incorpora fotografía real de sede y jugadores. El cierre reúne la marca, la navegación del archivo y los enlaces de información, con un diseño plano y sin mosaico fotográfico. La galería usa imágenes licenciadas locales y vídeos incrustados de canales oficiales, cargados solo tras pulsar.

## Lectura y evidencia
Los descubrimientos del jugador incluyen muestra y acceso a sus resultados. En el calendario, oro significa campeón, plata finalista, verde azulado semifinalista y tonos fijos para todas las demás rondas, siempre con texto. Las cifras generales de récords son neutras; el color de pista corresponde a una métrica o filtro de superficie. El resumen del partido compara juegos y medidas publicadas, sin la reproducción «Así se decidió»; el detalle del tie-break se despliega bajo demanda. Retratos y descubrimientos fotográficos reúnen crédito y licencia en un control de información. Los recortes de rostro conservan la procedencia y licencia de las fotografías originales. Un marcador compartido sirve portada, partido y final de torneo: números ganadores en color de pista, sin fondo en las celdas y con desempates pequeños en línea.

La superficie presentada deriva de las ediciones registradas y se distingue de la condición cubierta. La corrección histórica de Madrid afecta solo a Masters 1000 desde 2002: dura cubierta hasta 2008 y tierra al aire libre desde 2009. Conserva los campos originales y enlaza la historia oficial ATP.

## Actualización diaria
La fecha de compilación no acredita una sincronización. `/api/health` informa por separado de la edad de la generación activa y de la última sincronización y publicación. En despliegues con archivo remoto, una sincronización o publicación fallida, sin fecha o con más de 36 horas degrada la salud; la antigüedad de generación mantiene su umbral de 72 horas. Los cron del servidor conservan sus horarios de las 04:00 y 05:00 UTC para sincronizar y publicar.

Las lecturas remotas permiten como máximo tres intentos ante fallos transitorios observados, con plazos nuevos y diagnósticos sin credenciales. Los detalles se descargan en lotes de 25, con cuatro peticiones concurrentes como máximo. Si se agota el presupuesto, se mantiene la publicación anterior y la comprobación de cobertura sigue bloqueando cualquier reducción de datos.

## Integridad de ediciones
La actualización migra las temporadas 2023–actual a una consulta ATP de individuales sin excluir resultados por una categoría ausente. Recorre la paginación según `has_more`, incluso en páginas intermedias vacías. Después consulta correcciones (`restated_since`) en todas las temporadas guardadas y los encuentros recientes del año actual. Cada temporada completa se guarda antes de avanzar, de modo que un límite de tiempo permite continuar en la siguiente ejecución.

Los abandonos y walkovers con ganador documentado se publican en un artefacto separado para el cuadro y detalle de edición. Nunca aumentan victorias, muestras ni récords de partidos completos; un set abierto no cuenta como ganado y un walkover no muestra 0–0. Una auditoría de todas las ediciones de las fuentes conserva número de resultados válidos, estados terminales y registros pendientes; sus incidencias son consultables en Cobertura. La auditoría describe los registros recibidos y no afirma que todo sorteo histórico esté completo.

La portada añade actividad mensual, volumen de la temporada y finales recientes. Las fotos de sedes enlazan con su torneo y aportan un líder calculado del archivo.
