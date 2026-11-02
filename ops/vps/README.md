# DEUCE en un VPS de precio fijo

Usa un VPS europeo con al menos 2 vCPU, 4 GB de RAM, 64 GB de SSD persistente, IPv4 pública y Ubuntu o Debian. La aplicación se sirve con Caddy y HTTPS automático.

## Preparación

1. Ejecuta `ops/vps/bootstrap.sh` como `root`.
2. Añade la clave SSH de despliegue a `/home/deuce/.ssh/authorized_keys`.
3. Clona el repositorio en `/opt/deuce/app` como usuario `deuce`.
4. Crea `/opt/deuce/app/.env.production` desde `.env.production.example`.
5. Configura el remoto de `rclone` como el usuario del servicio: `sudo -u deuce rclone --config /home/deuce/.config/rclone/rclone.conf config`. `DEUCE_BACKUP_REMOTE` debe usar ese remoto; la copia externa es obligatoria.
6. Configura en GitHub la variable de repositorio `DEUCE_MONITOR_URL` con el mismo origen HTTPS de producción.
7. Ejecuta `ops/vps/deploy.sh` como usuario `deuce`.
8. Tras la primera promoción, ejecuta `sudo systemctl start deuce-backup.service` y después `sudo systemctl start deuce-restore-drill.service`; el monitor exige una copia restaurable de menos de 36 horas y un simulacro de menos de 8 días.

`DEUCE_HOST`, `NEXT_PUBLIC_SITE_ORIGIN` y `DEUCE_MONITOR_URL` deben apuntar al dominio real. Un nombre `sslip.io` permite preparar el servidor antes de comprar un dominio.

## Publicación y rollback

Cada despliegue toma un bloqueo exclusivo en `/opt/deuce/deployments/deploy.lock`, crea una imagen `deuce-web:<commit completo>` y comprueba que su etiqueta OCI coincide con el commit. El bloqueo impide dos despliegues simultáneos y hace que el watchdog se retire durante seed, gates y promoción. Después arranca un contenedor candidato aislado sobre el volumen real, espera su salud normal y ejecuta el gate profundo, que valida datos, circuito, almacenamiento, commit y heartbeat del scheduler. Solo entonces recrea `web` y `scheduler` con esa imagen.

En la primera instalación el script detecta que no hay una imagen activa, deja que Compose cree y etiquete la red y el volumen, llama de forma autenticada a `/api/cron/seed` y copia al volumen persistente el snapshot validado, incluidas las piezas ATP y WTA. La semilla registra `publish-status` con `initialSeed: true`. El scheduler funciona en modo de solo heartbeat durante el gate del candidato y el gate posterior a la promoción, de modo que ninguna descarga, hora programada o reserva de cuota puede alterar ese arranque. Solo después de superar ambos gates se recrea en modo normal y se comprueba su salud. Durante esos dos gates solo se admite ATP y WTA todavía ausentes junto a esa publicación inicial reciente, o los tres estados aún ausentes. Una fila con error u obsoleta, una semilla sin marcar o cualquier fallo de datos, almacenamiento, commit o scheduler sigue bloqueando. Desde la segunda release el gate vuelve a exigir los tres estados diarios recientes sin excepción.

La imagen activa y la anterior quedan registradas en `/opt/deuce/deployments`. Si la comprobación posterior a la promoción falla, el script restaura automáticamente la imagen anterior. Los contenedores escriben logs rotados en el host; Caddy conserva sus accesos JSON bajo `/opt/deuce/logs`.

El snapshot opcional puede publicarse por HTTPS con `npm run data:snapshot:export`. Define `DEUCE_SNAPSHOT_MANIFEST_URL` y `DEUCE_EXPECTED_SNAPSHOT_COMMIT` para que la construcción restaure únicamente el snapshot firmado por sus SHA-256 y por el commit aprobado.

## Copias y restauración

`deuce-backup.timer` comprime a diario el volumen físico y, antes de subirlo, usa la imagen activa para descomprimirlo y validar manifiesto, packs, piezas ATP/WTA, índices y todas las particiones. Si una publicación cambia el volumen durante la lectura, repite hasta tres veces el tar y la restauración. Solo una copia restaurable recibe su SHA-256 y se transfiere fuera del servidor; después se descarga por streaming el tar remoto real y se vuelve a calcular su hash, además de comprobar el sidecar. Un fallo de restauración, local, remoto o de configuración hace fallar la unidad; no se acepta una copia solo local. El resultado de esta validación previa queda en `/opt/deuce/backups/last-backup-validation.json`.

`deuce-restore-drill.timer` descarga semanalmente la copia externa más reciente y ejecuta `build/restore-drill.mjs` dentro de la imagen activa. Rechaza una copia con más de 192 horas, salvo que `DEUCE_RESTORE_MAX_AGE_HOURS` configure otra ventana. El simulacro descomprime en un directorio temporal y comprueba manifiesto, particiones, packs, recuentos e identificadores sin tocar el volumen de producción. Sus últimos resultados quedan en `/opt/deuce/backups/last-restore-drill.json` y `last-restore-drill.log`; salud profunda y monitor leen también los estados atómicos del volumen.

Comandos útiles:

```bash
sudo systemctl start deuce-backup.service
sudo systemctl start deuce-restore-drill.service
sudo systemctl status deuce-watchdog.timer deuce-backup.timer deuce-restore-drill.timer
journalctl -u deuce-backup.service -u deuce-restore-drill.service --since today
```

Mantén `DEUCE_ARCHIVE_MAX_BYTES` por debajo del espacio total para reservar capacidad a imágenes, compilaciones, logs y copias locales rotatorias.
