# Avance local v24 · 11 noviembre de 2026

## Cambios visibles solicitados

- El rediseño aprobado está activo en `/jugadores/[slug]` y `/comparar`. Las propuestas siguen accesibles; el perfil real conserva metadatos y datos estructurados.
- «Tal día como hoy»: composición estática en escritorio; pista vertical fijada y revelado separado de año, titular y acción en móvil. Admite partidos, títulos y acontecimientos sin partido. Movimiento reducido y ausencia de JavaScript mantienen acceso al contenido.
- La búsqueda de comparación alinea bandera y nombre; los formularios reales envían a `/comparar`, con compatibilidad para enlaces antiguos de periodo.
- Finals comparte la fila de columnas de 1000, 500 y 250. ATP y WTA conservan su directorio independiente.
- Palmarés móvil: selector encima, logo en esquina superior, trofeo separado de las métricas inferiores y acceso translúcido al torneo. No se repiten nombre ni categoría sobre la foto.
- Cronología del duelo: balance centrado, color contextual por superficie y control de reproducción debajo, a la derecha y fuera de la tarjeta.

## Fiabilidad y mantenimiento

1. El scheduler rechaza como éxito las respuestas HTTP 200 que contienen HTML, JSON inválido, errores o estados de trabajo ocupado/en ejecución.
2. Reserva de cuota, almacenamiento no verificado y enriquecimiento aplazado permanecen como aplazamientos, no como trabajos completados.
3. Un estado operativo `busy` guardado no puede desbloquear publicación por figurar como transporte exitoso.
4. Se retira el cuerpo bruto de respuesta de los logs del scheduler; se conserva el estado operativo útil para diagnóstico.
5. La versión de fórmulas de investigación ahora depende de fuentes transitivas, reglas importadas y evidencia real, incluyendo Maps y Sets sin depender del orden de inserción.
6. Los artefactos se sellan por dataset y versión de fórmula antes de mover un puntero. Las versiones anteriores se conservan. Si dos ejecuciones de la misma identidad producen distinto contenido, se bloquea la sustitución.
7. Los errores de calidad bloquean la publicación de esos artefactos. Nada de este catálogo se ha añadido a la interfaz pública.

## Evidencia de validación

- Build, tipos y lint completados correctamente.
- 28 pruebas dirigidas de investigación, versiones, Finals, navegación de torneos y scheduler, aprobadas.
- Primera inspección conjunta: 12 visitas a 320, 390 y 1366 px, todas HTTP 200, sin desbordamientos ni excepciones JavaScript. Revelado inicial/final comprobado.
- Confirmación funcional: formularios de comparación, Finals WTA, perfil WTA, movimiento reducido, perfil sin JavaScript y JSON-LD. Resultados en `/tmp/deuce-v24-confirm.json`. La lectura inmediata tras cambiar la URL de Comparar a 320px precedió a la nueva respuesta RSC; la confirmación corrigió esa sincronización esperando el titular resultante en `/tmp/deuce-v24-submit-320.json`, sin alterar el producto.
- Detector de diseño: 275 observaciones advisory sobre los componentes y estilos existentes/solicitados. No son 275 fallos funcionales; no se cambian identidad, radios o colores globales ajenos al encargo para eliminarlas.

## Estado real de las 200 medidas

Las 100 ideas tienen definición ejecutable. Esto no equivale a 100 datasets completos ni a 100 récords mundiales certificados. Siguen calculándose 143 selecciones ATP/WTA y permanecen 57 bloqueadas por evidencia insuficiente. Hay 55 controles de calidad y cero errores bloqueantes en la generación actual.

El registro de 100 críticas queda en **6 resueltas en local, 35 parciales y 59 pendientes**. Se conserva el detalle completo en `estado.json`. El aislamiento y las garantías nuevas no certifican automáticamente el funcionamiento del servidor remoto.

No ha habido nuevas consultas a Live Tennis API: el último cupo conocido es 201 llamadas con 200 reservadas. No se ha modificado producción ni realizado commit/push.

Persisten **62 incidencias de edición**, **3.081 ediciones sin certificación suficiente** y **3 con cuadro certificado**. No se declara cero partidos faltantes. Los problemas de derechos/calidad de fotografía, el denominador histórico completo, los rankings/países fechados, las reglas históricas pendientes, la restauración remota y la observación de producción requieren trabajo y evidencia adicional. Esta ronda no los da por cerrados ni inventa resultados para reducir las cifras.
