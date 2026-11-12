# Avance local v26

## Color y comparación

Se han sustituido 1.385 referencias al canal simbólico `h` usado como fallback en 43 archivos de estilos/componentes. Cada fallback contiene ahora el tono OKLCH numérico de su propio color original. No se asigna un único verde a todos los colores: se conservan azules, tierra, morados y neutros propios. La variable estacional sigue cambiando el matiz cuando el modo Temporada está activo. Esto evita depender de la interpretación del canal simbólico dentro de un fallback CSS de variable.

Prueba con colores calculados y píxel de canvas: Todos = RGB 224/231/225, Mayor racha = 224/233/225 y listado de dura = 220/230/236 en modo Clásico. Se recorren además Dura, Tierra y Hierba, a 390 y 1366px. Evidencia: `/tmp/deuce-v26-qa.json`. La comprobación automatizada ha usado Chromium; no acredita por sí sola todos los navegadores reales.

El cara a cara sustituye la cápsula flotante por una franja compartida integrada en la base de las fotografías. Conserva nombres por encima, balance central, ganador con acento y etiquetas accesibles. Confirmación a 320 y 1366px: `/tmp/deuce-v26-confirm.json`.

## Auditoría: restauración y corrupción silenciosa

La publicación y el verificador físico comparten ahora la misma función canónica de hash. Además de verificar esquema, IDs, circuitos y recuentos, restauración comprueba que el año y el contenido resumido de cada partido coincidan con su índice. Una copia con el torneo alterado y los mismos IDs/recuentos se rechaza. Se conserva la compatibilidad exacta de huellas de la generación publicada actual.

Verificación real local: 285 archivos, 148.181 partidos, ATP 74.075 y WTA 74.106, 242 listas de estadísticas y 14 particiones del navegador. Versión `2be3b9a020e9752675c8`. No se ha reconstruido ni cambiado un resultado deportivo para pasar la prueba. El hash resumido excluye deliberadamente las cintas grandes de puntos y estadísticas; esta protección no sustituye sus controles semánticos ni un ensayo remoto de recuperación.

## Comprobaciones

- Cinco pruebas de restauración, incluida corrupción de contenido con recuento intacto, aprobadas.
- Diecisiete pruebas de publicación, generaciones y modo estacional aprobadas.
- Tipos, lint y build de producción local aprobados.
- Sin desbordamientos ni excepciones JavaScript en las visitas de inspección de Inicio, Jugador, Torneos y Comparar.

Sin llamadas al proveedor, commit, push ni cambios en producción. El registro de medidas conserva sus estados y evidencia; esta ronda fortalece la crítica 83 y no certifica medidas que dependan de comprobaciones ajenas a estas pruebas.
