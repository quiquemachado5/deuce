# Instantánea WTA de DEUCE

Datos obtenidos de Live Tennis API el 2 de noviembre de 2026 con un plan BASIC activo. La descarga reanudable agotó el cupo disponible del día. La continuación usa el mismo modelo rápido del archivo ATP: resultados completos segmentados por temporada y niveles históricos G/M/A, sin pedir un detalle individual innecesario por cada partido.

La instantánea completa permanece en el entorno operativo de DEUCE. Este repositorio público incluye `resumen.json`, con los totales agregados, y `preview.json`, una muestra reducida y transformada que utiliza la página `/wta`.

La captura local contiene 6.969 jugadoras individuales, 5.551 equipos de dobles, 560 identificadores únicos de torneo y 146.963 partidos entre material histórico, resultados WTA, WTA 125 y agenda capturada. El archivo principal todavía está en construcción por el límite de 1.000 consultas diarias.

Las respuestas brutas, SQLite, JSONL y ZIP no se publican porque las condiciones del proveedor prohíben redistribuirlas como conjunto de datos masivo. La muestra conserva solo los campos necesarios para presentar la integración en DEUCE.

La clave de la API no está incluida.
