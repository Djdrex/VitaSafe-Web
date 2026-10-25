# VitaSafe v0.5 — DEMOSTRACIÓN GRATUITA (NO PRODUCCIÓN)

Esta versión sirve exclusivamente para probar diseño móvil, carga de página y conexión HTTPS en Render.

## Seguridad de la demo
- Con `DEMO_MODE=true`, las altas de cuentas, compras y cambios están bloqueados desde el servidor.
- Un aviso visible indica que no se deben introducir datos reales.
- Los productos de ejemplo son ficticios y no constituyen una oferta comercial.
- El disco de los servicios gratuitos puede ser efímero: los datos NO son persistentes.
- La contraseña administrativa se genera en Render, pero la demo no necesita usar el panel administrativo.
- **NO usar esta versión para clientes, pedidos reales, pagos ni datos personales.**

## Publicación gratuita
1. Sube los archivos de `vitasafe-web` a la raíz de tu repositorio GitHub `Djdrex/VitaSafe-Web`, sin subir `.env`, `data/` ni `node_modules/`.
2. En Render selecciona New > Blueprint y el repositorio GitHub.
3. Revisa el plan Free y confirma el Blueprint si está disponible. No aceptes un cargo inesperado.
4. Abre la URL HTTPS creada y revisa el sitio en Chrome del celular.
5. Comprueba `/api/health`: debe mostrar `mode: demo`.

## ¿Qué falta para producción?
- Migrar SQLite a PostgreSQL persistente, con migraciones y respaldo verificado.
- Sincronización OneDrive/Excel con autorización Microsoft y cola duradera.
- Verificación de correo, recuperación de contraseña, protección de cuentas y cumplimiento legal.
- Pruebas de carga y revisión de seguridad.

## Local
Con `DEMO_MODE` sin configurar, el comportamiento sigue siendo el de la v0.4. Node.js 22 o superior.
