---
name: DEUCE
description: Archivo deportivo visual de resultados y estadísticas de tenis masculino.
colors:
  bg: "#f5f6f7"
  bg-raised: "#fff"
  bg-sunken: "#ebeef0"
  ink: "#151b20"
  ink-soft: "#46525c"
  muted: "#626b74"
  line: "#e2e6e9"
  line-strong: "#c6ced4"
  court: "#146c52"
  court-deep: "#e4f3eb"
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
  dark-court: "#8bdfb2"
  dark-court-deep: "#203c30"
  dark-grass: "#88d9a8"
  dark-clay: "#f39a72"
  dark-hard: "#86bbf2"
  dark-carpet: "#c4a3ef"
  dark-danger: "#ffb3ad"
typography:
  display:
    fontFamily: "Bricolage, Geist, sans-serif"
    fontSize: "clamp(38px, 5vw, 64px)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage, Geist, sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Bricolage, Geist, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  field: "16px"
  panel: "24px"
  hero: "32px"
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
    height: "44px"
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

La jerarquía de Apple Sports y los controles de Revolut se expresan en fotografía deportiva real, cifras legibles y titulares con carácter. Bricolage Grotesque aporta energía; Geist sostiene nombres, tablas y lectura. El archivo debe sentirse cercano y vivo sin presentar los resultados observados como datos en directo.

Los paneles claros o carbón descansan sobre un fondo neutro. El color de la pista conecta torneo, marcador y análisis; los rostros ayudan a reconocer a los jugadores. La interfaz conserva densidad suficiente para explorar estadísticas, con espacio y cambios de escala que explican qué mirar primero.

**Key Characteristics:**

- Fotografía licenciada de sedes y jugadores, con procedencia accesible.
- Titulares expresivos y cifras tabulares coherentes.
- Verde hierba, terracota y azul de pista dura con significado estable.
- Paneles suaves, controles en cápsula y avatares circulares.
- Temas claro y oscuro persistentes, teclado y movimiento reducido.

## Colors

Los valores de la cabecera son normativos; `app/ui/foundation.css` aplica el cambio de tema a las mismas variables semánticas.

### Primary

- **Verde de pista** (`court`): acciones estadísticas, descubrimientos y valores destacados generales. **Bruma de pista** (`court-deep`) acompaña bloques explicativos y selección de texto.

### Secondary

- **Verde hierba** (`grass`), **terracota tierra** (`clay`), **azul dura** (`hard`) y **violeta moqueta** (`carpet`): identifican superficies en puntos, cifras, barras y contextos de torneo.
- El acento de evento toma el color de su superficie; su fondo mezcla ese color al 10% con el panel elevado. La comparación usa azul para el primer jugador y terracota para el segundo. Victoria usa hierba; derrota usa `loss` en claro y terracota en oscuro. El foco usa azul dura y los errores usan `danger`.

### Neutral

- **Fondo de archivo** (`bg`): lienzo general; **panel** (`bg-raised`): contenido; **hueco** (`bg-sunken`): controles, carriles y grupos segmentados.
- **Tinta** (`ink`), **tinta secundaria** (`ink-soft`) y **texto auxiliar** (`muted`): jerarquía de lectura. **Línea** (`line`) y **línea firme** (`line-strong`): filas, límites y estados de campo.
- Los tokens con prefijo `dark-` describen las sustituciones activas con `data-theme="dark"`. Las fotografías conservan su color original.

**The Court Meaning Rule.** El color vincula una cifra con su pista o jugador; nombres, etiquetas y valores siguen explicando el dato por sí mismos.

## Typography

**Display Font:** Bricolage Grotesque, cargada localmente con el nombre CSS `Bricolage`, con Geist como respaldo.

**Body Font:** Geist local, con respaldo del sistema. Los alias editorial y mono también resuelven a estas familias: no hay una tercera voz tipográfica ni una fuente monoespaciada independiente.

Los titulares usan peso 650, interletraje cerrado y altura compacta. El cuerpo usa cifras tabulares y alineadas para comparar resultados. Los párrafos se limitan a 70 caracteres de ancho aproximado.

### Hierarchy

- **Display:** escala global de la cabecera; portada y perfiles amplían el máximo a 68px. El nombre del torneo principal alcanza 88px y los descubrimientos usan cifras de 52–88px.
- **Headline / Title:** títulos de sección y panel en la escala declarada; las secciones principales conservan una voz común.
- **Body:** lectura general; filas de tabla a 15px y controles o enlaces a 13–14px.
- **Label:** contexto, muestras y leyendas a 11–13px. Mantener el español y la caja de oración observada.

## Layout

La zona principal mide como máximo 1240px, con 32px de margen a cada lado; el contenedor analítico interno llega a 1180px. La cabecera permite 1360px y mide 64px de alto. El ritmo combina 8, 16, 24 y 32px para contenido, y 40–64px entre secciones. Los paneles usan habitualmente 24–40px de relleno.

En **1100px** comienza la composición amplia. Por debajo, los márgenes principales pasan a 24px, la búsqueda de cabecera se reduce a icono y varias composiciones laterales se apilan. En **760px** comienza la composición intermedia; por debajo, el contenido deja 16px a cada lado, la cabecera mide 60px y el menú ocupa un diálogo de pantalla completa. Las consultas actuales usan `max-width: 1099px` y `max-width: 759px`.

En móvil, el marcador conserva todo el ancho disponible y permite desplazamiento horizontal cuando hace falta. Los resultados de las filas se ajustan entre sets completos, manteniendo cada set y su desempate juntos. Las acciones del torneo tienen su propia línea; las cifras porcentuales no se parten. Los formularios de comparación usan una rejilla de cuatro columnas, dos bajo 1100px; en móvil los dos primeros campos y la acción ocupan ambas columnas. Tablas y pestañas desbordan dentro de su contenedor, sin ensanchar la página.

## Elevation & Depth

No hay sombras de caja en el sistema activo. La profundidad procede de fondos elevados o hundidos, líneas finas y fotografía recortada. La cabecera fija mezcla el fondo al 92% y usa desenfoque de 20px. El diálogo atenúa el resto de la página con un velo oscuro y desenfoque de 6px. Los degradados de imagen aseguran lectura sobre fotografías.

Las transiciones de color, fondo, borde y opacidad duran 240ms. Las entradas recorren 12px en 280–480ms con `cubic-bezier(0.22, 1, 0.36, 1)` y mantienen el texto opaco desde el primer fotograma; el trazo de algunos gráficos dura 1s. Con movimiento reducido se desactivan animaciones, transiciones y desplazamiento suave.

## Shapes

Paneles redondeados (24px), campos suaves (16px) y cápsulas completas forman la gramática principal. El torneo destacado admite 32px en escritorio y 24px en móvil. Los avatares son circulares; el retrato protagonista puede usar una coronación redondeada y esquinas inferiores de panel. Las barras terminan en cápsula, y los indicadores de superficie son puntos circulares. Las líneas de 1px separan contenido denso sin convertir cada fila en una tarjeta independiente.

## Components

### Buttons

Acciones compactas y claras: tinta sobre panel invertido, radio cápsula, peso 600 y objetivo de al menos 44px de alto. El relleno habitual es 8–12px vertical y 16–24px horizontal. Las acciones de comparación reducen opacidad al pasar el puntero. Las acciones de texto llevan subrayado; los botones de icono son circulares. El foco visible usa un contorno de 2px con separación de 4px. Los botones desactivados usan opacidad 0,5.

### Chips

Ediciones y filtros de navegación usan cápsulas. La edición activa invierte tinta y panel. Las pestañas agrupan sus opciones sobre un carril hundido; la seleccionada recibe un panel elevado. Conservan texto sin partir y desplazamiento horizontal en espacios estrechos.

### Cards / Containers

Paneles blancos o carbón, bordes suaves y relleno amplio. Los listados agrupan sus filas con esquinas externas compartidas. El estado hover de un partido recibe el tinte de su superficie. Los perfiles integran fotografía y datos en un único encabezado; si no hay foto, la columna de datos ocupa el ancho.

### Inputs / Fields

Etiquetas visibles, altura de 44px, borde de línea, fondo general y radio de campo. El borde se refuerza al pasar el puntero; el foco conserva el contorno global. Filtros y comparadores se agrupan sobre paneles elevados, con separación suficiente para sus etiquetas y acciones.

### Navigation

Marca Bricolage de peso 800. Navegación Geist de 13px, texto auxiliar en reposo y tinta en la ruta activa, señalada además por una línea inferior de 3px. En móvil, menú de pantalla completa con enlaces Bricolage grandes. Búsqueda y menú se presentan como diálogos. El selector de tema ofrece Sistema, Claro y Oscuro; la preferencia persiste y se resuelve antes de pintar la página.

### Photography & Avatars

Los retratos locales y licenciados se recortan hacia el rostro; los avatares usan normalmente 24–40px en filas y tamaños mayores en marcadores. La inicial del nombre sustituye una foto ausente. El nombre adyacente aporta la etiqueta accesible, por lo que el avatar decorativo no la repite. Las fotos de sede describen la sede; no representan un partido concreto sin evidencia.

### Scoreboards & Discovery

Los marcadores son tablas: nombres a la izquierda, sets alineados y cifras tabulares. Sets ganados y totales se distinguen con peso, color y etiquetas. Los descubrimientos presentan cifra, jugador, explicación y muestra juntos; el control «Otro dato» cambia una observación real y anuncia su contenido de forma cortés a lectores de pantalla. Los gráficos conservan leyendas, alcance y valores legibles.

## Do's and Don'ts

### Do:

- **Do** conservar Bricolage para titulares y Geist para lectura y tablas.
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

<!-- Fuentes: PRODUCT.md; app/deuce.css; app/ui/*.css; components/PlayerAvatar.tsx; components/HomeHighlights.tsx; components/nocturno/Frame.tsx; app/layout.tsx. -->
