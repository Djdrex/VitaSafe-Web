# VitaSafe v0.4 — estado y despliegue seguro

## Incluido
- Registro e inicio de sesión de clientes separados del panel administrativo.
- Acceso administrativo en `/?staff`; ocultar el enlace no sustituye la validación de permisos en servidor.
- Contraseñas de clientes con scrypt y cookies HttpOnly.
- Auditoría básica para pedidos y ciertos cambios de catálogo y membresías.
- Exportación CSV compatible con Excel para pedidos, productos, membresías, inventario y auditoría. Ejemplo: `/api/admin/export?type=orders` (requiere sesión administrativa).
- Historial de pedidos de clientes deshabilitado hasta verificar correos; el enlace privado de seguimiento sigue disponible.

## Pendiente antes de vender públicamente
1. Verificación de correo, recuperación de contraseña y límites de acceso más robustos.
2. Migrar de SQLite local a base de datos persistente en Render, con respaldo y restauración probada.
3. Configurar Microsoft Graph OAuth y comprobar compatibilidad de escritura Excel con cuenta Microsoft personal. OneDrive aún NO está conectado.
4. Cola duradera de sincronización, reintentos y conciliación; Excel es copia administrativa, no base principal.
5. Revisar privacidad, datos legales, Libro de Reclamaciones, pagos y términos.
6. Pruebas reales de celular, seguridad y concurrencia. Mantener modo privado hasta completar.

## Local
Node.js >=22, `VITASAFE_ADMIN_PASSWORD` de al menos 12 caracteres, `npm start`. Visitar `http://localhost:3000`, para administración `http://localhost:3000/?staff`. No subir `.env` ni `data/` a GitHub.
