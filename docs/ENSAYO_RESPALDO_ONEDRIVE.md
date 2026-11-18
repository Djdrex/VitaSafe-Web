# Restauración de una copia privada de VitaSafe

Origen autorizado: vitasafe-demo-db, dpg-dbep767avr4c73bll9u0-a, PostgreSQL 18, Oregon. Vencimiento Free previsto para el 24/11/2026 a las 00:28 de Lima. Mantener la web Free y las credenciales de origen en su entorno privado. OneDrive personal privado es el destino elegido. El procedimiento es manual y no requiere activar la sincronización de reportes.

1. Custodiar VITASAFE_BACKUP_KEY en un gestor privado distinto de OneDrive y configurarla por el canal seguro del servicio. Usar la misma clave al restaurar. Verificar acceso de recuperación del custodio.
2. Desde el panel administrativo aislado, Datos y Excel → Copias de seguridad, descargar el archivo cifrado. Registrar fecha, versión, tamaño y SHA-256. Subir solo el archivo cifrado a una carpeta privada de OneDrive sin enlace compartido. Volver a descargarlo a una ubicación privada. Comparar SHA-256 y ejecutar allí el siguiente comando con la clave cargada de forma segura.
   
   `node scripts/backup-secure.js copia.enc --verify`
3. Antes de generar cargos, revisar el presupuesto de una **segunda instancia** temporal Basic-256mb, PostgreSQL 18 en Oregon, acceso externo cerrado, capacidad suficiente para la copia expandida y los índices. Confirmar memoria y espacio en el panel. Como referencia, US$6/mes de cómputo + US$0.30 por GB/mes. Con 1 GB y 30 días de referencia, dos horas cuestan aproximadamente US$0.018 y un día US$0.21, antes de impuestos y otros cargos. Render factura según el uso y la configuración elegida. Incluir también el costo del ejecutor privado si se requiere, egreso y cuota disponible de OneDrive. Recoger el desglose y un límite de tiempo/gasto antes de crear el destino.
4. En un ejecutor privado que alcance el destino, comprobar identidad del servidor, versión y base vacía. Mantener DATABASE_URL como referencia al origen y definir VITASAFE_RESTORE_DATABASE_URL únicamente con la URL interna del destino nuevo. Ejecutar:
   
   `node scripts/restore-secure.js copia.enc --confirm-empty-target`
5. Registrar el hash del archivo, conteos por tabla y tiempo de restauración. Validar catálogo, lotes, membresías, permisos, bytes de archivos y reporte de 17 hojas con consultas aisladas. No conectar la tienda pública al destino. Si falla, conservar origen y copia, registrar el error sin credenciales y revisar antes de reintentar. No confiar en un Excel para reconstruir la base.
6. Presentar el resultado y los importes al propietario. La eliminación de la instancia temporal y el cambio de plan de la base existente necesitan aprobación. Mientras el destino siga aprovisionado puede generar cargos. Para la actualización en el lugar usar docs/CONTINUIDAD_POSTGRES_NOVIEMBRE.md.

Fuentes oficiales: https://render.com/pricing · https://render.com/docs/billing · https://render.com/docs/postgresql-backups
