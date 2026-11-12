# Las 100 críticas más probables, priorizadas

Esta lista no afirma haber encontrado cien fallos demostrados. **C:** comprobado en código/datos/estado público; **R:** riesgo de arquitectura o producto; **M:** medición pendiente. Cuando una fila es R/M, su gravedad es el impacto potencial si se confirma. Alta no equivale a una vulnerabilidad explotada. B/M/A: complejidad baja/media/alta; prioridades según el informe principal.

| # | Estado | Gravedad / prioridad | Crítica e impacto | Solución concreta | Complejidad |
|---|---|---|---|---|---|
| 1 | C | Alta · P0 | No existe un porcentaje global de cobertura demostrable: el denominador externo no está cerrado. | Censo de ediciones/fases y partidos esperados, con desconocidos separados. | A |
| 2 | C | Alta · P0 | 2.945 ediciones no están certificadas: no pueden respaldar promesas de totalidad. | Certificación con evidencia por edición y reglamento. | A |
| 3 | C | Alta · P0 | 74 ediciones constan como incompletas: afectan cuadros y agregados. | Priorizar por impacto, reconciliar fuentes y recalcular productos dependientes. | A |
| 4 | C | Alta · P0 | Seis pares Miami reference/live comparten ronda, pareja y score: posible doble cómputo. | Un hecho canónico con varias observaciones, sin borrar originales. | M |
| 5 | C | Alta · P0 | Scheduler bloqueado y publicación posterior exitosa discrepan: alerta operativa ambigua. | Estado de job persistente, ID y conciliación tras timeout. | M |
| 6 | C | Alta · P0 | H2H del archivo puede parecer el historial oficial: 34 Federer–Nadal frente a 40 ATP. | Contrato de alcance y desglose exacto de competiciones excluidas. | M |
| 7 | R | Alta · P0 | Una racha puede atravesar encuentros desconocidos y alargarse artificialmente. | Exigir continuidad certificada o marcarla como racha parcial. | A |
| 8 | R | Alta · P0 | Máximos de una muestra incompleta pueden anunciarse como récord mundial. | Elegibilidad y denominador por métrica antes de publicar absolutos. | A |
| 9 | C | Alta · P0 | Inicio del torneo y temporada se confunden en fronteras de diciembre. | Separar temporada deportiva, fecha civil e identidad de edición. | A |
| 10 | R | Alta · P0 | Asociar torneos por ciudad mezcla entidades históricas y categorías. | Registro de series/ediciones con circuito, nivel y vigencia. | A |
| 11 | C | Alta · P1 | Solo cerca del 13 % tiene fecha exacta: cronologías precisas no son universales. | Propagar precisión y prohibir falsa fecha diaria. | M |
| 12 | C | Alta · P1 | Menos del 1 % tiene estadísticas de partido: análisis de servicio/resto sesgados. | Productos separados por cobertura, ampliar cohortes verificadas. | A |
| 13 | C | Alta · P1 | Punto a punto aún más escaso: no permite récords de presión globales. | Elegibilidad por campo y definición de muestra. | M |
| 14 | C | Alta · P1 | WTA 2018 cae a 1.070 filas frente a años vecinos: discontinuidad sin explicación cerrada. | Conciliar catálogo y fases contra un censo independiente. | M |
| 15 | C | Alta · P1 | ATP 2023–2026 no registra partidos con ranking de ambos en el producto inspeccionado. | Enriquecimiento fechado y pruebas de regresión por cohorte. | A |
| 16 | C | Alta · P1 | Persisten diez conflictos: más filas no garantiza mejor verdad. | Expediente de resolución con fuentes y decisión versionada. | M |
| 17 | C | Alta · P1 | URLs de procedencia apenas aparecen en la proyección de lectura. | Mapa fila→original→hash→transformación accesible desde Cobertura. | A |
| 18 | R | Alta · P1 | Conservar un raw sin localizar la fila no hace una cifra reproducible. | Localizador estable y relaciones entre observaciones y hechos. | M |
| 19 | R | Alta · P1 | Tres páginas pueden copiar una única fuente equivocada. | Grafo de procedencias independientes y autoridad por campo. | M |
| 20 | R | Alta · P1 | Reparación manual sin dependencia de métricas deja récords obsoletos. | Invalidación por linaje y recálculo atómico. | A |
| 21 | C | Alta · P1 | Hay candidatos de duración extrema; los outliers pueden contaminar rankings. | Revisar unidades/estado/fuentes antes de usar duraciones. | M |
| 22 | R | Alta · P1 | Reglas modernas aplicadas al pasado invalidarían sets legítimos. | Tabla reglamentaria versionada por edición y fase. | A |
| 23 | R | Alta · P1 | BYE, walkover y abandono no son resultados terminados intercambiables. | Máquina de estados y políticas de cómputo separadas. | M |
| 24 | R | Alta · P1 | Contar final no equivale siempre a ganar un título oficial. | Validar estado de final, ronda y decisión canónica. | M |
| 25 | R | Alta · P1 | Cambio de nombre o nacionalidad puede crear personas falsas o duplicadas. | IDs de persona, alias y atributos con vigencia temporal. | A |
| 26 | R | Alta · P1 | Ranking actual o posterior puede filtrarse a métricas históricas. | Observación fechada y prohibición de datos futuros. | A |
| 27 | C | Alta · P1 | Caché de detalles acumula muchas expulsiones y fallos. | Trazar reutilización, precalcular lo frecuente y acotar cardinalidad. | M |
| 28 | C | Alta · P1 | Selecciones compactas tienen baja reutilización observada. | Normalizar claves y medir coste por combinación. | M |
| 29 | R | Alta · P1 | Gzip/JSON síncrono grande puede bloquear el proceso bajo concurrencia. | Perfilar y particionar/precargar fuera del camino interactivo. | A |
| 30 | M | Alta · P1 | No está demostrado el p95 de `/match` y `/comparar` en carga real. | RUM y trazas por fase con escenarios fríos/calientes. | M |
| 31 | R | Alta · P1 | Un timeout puede disparar reintentos mientras el job anterior sigue vivo. | Lease con heartbeat, idempotencia y estado consultable. | M |
| 32 | R | Alta · P1 | Nuevos workers podrían multiplicar cuotas si el presupuesto no es compartido. | Reserva transaccional persistente y límite por operación/proveedor. | M |
| 33 | C | Alta · P1 | Rate limiting en memoria es local al proceso. | Limitar en proxy/edge y probar varias réplicas. | M |
| 34 | R | Alta · P1 | Identificación por forwarded IP depende de la configuración del proxy. | Sobrescribir cabeceras externas y unificar extracción/logging de IP. | B |
| 35 | C | Alta · P1 | Diagnóstico profundo público revela operación, cuota y capacidad. | Separar salud pública mínima de detalle autenticado. | B |
| 36 | R | Alta · P1 | Descarga de medios/fuentes puede convertirse en SSRF si acepta URLs sin controles. | Validar destino/red/redirect y límites de tamaño/tiempo. | M |
| 37 | C | Alta · P1 | CSP permite scripts inline: reduce defensa frente a una inyección. | Inventario de scripts y nonces/hashes con pruebas de hidratación. | M |
| 38 | M | Alta · P1 | Archivos de migración no acreditan RLS y permisos de producción. | Inspección de políticas/roles y pruebas negativas en entorno aislado. | M |
| 39 | M | Alta · P1 | No está demostrado que el host perdido pueda recuperarse sin sus secretos locales. | Restauración en host vacío con claves externas. | M |
| 40 | M | Alta · P1 | Cifrado y retención resistente al borrado no quedan probados por `rclone --immutable`. | Verificar cifrado, cuenta independiente y política remota real. | M |
| 41 | R | Alta · P1 | HTML público permite reconstrucción por scraping y coste de agregaciones. | Presupuesto de consultas, límites de concurrencia y crawler policy. | M |
| 42 | M | Alta · P1 | Tráfico legítimo y bot agresivo no están caracterizados en esta revisión. | Logs agregados por ruta/cliente, coste y ventana temporal. | M |
| 43 | R | Alta · P1 | Extraer datos públicos no garantiza permiso de redistribución de cada fuente. | Registro de derechos/contratos por fuente y forma de publicación. | A |
| 44 | R | Alta · P1 | Una cita en Licencias no concede licencia sobre una fotografía. | Activos autorizados y evidencia de licencia/autor/restricciones. | A |
| 45 | R | Alta · P1 | Fotografía de persona equivocada es un error editorial grave. | Identidad verificada y revisión visual por lote, no solo URL válida. | M |
| 46 | R | Alta · P1 | Facetas indexables pueden crear un universo de URLs pobres. | Política index/noindex y enlazado por intención/valor. | M |
| 47 | R | Alta · P1 | Canonicals de combinaciones o parejas invertidas pueden divergir. | Normalización canónica única y pruebas generadas. | M |
| 48 | R | Alta · P1 | ES/EN podrían declararse equivalentes sin conservar filtros/contexto. | Hreflang recíproco solo entre vistas equivalentes. | M |
| 49 | M | Alta · P1 | Indexación real y soft 404 no están medidos con Search Console. | Muestra de URL inspection y cruce sitemap/respuestas/contenido. | M |
| 50 | C | Alta · P1 | JSON-LD usa EventCompleted, ausente de EventStatusType: semántica inválida. | Sustituir/omitir el valor y validar todas las plantillas schema.org. | B |
| 51 | C | Media · P2 | El modelo central de dos personas no soporta equipos/dobles sin ampliación. | Participantes compuestos y disciplinas independientes. | A |
| 52 | R | Media · P2 | Etiquetas modernas pueden anacronizar categorías anteriores a ATP500/WTA1000. | Categoría original más familia analítica con fechas. | A |
| 53 | R | Media · P2 | Torneo serie, sede, patrocinador y edición no son la misma entidad. | Separar relaciones y alias históricos. | A |
| 54 | R | Media · P2 | Australia 1977 no cabe en una sola clave torneo+año. | ID de edición con ocurrencia y fechas. | M |
| 55 | R | Media · P2 | Dos Tokyo del mismo año pueden ser torneos distintos, no duplicados. | Resolver nivel/fecha/serie antes de deduplicar. | M |
| 56 | R | Media · P2 | Una actualización de raw puede alterar silenciosamente un hecho ya publicado. | Diffs de observaciones y decisiones canónicas revisables. | M |
| 57 | R | Media · P2 | Un hash de dataset no explica por sí solo qué cambió. | Changelog semántico de altas, bajas, correcciones y métricas. | M |
| 58 | R | Media · P2 | Un catálogo de métricas sin versión de definición no es reproducible. | IDs y versiones de fórmula, alcance y política de nulls. | M |
| 59 | R | Media · P2 | Comparar porcentajes con denominadores desiguales induce conclusiones falsas. | Mínimos, cobertura y periodos comparables. | M |
| 60 | R | Media · P2 | Sesgo por partidos con ranking/estadísticas no es aleatorio. | Analizar disponibilidad por año, circuito, ronda y jugador. | M |
| 61 | R | Media · P2 | Elo inicial y orden aproximado de encuentros alteran estimaciones. | Warm-up, reglas de fecha y evaluación/calibración reproducible. | A |
| 62 | R | Media · P2 | «Mejor ranking observado» no equivale a ranking oficial de fin de año. | Nombre preciso y fuente de la observación. | B |
| 63 | R | Media · P2 | Nacionalidad actual aplicada al pasado distorsiona estadísticas por país. | Atributos con intervalo de validez. | A |
| 64 | R | Media · P2 | Ausencia de una edición puede parecer inactividad o derrota. | Estados distintos: no jugó, no celebrado, desconocido y sin documentación. | M |
| 65 | R | Media · P2 | Topología del cuadro no puede inferirse solo desde cantidad de partidos. | BYE, grupos y clasificaciones identificadas. | A |
| 66 | R | Media · P2 | ETag ligado solo a datos no cambia al cambiar la representación/código. | Versión de esquema/render en claves y pruebas de 304. | M |
| 67 | C | Media · P2 | Cabecera observada permite una ventana stale muy larga. | Política por tipo de contenido y prueba de invalidación efectiva. | M |
| 68 | R | Media · P2 | HTML, RSC y productos podrían resolver generaciones distintas. | Contexto de generación fijado por petición/navegación. | A |
| 69 | M | Media · P2 | No hay perfil de memoria medido con volumen x10 en esta revisión. | Ensayo reproducible y presupuestos por fase. | M |
| 70 | R | Media · P2 | Retener generaciones y detalles sin GC puede agotar objetos/disco. | Recolección con referencias activas y retención de evidencia. | M |
| 71 | M | Media · P2 | No se han medido LCP/CLS/INP de usuarios reales. | RUM p75 por ruta y dispositivo, con privacidad. | M |
| 72 | R | Media · P2 | Vídeo hero puede consumir datos y desplazar el LCP. | Poster prioritario, carga adaptativa, ahorro de datos y límites por dispositivo. | M |
| 73 | R | Media · P2 | Parallax no debe convertirse en bloqueo del scroll o información invisible. | Fallback estático, pruebas táctiles y reduced-motion. | M |
| 74 | R | Media · P2 | Componentes móviles extremadamente compactos pierden lectura o targets. | Pruebas de zoom, nombres largos y tamaño de interacción. | M |
| 75 | M | Media · P2 | Compatibilidad de colores relativos depende del parque real de navegadores. | Fallbacks CSS y matriz de soporte medida. | B |
| 76 | R | Media · P2 | Colores de temporada y Grand Slam pueden degradar contraste. | Pruebas de tokens/componentes en todos los temas. | M |
| 77 | R | Media · P2 | Autoplay sin pausa accesible o reduced-motion perjudica accesibilidad. | Controles por teclado y contenido estático alternativo. | B |
| 78 | R | Media · P2 | Tablas visuales sin contexto semántico dificultan investigación asistida. | Encabezados, nombres accesibles y orden de lectura. | M |
| 79 | R | Media · P2 | CSS acumulado y excepciones hacen impredecibles los siguientes retoques. | Inventario de propiedad y refactor con contrato visual, sin borrado masivo. | A |
| 80 | C | Media · P2 | El árbol local incluye muchos cambios aún no publicados. | Release manifest y revisión de alcance antes de commit/deploy. | M |
| 81 | M | Media · P2 | SBOM y estado real de dependencias no se han auditado aquí. | Inventario, avisos y política de actualización con rollback. | M |
| 82 | M | Media · P2 | Rotación/recuperación de claves no está acreditada en esta revisión. | Ensayo de rotación y revocación fuera de producción. | M |
| 83 | R | Media · P2 | Una copia recuperable puede seguir conteniendo corrupción semántica. | Restauración más consultas testigo y hashes históricos. | M |
| 84 | M | Media · P2 | RPO/RTO no han sido cronometrados tras pérdida total de host. | Simulacro con cronómetro y checklist de dependencias. | M |
| 85 | R | Media · P2 | Monitores locales no detectan caída simultánea del servidor y monitor. | Alerta externa independiente. | B |
| 86 | R | Media · P2 | Éxito HTTP de ingestión no demuestra novedades publicadas. | Contadores de altas/correcciones y versión servida por día. | M |
| 87 | R | Media · P2 | Totales de estadísticas diferentes entre local y producción no son comparables sin versión. | Mostrar generación en diagnóstico y guardar evidencia de cada medición. | B |
| 88 | R | Media · P2 | Retención de logs sin política puede exponer identificadores innecesarios. | Minimización, redacción y plazo de retención. | M |
| 89 | M | Media · P2 | Métricas de bots/caché sin ventana temporal dificultan decisiones. | Tasas por intervalo y correlación con latencia/coste. | B |
| 90 | R | Media · P2 | Un stack de monitorización excesivo añade coste y mantenimiento. | Elegir servicios según alertas necesarias y presupuesto. | B |
| 91 | R | Media · P3 | Contenido diario basado en fechas aproximadas cuenta aniversarios falsos. | Solo efemérides con fecha exacta y hecho certificado. | M |
| 92 | R | Media · P3 | Noticias generadas pueden convertir correlación en causalidad deportiva. | Plantillas desde cálculos verificados y revisión editorial. | M |
| 93 | R | Media · P3 | Wikipedia sin revisión guardada impide reproducir una corrección futura. | Revision ID, hash, cita primaria y fecha de captura. | M |
| 94 | R | Media · P3 | Estadísticas de X pueden omitir formato, periodo o empates. | Extraer la hipótesis y recalcularla con alcance explícito. | M |
| 95 | R | Media · P3 | Incorporar IA en cada visita eleva coste sin mejorar el dato. | Procesamiento offline, caché por versión y presupuesto. | M |
| 96 | R | Media · P3 | Fuentes externas pueden inyectar instrucciones a un proceso de IA. | Datos no confiables, esquema cerrado y autorización separada de extracción. | M |
| 97 | R | Media · P3 | Sin URLs de consulta versionadas el periodista no puede citar un resultado estable. | Enlaces permanentes a definición, selección y versión. | M |
| 98 | R | Media · P3 | Exportaciones sin diccionario ni licencia crean ambigüedad de uso. | CSV/JSON con tipos, nulls, alcance, procedencia y permisos. | M |
| 99 | R | Media · P3 | Cien métricas nuevas antes de certificar diez aumentan deuda editorial. | Entregas pequeñas con pruebas y responsables. | B |
| 100 | R | Media · P3 | Competir a la vez en directo, historia, predicción y noticias diluye la ventaja. | Priorizar archivo histórico verificable y experiencia de investigación. | B |

## Qué ya existe y no debe rehacerse por inercia

- Generaciones inmutables y fallback de lectura.
- Separación ATP/WTA en datos y productos.
- Validadores de formatos históricos y coherencia de resultados.
- Dedupe determinista para casos de evidencia exacta.
- Cuotas, reservas y checkpoints de importación.
- Cachés con límites de entradas/bytes y telemetría.
- Metadatos, canonical, sitemap y JSON-LD.
- Copias remotas, checksums, restauraciones y comprobaciones de frescura.
- HSTS y defensas contra framing observadas en producción.

La prioridad es **cerrar contratos y demostrar estos mecanismos extremo a extremo**, no sustituirlos por otro framework o añadir servicios sin necesidad.
