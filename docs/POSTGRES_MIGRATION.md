# VitaSafe v0.5: acceso y migración por etapas

## Estado y límites

El servidor publicado sigue usando SQLite. Estos cambios preparan y prueban la copia a PostgreSQL; **no cambian el motor de la aplicación ni crean una base remota**. No configure DATABASE_URL esperando que el servidor actual lo utilice: sus consultas todavía usan DatabaseSync, `?`, `rowid`, `BEGIN IMMEDIATE` e INSERT OR IGNORE. Se requiere un adaptador asíncrono y pruebas completas de rutas antes del cambio de motor.

Mantener DEMO_MODE=true y COOKIE_SECURE=true en Render. No habilitar pedidos, registros, pagos o cambios comerciales. La barra roja depende del modo real del servidor; el interruptor «Modo privado» del panel no desactiva DEMO_MODE.

## Acceso administrativo

En modo demo el botón de la cabecera abre «Acceso administrador». También existe `/?staff=1`. No requiere correo de cliente. En demo, la contraseña válida procede exclusivamente de VITASAFE_ADMIN_PASSWORD, con 12–256 caracteres. Fuera de demo, el hash guardado en SQLite conserva su prioridad y el flujo de cambio de contraseña sigue funcionando.

El propietario debe introducir una contraseña nueva, única y preferiblemente de 20 o más caracteres en Render > servicio VitaSafe > Environment > VITASAFE_ADMIN_PASSWORD > Save and deploy. No mostrar el valor anterior ni enviarlo al chat. Los cambios de credencial invalidan las sesiones administrativas de demo. Nunca usar las contraseñas sintéticas de las pruebas.

Después del despliegue: abrir la web > Acceso administrador > introducir la nueva contraseña > verificar Resumen, Catálogo, Pedidos, Reclamaciones, Care, Inventario y Configuración. En demo, las pantallas son de consulta y el servidor devuelve 403 a las mutaciones. Los hashes de contraseñas no se devuelven como configuraciones.

## Costos consultados (24 de octubre de 2026, Perú)

- Render Postgres Free: gratuito, una instancia gratuita por workspace, 1 GB y caducidad a los 30 días. Tras caducar existe una gracia de 14 días para subir a pago; después se elimina la base. No incluye backups administrados ni pool administrado.
- El plan de PostgreSQL de pago más pequeño se anuncia desde USD 6/mes por cómputo; verificar almacenamiento, impuestos y condiciones en el formulario antes de contratar. No se contrató.
- El servicio web Free no admite disco persistente ni consola SSH. Su SQLite local puede perderse al reiniciar, suspenderse o desplegar. No usarlo para datos reales.
- No se recomienda activar una base gratuita temporal como almacenamiento definitivo. Su creación debe esperar a elegir una opción de persistencia y una política de exportación fuera del servicio web.

Fuentes oficiales: https://render.com/docs/free, https://render.com/pricing, https://render.com/docs/postgresql-creating-connecting.

## Etapa 0 — inventario y respaldo previo al cambio

Detener escrituras y comprobar que no existen datos reales antes de desplegar. No obtener un respaldo copiando únicamente el archivo SQLite mientras exista un WAL activo. No importar el servidor para hacer backups, pues su arranque crea tablas y datos iniciales.

En un entorno con acceso al SQLite real y Node >=22.16:

```
npm ci
npm run db:migrate -- backup /ruta/real/vitasafe.sqlite /ruta/segura/nuevo-respaldo
```

El destino debe ser nuevo. El comando usa la API de backup de SQLite con la fuente en solo lectura, preserva el WAL de forma consistente y valida integrity_check, foreign_key_check, esquema, huérfanos, stock, JSON y totales. Produce snapshot.sqlite, manifest.json y report.json con SHA-256, permisos restrictivos y recuentos de las 13 tablas. Guardar el respaldo fuera del disco efímero; cifrar y limitar acceso. **El manifiesto contiene datos y hashes sensibles: nunca subirlo a GitHub ni publicarlo.** La aplicación Free actual no ofrece acceso SSH: todavía hace falta obtener el respaldo del SQLite remoto mediante un procedimiento autenticado antes de cualquier migración real.

Tablas conservadas: products, inventory_events, orders (incluye ventas manuales por source), order_events, users, sessions, customer_sessions, settings, tickets (consultas/reclamaciones/quejas), memberships, kit_items, idempotency y audit_log.

## Etapa 1 — ensayo local automático

```
npm test
```

Las pruebas usan una base temporal sintética SQLite y PostgreSQL embebido (PGlite), con registros en las 13 tablas. Verifican copia exacta, textos Unicode, importes, identificadores, relaciones, sesiones, secuencias de IDs, ensayo sin persistir, rechazo de destino existente, corrupción, cambios de esquema, interrupción de importación y restauración. No equivalen a probar conectividad, TLS o rendimiento de Render Postgres.

La primera versión conserva textos y fechas vacías exactamente, enteros como BIGINT y los rowid originales como _sqlite_rowid. No convierte importes a coma flotante, ni fuerza vacíos a fechas. Las restricciones se mantienen; se detectan inconsistencias antes de importar. Una normalización posterior de fechas o relaciones necesita su propia migración.

## Etapa 2 — ensayo en PostgreSQL seleccionado

Elegir una base de prueba vacía y autorizada, preferentemente en Oregon y en el mismo workspace que VitaSafe. Usar la URL interna en Render; desde el exterior configurar TLS con verificación de certificado, nunca rejectUnauthorized=false. Introducir MIGRATION_DATABASE_URL por un mecanismo seguro. DATABASE_URL se ignora deliberadamente para evitar tocar una base de aplicación por error.

```
npm run db:migrate -- import /ruta/segura/nuevo-respaldo vitasafe_stage_ensayo
```

Por defecto crea las tablas e importa dentro de una única transacción que **siempre revierte al terminar**. No ejecuta DROP, DELETE ni TRUNCATE. Rechaza un esquema existente y cualquier nombre que no empiece por vitasafe_stage_. Las verificaciones comparan cada celda y el SHA-256 por tabla, no solo los recuentos. El proceso es para un volumen pequeño que cabe en memoria; para datos grandes hay que implementar lotes y exportaciones por streaming antes de usarlo.

## Etapa 3 — conservar una copia de staging

Solo después de revisar el ensayo y el respaldo, establecer explícitamente MIGRATION_ALLOW_WRITE=isolated-schema en el entorno de la migración:

```
npm run db:migrate -- import /ruta/segura/nuevo-respaldo vitasafe_stage_validado --apply
npm run db:migrate -- verify /ruta/segura/nuevo-respaldo vitasafe_stage_validado
```

Solo se confirma la transacción si todas las comparaciones coinciden. No modifica el esquema public ni tablas de otros proyectos. No es reintentable sobre un esquema existente: usar otro nombre nuevo para preservar evidencia y copias anteriores. El CLI no imprime credenciales ni filas en errores.

## Etapa 4 — cambio de motor todavía pendiente

Antes del corte: implementar repositorios asíncronos PostgreSQL para todas las rutas, parametrización $n, transacciones por conexión, secuencias, orden por _sqlite_rowid, rollback de pedidos/stock y cierre del pool. Probar login, cookies HTTPS y todos los módulos en una réplica, incluyendo reintentos de pedidos y cancelaciones. Repetir respaldo con escrituras detenidas, importar una nueva copia, validar todo, registrar commit/esquema de corte y mantener DEMO_MODE=true. Solo entonces cambiar el adaptador del servicio. No habilitar operaciones comerciales como parte de la migración.

## Recuperación y reversión

Antes del corte, la aplicación conserva SQLite: descartar el ensayo con ROLLBACK o abandonar el esquema de staging no afecta el original. Para reconstruir un SQLite de respaldo:

```
npm run db:migrate -- restore /ruta/segura/nuevo-respaldo /ruta/nueva/vitasafe.sqlite
```

La ruta final no debe existir; el comando rechaza sobrescribirla y valida hashes e integridad. Con el servidor detenido, configurar DATA_DIR al directorio recuperado y reiniciar la versión SQLite conocida. Mantener la base antigua y el PostgreSQL de staging intactos. Si ya hubiese escrituras nuevas en PostgreSQL, no volver a una copia antigua: detener escrituras, exportarlas y reconciliarlas primero para evitar perder operaciones. No hay reversión automática de datos ni eliminación de bases.

## URL de Render

La configuración observada distingue name=VitaSafe de slug=vitasafe-demo. Renombrar el recurso no cambió el subdominio. La disponibilidad de vitasafe.onrender.com y las opciones de modificación deben confirmarse en Dashboard o con soporte; que una URL devuelva 404 no prueba que el nombre esté libre. No recrear ni eliminar el servicio sin autorización. Como alternativas: soporte de Render, un dominio propio ya controlado o, únicamente con autorización posterior, otro servicio con un nombre disponible.
