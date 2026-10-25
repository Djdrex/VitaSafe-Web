# VitaSafe v0.6 — etapa de desarrollo

## Actualización autorizada: entorno limpio de pruebas

El propietario confirmó que el SQLite anterior era descartable y autorizó usar una base limpia SIN migrar esos registros. No se requiere ese respaldo para el entorno aislado. Las instrucciones históricas de migración de abajo no son un bloqueo para este ensayo limpio. Main y el servicio público siguen intactos.

Servicio separado gratuito: vitasafe-v06-pr2-test, srv-dbf1pi0473hc73bi5kog, Oregon, rama v06-postgres-excel-onedrive, autoDeploy=no. Base existente exclusivamente dpg-dbep767avr4c73bll9u0-a, conexiones externas cerradas. Falta configurar DATABASE_URL interna y VITASAFE_ADMIN_PASSWORD directamente en Render, sin publicar valores. No se ha verificado todavía conexión ni persistencia en Render.

Inicio del servicio aislado: node scripts/verify-isolated.js && npm start. Requiere VITASAFE_TEST_ENV=true y DEMO_MODE=true; rechaza un hostname distinto del interno de la base autorizada. Verifica acceso por rol mediante HTTP de loopback, catálogo de 6 productos, lectura del panel, bloqueo de ventas/registros/importación aplicada, exportación y vista previa de los 4 módulos Excel y cantidades negativas/fraccionarias inválidas. Crea solo un cliente marcado FICTICIO con correo example.invalid y contraseña aleatoria no expuesta; nunca crea ventas. Registra isolated_persistence_marker e isolated_last_verification en sync_state. previous_marker=true solo indica un marcador previo: para acreditar reinicio real hay que identificar dos ejecuciones correspondientes a dos arranques distintos de Render. La prueba local cierra y reabre PGlite.

Pruebas locales actuales: 18 aprobadas. OneDrive sigue preparado pero no autorizado ni conectado realmente. EXCEL_IMPORT_ENABLED=false, ONEDRIVE_AUTO_SYNC=false. No fusionar el PR ni cambiar el despliegue público sin presentar resultados y obtener aprobación expresa.


Esta rama NO acredita una migración del servicio desplegado. Mantener DEMO_MODE=true.

## Implementado y probado localmente

Backend asíncrono con adaptador PostgreSQL (parámetros, conflictos, rowid, fechas y transacciones), sesiones persistentes por usuario y rol, contraseña scrypt, entrada normal con correo y contraseña. El propietario se crea solo si no existe mediante VITASAFE_ADMIN_EMAIL y la contraseña existente VITASAFE_ADMIN_PASSWORD; nunca se sobrescribe una cuenta ni se promueve un cliente automáticamente.

Excel: plantillas, exportación, validación y vista previa para productos, inventario, historial de pedidos y reportes. Importaciones de aplicación bloqueadas en demo y por defecto. Historial importado de pedidos de solo lectura para evitar devoluciones ficticias de stock. Límites: 5 MB comprimidos, 30 MB descomprimidos, 2000 filas; fórmulas y contenido activo rechazados. Precios en centavos. Las exportaciones de productos, inventario y pedidos incluyen como máximo 2000 filas; usar un respaldo completo para conservar todos los datos.

Microsoft Graph preparado para cuentas personales, PKCE, estado de uso único, tokens cifrados AES-GCM y alcance Files.ReadWrite.AppFolder. Solo exporta reportes agregados a la carpeta de la aplicación. No hay consentimiento ni conexión real verificada. El temporizador horario depende de que el proceso esté activo: Render Free puede suspenderlo.

## Pruebas

npm ci && npm test (Node >=22.16). La suite actual reemplaza los contratos antiguos de autenticación; conserva las pruebas de contraseña, horarios y migración. PostgreSQL se prueba mediante PGlite local, no con la instancia PG18 de Render. Comprueba reinicio completo y sesión persistente, lectura de módulos, bloqueo demo, Excel y OAuth con transporte simulado. No equivale a una prueba del despliegue.

## Bloqueos antes de desplegar o conectar

1. Obtener un respaldo íntegro del SQLite ACTUAL del servicio y guardarlo de forma privada con checksum. Un respaldo de datos sintéticos local no sirve. No reiniciar/desplegar sobre el disco efímero antes de conservar los datos actuales.
2. Comprobar nuevamente que la base indicada está disponible y su fecha de vencimiento. El plan gratuito no garantiza retención permanente ni copias administradas; definir exportaciones externas y renovación/migración antes del vencimiento.
3. Ejecutar scripts/migrate-postgres.js en modo de ensayo sobre respaldo consistente. El importador crea un esquema aislado, valida tablas y compara datos. Leer docs/POSTGRES_MIGRATION.md. No modificar el origen ni sobrescribir un esquema.
4. La aplicación v0.6 usa vitasafe_stage_app. El esquema importado necesita un procedimiento de promoción comprobado y las columnas nuevas de sesiones. NO conectar directamente el backend a un esquema vacío y afirmar que se migraron los datos.
5. Probar restauración aislada y reversión antes del corte. El nuevo endpoint /api/admin/backup exporta JSON consistente con SHA256 y contiene hashes privados y tokens cifrados; no publicarlo ni subirlo al repositorio. Su restauración v0.6 completa aún está pendiente. La herramienta anterior restaura respaldos SQLite a archivos nuevos.
6. Solo entonces configurar DATABASE_URL internamente y de forma segura en Render, VITASAFE_ADMIN_EMAIL y COOKIE_SECURE=true. Conservar VITASAFE_ADMIN_PASSWORD sin cambiarla. Sin DATABASE_URL, Render falla deliberadamente en vez de usar SQLite efímero silenciosamente.
7. Desplegar una sola revisión íntegra aprobada, verificar Live, /api/health, correo/contraseña reales mediante entrada segura del propietario, persistencia después de reinicio, panel, catálogo y bloqueo comercial; comprobar vista móvil real.

## Microsoft — pendiente del propietario

Registrar una aplicación que permita cuentas personales, callback HTTPS APP_ORIGIN/api/onedrive/callback. Introducir MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET y ONEDRIVE_TOKEN_KEY (clave aleatoria de 32 bytes en base64) únicamente en configuración segura. APP_ORIGIN sin barra final. Nunca enviar secretos al chat. Solicitar consentimiento del propietario desde Panel → Datos y Excel; después verificar una subida real. ONEDRIVE_AUTO_SYNC=false hasta entonces. No habilitar ventas ni registros.
