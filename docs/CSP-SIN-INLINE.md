# CSP sin unsafe-inline: plan de migración

Estado: política vigente conservada; este documento no equivale a haber retirado `unsafe-inline`.
La eliminación sin preparar Next/React bloquearía la hidratación, los gráficos y los temas.

## Inventario comprobado

- `next.config.ts`: `script-src 'self' 'unsafe-inline'`, `script-src-attr 'none'`, `style-src 'self' 'unsafe-inline'`.
- `app/layout.tsx`: script previo al primer pintado que restaura la apariencia. Puede convertirse en un archivo propio o autorizarse por hash exacto del build.
- `components/StructuredData.tsx`: JSON-LD por entidad; necesita hash del contenido o nonce de la respuesta.
- Next App Router: scripts de Flight/hidratación insertados por el framework. El SRI sha256 habilitado para recursos externos no autoriza estos scripts inline.
- React: atributos style para posiciones de fotos, barras, gráficas y animación. Los nonces de script no autorizan los atributos style.
- Vídeo externo: únicamente `youtube-nocookie.com` en `frame-src`. No ampliar a comodines.

## Orden de implementación

1. Obtener CSP de producción y recopilar en staging el inventario de scripts/estilos emitidos por home, búsqueda, partido, jugador, torneo, edición, comparación, récord y cobertura.
2. Probar hash de scripts estáticos y externalizar el arranque de apariencia. Para Flight dinámico, usar un nonce criptográfico nuevo por respuesta, generado en el proxy y comunicado en la cabecera CSP al render de Next.
3. Evitar servir HTML con nonce reutilizado desde ISR/CDN. Las rutas que dependan de nonces deberán ser dinámicas; antes de aplicar, comparar su TTFB/memoria frente a la alternativa de hashes del HTML prerenderizado. No sacrificar la caché global sin esta medición.
4. Aplicar primero `Content-Security-Policy-Report-Only` sin unsafe-inline en staging. Recibir informes en un endpoint con máximo 16 KB, rate limit y eliminación de query strings. No enviar informes a un tercero de pago.
5. Migrar estilos dinámicos a clases/hojas autorizadas. Auditar por separado `style-src-elem` y `style-src-attr`; no dar por eliminado unsafe-inline solo porque desaparezca de script-src.
6. Exigir cero violaciones propias en los flujos anteriores, incluidos cambios de tema, filtros, navegación RSC, teclado, móvil y vídeo. Validar también una respuesta cacheada y una publicación nueva.
7. Activar enforcement por cohortes. Mantener reversión del encabezado independiente del despliegue de datos. Conservar object-src none, script-src-attr none, base-uri self y frame-ancestors none.

## Criterio de cierre

La CSP de las respuestas HTML no contiene unsafe-inline ni unsafe-eval en producción; cada ejecución inline tiene nonce/hash válido, sin errores de hidratación y sin regresión material de caché/TTFB. Hasta pasar ese criterio, esta medida figura como planificada, no como resuelta en enforcement.
