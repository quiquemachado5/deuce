# DEUCE en un VPS de precio fijo

Usa un VPS europeo con al menos 2 vCPU, 4 GB de RAM, 64 GB de SSD persistente, IPv4 pública y Ubuntu o Debian. La aplicación se sirve con Caddy y HTTPS automático.

## Preparación

1. Ejecuta `ops/vps/bootstrap.sh` como `root`.
2. Añade la clave SSH de despliegue a `/home/deuce/.ssh/authorized_keys`.
3. Abre una segunda sesión como `deuce` y clona el repositorio en `/opt/deuce/app`.
4. Sin cerrar la consola actual, ejecuta `/opt/deuce/app/ops/vps/harden-ssh.sh` como `root`. El script se niega a desactivar contraseñas si no existe una clave autorizada.
5. Crea `/opt/deuce/app/.env.production` desde `.env.production.example`, aplica `chmod 600`; `deploy.sh` ejecutará el preflight aislado antes de modificar el servicio.
6. Configura un bucket externo. La opción preferida es Cloudflare R2 Standard: ejecuta `configure-cloudflare-r2.sh` como `deuce` con `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET`. Backblaze B2 queda soportado mediante `configure-backblaze-b2.sh`. En ambos casos limita la clave al bucket y guarda una segunda copia fuera del VPS. `DEUCE_BACKUP_REMOTE` debe apuntar a ese bucket; un directorio del propio servidor no es una copia externa.
7. Configura en GitHub la variable de repositorio `DEUCE_MONITOR_URL` con el mismo origen HTTPS de producción.
   Para despliegue continuo añade también `DEUCE_VPS_HOST`, `DEUCE_VPS_USER` y los secretos
   `DEUCE_VPS_SSH_KEY` y `DEUCE_VPS_KNOWN_HOSTS`. El workflow solo despliega el SHA exacto
   aprobado por `Archive quality` y valida la identidad SSH del servidor.
8. Ejecuta `ops/vps/deploy.sh` como usuario `deuce`.
9. Tras la primera promoción, ejecuta `sudo systemctl start deuce-backup.service` y después `sudo systemctl start deuce-restore-drill.service`; el monitor exige una copia restaurable de menos de 36 horas y un simulacro de menos de 8 días.

`DEUCE_HOST`, `NEXT_PUBLIC_SITE_ORIGIN` y `DEUCE_MONITOR_URL` deben apuntar al dominio real. Un nombre `sslip.io` permite preparar el servidor antes de comprar un dominio.
Los valores públicos canónicos se versionan en `production-public.env` y cada despliegue los aplica de forma atómica antes del preflight, sin leer ni modificar los secretos del entorno. `DEUCE_WWW_HOST` y `DEUCE_LEGACY_HOST` conservan los alias públicos únicamente como redirecciones permanentes al dominio canónico.

`METRICS_SECRET` es independiente de los secretos cron. El despliegue comprueba de forma autenticada `/api/metrics`; Prometheus lo recibe como secreto de Compose montado en `/run/secrets`, no como variable de su contenedor ni dentro de una URL o configuración versionada. Conserva un máximo de 14 días y 256 MB en `prometheus_data`, no publica 9090 y también recoge Caddy y su rate limiting. `ops/observability/alerts.yml` deja las alertas evaluadas y consultables aunque se reinicien los contenedores.

## Publicación y rollback

Cada despliegue toma un bloqueo exclusivo en `/opt/deuce/deployments/deploy.lock`, crea una imagen `deuce-web:<commit completo>` y comprueba que su etiqueta OCI coincide con el commit. El bloqueo impide dos despliegues simultáneos y hace que el watchdog se retire durante seed, gates y promoción. Después arranca un contenedor candidato aislado sobre el volumen real, espera su salud normal y ejecuta el gate profundo, que valida datos, circuito, almacenamiento, commit y heartbeat del scheduler. Solo entonces recrea `web` y `scheduler` con esa imagen.

En la primera instalación el script detecta que no hay una imagen activa, deja que Compose cree y etiquete la red y el volumen, llama de forma autenticada a `/api/cron/seed` y copia al volumen persistente el snapshot validado, incluidas las piezas ATP y WTA. La semilla registra `publish-status` con `initialSeed: true`. El scheduler funciona en modo de solo heartbeat durante el gate del candidato y el gate posterior a la promoción, de modo que ninguna descarga, hora programada o reserva de cuota puede alterar ese arranque. Solo después de superar ambos gates se recrea en modo normal y se comprueba su salud. Mientras todavía no haya ocurrido la primera ejecución del proveedor, los gates solo admiten ATP y WTA ausentes junto a esa publicación inicial reciente, o los tres estados aún ausentes. La excepción depende del estado persistido, no del número de release: en cuanto aparece cualquier fila diaria deja de ser aplicable. Una fila con error u obsoleta, una semilla sin marcar o cualquier fallo de datos, almacenamiento, commit o scheduler sigue bloqueando.

La imagen activa y la anterior quedan registradas en `/opt/deuce/deployments`. Si la comprobación posterior a la promoción falla, el script restaura automáticamente la imagen anterior. Antes de promocionar, el despliegue compila y valida la imagen de Caddy fijada por versión y commit del módulo de rate limiting, y valida Prometheus con `promtool`. Prometheus arranca como servicio operativo no bloqueante: una avería de telemetría no revierte una web y un proxy sanos, y el watchdog intenta recuperarlo. Los contenedores escriben logs rotados en el host; Caddy conserva sus accesos JSON bajo `/opt/deuce/logs` y Prometheus conserva las series temporales en un volumen separado.

El snapshot opcional puede publicarse por HTTPS con `npm run data:snapshot:export`. Define `DEUCE_SNAPSHOT_MANIFEST_URL` y `DEUCE_EXPECTED_SNAPSHOT_COMMIT` para que la construcción restaure únicamente el snapshot firmado por sus SHA-256 y por el commit aprobado.

## Copias y restauración

`deuce-backup.timer` comprime a diario el volumen físico y, antes de subirlo, usa la imagen activa para descomprimirlo y validar manifiesto, packs, piezas ATP/WTA, índices y todas las particiones. Si una publicación cambia el volumen durante la lectura, repite hasta tres veces el tar y la restauración. Solo una copia restaurable recibe su SHA-256 y se transfiere fuera del servidor; después se descarga por streaming el tar remoto real y se vuelve a calcular su hash, además de comprobar el sidecar. Un fallo de restauración, local, remoto o de configuración hace fallar la unidad; no se acepta una copia solo local. El resultado de esta validación previa queda en `/opt/deuce/backups/last-backup-validation.json`.

`deuce-restore-drill.timer` descarga semanalmente la copia externa más reciente y ejecuta `build/restore-drill.mjs` dentro de la imagen activa. Rechaza una copia con más de 192 horas, salvo que `DEUCE_RESTORE_MAX_AGE_HOURS` configure otra ventana. El simulacro descomprime en un directorio temporal y comprueba manifiesto, particiones, packs, recuentos e identificadores sin tocar el volumen de producción. Sus últimos resultados quedan en `/opt/deuce/backups/last-restore-drill.json` y `last-restore-drill.log`; salud profunda y monitor leen también los estados atómicos del volumen.

Tras verificar por descarga el archivo nuevo, `DEUCE_BACKUP_REMOTE_KEEP_DAYS` elimina del remoto únicamente juegos de copia con más de 14 días por defecto. El valor admite entre 8 y 90 días: conserva al menos una semana completa de restauraciones y evita crecimiento de coste sin límite.

Comandos útiles:

```bash
sudo systemctl start deuce-backup.service
sudo systemctl start deuce-restore-drill.service
sudo systemctl status deuce-watchdog.timer deuce-backup.timer deuce-restore-drill.timer
journalctl -u deuce-backup.service -u deuce-restore-drill.service --since today
```

Mantén `DEUCE_ARCHIVE_MAX_BYTES` por debajo del espacio total para reservar capacidad a imágenes, compilaciones, logs y copias locales rotatorias.
`DEUCE_PROVIDER_MIN_REMAINING` reserva por defecto 200 llamadas del saldo contratado. `DEUCE_PROVIDER_DAILY_MAX_CALLS` añade un techo propio de 400 llamadas por día para el conjunto de ATP, WTA, históricos, enriquecimiento y detalles solicitados desde la web. Cada operación conserva además su presupuesto individual. `provider-quota-status` guarda observaciones sin credenciales y `/api/metrics` expone límites, utilización y saldo seguro.
`deuce-resource-check.timer` publica memoria, disco y estado de contenedores cada cinco minutos; `deuce-maintenance.timer` elimina únicamente capas de construcción e imágenes sin uso y nunca poda volúmenes.
