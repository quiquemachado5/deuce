# Plan de implementación de la auditoría

21/10/2026. Trabajo por entregas verificables; no interpretar este archivo como una afirmación de que toda la auditoría esté resuelta.

## Primera entrega: publicada

- Límite compartido de 16 lecturas del archivo comprimido; overview desde manifiesto.
- Next 16.3.8 y actualizaciones compatibles de dependencias; árbol de producción sin avisos en el chequeo realizado.
- Datos reales por defecto; rechazo de demo en producción y en publicación.
- Puertas de volumen, años, pérdida de datos e identificadores duplicados.
- Superficies moqueta/desconocido en importación, agregados, filtros y fichas.
- Snapshot con esquema/reglas versionados, resumen de cobertura e identidad por día editorial.
- Reconstrucción local real y comprobación de integridad.
- Página pública de cobertura por temporada y superficie.
- Filtros persistentes en estados vacíos y explicación del ranking histórico ausente.
- Búsqueda de torneos/ediciones; sugerencias conservadoras de nombres; índice de texto de partidos reutilizado por generación en memoria.
- Semántica y contraste de fichas; gráfico con enlaces agrupados y descripción textual.
- Cabeceras básicas de seguridad.
- Pruebas unitarias, de navegador y workflow de CI sin secretos ni despliegue automático.
- README y configuración de ejemplo; retirada documentada de comandos a scripts no recuperados.

## Verificación local de esta entrega

- Compilación de producción, TypeScript y ESLint: correctos.
- 10 pruebas unitarias y 7 recorridos de navegador: correctos.
- Integridad de 176.263 partidos y 90 listas preparadas comprobada.
- Lectura en frío con límite de 128 archivos abiertos: completa, sin `EMFILE`.
- Auditoría npm: 0 vulnerabilidades en dependencias de producción; 9 en desarrollo (7 altas y 2 moderadas), pendientes de migración revisada.
- Axe sin infracciones en las fichas comprobadas en claro/oscuro y en la página de cobertura; capturas revisadas en móvil. Esto no certifica todas las páginas ni sustituye pruebas con lectores de pantalla.
- Las guías de revisión React y verificación de Vercel orientaron las comprobaciones de semántica, contraste y recorridos interfaz/API/datos.
- CI preparado, aún no ejecutado en GitHub. Producción no modificada por esta entrega.

## Segunda entrega: coherencia y diagnóstico

- Manifiesto, partidos y agregados de jugadores se seleccionan como una generación completa. Si falta una pieza esencial remota, se utiliza íntegramente la copia incluida.
- Una página de ranking remota incompleta se recalcula con los partidos de esa misma generación, sin introducir filas antiguas.
- Caché del cuaderno identificada por versión/origen; búsqueda, listados, fichas, destacados y sitemap de partidos leen datos publicados.
- Metadatos y cabecera `X-DEUCE-Dataset-Version` en las APIs para contrastar resultados.
- Aviso visible de respaldo en portada, estadísticas, fichas y cobertura. Las cachés CDN pueden actualizarse en momentos diferentes: no se promete simultaneidad global entre páginas.
- `/api/health`: versión, origen, antigüedad y estado. Más de 72 horas o un respaldo por fallo remoto produce `degraded`; archivo inaccesible produce HTTP 503. No se ha contratado ni configurado un servicio de alertas.
- Consultas de lectura remota con límite de espera; build de producción bloqueado si pierde partidos o cobertura estadística medida frente al manifiesto publicado.
- Pruebas de fallos parciales, datos corruptos, cambio de versión, edición de torneo, persistencia de filtros y concordancia entre siete APIs.

## Próxima entrega: fiabilidad avanzada

- Recuperar herramientas originales y esquema; revisar grants/RLS, backups y restauración con acceso al proyecto correcto.
- Conservar la conciliación en cada release: la primera publicación mantuvo 176.267 partidos, 94 estadísticas y los 50 partidos recientes comprobados.
- Revisar los 42 grupos candidatos a conflictos; no borrar ni fusionar por coincidencia de nombres.
- Reglas de desempate por torneo/época y corpus histórico más amplio.
- Orden de rachas con fechas y rondas fiables; documentar cortes por datos ausentes.
- Ampliar los ensayos de fallo a múltiples instancias y cachés CDN.
- Cálculo de estadísticas filtradas por métrica; índice preparado de entidades; medición frío/caliente.
- Particionar artefactos para reducir memoria y trazado de funciones.
- Timeouts consistentes, supervisión de cron, edad del dataset y alarmas accionables.
- Resolver avisos de desarrollo mediante migración compatible y revisada.

## Experiencia y descubrimiento

- Comparador de jugadores con cohortes equivalentes, no totales engañosos.
- Lista completa de evidencia para cada cifra.
- Colecciones y favoritos locales; cuenta opcional solo después de validar utilidad.
- Fotografías de cabecera con mayor resolución y encuadres coherentes.
- Navegación de secciones en móvil, más pruebas de zoom/lector de pantalla y de navegadores.
- Sitemap particionado, canonical normalizada, datos estructurados apropiados y guías editoriales.
- Medición de búsquedas útiles, consulta de evidencia y recurrencia, con minimización de datos personales.

## Funciones posteriores que requieren decisiones o permisos

- Exportaciones CSV y reutilización: revisar licencias del proveedor.
- Compartir tarjetas con cobertura, fuente y versión; extender el compartir existente.
- Ediciones/cuadros e historias curadas con fuentes verificadas.
- Canal de correcciones con moderación y seguimiento.
- Cuentas, sincronización y correo: elegir política de datos, autenticación y consentimientos.
- WTA/dobles: nueva cobertura y reglas, no solo cambiar etiquetas.
- Lenguaje natural: traducir preguntas a consultas comprobables; no inventar estadísticas.
- Monetización, servicios de pago o aplicación nativa: decidir después de medir demanda.

## Puerta de release

No promocionar solo porque compila: ejecutar build, pruebas, verificación del archivo, comparación del dataset remoto, revisión del diff y una preview del mismo entorno de datos. Conservar la generación anterior para rollback. La prueba local no acredita la configuración del WAF ni los permisos reales de la base de datos.
