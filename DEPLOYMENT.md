# DEUCE · entrega de interfaz del 21 de octubre de 2026

La entrega visual se integró mediante la [PR #1](https://github.com/quiquemachado5/deuce/pull/1) y se publicó en [DEUCE](https://deuce-archive.vercel.app/). La producción se verificó con seis rutas públicas y el monitor de salud del archivo.

## Continuación: finales y cobertura

- El registro de resultados contrastados pasa de 3 a 11 finales, con enlaces a ATP, fecha de revisión y acceso a la ficha correspondiente en `/cobertura/revision`.
- La validación detecta también un tanteo de tie-break contradictorio. Permite que falte ese tanteo en el proveedor y completa únicamente las finales contrastadas con su fuente.
- `data:verify` exige que las 11 finales estén presentes y coincidan con el registro. Las reglas de la generación cambian a `2026-10-reviewed-finals-v3` para evitar mezclar derivaciones anteriores.
- `/cobertura` muestra los partidos que conservan cada medida, cuántos tienen el dato de los dos jugadores, temporadas concretas y procedencia histórica o reciente. Los ceros documentados se conservan; valores vacíos, negativos o no numéricos no cuentan.
- El estado de la cinta se desglosa entre fiable, incompleta y ausente. Las barras usan un máximo común dentro de cada grupo, con el valor escrito.
- Esta auditoría usa lo ya guardado. No consume llamadas de pago ni afirma una cobertura que el proveedor no haya entregado.

## Cambios de esta entrega

- **Portada:** la última final registrada usa una tabla de sets compacta con los dos jugadores, ganador explícito y tie-breaks completos. El resultado cabe en móvil y el color contextual corresponde a la superficie. Se mantiene el hallazgo verificable y el acceso a sus partidos.
- **Partidos:** la evolución muestra ventaja acumulada en juegos cerrados, ejes numéricos y tabla accesible. Se separan los tramos cuya secuencia no está verificada; los breaks y bolas de partido son controles con texto accesible. En la comparación de dos partidos, ambos ejes comparten escala y el encuentro más corto termina antes. La presión prioriza breaks y evita porcentajes de muestras diminutas. Se eliminó la acción duplicada de comparar en la ficha.
- **Estadísticas:** las cinco primeras posiciones de una clasificación se comparan con barras desde cero y máximo común, con valores escritos, alcance y enlaces a la evidencia. La lista completa conserva su paginación.
- **Jugadores:** trayectoria anual con victorias y derrotas y huecos visibles, lectura móvil de los últimos años, superficies con porcentajes y denominadores, y huella de rendimiento con muestra junto a cada medida.
- **Torneos:** acceso directo a Grand Slams, Masters y categorías ATP; las ediciones muestran la final, los sets decisivos y el camino **registrado** del campeón por ronda. Los partidos destacados no ocultan nombres en columnas estrechas. La foto de una edición solo se usa cuando su año coincide con el de la imagen documentada.
- **Fotografía:** retratos locales más ligeros y variantes pequeñas, fotos de acción verificadas para Djokovic y Nadal, recortes coherentes en el cara a cara y fuentes/licencias vinculadas a cada archivo. Las imágenes no simulan un partido real ni sustituyen una sede sin avisar.
- **Navegación y búsqueda:** barra activa más clara, retorno de foco y `aria-expanded` en diálogos, campo móvil de 16 px y filtros compactos en dos columnas. La búsqueda vacía reutiliza el orden reciente sin reconstruir un índice de texto de los 176.265 partidos.
- **Mantenimiento:** se retiraron reglas obsoletas de la antigua portada y de la acción de comparar duplicada.

## Relación con las 100 propuestas

Esta entrega avanza especialmente los puntos **5, 19, 25, 33, 34, 37, 38, 49, 52, 57–59, 61, 63–67, 73, 76–80, 94, 97 y 99**. Algunas capacidades del listado ya existían antes de esta PR, entre ellas la distinción ATP 500/250, las URLs de torneo, la paginación de 25, la exclusión de marcadores en revisión, los filtros compartibles y el archivado diario. No se consideran cambios nuevos de esta entrega.

Permanecen fuera de esta PR la ampliación de cobertura de campos del proveedor, la revisión manual de finales adicionales y la incorporación de nuevas fuentes históricas. La API no publica longitud de peloteo, probabilidad ni ranking histórico en todos los partidos; esos campos no se infieren. Roland Garros 2024 conserva seis partidos de Alcaraz en el archivo, por lo que la edición indica «camino registrado» y no un cuadro completo.

## Verificación

- `npm run verify`: 31 pruebas, lint, TypeScript y archivo válido (176.265 partidos, 90 listas, 11 finales contrastadas).
- `npm run build`: compilación de producción completa.
- `npm run test:browser`: 17 pruebas de flujos, accesibilidad básica, datos, foco de búsqueda/menú, lectura de la curva de juegos y cobertura de campos.
- Revisión visual de portada, partido, jugador, cara a cara, torneo, edición y cifra a 390 y 1440 px; sin desplazamiento horizontal de documento ni errores de consola. También se comprobaron 320, 768 y 1024 px en las vistas modificadas.

La continuación actualiza el manifiesto de la generación porque cambian las reglas de contraste. Los 176.265 partidos y las 90 listas conservan los mismos datos; los demás archivos regenerados, sin diferencias lógicas, se excluyeron del commit.
