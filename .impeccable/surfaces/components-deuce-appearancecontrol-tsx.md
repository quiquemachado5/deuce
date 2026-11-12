---
version: 1
slug: "components-deuce-appearancecontrol-tsx"
primary_target: "components/deuce/AppearanceControl.tsx"
related_targets: ["components/deuce/DeuceFooter.tsx","components/deuce/deuce-footer.module.css","lib/appearance.ts","styles/appearance.css","app/layout.tsx"]
---

El selector v20 es un control nativo de presentación situado junto al idioma en el pie, dentro de un grupo que no se parte, también a 320px. Ofrece Clásico/Temporada en español y Classic/Season en inglés, con etiqueta accesible «Modo de color» o «Colour mode» y chevron decorativo. Clásico es el valor inicial y el control queda desactivado hasta completar la restauración de preferencia e hidratación.

La preferencia `deuce-appearance` persiste en `localStorage`; valores desconocidos vuelven a Clásico y un fallo de almacenamiento conserva la elección de la visita. Un script previo al primer pintado aplica los atributos `data-appearance` y `data-season` al documento. El control vuelve a consultar la preferencia con cambios de almacenamiento, al recuperar visibilidad y después de medianoche UTC.

Temporada aplica tierra del 1 de abril al 7 de junio inclusive, hierba del 8 de junio al 14 de julio inclusive y dura el resto del año, siempre en UTC. `styles/appearance.css` es la fuente de los nueve roles de marca por estación: tinta, profundo, panel, acción, acento, suave, auxiliar, inicio y pie. Solo cambia la presentación de marca; ganador, rondas, superficies de los partidos, banderas e identidades Grand Slam conservan sus significados. No filtra el archivo ni cambia datos deportivos. El footer Grand Slam mantiene su origen contextual y continuidad hacia negro.

La confirmación local está en el bloque `seasonalFollowup` de `/tmp/deuce-v20-confirm.json`: paletas de dura, tierra y hierba después de terminar la hidratación, persistencia tras recarga y capturas `/tmp/deuce-v20-season-{hard,clay,grass}.png`. La composición estrecha se conserva en `/tmp/deuce-v20-footer-320.png`. El cierre visual pasó y las dos pruebas del calendario, tipos y lint están aprobados. Esta documentación no acredita un despliegue.

### Actualización local v21

El selector nativo adopta la cápsula del pie; el crédito queda bajo «El Archivo». Temporada también recolorea los verdes de interfaz mediante OKLCH relativo, conservando luminosidad, croma y alfa: `--appearance-hue` vale 235 en dura, 48 en tierra y 140 en hierba; su ausencia conserva el matiz de Clásico. El alcance incluye marcador y ganador, cabecera, búsqueda, desplegable Grand Slam y pie, sin alterar el significado de resultados ni el calendario UTC. Fotografías, banderas y logos oficiales conservan sus colores; no se aplica un filtro global. Esta ampliación sustituye el alcance exclusivamente de marca descrito en v20. Evidencia local: `/tmp/deuce-v21-confirm.json`, `/tmp/deuce-v21-color-audit.json` y `/tmp/deuce-v21-tests.log`.
