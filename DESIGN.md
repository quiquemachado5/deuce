---
name: DEUCE
description: Archivo deportivo visual de resultados y estadísticas ATP y WTA.
colors:
  bg: "#f5f6f7"
  bg-raised: "#fff"
  bg-sunken: "#ebeef0"
  ink: "#151b20"
  ink-soft: "#46525c"
  muted: "#626b74"
  line: "#e2e6e9"
  line-strong: "#c6ced4"
  court: "#151b20"
  court-deep: "#ebeef0"
  grass: "#17774b"
  clay: "#aa4326"
  hard: "#2169b3"
  carpet: "#7949ab"
  loss: "#bb4c36"
  danger: "#a92e2e"
  dark-bg: "#0e1215"
  dark-bg-raised: "#1a2025"
  dark-bg-sunken: "#252d34"
  dark-ink: "#f4f7f9"
  dark-ink-soft: "#c4cdd4"
  dark-muted: "#a2adb6"
  dark-line: "#303b44"
  dark-line-strong: "#53616c"
  dark-court: "#f4f7f9"
  dark-court-deep: "#252d34"
  dark-grass: "#88d9a8"
  dark-clay: "#f39a72"
  dark-hard: "#86bbf2"
  dark-carpet: "#c4a3ef"
  dark-danger: "#ffb3ad"
  records-bg: "#071e17"
  records-panel: "#15382c"
  records-lime: "#d9ff45"
  records-hard: "#73b6ed"
  records-clay: "#f3997a"
  records-grass: "#a9df81"
  records-footer: "#0d281f"
typography:
  display:
    fontFamily: "Sora, Host Grotesk, sans-serif"
    fontSize: "clamp(38px, 5vw, 64px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sora, Host Grotesk, sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Host Grotesk, sans-serif"
    fontSize: "24px"
    fontWeight: 550
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Host Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Host Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Host Grotesk, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  field: "12px"
  panel: "18px"
  hero: "24px"
  capsule: "999px"
  avatar: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "12px"
  md: "16px"
  inset-mobile: "20px"
  lg: "24px"
  xl: "32px"
  section-mobile: "40px"
  section: "48px"
  section-home: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg-raised}"
    rounded: "{rounded.capsule}"
    padding: "8px 24px"
  field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  panel:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    padding: "12px 16px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg-raised}"
    rounded: "{rounded.capsule}"
    padding: "12px 16px"
  avatar:
    rounded: "{rounded.avatar}"
    size: "36px"
---

# Design System: DEUCE

## Overview

**Creative North Star: "El archivo deportivo visual"**

La jerarquía de Apple Sports y los controles de Revolut se expresan en fotografía deportiva real, cifras legibles y titulares con carácter. Host Grotesk sostiene una sola voz editorial para titulares, nombres, tablas y lectura. El archivo debe sentirse cercano y vivo sin presentar los resultados observados como datos en directo.

Los paneles claros o carbón descansan sobre un fondo neutro. El color de la pista conecta torneo, marcador y análisis; los rostros ayudan a reconocer a los jugadores. La interfaz conserva densidad suficiente para explorar estadísticas, con espacio y cambios de escala que explican qué mirar primero.

**Key Characteristics:**

- Fotografía licenciada de sedes y jugadores, con procedencia accesible.
- Titulares expresivos y cifras tabulares coherentes.
- Verde hierba, terracota y azul de pista dura con significado estable.
- Paneles suaves, controles en cápsula y avatares circulares.
- Temas claro y oscuro persistentes, teclado y movimiento reducido.

## Colors

Los valores de la cabecera describen el modo Clásico; `app/ui/foundation.css` aplica el cambio claro/oscuro a las mismas variables semánticas. El modo Temporada usa únicamente los roles de marca de `styles/appearance.css`, según el calendario UTC de `lib/appearance.ts`: tierra del 1 de abril al 7 de junio, hierba del 8 de junio al 14 de julio y dura el resto del año. Conserva el significado de ganador, ronda, superficie, banderas e identidad Grand Slam. El control del pie y su persistencia se documentan en `.impeccable/surfaces/components-deuce-appearancecontrol-tsx.md`.

### Primary

- **Tinta estadística** (`court`, alias de `ink`): cifras y acciones generales. El fondo asociado (`court-deep`) usa el neutro hundido; el verde se reserva para hierba y resultados definidos.

### Secondary

- **Verde hierba** (`grass`), **terracota tierra** (`clay`), **azul dura** (`hard`) y **violeta moqueta** (`carpet`): identifican superficies en puntos, cifras, barras y contextos de torneo.
- El acento de evento toma el color de su superficie; su fondo mezcla ese color al 10% con el panel elevado. La comparación usa azul para el primer jugador y terracota para el segundo. Victoria usa hierba; derrota usa `loss` en claro y terracota en oscuro. El foco usa azul dura y los errores usan `danger`.
- El calendario del jugador reserva **oro para campeón**, **plata para finalista** y **verde azulado para semifinalista**, azul para cuartos, violeta para octavos, rosa para tercera ronda, arena para segunda y gris para primera, con fondos, tinta y bordes propios en ambos temas. Una leyenda y el resultado escrito acompañan esos colores; no describen la superficie.

### Neutral

- **Fondo de archivo** (`bg`): lienzo general; **panel** (`bg-raised`): contenido; **hueco** (`bg-sunken`): controles, carriles y grupos segmentados.
- **Tinta** (`ink`), **tinta secundaria** (`ink-soft`) y **texto auxiliar** (`muted`): jerarquía de lectura. **Línea** (`line`) y **línea firme** (`line-strong`): filas, límites y estados de campo.
- Los tokens con prefijo `dark-` describen las sustituciones activas con `data-theme="dark"`. Las fotografías conservan su color original.
- Las cifras de las clasificaciones de récords usan tinta neutra; la entrada editorial de Récords aplica su variante local descrita en Components. Solo una métrica o un filtro referido a una superficie activa su color de pista en cifras y barras.

**The Court Meaning Rule.** El color vincula una cifra con su pista o jugador; nombres, etiquetas y valores siguen explicando el dato por sí mismos.

## Typography

**Display Font:** Sora para titulares editoriales, distribuida con licencia SIL OFL y autoalojada durante la compilación mediante `next/font`. Host Grotesk permanece como voz de interfaz y lectura.

**Inicio — noviembre 2026:** portada cinematográfica con vídeo existente y titular Sora a un máximo de 96 px. Verde profundo y lima en la apertura; resultados sobre gris verdoso claro; fotografía histórica y galería de récords sobre salvia. El título de récords permanece fijo mientras las imágenes tienen un desplazamiento vertical acotado. Carrusel de sedes con desplazamiento manual, teclado y botones. El movimiento depende del viewport y de `prefers-reduced-motion`; todo el contenido es visible sin animaciones. Los marcadores reutilizan `ArchiveMatchRow`, con ganadores en verde. Contenido factual servido por la generación publicada.

En móvil, descubrimiento se convierte en tres accesos fotográficos de proporciones distintas; los resultados y récords se recorren horizontalmente. La ficha de «Tal día como hoy» separa la foto, el contexto y el marcador sobre blanco. Cabeceras y botones «Todos» comparten fila. La portada no muestra contadores ni controles inferiores del hero. Nuevas experiencias: rivalidad Federer–Nadal, selector de superficie con enlaces ATP/WTA separados y vídeo oficial bajo demanda, sin iframe hasta pulsar. Parallax móvil de recorrido corto mediante scroll timelines cuando el navegador lo admite.

La portada usa un catálogo propio de 23 fotografías nuevas en `lib/home-media-refresh.json`, con originales y miniaturas WebP locales, focos de recorte y enlaces de procedencia mostrados en Licencias. No se presenta un crédito como permiso cuando la fuente no documenta una licencia. El hero local v20 emplea un montaje profesional de juego del tráiler oficial de Wimbledon: MP4 nativo y silencioso, aproximadamente 16 segundos, H.264 a 1280×720 y 4,4 MB, sin controles ni grafismos añadidos. Licencias conserva su fuente y crédito; no se afirma una licencia abierta ni un permiso de publicación. Este montaje corresponde solo a la previsualización local. Los resultados de escritorio se organizan en dos filas de tres, con botón «Todos» gris. El carrusel de sedes inicia su temporizador al montarse y avanza cada 4,8 segundos; pausa al pasar el puntero o recibir foco, durante nueve segundos tras tocarlo, con la pestaña oculta y con movimiento reducido. Vuelve al primer elemento con salto directo. Su sección tiene esquinas exteriores rectas. El footer de inicio comienza en el material de la última sección; el modo Temporada sustituye sus roles de marca manteniendo esa continuidad.

**Body Font:** Host Grotesk con respaldo métrico del sistema. Los alias de interfaz, display, editorial y mono resuelven a la misma familia: no hay una segunda descarga ni una voz tipográfica accidental.

Los titulares principales usan peso 500, interletraje de `-0.045em` y altura compacta; los títulos pequeños suben de peso para conservar jerarquía. El cuerpo usa cifras tabulares y alineadas para comparar resultados. Los párrafos se limitan a 70 caracteres de ancho aproximado.

### Hierarchy

- **Display:** escala global de la cabecera; portada y perfiles amplían el máximo a 68px. El nombre del torneo principal alcanza 88px y los descubrimientos usan cifras de 52–88px.
- **Headline / Title:** títulos de sección y panel en la escala declarada; las secciones principales conservan una voz común.
- **Body:** lectura general; filas de tabla a 15px y controles o enlaces a 13–14px.
- **Label:** contexto, muestras y leyendas a 11–13px. Los desempates usan 11px en escritorio y 9px en móvil, junto al número del set; los encabezados compactos del marcador usan 10px. Mantener el español y la caja de oración observada.

## Layout

La zona principal mide como máximo 1240px, con 32px de margen a cada lado; el contenedor analítico interno llega a 1180px. La cabecera permite 1360px y mide 64px de alto. El ritmo combina 8, 16, 24 y 32px para contenido, y 40–64px entre secciones. Los paneles usan habitualmente 24–40px de relleno.

En **1100px** comienza la composición amplia. Por debajo, los márgenes principales pasan a 24px, la búsqueda de cabecera se reduce a icono y varias composiciones laterales se apilan. En **760px** comienza la composición intermedia; por debajo, el contenido deja 16px a cada lado, la cabecera mide 60px y el menú ocupa un diálogo de pantalla completa. Las consultas actuales usan `max-width: 1099px` y `max-width: 759px`.

En móvil, el marcador conserva todo el ancho disponible y permite desplazamiento horizontal cuando hace falta. Los resultados de las filas se ajustan entre sets completos, manteniendo cada set y su desempate juntos. Las acciones del torneo tienen su propia línea; las cifras porcentuales no se parten. Los formularios de comparación usan una rejilla de cuatro columnas, dos bajo 1100px; en móvil los dos primeros campos y la acción ocupan ambas columnas. Tablas y pestañas desbordan dentro de su contenedor, sin ensanchar la página.

## Elevation & Depth

La profundidad procede de fondos elevados o hundidos, líneas finas y fotografía recortada. La cabecera flotante es opaca, sobre el panel elevado, con una sombra neutra tenue y sin desenfoque. El diálogo atenúa el resto de la página con un velo oscuro y desenfoque de 6px. Los degradados de imagen aseguran lectura sobre fotografías.

Las transiciones de color, fondo, borde y opacidad duran 240ms. Las entradas recorren 12px en 280–480ms con `cubic-bezier(0.22, 1, 0.36, 1)` y mantienen el texto opaco desde el primer fotograma; el trazo de algunos gráficos dura 1s. Con movimiento reducido se desactivan animaciones, transiciones y desplazamiento suave.

## Shapes

Paneles redondeados (24px), campos suaves (16px) y cápsulas completas forman la gramática principal. El torneo destacado admite 32px en escritorio y 24px en móvil. Los avatares son circulares; el retrato protagonista puede usar una coronación redondeada y esquinas inferiores de panel. Las barras terminan en cápsula, y los indicadores de superficie son puntos circulares. Las líneas de 1px separan contenido denso sin convertir cada fila en una tarjeta independiente.

## Components

### Actualización de navegación y lectura

- **Cabecera opaca:** barra flotante en cápsula, separada 12 px del borde superior (8 px en móvil), con el tratamiento opaco descrito en Elevation & Depth. Cinco enlaces: Partidos, Estadísticas, Jugadores, Torneos, Comparar. Cara a cara pertenece a Jugadores.
- **MatchHero:** fotografía licenciada de sede, retratos circulares enfrentados, total de sets central y una tabla accesible de sets en cualquier ancho. Sin resultado duplicado en una segunda línea móvil. Ganador en el nombre accesible y cifras ganadoras en color de pista, sin fondos en las celdas; el desempate es pequeño y queda en línea. Compartir y registro se abren bajo demanda.
- **Archivo por ediciones:** selector de temporada, campeonatos con fotografía o color de superficie, partidas agrupadas por año y torneo tras filtrar. Paginación de 25; ninguna cinta viaja al cliente en el listado.
- **Footer:** marca DEUCE y navegación de archivo alineadas; debajo, Sobre DEUCE, Cobertura, Licencias e idioma. Sin panel fotográfico repetido. Se apila en móvil.
- **Galería:** selector de fotos/vídeos, navegación anterior/siguiente, ampliación nativa con Escape y retorno del foco. YouTube no se solicita hasta pulsar reproducir; siempre existe enlace al canal oficial. Fechas de los vídeos pertenecen al vídeo, no al partido destacado en portada.
- **Comparación por superficie:** controles para total y pistas; dos barras proporcionales con escala común, valores escritos y transición de anchura. No hay una puntuación sintética.
- **Texto secundario:** Cobertura explica el alcance público del archivo y cómo interpretar los datos. Los estados de cinta se consultan en el registro del partido. Se conservan los denominadores que cambian el significado de un porcentaje y los datos ausentes se mantienen como desconocidos.

### Exploración con contexto

- **Descubrimientos del jugador:** cifra, explicación, muestra y enlace a un partido, temporada o campeonato forman un bloque estable. «Otro dato» elige otra observación entre resultados completos y elegibles, anuncia el cambio y conserva el espacio del contenido. El país publicado se presenta como texto; los perfiles y la comparación no muestran banderas.
- **Retratos:** perfil y descubrimiento fotográfico muestran crédito, original y licencia mediante un único control de información de 44px. Los avatares de Federer, Nadal, Djokovic, Murray, Alcaraz y Sinner usan rectángulos de foco definidos sobre las seis fotografías locales existentes: el recorte CSS conserva los píxeles originales.
- **Torneo y edición:** la vista general abre con fotografía licenciada de sede y enlaza ediciones y campeones registrados. La edición presenta su final y un cuadro por rondas, con el camino del campeón señalado por texto. Solo aparecen partidos disponibles; el orden no afirma posiciones del sorteo. Las columnas de escritorio pasan a una ronda seleccionable bajo 1100px. Una fotografía de edición requiere evidencia de ese año.
- **Superficie y condición:** la presentación del torneo deriva de sus ediciones; la tarjeta general usa la más reciente y permite consultar la historia de superficies. El resolver distingue superficie y pista cubierta. La corrección de Madrid se limita a Masters 1000 desde 2002: dura cubierta hasta 2008 y tierra al aire libre desde 2009, con enlace a la fuente ATP y datos originales intactos.
- **Lectura del partido:** «Principales cifras» compara medidas publicadas; «En aquel momento» alinea duración, edad y ranking histórico cuando existen. «El partido en cifras» reúne juegos ganados y medidas disponibles. La pestaña Medidas agrupa servicio, resto y puntos con valores enfrentados y carriles de escala común. Los huecos de cinta permanecen huecos. El recuento exacto del tie-break se consulta en un desplegable cerrado; la antigua sección «Set a set» se retira.
- **Récords y clasificaciones:** la entrada editorial tiene el alcance y comportamiento descritos en «Récords — archivo editorial». El detalle de clasificación conserva nombre, cifra, muestra y acceso a evidencia; en móvil la prueba pasa bajo el nombre y la cifra mantiene su columna.

### Récords — archivo editorial (noviembre 2026)

Variante local de la entrada `/records`, implementada en `RecordsExperience`, `RecordsInteractive` y su módulo CSS. Mantiene Sora para titulares y Host Grotesk para lectura y controles; no cambia la identidad de otras rutas. El negro verdoso del lienzo (`records-bg`), el verde de panel (`records-panel`) y el acento lima (`records-lime`) sostienen una lectura editorial con grandes cifras. Dura, tierra y hierba usan respectivamente `records-hard`, `records-clay` y `records-grass`; el cierre transiciona a `records-footer`. La lima destaca hallazgos y acciones, sin representar una superficie. Titulares, nombres de clasificación y cifras principales usan peso 500; las cifras son tabulares.

- **Apertura fotográfica:** líder real de victorias del circuito seleccionado, cifra dominante, nombre enlazado y acceso a su clasificación. La fotografía conserva su procedencia; el degradado oscuro permite leer el titular y el resultado. No se escriben líderes ni valores de muestra en el componente.
- **Clasificación abierta:** hasta cuatro botones de selección con estado `aria-pressed` cambian el bloque de hasta ocho líderes, presentado como filas sin tarjetas individuales. El primer valor toma lima y la clasificación completa permanece enlazada. Cada nombre abre su destino real.
- **Tres superficies:** barras sobre una escala porcentual común de 0 a 100, calculadas a partir del porcentaje publicado del líder; etiqueta, valor y nombre acompañan cada barra. La fila completa abre la clasificación y sus criterios de elegibilidad. No es un gráfico de títulos ni un reparto de cuota.
- **Partidos extraordinarios:** composición fotográfica asimétrica (1,35:1) para más juegos y remontadas. Los líderes y valores vienen del manifiesto; ATP usa remontadas desde dos sets abajo y WTA tras perder el primer set. Ambas piezas enlazan la clasificación correspondiente.
- **Interludio de vídeo:** montaje nativo local, silencioso y decorativo, con póster y `preload="none"`. La fuente se asigna al aproximarse al viewport; se pausa fuera de su margen de observación y con movimiento reducido. No identifica el montaje como imágenes del partido destacado. El enlace conduce al directorio.
- **Directorio por familias:** desplegables nativos cerrados al entrar, abiertos al buscar o elegir una familia. Las filas conservan título, líder disponible, valor y acceso real; el estado vacío permite quitar filtros. La búsqueda y ATP/WTA conservan el alcance de los datos. El enlace de cálculo lleva a Cobertura.
- **Hitos de una carrera (11 noviembre):** `VerifiedMilestones` añade una única lista sobre panel verde, con cifras tabulares verde claro, unidad, jugador enlazado, descripción y periodo histórico. Dos columnas en escritorio pasan a una bajo 760px; no hay tarjetas por hito. Cada entrada ofrece «Consultar fuentes» mediante un `details` nativo, cerrado al entrar, que revela la definición y tres publicaciones enlazadas. Los siete hechos ATP y cuatro WTA se filtran por circuito y el enlace al jugador conserva WTA cuando corresponde. El servidor los lee del registro local, sin solicitar fuentes externas para renderizarlos. El filtro de incorporación comprueba observaciones coincidentes en cifra, alcance y unidad, tres páginas, publicaciones y orígenes editoriales distintos, fechas de revisión y revisiones de Wikipedia fijadas. Son hechos de periodos cerrados, no totales del dataset ni una afirmación de independencia global de la investigación.

El contenedor comparte `--deuce-content-max` (1120px), con `width: calc(100% - 40px)` en escritorio. La portada mide al menos 620px; clasificación y superficies usan dos columnas, mientras el vídeo se extiende al ancho de la ventana. Bajo 760px usa `width: calc(100% - 28px)`, portada de 560px, bloques apilados y una sola columna de directorio; maratón y remontada conservan alturas distintas (450px y 350px). Los radios fotográficos son 25–28px en escritorio; en móvil la portada usa 21px y el panel de superficies, 23px. Foco lima de 2px, controles nativos y movimiento reducido conservan la navegación por teclado. El parallax reutiliza el movimiento de portada y queda estático con movimiento reducido.

Esta sustitución afecta a la entrada sin `dato`: `page.tsx` sigue sirviendo el detalle existente, sus filtros, muestra, evidencia y clasificaciones. Los datos y enlaces se resuelven desde el manifiesto y las lecturas del circuito; no se afirma que la cobertura sea completa.

### Refinamiento local del archivo (10 noviembre 2026)

- **Efeméride:** año, contexto, protagonistas, resultado y acceso al partido forman un registro plano; no adopta otra tarjeta de récord. El retrato aporta contexto del jugador y no identifica una fotografía de ese encuentro. Reutiliza las imágenes locales curadas, con su procedencia.
- **Partidos:** cada fecha es un `details` nativo abierto al entrar; sus grupos se pliegan de forma independiente y mantienen los marcadores compartidos.
- **Récords:** periodo derivado del manifiesto (1968–2026 en la publicación actual) y cuatro categorías por circuito: Grand Slam, 1000, 500 y 250. `ArchiveFilterBar` usa su variante oscura, incluidos campos y desplegable. Cada familia lleva un único SVG de más que rota al abrirse; se desactivan los pseudomarcadores globales. Los degradados negros sobre fotografía conservan el contraste.
- **Jugador:** titulares de peso 500; etiquetas de métricas visibles a 10px y valores móviles en `clamp(16px, 4.6vw, 21px)`, sin perder etiquetas a 320px.
- **Galería de torneos:** acciones y progreso de tonos grises; anterior/siguiente de 44px, desactivados en sus extremos. El avance automático pausa con puntero, foco, interacción táctil durante 9s, pestaña oculta o galería fuera de pantalla. El retorno al inicio es instantáneo; movimiento reducido elimina el avance automático.
- **Portada:** los resultados recientes priorizan los últimos 45 días por Grand Slam, 1000, 500 y 250; orden cronológico dentro de cada nivel. Se buscan tres de cada circuito y se completa hasta seis cuando hay datos. La lectura local reutiliza una selección compacta en caché de las dos últimas temporadas del archivo.

La propuesta no indexable `/laboratorio/cabecera` ensaya una navegación verde bosque a todo el ancho, conectada con una cabecera compacta de Partidos: título móvil de 34px y control de filtro de 44px. Sus reglas están aisladas a esa ruta; no constituyen una aplicación global de la propuesta.


### Torneo, efeméride y detalle de récords — extensión local (10 noviembre 2026)

Tratamiento documentado de `TournamentExperience`, `TournamentControls`, `OnThisDayCarousel` y `record-detail.module.css`. Actualiza las descripciones anteriores de estas superficies; conserva cabecera, tipografía y marcadores blancos compartidos, sin cambiar la paleta global.

**Torneo y edición.** La fotografía de sede abre a todo el ancho. El logo oficial local acompaña al nombre cuando está en el catálogo; categoría y año ocupan una fila de altura reservada para no desplazar el nombre. No se muestra «Archivo del torneo» ni navegación intermedia de secciones. Un control compacto «ATP/WTA · Resumen/año» hereda la paleta del evento; dentro, «Resumen general» precede a los años y su búsqueda. ATP/WTA conserva el año cuando existe y vuelve al resumen cuando no existe. Escape y cierre explícito devuelven el foco al botón; pulsar fuera cierra el panel.

La variante local usa `--t-deep` / `--t-accent` / `--t-panel`: general `#0a281d` / `#d0e699` / `#163b2b`; Australia `#092a3a` / `#8fdded` / `#123e4d`; Roland Garros `#182b20` / `#f1b08a` / `#263f2c`; Wimbledon `#242238` / `#d2c1e9` / `#343249`; US Open `#09213d` / `#edda87` / `#153553`. Tinta `#f2f5ee`, auxiliar `#bfd0c1` y cierre `#0d281f`. Los acentos Grand Slam identifican el evento y mantienen la semántica propia del marcador.

El resumen sigue fotografía, campeones y palmarés, después datos históricos: carril manual de hasta diez finales, líder fotográfico junto a clasificación en filas, totales en una superficie tonal, histograma por década y registro de presión con porcentajes y recuentos. «Efectividad destacada» identifica al jugador mostrado; un partido real con más juegos aporta acceso al marcador. El archivo completo de ediciones es un `details` cerrado. No se usa una rejilla multicolor de tarjetas estadísticas. Las fotografías de jugadores aportan contexto sin acreditar por sí solas una edición.

La edición presenta una final fotográfica con desenlace por sets y enlace al partido, sin repetir el marcador tabular del cuadro. Sigue volumen de juego, recorrido del campeón (sin volver a mostrar la final), lente interactiva por ronda, nombres destacados, vídeo identificado cuando existe, cuadro íntegro y lecturas de presión/ritmo. La lente muestra partidos, sets, juegos, proporción de sets decisivos, remontadas y tie-breaks del mismo circuito/año/categoría. Los nombres se ordenan por victorias y balance de juegos. Aces, conversión de break y duración solo aparecen con datos disponibles. Secciones y filas se diferencian por fondos próximos a la paleta contextual, sin líneas separadoras. El contenido usa `--deuce-content-max`, ancho `calc(100% - 40px)` y `calc(100% - 28px)` bajo 600px; hero de 590px/425px. `HomeMotion` aporta profundidad fotográfica y queda estático con movimiento reducido. El vídeo se carga al pulsar, con cierre explícito y Escape. Carriles sin progreso, con teclado y botones de 44px desactivados en los extremos.

**Efeméride.** Usa los materiales de la portada: fondo gris verdoso, título de peso 500, fecha completa y fotografía horizontal de 290px al lado del marcador canónico blanco. No hay calendario lateral, mes vertical ni año sobre la fotografía. Bajo 760px la imagen mide 190px y el marcador se solapa ligeramente al pie, con controles grises de 44px. «Más de este día» conserva el día/mes y circuito en Máquina del tiempo. Anterior/siguiente cambia historias reales; el resultado se anuncia con `aria-live="polite"`. La profundidad fotográfica respeta movimiento reducido.

**Detalle y evidencia de Récords.** Continúan el archivo editorial con fondo `#071e17`, panel `#123525`, material hundido `#193e2c`, tinta `#f0f5ef` y lima `#d9ff45`. Fotografía con degradado, titular de peso 500, cifra, protagonista y acceso a evidencia preceden filtros y clasificación. Navegación de circuito, tabla y resultados relacionados comparten el tratamiento oscuro. La evidencia mantiene sus resúmenes y partidos en dos columnas; la lista pasa a una bajo 600px. Hero de al menos 480px, radio de 25px y 20px en móvil. La extensión visual conserva muestras, criterios y alcance de datos.

### Buttons

Acciones compactas y claras: tinta sobre panel invertido, radio cápsula, peso 600 y objetivo de al menos 44px de alto. El relleno habitual es 8–12px vertical y 16–24px horizontal. Las acciones de comparación reducen opacidad al pasar el puntero. Las acciones de texto llevan subrayado; los botones de icono son circulares. El foco visible usa un contorno de 2px con separación de 4px. Los botones desactivados usan opacidad 0,5.

### Chips

Ediciones y filtros de navegación usan cápsulas. La edición activa invierte tinta y panel. Las pestañas agrupan sus opciones sobre un carril hundido; la seleccionada recibe un panel elevado. Conservan texto sin partir y desplazamiento horizontal en espacios estrechos.

### Cards / Containers

Paneles blancos o carbón, bordes suaves y relleno amplio. Los listados agrupan sus filas con esquinas externas compartidas. El estado hover de un partido recibe el tinte de su superficie. Los perfiles integran fotografía y datos en un único encabezado; si no hay foto, la columna de datos ocupa el ancho.

### Inputs / Fields

Etiquetas visibles, altura de 44px, borde de línea, fondo general y radio de campo. El borde se refuerza al pasar el puntero; el foco conserva el contorno global. Filtros y comparadores se agrupan sobre paneles elevados, con separación suficiente para sus etiquetas y acciones.

### Navigation

Marca Host Grotesk de peso 700. Navegación Host Grotesk de 13px, texto auxiliar en reposo y tinta en la ruta activa, señalada además por una línea inferior de 3px. En móvil, el menú de pantalla completa usa la misma familia a una escala mayor. Búsqueda y menú se presentan como diálogos. El selector de tema ofrece Sistema, Claro y Oscuro; la preferencia persiste y se resuelve antes de pintar la página.

### Photography & Avatars

Los retratos locales y licenciados se recortan hacia el rostro; los avatares usan normalmente 24–40px en filas y tamaños mayores en marcadores. La inicial del nombre sustituye una foto ausente en avatares de listado. El nombre adyacente aporta la etiqueta accesible, por lo que el avatar decorativo no la repite. Las fotos de sede describen la sede; no representan un partido concreto sin evidencia.

### Scoreboards & Discovery

Los marcadores son tablas: nombres a la izquierda, sets alineados y cifras tabulares. Sets ganados y totales se distinguen con peso y color; el ganador se incluye en el nombre accesible. SetScoreboard sirve la portada, el partido y el torneo. Los descubrimientos presentan cifra, jugador, explicación y muestra juntos; el control «Otro dato» cambia una observación real y anuncia su contenido de forma cortés a lectores de pantalla. Los gráficos conservan leyendas, alcance y valores legibles.

## Do's and Don'ts

### Do:

- **Do** usar Sora en titulares editoriales y Host Grotesk en interfaz, tablas y lectura.
- **Do** enlazar color de superficie, marcador y gráfico con la misma semántica en ambos temas.
- **Do** mostrar muestras, cobertura y elegibilidad junto a las cifras que explican.
- **Do** mantener nombres, resultados y acciones legibles al apilar la vista móvil.
- **Do** usar fotografía licenciada, procedencia accesible e iniciales cuando falte un retrato.
- **Do** conservar foco visible, etiquetas de texto y movimiento reducido.

### Don't:

- **Don't** presentar una observación histórica como directo ni inventar rankings, coordenadas o resultados.
- **Don't** recrear con IA fotografías de encuentros reales.
- **Don't** usar color como única identificación de un jugador o un resultado.
- **Don't** añadir nuevas familias tipográficas a pantallas del sistema.
- **Don't** partir porcentajes o recortar resultados para encajarlos en una columna estrecha.

<!-- Fuentes: PRODUCT.md; app/deuce.css; app/ui/*.css; components/PlayerAvatar.tsx; components/PlayerPortrait.tsx; components/PlayerFlag.tsx; components/PlayerDiscovery*.ts*; components/MatchHero.tsx; components/TournamentBracket.tsx; components/nocturno/{Frame,Reading,ReadingLine,GameFlow,RecordDiscovery,RecordsViews}.tsx; lib/{photo-style,player-photo-focus,tournament-presentation}.ts; app/records/page.tsx; app/layout.tsx. -->

## Revisión de ediciones y marcadores (22 octubre 2026)

Las filas compartidas muestran dos jugadores alineados con columnas de sets y total. Solo el número del set ganado toma el acento de superficie; el total ganador usa tinta invertida en una pequeña cápsula neutra. Los desempates permanecen pequeños y en línea. Las separaciones de todas las tablas son rectas; solo el extremo superior de la primera fila e inferior de la última admiten radios al pasar el puntero. Las filas aisladas conservan el panel redondo.

La cabecera del partido reúne torneo, año, ronda y superficie; el estado y las acciones quedan al extremo. Cada jugador conserva un avatar circular aun sin fotografía y una bandera pequeña junto al nombre si el país está documentado. La portada usa una fotografía a todo el ancho con un desplazamiento de hasta 28px, desactivado con movimiento reducido. El pie ocupa otro material neutro y redondea sus esquinas superiores. Las cards Grand Slam llevan un borde fino dorado.

La revisión visual se limita a una pasada de detección y una confirmación de correcciones. Las variaciones tipográficas contextuales y el degradado sobre fotografía se conservan para legibilidad; no se generó una segunda pasada de detector.

## Portada y ensayo de marcadores (10 noviembre 2026)

En móvil, la rivalidad usa dos fotografías horizontales completas, apiladas, con nombres blancos al pie; se evita el recorte en dos columnas estrechas. La efeméride se separa 56px y sigue el diseño de fotografía y marcador canónico descrito en la extensión local anterior. «Hay que verlo» no muestra el enlace de canal sobre el vídeo.

`MatchScoreboard` y su módulo CSS son la única presentación de resultados de inicio, Partidos, finales y cuadros de Torneos, Comparar, jugadores, ficha panorámica de partido y previsualización de compartir. Los adaptadores antiguos delegan en él y las variantes solo cambian la semántica del enlace, nunca el diseño. El laboratorio no indexable usa ese mismo componente y diez casos reales del archivo. Una sola fila superior reúne torneo y ronda sin cápsulas; la inferior reúne circuito escrito sin fondo, competición, fecha y estado excepcional. Nunca muestra superficie. El borde completo de 1,5px distingue final en oro, semifinales en azul y cuartos en lavanda; la ronda sigue escrita y comparte el tono oscuro correspondiente. Las consultas de contenedor adaptan el marcador al ancho disponible, con independencia de la página. Las filas usan solo el número real de sets, preservan los superíndices del tie-break y truncan nombres con puntos suspensivos sin perder el texto accesible. Los casos incluyen dos a cinco sets, nombres y torneo largos, desempates de dos cifras, abandono y walkover sin tanteo inventado. Las fechas sin día verificado conservan su indicación de semana o edición.

«Hay que verlo» se extiende a todo el ancho en móvil y escritorio, sin radios ni márgenes laterales. Título y control se superponen a la fotografía. Un movimiento de profundidad y zoom acompaña el desplazamiento; en móvil su recorrido se limita a 28px y con movimiento reducido queda estático. El vídeo se carga solo tras pulsar y conserva el cierre accesible.

El footer conserva su composición y continuidad de degradado; desde v20 sus roles de marca admiten el modo Temporada y el origen contextual de cada Grand Slam. Sus enlaces se agrupan en Explorar y El archivo; Máquina del tiempo pasa a Explorar y se eliminan los accesos ATP/WTA redundantes. La marca usa el mismo símbolo de pelota `TennisBallMark` que la cabecera. El selector de idioma se sitúa junto al copyright, inmediatamente después, tanto en escritorio como en móvil: SVG local rectangular de 26 × 19px en un objetivo transparente de 44 × 44px. Copyright y crédito cierran el pie. La estructura inglesa conserva los destinos disponibles y señala los enlaces informativos en español.

El pie del marcador permanece en una sola línea: categoría o estado pueden abreviarse visualmente con puntos suspensivos, manteniendo el texto completo en sus atributos accesibles. «Sem.» identifica una semana, no un día de partido confirmado, y «W/O» conserva su explicación completa. Los diez casos se comprueban a 320px y 390px sin nombres ni metadatos en dos líneas.

Los títulos principales de listados usan peso 500. En escritorio los chips de navegación quedan alineados a la derecha, bajo los filtros. Las acciones pequeñas de superficies mantienen una altura mínima de 44px. La ficha panorámica de partido elimina el enlace de volver y conserva un degradado fotográfico hacia negro en escritorio y móvil.

La revisión local de torneos del 10 de noviembre agrupa logo ampliado, título con año en línea y categoría bajo el nombre. La extensión histórica se coloca encima del selector compacto. París usa soporte oscuro para su marca blanca; los eventos sin marca propia identificada recurren al logo oficial de su circuito sin atribuirles una identidad inventada. Los marcadores conservan su estructura canónica y solo heredan color de fondo, texto y ganador en superficies de torneo. Roland Garros combina naranja y verde; Wimbledon, morado y verde; US Open, azul y amarillo; Australia, azul y blanco. La final superpone el marcador a una fotografía, con juegos y duración documentados. Décadas y presión tienen materiales distintos; las ediciones alternan portadas y un archivo compacto. En móvil, las décadas se leen como barras horizontales y las portadas se exploran mediante desplazamiento nativo. No se añaden separadores horizontales ni barras de progreso.

La siguiente revisión local sustituye expresamente el soporte de logos anterior: los cuatro Grand Slam conservan su marca oficial transparente; todos los demás eventos usan el logo oficial ATP/WTA y texto de categoría, sin atribuirles logos de torneo. El símbolo US Open procede del SVG oficial de cabecera conservado en Commons; AO se extrae del SVG de la cabecera oficial. Ninguna marca lleva una caja blanca. En el marcador el logo es más pequeño, el circuito no se repite en el pie cuando ya aparece en el logo, la fecha tiene peso 650 y la ronda pasa a «Semifinal». Las superficies del marcador en torneos son claras y teñidas, con texto y ganador oscuros. El hero reduce el título y baja el conjunto identidad/categoría para dar espacio a la fotografía.

«El torneo, por dentro» y «Lo que dejó el juego» usan una única zona de datos con Historia, Presión y Ritmo. Las décadas conservan cantidades reales; Presión cambia la métrica al pulsar y Ritmo reúne las magnitudes sin una cascada de tarjetas. Las ediciones se exploran con una tira horizontal y un filtro de décadas. «Grandes escenarios» usa tres copias equivalentes del recorrido y normaliza su posición fuera del tramo principal: París queda seguido de Australia sin un rebobinado visible. Se mantiene la pausa por foco, interacción y movimiento reducido.

«Tal día como hoy» usa la composición v20 descrita al final: cabecera con fecha y año, titular editorial, pista compartida y marcador real cuando hay partido, con fotografía de archivo como alternativa. Una sola acción abre el encuentro o la historia activa.

La propuesta aprobada de Jugadores está integrada en `/jugadores`; `/propuestas/jugadores` redirige al directorio. La fotografía fija usa `top:86px` en escritorio, una altura máxima de 610px y un límite derivado del viewport. En móvil se apila sobre el índice con filtros en línea con el título. Los datos y circuitos conservan los productos preparados, con búsqueda, orden y paginación reales. Se elimina el enlace a la versión anterior.

La revisión fotográfica de 100 ATP y 100 WTA distingue identidad, resolución original y selección editorial. Las sustituciones conservan fuente exacta y crédito en Licencias; la falta de permiso de descarga o de una fotografía identificada nunca se resuelve usando otra persona ni inventando una licencia. El inventario y las limitaciones se conservan en `data/media-review/top200-2026-11-10.json`. Las secuencias de puntos solo generan récords de presión cuando su calidad está marcada explícitamente como fiable; la revisión de esta regla queda versionada en los productos preparados.

Los heroes de torneo alinean identidad y selector en una misma fila en escritorio. En móvil, logo centrado, nombre y categoría forman un bloque propio; debajo aparecen periodo y selector compacto. La fotografía tiene un contenedor de recorte independiente para no cortar el menú de ediciones, que en móvil se limita al viewport. El palmarés muestra tres entradas y permite desplegar las demás. Las cifras de torneos y Récords usan la fuente local Libre Caslon Display, con licencia OFL conservada; los textos mantienen las fuentes DEUCE.

En las fichas de Grand Slam, el topbar completo, sus desplegables y el buscador heredan una paleta contextual: Australia azul, Roland Garros terracota, Wimbledon morado y US Open azul con amarillo. El footer enlaza directamente el color final de página con negro, sin una franja verde intermedia. Las transiciones globales conservan la navegación normal cuando no existe View Transitions o se solicita movimiento reducido. `/propuestas/transiciones` permite elegir Enfoque, Apertura central, Profundidad o Barrido y probarlas en navegación real. `/propuestas/torneos` es una alternativa independiente: escenario fotográfico seleccionable y directorio por categorías, con lectura compacta en móvil. Estas demos no son indexables.

### Ajuste local de navegación y archivo · 10 noviembre, tarde
La demo de transiciones navega a rutas completas (Jugadores, Torneos, Comparar); no usa fotografías como simulación. Las cifras recuperan la fuente de títulos existente. El hero del torneo agrupa identidad y selector en su base; móvil dispone logo y título en una fila y controles debajo. El palmarés ampliado es horizontal, en columnas de cinco filas (cuatro en móvil), con revelado irreversible de su botón. Efemérides prioriza finales, remontadas y sets decisivos documentados, hasta tres entradas alternadas cada diez segundos; con movimiento reducido se usa selección manual. No se redactan anécdotas históricas sin fuente. La nueva propuesta del directorio de torneos usa cuatro escenarios fotográficos escalonados y un directorio por categoría.

### Ajuste local · 10 noviembre, 18h
Los cuatro Grand Slams de la propuesta tienen igual tamaño y abren el resumen general, sin año impreso. La navegación normal queda a cargo de Next, con una única entrada suave de 220 ms en el template (sin captura nativa más animación de plantilla). El selector de torneo muestra circuito, resumen y un select nativo de años con enlace de apertura; no renderiza una matriz de decenas de enlaces. El palmarés ampliado usa columnas horizontales de cinco filas. Efemérides mantiene altura fija por breakpoint. Las semifinales usan plata y los marcadores conservan la denominación WTA 1000. Se incorpora fotografía institucional conjunta de Barbara y Kathy Jordan, sin atribuir a ciegas un recorte individual.

### Integración local · directorio y cobertura
La propuesta de torneos sustituye el directorio español. Grand Slams iguales; categorías restantes completas, sin ocultar filas detrás de «ver más». El palmarés completo se pagina horizontalmente en bloques de cinco posiciones, con flechas y posición explícita; ninguna fila queda fija fuera del carrusel. Ediciones conserva solo un carrusel cronológico de años y campeones, sin fotos repetidas ni filtro por década, con controles inferiores a la derecha.

Cobertura abre con dos tarjetas que resumen el alcance de ATP y WTA, con el intervalo de años, el número de partidos y la fecha del último resultado de cada circuito. Cada tarjeta incluye sus propios rangos por categoría en un desplegable compacto. Abrir un circuito no estira la tarjeta del otro. El diario muestra los tres días de publicación más recientes según la fecha de incorporación al archivo y deja plegados los días anteriores. La introducción y el diario se apilan en móvil. Una nota explica la revisión continua, indica los resultados pendientes cuando la última revisión histórica corresponde a la versión publicada y ofrece pautas de lectura en un desplegable. Los datos operativos, los expedientes de evidencia y las versiones internas se conservan para la revisión interna. La ruta utiliza las tipografías DEUCE y superficies redondeadas con `var(--bg-raised)` y `var(--bg-sunken)`.

### Selector compacto y categorías · 10 noviembre, 19h
Directorio: separación clara de 40 px tras Grand Slams; 1000/500/250 en tres columnas en escritorio, selector de categoría opcional y listas adaptadas a móvil. El menú de edición ocupa unos 225 px de ancho: circuito y cierre en una fila, un único selector nativo con Resumen y años debajo; selección navega directamente, sin botón adicional. Logos de marcador en caja cuadrada con object-fit contain, sin recortar círculos.

La cápsula ligera mantiene los circuitos visibles junto a un icono gris de filtros. Las opciones dependen de cada sección; en pantallas estrechas se abren en un panel inferior. Torneos, Partidos, Récords, Jugadores y Comparar comparten el espaciado móvil de cabecera. Torneos conserva sus categorías dentro de la cápsula y no duplica el selector junto al directorio. Licencias reúne un buscador de créditos y enlaces a cada fuente y sus derechos documentados. Sobre DEUCE concentra el manifiesto y los enlaces secundarios de corrección, privacidad y descarga; /info redirige al manifiesto.

### Cabeceras y calendario · ajuste local
Partidos, Récords, Jugadores, Torneos y Comparar comparten una cabecera con los mismos márgenes y escala. En escritorio se ven los circuitos junto al icono de filtros. En móvil se muestra un solo botón con el circuito activo y el panel incluye ATP/WTA más las opciones de esa sección. Los Grand Slams llevan su propia paleta también dentro del panel inferior. En sus fichas móviles la foto deja paso a una zona de identidad y el selector queda en una fila independiente.

### Ficha de Nadal, efemérides y alcance de ediciones

- **Propuesta de ficha v20 (11 noviembre).** `/propuestas/nadal` y `/propuestas/jugadores/[slug]`, con `?tour=wta`, conservan su alcance local sin indexación, lienzo DEUCE, Sora 500 y Host Grotesk. Temporadas presenta ranking, etiqueta y año junto a la métrica, gráfica interactiva y tabla ordenable. El palmarés de escritorio mantiene ficha fotográfica y lista de 490px. En móvil, una foto de sede de 205px ocupa todo el ancho: degradado superior, logo, nombre como selector nativo y categoría blancos, más acceso circular de 44px al torneo sobre la imagen. El selector muestra el total de torneos disponibles y la franja inferior alinea etiquetas y cifras de títulos, participaciones y V–D. La racha de escritorio usa puntos compactos con etiquetas de partido accesibles y selección por teclado. El historial mantiene filas estables, seis años visibles y desplazamiento de un año por flecha o mediante un range nativo; en móvil, categoría centrada y año de 17px con flechas al pie. Rivales usa hover gris `#ebeef0` y relleno lateral de 14px en escritorio/11px en móvil; los títulos de mejor temporada y racha usan 22–28px en escritorio. El parallax fotográfico se detiene con movimiento reducido. Detalle vigente en `.impeccable/surfaces/app-players-playerprofileproposal-tsx.md`.
- **Tal día como hoy · v20.** `OnThisDayFeature` usa relleno interior de 30px 34px 24px en escritorio y 22px 18px 16px en móvil. La cabecera combina título, fecha y año; el titular editorial acompaña la pista compartida `TennisCourt`, horizontal en escritorio y vertical en móvil, con dos retratos existentes. El contexto del torneo aparece debajo de la pista y precede a dos filas de tanteo real por set, con nombres, banderas y ganador destacado. La pelota es decorativa, no representa seguimiento del partido y se pausa fuera del viewport, con puntero o foco; con movimiento reducido desaparece. Las posiciones de avatares son editoriales, sin representar seguimiento del partido. Cuando no hay partido conserva fotografía histórica como alternativa. Una sola acción abre la historia o encuentro activo. Con varias historias rota cada diez segundos y pausa con puntero, foco, pestaña oculta o control visible al recibir foco. Con movimiento reducido muestra estáticamente las historias suministradas y mantiene una acción que identifica su destino; una sola historia conserva la composición normal.
- **Jugadores · v19.** `/jugadores` usa productos preparados independientes ATP/WTA y ordena por defecto por títulos de Grand Slam, después victorias y partidos; las filas conservan los recuentos de Grand Slam y muestra de partidos, sin descripción adicional del orden. Conserva búsqueda, orden por victorias o nombre y páginas de 25. Bandera y nombre ocupan la base de la foto fija de escritorio, con métricas blancas debajo y «Ver carrera» a la derecha. Foco o puntero seleccionan el retrato y las filas usan hover gris; móvil apila foto e índice. El movimiento se detiene con movimiento reducido.
- **Comparación · propuesta local v20.** `/propuestas/comparar` conserva datos preparados publicados, ATP/WTA y filtros; es independiente y no indexable, con `/comparar` preservado. La selección integra «Primer jugador» y «Segundo jugador», retrato y autocompletado. La opción `clearOnFocus` limpia el campo al enfocarlo; un nombre nuevo limpia la foto anterior y muestra una silueta neutra hasta el envío GET que resuelve su imagen. El balance compacto queda en flujo debajo de los retratos, sin solapamiento ni contexto repetido, con ganador verde y perdedor gris. Las métricas añaden victorias sin ceder sets, remontadas tras perder el primero y victorias en set decisivo, derivadas de los encuentros reales de cada selección. La pista proporcional compartida `TennisCourt` (23,77 × 10,97m) cambia entre dura, tierra y hierba. La gráfica anual adapta su referencia entre 360/700 unidades, alterna Victorias —inicial— y %, marca el año seleccionado y muestra valores y partidos reales; parte del último año compartido. Conserva puntero, teclado y periodo vacío, sin nuevas consultas API. Frente a frente muestra seis marcadores; «Ver todos» revela el resto y desaparece. Paneles claros con tinta explícita también bajo tema oscuro, Sora 500 y Host Grotesk; movimiento reducido detiene fotos y transiciones. Detalle en `.impeccable/surfaces/app-propuestas-comparar-page-tsx.md`.
- **Acciones y búsqueda · v19.** Las acciones direccionales Lucide apuntan a la derecha en reposo y en diagonal al pasar el puntero. Los glifos anterior/siguiente quedan visualmente más próximos conservando objetivos de 44px. La búsqueda por nombre del topbar abre `/jugadores?tour=…&filtros=nombre`, despliega y enfoca el campo; su evento de reapertura permite repetir la acción. Se retiran los enlaces de todos los resultados y su guía ATP/WTA.
- **Directorio de torneos · v20.** Las filas conservan azul pálido, terracota o verde según la superficie de la categoría más reciente. «Calendario 2026» y «Otras etapas del archivo» se separan mediante el mapa editorial explícito de `lib/tournament-calendar-status.ts`, con fuentes ATP/WTA documentadas; la ausencia de resultados recientes nunca acredita que un torneo ya no exista. La categoría y el filtro ocupan la base del hero. El recorte de desbordamiento contiene la fotografía decorativa y conserva los carriles desplazables.
- **Resultados por fecha.** `CoverageCalendar` reúne en Cobertura el día, el mes y el circuito (Ambos, ATP o WTA). Al consultar, muestra hasta cuatro marcadores compartidos en dos columnas, con una sola en móvil. Las rutas de Máquina del tiempo redirigen al calendario de Cobertura de su idioma y conservan la fecha y el circuito seleccionados.
- **Ediciones de torneo · v20.** Se retira la nota de periodo y total de ediciones de todas las vistas. La identidad del hero baja para dar espacio a la fotografía; en páginas de año, la barra de herramientas de escritorio se alinea con la fila de Final. El selector compacto permanece en la cabecera. El hover Grand Slam conserva contraste legible y el footer parte del color propio de cada Slam hacia negro.

### Apariencia, movimiento y cierre local · v20

El pie coloca el selector nativo Clásico/Temporada junto al idioma en un grupo que no se parte, con composición válida a 320px. Clásico es el valor inicial; el control permanece desactivado hasta restaurar la preferencia y completar la hidratación. `localStorage` guarda `deuce-appearance` y un script previo al primer pintado aplica modo y estación UTC. Los cambios de día, visibilidad y almacenamiento mantienen la elección; no modifican resultados ni muestras. Los tres mundos estacionales usan los roles `--brand-*` y preservan la identidad de Grand Slam, los colores semánticos de ronda y ganador, las superficies y las banderas. El icono de filtros mantiene tinta neutra.

La navegación conserva una sola entrada de 220ms en el template. `PhotoMotion` añade movimiento editorial solo a fotografías marcadas con `data-photo-motion`, en escritorio desde 822px: desplazamiento máximo de 14px y escala 1,055, limitado a escenas próximas al viewport. El móvil y movimiento reducido lo desactivan. Este comportamiento optativo convive con los tratamientos fotográficos específicos ya documentados; no mueve bloques de contenido ni datos.

El cierre local v20 tiene revisión visual PASS, detector sin hallazgos y comprobaciones de tipos, lint y dos pruebas del calendario aprobadas. `/tmp/deuce-v20-confirm.json` conserva las rutas y tamaños revisados; su bloque `seasonalFollowup` sustituye las primeras lecturas de paleta realizadas antes de terminar la hidratación. Las capturas finales están en `/tmp/deuce-v20-final-*`, `/tmp/deuce-v20-season-*` y `/tmp/deuce-v20-footer-320.png`. Son evidencias de previsualización local; no hubo commit, push ni despliegue, y no se cambiaron datos deportivos.

### Refinamiento local · v21 (11 noviembre 2026)

Esta nota sustituye las descripciones v20 afectadas. Temporada amplía el cambio a los verdes de interfaz de 40 hojas CSS mediante OKLCH relativo: conserva luminosidad, croma y alfa, y usa `--appearance-hue` de `styles/appearance.css` (dura 235, tierra 48, hierba 140); Clásico recupera el matiz original. Marcadores y ganador, cabecera, búsqueda, desplegable Grand Slam y pie responden a la estación. El calendario UTC de `lib/appearance.ts` se mantiene. Fotografías, banderas y logos oficiales conservan sus colores; no hay filtro sobre la página completa. El selector nativo del pie tiene forma de cápsula y el crédito queda bajo «El Archivo».

`HeadToHeadEvolution` comparte la evolución del cara a cara entre `/comparar` y `/propuestas/comparar`: victorias acumuladas de encuentros reales calculadas en servidor, selección por puntero, teclado y año, y contexto del torneo. No genera registros ilustrativos. En `/propuestas/nadal`, el selector móvil de palmarés queda encima de una tarjeta enteramente fotográfica, con degradado inferior oscuro, texto y cifras blancos y trofeo dorado. El range del historial de escritorio ocupa solo las columnas de años, sin flechas duplicadas. Los torneos no vigentes se ordenan al final y llevan «Etapa histórica» en escritorio y móvil, sin inferir fechas de cierre.

La efeméride de inicio reúne titular compacto, pista horizontal con retratos, una frase editorial con el tanteo y una sola acción; se retira la pelota animada. La fotografía de récords de la portada refuerza su sombra inferior.

Cierre local: revisión final PASS, sin asuntos materiales abiertos. `/tmp/deuce-v21-qa.json` y `/tmp/deuce-v21-confirm.json` reúnen 26 comprobaciones de ruta y viewport sin desbordamiento ni errores; `/tmp/deuce-v21-color-audit.json` registra diez páginas sin verdes de interfaz fijos en temporada dura. Las dos pruebas de calendario y valores persistidos pasan en `/tmp/deuce-v21-tests.log`; la compilación final termina correctamente en `/tmp/deuce-v21-final-build.log`. El alcance sigue siendo exclusivamente local, sin commit ni despliegue.

### Refinamiento local · v22 (11 noviembre 2026)

Esta nota sustituye las descripciones v20/v21 afectadas. La pelota compartida de cabecera y pie conserva su lima fija, independiente de Temporada. El cambio ATP/WTA del torneo exige un evento conjunto identificado y la misma familia de categoría; compartir ciudad no basta. En móvil, el hero de torneo reduce altura, amplía el título y mantiene el filtro de 44px. En la propuesta de ficha, el palmarés elimina el contador del selector, alinea títulos, participaciones y V–D en una franja compacta y extiende una atmósfera radial transparente al ancho de la ventana. «Más participaciones» coloca el texto al pie sobre degradado y la mejor posición se denomina «Mejor ranking». El autocompletado de comparación muestra banderas cuando el país está documentado. La propuesta integra las victorias acumuladas en cada retrato; `HeadToHeadEvolution` comparte una cronología de encuentros reales que avanza cada tres segundos, pausa con puntero o foco y conserva selección manual con movimiento reducido. En móvil, la efeméride mantiene la pista a la derecha y revela texto y acción a la izquierda durante el desplazamiento; el foco de teclado hace visible la acción y movimiento reducido conserva la composición estática. Wimbledon usa una fotografía del interior de Centre Court durante la final de 2023, con fuente y crédito de Daniel Cooper, CC BY-SA 2.0 y transformación documentada en el catálogo de medios y Licencias. El alcance sigue siendo local, sin modificar el dataset canónico ni desplegar.

**Refinamiento local · v23 (11 noviembre 2026).** Sustituye las composiciones afectadas: el palmarés móvil usa etiquetas de participaciones y V–D de 10px y métricas compactas alineadas a la derecha junto al trofeo. En la propuesta de comparación, un balance H2H compartido ocupa las mitades interiores de los retratos, conserva los nombres visibles y añade etiquetas ocultas accesibles que vinculan cada jugador con sus victorias. La efeméride móvil ancla la pista SVG vertical a la derecha mientras el relato avanza a la izquierda mediante desplazamiento nativo, con alternativa estática al reducir movimiento. El filtro de edición de torneo sube a la primera línea del título en escritorio; ATP Finals y WTA Finals forman una sección propia del directorio, fuera de 1000/500/250. Revisión final de diseño PASS; `/tmp/deuce-v23-confirm.json` reúne 18 comprobaciones a 320, 390 y 1366px, todas con respuesta 200, sin desbordamiento horizontal ni errores de página. La certificación de datos de backend queda fuera de este PASS. Alcance exclusivamente local, sin nueva interfaz estadística, cambios de identidad, commit, push ni despliegue.

### Ajuste local v24 · activación y adaptación solicitada

Las fichas reales `/jugadores/[slug]` usan ahora la propuesta aprobada; solo las rutas de propuesta muestran «Ver ficha actual». Se preservan SEO y JSON-LD de la ficha real. `/comparar` y su propuesta comparten `CompareExperience`, con destino de formulario propio y bandera junto al nombre en las opciones. La cronología sitúa reproducción debajo de la tarjeta, a la derecha, y centra el balance en un fondo pálido correspondiente a la superficie. El directorio de torneos añade Finals como cuarta columna desde 1050px.

Sustituye la descripción anterior de efemérides: escritorio es estático y directo, con titular y pista horizontal; móvil reserva una columna para una pista vertical fijada mientras el scroll revela año, titular y acción por etapas. No hay pelota animada. Los acontecimientos sin partido usan fotografía y su fuente. Movimiento reducido y JavaScript desactivado conservan el contenido visible.

El palmarés móvil deja la identidad textual en el selector exterior, conserva solo el logo arriba a la izquierda, eleva el trofeo y sitúa participaciones/V–D pequeños abajo a la izquierda con acceso translúcido abajo a la derecha. Evidencia: `/tmp/deuce-v24-qa.json` y `/tmp/deuce-v24-confirm.json`. Todo sigue en local.

### Ajuste local v25

Inicio mantiene lienzos editoriales neutros fijos, sin tonos rosados al cambiar el modo Temporada. Efemérides móvil usa una escena fijada completa: pista vertical derecha y narrativa izquierda que cambia desde fecha/título de sección hacia titular revelado por palabras y acción. El escritorio sigue estático. Alturas inferiores a 600px y movimiento reducido conservan una presentación sin escena fijada. Foco revela texto y acción. El balance de Comparar cambia de caja blanca grande a panel oscuro compacto sobre las mitades interiores de ambas fotos, con cifras claras y acento para el líder. Finals añade «Actualmente» en su columna. Todo local.

### Corrección global de color v26

El modo Clásico conserva el matiz original mediante fallbacks numéricos explícitos en OKLCH relativo. Se retira el canal simbólico `h` de los fallbacks de variable; el modo Temporada sigue sobreescribiendo el matiz. No hay una sustitución global de todos los colores por verde. Todos, Mayor racha y listados de torneos mantienen sus colores originales. Comparar dispone el balance como franja fotográfica compartida al pie de los retratos, con nombres arriba y ganador destacado. Evidencia local: `/tmp/deuce-v26-qa.json` y `/tmp/deuce-v26-confirm.json`.

**Refinamiento local · v27 (11 noviembre 2026).** Sustituye la composición anterior de Comparar: dos fotografías forman una escena continua con una pequeña separación central; las victorias ocupan las esquinas superiores exteriores, bandera y nombre quedan abajo y el contexto aparece bajo la escena. Un velo oscuro superior localizado asegura el contraste de las cifras y el degradado inferior protege los nombres; se retira la franja opaca flotante. Conserva tipografías, paleta y tokens estacionales. La revisión final aprueba rostros despejados y cifras legibles a 390 y 1366px; capturas en `/tmp/deuce-v27-compare-final-390.png` y `/tmp/deuce-v27-compare-final-1366.png`. ATP Finals muestra el interior oficial de Turín y WTA Finals la sede oficial de Indian Wells para 2026. Cinco asociaciones revisadas de edición, jugador y año prevalecen sobre la foto genérica; una final sin fotografía elimina el espacio vacío. La biblioteca contiene 1085 WebP con autor, licencia, fuente y hashes de origen/local; la asociación por categoría no certifica la edición exacta. Tipos, lint y compilación de producción pasan. Se documenta el resultado visual construido, sin afirmar cobertura completa de datos. Todo permanece local, sin commit, push ni despliegue.


**Refinamiento local · v28 (11 noviembre 2026).** Sustituye el H2H de v27: «Cara a cara» coloca dos fotografías sobre sendas zonas blancas en flujo, con identidad y victorias propias, sin tarjeta superpuesta. Bandera y nombre acompañan lateralmente la cifra en escritorio y quedan encima en móvil; el líder usa el acento estacional de acción y el otro, tinta atenuada. Las fotos miden 340px en escritorio, 220px en móvil y 180px a 320px de ancho. Host Grotesk y Sora se conservan. Etiquetas y metadatos de fichas, torneos, inicio, comparación, Cobertura, récords, directorios, cronología H2H y filtros pasan a .875rem y pesos 500–600 mediante sus módulos originales. El marcador compartido usa metadatos de ronda y pie de 14px en todos los anchos; conserva desempates superíndices de 9px. En comparación, nombres anuales: 17px/15px móvil; contexto: 15px/14px. Alcance exclusivamente local, sin cambios de datos, API, commit, push ni despliegue.

### Refinamiento local · v29 (11 noviembre 2026)

Sustituye únicamente las composiciones afectadas de las notas anteriores; conserva verde/lima, Sora y Host Grotesk.

- **Efeméride de inicio:** composición abierta sobre el lienzo, sin caja ni radio exterior; fecha completa prominente y tanteo secundario bajo la pista. Mantiene la narrativa móvil y su alternativa con movimiento reducido.
- **Cara a cara:** identidades en los extremos exteriores y victorias hacia el centro, con la segunda mitad reflejada; texto blanco y líder en acento lima sobre el degradado inferior de las fotografías. Se retiran las zonas blancas de v28; en móvil, nombre y cifra se apilan dentro de cada foto conservando la orientación exterior/interior.
- **Detalle de récord:** cabecera textual sin fotografía, cifra protagonista ni hero decorativo; título, definición y acceso al cálculo preceden una clasificación oscura con filas verdes redondeadas, cifras destacadas y porcentajes inseparables. Circuito, ordenación, paginación y evidencia conservan sus destinos.

Alcance exclusivamente local; esta nota describe el código construido, sin certificar datos ni registrar nuevas pruebas o despliegues.

### Refinamiento local · v30 (12 noviembre 2026)

Sustituye solo las descripciones afectadas: la fecha completa de la efeméride acompaña al título en la esquina superior derecha, en tinta secundaria; el titular incluye ronda y torneo y el tanteo aparece discreto dentro de la pista. En móvil la escena y el recorrido fijados son más cortos, el texto se revela antes y mantiene el fallback estático con movimiento reducido. Las subpáginas de Records conservan el lienzo oscuro sin fotografías, reúnen clasificación y ordenación y nombran la unidad de la cifra. El directorio de Madrid usa tierra desde 2009 en ambos circuitos; las superficies anteriores permanecen históricas. No cambia la identidad tipográfica ni se rediseñan otras superficies. Alcance exclusivamente local.
