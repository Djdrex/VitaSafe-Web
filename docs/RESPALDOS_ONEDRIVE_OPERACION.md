# Respaldo privado y recuperación · 18/11/2026

Estado: implementación de ensayo, NO respaldo remoto verificado. No hay tareas programadas activadas. La conexión Microsoft y la clave aún requieren configuración segura del propietario. La base real PostgreSQL 18 está disponible, Free, Oregon y vence el 24/11/2026 05:28:56 UTC (00:28:56 Lima).

## Configuración segura y consentimiento

1. En Microsoft Entra, registrar una aplicación Web para cuentas personales Microsoft, por ejemplo VitaSafe. El propietario debe completar las autorizaciones que Microsoft solicite. No enviar contraseñas, secretos ni tokens por chat.
2. Registrar exactamente la redirección HTTPS `https://vitasafe-v06-pr2-test.onrender.com/api/onedrive/callback`.
3. Solicitar permisos delegados `Files.ReadWrite.AppFolder` y `offline_access`. No solicitar acceso a todo OneDrive. El nombre de la aplicación determina la carpeta `Apps/<nombre de aplicación>`.
4. En Environment del servicio aislado de Render configurar `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `APP_ORIGIN=https://vitasafe-v06-pr2-test.onrender.com`. Introducir los secretos directamente en Render.
5. Configurar dos claves aleatorias DIFERENTES, cada una de 32 bytes codificados en base64: `ONEDRIVE_TOKEN_KEY` protege tokens OAuth y `VITASAFE_BACKUP_KEY` cifra las copias. Generarlas y custodiarlas en un gestor privado separado de OneDrive; conservar una recuperación offline. Nunca guardarlas en GitHub, Excel, capturas ni junto al archivo cifrado. Perder la clave de respaldo impide recuperar la copia. Cambiarla no vuelve a cifrar copias anteriores.
6. Mantener `ONEDRIVE_AUTO_SYNC=false`, DEMO_MODE=true y autoDeploy desactivado. Aplicar la configuración solo al servicio aislado mediante despliegue manual.
7. En VitaSafe: Iniciar sesión → Datos y Excel → Autorizar Microsoft. Revisar cuenta y permisos en la pantalla de Microsoft. El código usa PKCE S256 y estado vinculado al administrador, de un solo uso y con caducidad de diez minutos. Los tokens persistidos están cifrados; no se muestran en el panel.
8. Solo después de revisar custodia y consentimiento, configurar `VITASAFE_BACKUP_UPLOAD_ENABLED=true` para habilitar el botón manual «Verificar respaldo cifrado en OneDrive». Este interruptor NO programa ejecuciones. El botón solicita confirmación. Nunca ampliar permisos automáticamente si Graph devuelve 403.

## Carpetas y privacidad

Dentro de `Apps/<nombre de aplicación>` se preparan:

- `VitaSafe — Respaldos/PostgreSQL/Diarios`
- `VitaSafe — Respaldos/PostgreSQL/Semanales`
- `VitaSafe — Respaldos/PostgreSQL/Restauraciones-verificadas`
- `VitaSafe — Respaldos/Informes-de-integridad`

No se han creado en la cuenta real. El código rechaza carpetas compartidas y exige poder consultar sus permisos; si Microsoft no permite comprobarlos con el ámbito mínimo, se bloquea la subida para revisar el caso. No se crean enlaces públicos, invitaciones ni operaciones de eliminación. No compartir manualmente esas carpetas. OneDrive permite que su propietario cambie o elimine archivos: no es almacenamiento inmutable.

## Ejecución y límites

El snapshot lógico de VitaSafe usa una transacción REPEATABLE READ READ ONLY. Incluye tablas declaradas de aplicación, comercio y plataforma, no roles del servidor ni extensiones externas. Los estados OAuth transitorios no son parte de la recuperación. La copia incluye tokens YA cifrados, por lo que su reutilización requiere ONEDRIVE_TOKEN_KEY; es preferible revocar sesiones y reconectar OAuth después de un incidente.

AES-256-GCM conserva formato `VitaSafe-backup-v1`, clave 32 bytes, IV aleatorio 12 bytes, etiqueta 16 bytes y AAD de formato. SHA-256 verifica el archivo cifrado y el manifiesto interno. La nueva apertura `readOnly:true` evita inicializaciones y rechaza escrituras. El comando local `node scripts/backup-secure.js copia.enc` exige DATABASE_URL y no sobrescribe el archivo de salida. La descarga administrativa escribe únicamente su auditoría después del snapshot.

La integración cifra y valida antes de cualquier subida. Usa nombre basado en SHA-256 y conflicto `fail`, descarga y compara hash y bytes descifrados. Límite conservador actual: 25 MiB cifrados, procesados en memoria. No hay transferencia fragmentada. Los reintentos se limitan a tres para errores transitorios; Retry-After mayor de cinco segundos deja pendiente la ejecución. No se reenvía Authorization a la URL temporal de descarga. Se rechazan destinos inesperados. Los informes no muestran claves ni URL firmada.

Ejecución manual alternativa en un ejecutor privado autorizado de la misma región:

`node scripts/backup-onedrive.js --confirm-manual`

Agregar `--weekly` selecciona Semanales. La apertura de este runner no ejecuta migraciones; solo la renovación OAuth puede actualizar sus tokens. La lectura de registros de negocio ocurre en transacción de solo lectura. El resultado informa `restored:false` incluso cuando subida/descarga/descifrado fueron correctos: falta restaurar en PostgreSQL real.

La ejecución futura independiente de la computadora puede utilizar un Cron Job Render en Oregon. No hay Blueprint ni cron aprovisionado en este cambio. Web Free puede dormir, por lo que un temporizador en esa web no garantiza respaldos diarios. Antes de automatizar: aprobar gasto, validar ejecución manual real, exclusión de concurrencia entre ejecutores, custodia, alertas y retención. No borrar automáticamente copias antiguas sin política aprobada.

## Instancia temporal y costos

Propuesta NO creada: `vitasafe-restore-test`, PostgreSQL 18, Oregon, workspace actual, sin acceso externo, vacía, plan 0.1c-256mb (alias basic-256mb), 256 MB RAM, 100 conexiones. Dimensionar almacenamiento por tamaño expandido, índices y margen; 1 GB es solo ejemplo sujeto a disponibilidad del formulario.

Referencia pública consultada: cómputo US$6/mes + almacenamiento US$0.30/GB/mes. Ejemplo 1 GB: US$6.30/mes; dos horas aproximadamente US$0.018 y 24 h US$0.21 usando un mes de 30 días. NO son cotización final ni garantía de factura. Impuestos, transferencias, ejecutor, almacenamiento adicional y cuota OneDrive se confirman en la cuenta. Mientras exista la instancia, puede seguir generando cargos; su eliminación requiere aprobación y no está autorizada.

Cron Job futuro: mínimo US$1/mes por servicio, cómputo según duración (referencia 0.5c-512mb US$0.00016/minuto). No creado ni activado. Los planes pagos de PostgreSQL tienen PITR; ventana Hobby de tres días, Pro o superior siete. Free no dispone de esa recuperación. La copia externa cifrada sigue siendo necesaria.

## Restauración cuando falle la base original

1. Detener operaciones y no sobrescribir ni eliminar el origen. Mantener modo demo. Registrar commit desplegado y momento de corte.
2. Recuperar archivo .enc de OneDrive privado, clave desde el custodio separado y manifiesto SHA confiable. Ejecutar `node scripts/backup-secure.js copia.enc --verify` en entorno privado. No imprimir el contenido descifrado.
3. Tras aprobación del gasto, crear el destino temporal indicado. Verificar PostgreSQL 18, región, red privada, identidad y base vacía. No usar la URL de origen como destino.
4. Configurar `VITASAFE_RESTORE_DATABASE_URL` por canal seguro y ejecutar `node scripts/restore-secure.js copia.enc --confirm-empty-target`. El código rechaza origen=destino y tablas con datos. No hacer una restauración de ensayo sobre el origen.
5. Verificar conteos y contenido por tabla, secuencias, catálogo, stock/lotes, pedidos, membresías, bytes privados, permisos y Excel de 17 hojas. Reiniciar solo el servicio de ensayo conectado al destino y comprobar persistencia. Guardar informe de integridad sin datos personales y marcar como restauración verificada solo entonces.
6. Solicitar aprobación antes de cambiar DATABASE_URL de cualquier servicio. Para recuperación por incidente, invalidar sesiones existentes y renovar consentimiento OAuth; revisar si hubo exposición de claves. No cambiar la contraseña administrativa sin el propietario.
7. Reversión: mantener la configuración previa y el archivo cifrado. Si las comprobaciones fallan, no conmutar el servicio; conservar el destino para diagnóstico. No borrar ninguna instancia sin autorización.

## Evidencia actual

Dos pruebas nuevas con PGlite y transporte Graph simulado: cifrado antes de red, descarga íntegra, rechazo de texto plano, carpeta compartida y archivo alterado; restauración en destino vacío y rechazo de destino ocupado. Apertura de lectura sin migraciones y rechazo real de DELETE por el motor local. La suite incorpora los casos mediante tests/v1-backup-onedrive.test.js. No equivale a PostgreSQL 18 remoto ni a OAuth real. Deben verificarse también permisos Graph y su redirección de descarga en la cuenta real.

Fuentes oficiales consultadas: https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder · https://learn.microsoft.com/en-us/graph/api/driveitem-put-content · https://render.com/pricing · https://render.com/docs/compute-plans.md · https://render.com/docs/cronjobs · https://render.com/docs/postgresql-backups
