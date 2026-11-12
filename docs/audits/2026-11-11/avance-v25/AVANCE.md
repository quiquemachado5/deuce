# Avance local v25

## Ajustes solicitados

- Finals muestra «Actualmente» como las demás columnas del directorio.
- El lienzo de Inicio, efemérides y récords mantiene grises neutros incluso en modo Temporada; no se rota su matiz hacia tonos rosados.
- El balance cara a cara se integra en los retratos con un panel oscuro compacto, cifras claras y líder destacado con el acento de temporada. Conserva nombres accesibles, recuento y datos reales.
- En móvil la composición de efemérides completa permanece fija dentro de su escena de scroll: fecha introductoria, titular revelado palabra a palabra y acción final. El texto y la pista comparten centro visual. La última historia no desaparece al terminar. En escritorio no hay parallax en esta sección.
- Las historias siguen admitiendo acontecimientos sin partido. Con movimiento reducido, pantalla baja o sin JavaScript se conserva contenido estático. El foco de teclado revela la historia y su acción sin depender del scroll.

## Rendimiento

Se sustituyen cuatro puntos de descompresión gzip síncrona en las lecturas preparadas: archivos locales, blobs de varias partes, buffers remotos y páginas de récords. La descompresión pasa al trabajo asíncrono de zlib. Las cachés, el aislamiento ATP/WTA, las comprobaciones de tamaño y el tratamiento de archivos incompletos se conservan. No se atribuye una mejora cuantitativa de Core Web Vitals a este cambio sin medirla en el servidor real. JSON.parse continúa siendo síncrono.

## Verificación

Tipos, lint y 16 pruebas dirigidas de generaciones y conservación de artefactos. Build de producción local. Inspección conjunta a 320, 390 y 1366px, seguida de una confirmación tras el ajuste de alineación. Sin desbordamientos ni excepciones de JavaScript. Fondos neutrales comprobados también al activar Tierra. Etapas del scroll verificadas mediante las opacidades reales de introducción, titular y acción, y movimiento reducido verificado. Evidencia en `/tmp/deuce-v25-qa.json` y `/tmp/deuce-v25-confirm-qa.json`.

El registro de 200 medidas conserva evidencia y estados separados. No se certifican remotamente seguridad, backups, carga de producción ni totalidad histórica mediante esta inspección local. No se han ocultado incidencias ni inventado partidos para cambiar su estado. No se ha consumido la reserva de Live Tennis API. Sin commit, push ni despliegue.
