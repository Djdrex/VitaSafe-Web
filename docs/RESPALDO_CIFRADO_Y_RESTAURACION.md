# Respaldo cifrado y recuperación — VitaSafe

Estado: cifrado AES-256-GCM y restauración integral comprobados en PostgreSQL embebido PGlite con datos ficticios. NO equivale a restauración en PostgreSQL remoto ni a una copia externa ya almacenada.

## Configuración privada necesaria

- `DATABASE_URL`: origen autorizado, por red interna de Render. No habilitar acceso público a PostgreSQL.
- `VITASAFE_BACKUP_KEY`: clave aleatoria independiente de 32 bytes codificada en base64; guardarla en un gestor seguro separado de las copias. No usar la contraseña administrativa. Introducirla directamente en configuración segura, nunca en chat, argumentos de consola o GitHub.
- `VITASAFE_RESTORE_DATABASE_URL`: destino PostgreSQL vacío y separado, aprobado por el propietario; no usar el servicio comercial ni una base con registros.
- Elegir un almacenamiento externo con acceso privado y retención. No se ha contratado ni conectado ninguno.

## Procedimiento

1. En un equipo o proceso autorizado con acceso interno a la base, ejecutar `node scripts/backup-secure.js /ruta/privada/vitasafe-fecha.enc`. El archivo debe ser nuevo. Se cifra antes de escribir; permisos 0600; verifica descifrado e integridad y emite solo checksum.
2. Copiar únicamente el `.enc` al destino privado aprobado usando su cliente autenticado. No incluir la clave. Conservar el checksum y fecha. No guardar copias ni claves en GitHub, carpetas públicas, Excel o reportes.
3. Volver a descargar esa copia a un directorio privado. Ejecutar `node scripts/backup-secure.js /ruta/privada/copia-descargada.enc --verify` con la clave segura; comparar checksum.
4. Con el destino vacío explícitamente configurado, ejecutar `node scripts/restore-secure.js /ruta/privada/copia-descargada.enc --confirm-empty-target`. Rechaza un destino igual al origen y datos existentes. Valida todas las filas, relaciones preservadas y secuencias; no borra ni sobrescribe registros.
5. Probar autenticación, catálogo, pedidos, devoluciones, membresías, archivos y reportes sobre ese destino. Registrar duración, recuentos y prueba de arranque. Mantener DEMO_MODE=true, mensajes y cobros apagados.
6. Solo después del ensayo completo y aprobación, decidir un corte a infraestructura permanente. Conservar origen y copias. Una reversión de código no revierte datos; reconciliar escrituras posteriores antes de volver a una copia antigua.

La copia incluye credenciales cifradas de integraciones y hashes de contraseña: sigue siendo confidencial aunque esté cifrada. Las claves de aplicación necesarias para descifrar tokens de Microsoft deben conservarse de forma separada. No se promete recuperación de una integración sin esas claves.

## Evidencia disponible y bloqueos

Prueba automatizada `tests/v1-cart-checkout.test.js`: compra integrada, devolución física, reporte de 17 hojas, snapshot, cifrado, rechazo de clave incorrecta, restauración en destino vacío, comparación de stock/pedido y rechazo de destino no vacío. No se migraron ni eliminaron datos de Render.

Pendiente del propietario: destino externo y acceso autorizado, custodia de clave y presupuesto/infraestructura permanente. Pendiente técnico posterior: ejecutar el procedimiento desde la red interna, verificar la copia descargada del proveedor y restaurarla en PostgreSQL remoto. Vencimiento previsto informado de PostgreSQL Free: 24/11/2026; confirmar en Render antes del plan de corte.
