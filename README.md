# VitaSafe Web — prototipo privado funcional

Tienda responsive con panel administrativo, catálogo, carrito, pedidos sin cuenta con enlaces privados, ventas manuales, inventario centralizado, gestión de delivery, consultas, reclamaciones, membresías manuales, registro de vencimientos y controles de habilitación.

## Requisitos
- Node.js 22 o superior (usa `node:sqlite`, experimental en Node 22)
- No requiere `npm install`: solo módulos nativos de Node.

## Inicio

macOS/Linux:
```bash
cd vitasafe-web
export VITASAFE_ADMIN_PASSWORD='UNA_CLAVE_DE_PRUEBA_LARGA_Y_UNICA'
npm start
```
Windows PowerShell:
```powershell
cd vitasafe-web
$env:VITASAFE_ADMIN_PASSWORD='UNA_CLAVE_DE_PRUEBA_LARGA_Y_UNICA'
npm start
```
Abrir `http://localhost:3000` en el mismo equipo. Para probar en otro dispositivo, usar un túnel privado o configuración de red segura: el servidor escucha solo `127.0.0.1` por defecto.

El correo propietario preconfigurado es `josealvarez02a@gmail.com`, pero **Google OAuth aún no está conectado**. El inicio de sesión actual utiliza una contraseña de desarrollo proporcionada mediante variable de entorno, **no adecuada para exposición pública**.

## Modo privado y activación
El proyecto comienza con `private_mode=true` y `orders_enabled=false`. Inicia sesión como administrador y utiliza Configuración. El botón de publicación está condicionado a datos comerciales básicos, políticas, atención, Libro de Reclamaciones y stock real. **No publiques en internet sin endurecer seguridad, revisar cumplimiento legal y configurar infraestructura real**.

## Qué funciona hoy
- Vista responsive y animaciones respetuosas con movimiento reducido.
- Productos editables, imágenes PNG/JPG/WebP pequeñas cargadas como data URL, precios y stock.
- Carrito local y pedidos persistidos en SQLite con código, secreto de seguimiento e idempotencia.
- Descuento de stock con transacciones; cancelación con devolución de stock.
- Registro de ventas de WhatsApp/Instagram/TikTok/presencial.
- Estados de pedido, costo de delivery, fecha confirmada y horario estimado editables.
- Formularios de consultas y reclamaciones, constancia con enlace privado, bandeja administrativa y respuestas registradas.
- Membresías de alta manual y registro de lotes/vencimientos.
- Configuración de datos comerciales, atención, QR y módulos.

## Pendiente antes de abrir al público
1. Autenticación con Google real (OAuth), control de roles y sesiones de producción.
2. Integración real de pagos con tarjeta, verificación de webhooks, conciliación y comprobantes. Los pagos con QR se confirman manualmente, nunca mediante capturas sin verificar.
3. Proveedor de correo para confirmaciones, avisos de vencimiento y respuestas; calendario Google opcional con consentimiento.
4. Libro de Reclamaciones validado con formato oficial, todos los campos legales, protección de datos, plazos y mecanismo de respaldo.
5. Validación legal de privacidad, comercio electrónico, RUC, tratamiento de datos sensibles y políticas.
6. Subida de imágenes a almacenamiento dedicado, no data URLs en SQLite; antivirus/límites y controles de acceso.
7. Protección contra abuso: rate limiting, CAPTCHA cuando proceda, monitoreo, backups, TLS, recuperación, logs y pruebas de carga.
8. Cotización real de delivery inDrive: operación manual; no hay integración con inDrive.
9. Carga de fotos reales de los kits, manuales clínicamente revisados, precios definitivos y ubicación exacta de recojo.
10. Rediseño de servidor para despliegue escalable: SQLite local no es adecuado para despliegues efímeros/serverless sin disco persistente.

## Datos
`data/vitasafe.sqlite` se crea automáticamente. **No compartas esta base de datos si contiene clientes**. Copia de seguridad con la app detenida o con mecanismo de backup SQLite adecuado. No hay envío de datos a terceros desde este prototipo.

## Pruebas
```bash
npm test
```

## Nota importante
Este es un **prototipo privado utilizable y extensible**, no un ecommerce certificado ni un servicio listo para producción. Se ha priorizado no fingir integraciones que requieren cuentas externas. El precio de S/59 de Care es piloto, no una oferta activada.


## Versión modular 0.2 — mejoras de seguridad y diseño
- Identidad visual con corazón, ECG y hoja en `public/assets/vitasafe-heart.svg`.
- Tema claro/oscuro persistido en el navegador (`public/js/theme.js`).
- Botón público discreto **Iniciar sesión**. El visitante no necesita cuenta para comprar cuando la tienda esté habilitada.
- Cambiar contraseña desde **Panel → Configuración → Seguridad de la cuenta**; se guarda un hash scrypt con sal y se cierran las sesiones. La contraseña inicial de `VITASAFE_ADMIN_PASSWORD` es solo para el primer acceso; después del cambio se usa el hash persistido en la base de datos.
- Limitación básica de intentos de login por IP (memoria de proceso). Antes de publicar se necesita protección distribuida, HTTPS, supervisión y auditoría.
- `HOST=0.0.0.0` permite escuchar en un servicio web; por defecto continúa en localhost.
- **No desplegar en Render con SQLite en disco efímero**: usar almacenamiento persistente con respaldos o migrar a una base de datos administrada. `DATA_DIR` debe apuntar a almacenamiento persistente.

### VS Code (Windows PowerShell)
1. Instala Node.js 22+ y abre esta carpeta desde **Archivo → Abrir carpeta**.
2. En **Terminal → Nueva terminal**, configura la clave inicial (no la subas a GitHub): `$env:VITASAFE_ADMIN_PASSWORD='tu-clave-larga-y-unica'`.
3. Ejecuta `npm test` y luego `npm start`. No se necesita `npm install` porque solo usa módulos nativos.
4. Abre `http://localhost:3000`. En **Iniciar sesión** usa la clave inicial; luego cámbiala en **Configuración**.
5. Para detenerlo, presiona `Ctrl+C`.

**Nota:** el diseño está separado por recursos; la lógica principal heredada continúa en `server.js` y `public/app.js` para preservar las funciones originales. La división completa por controladores/rutas se hará en una migración posterior con pruebas de regresión.


## VitaSafe v0.3 — catálogo, horarios y pruebas en móvil

- **Editar kits:** iniciar sesión → Mi panel → Catálogo y productos → Editar. Incluye imagen referencial (PNG/JPG/WebP hasta 1 MB), vista previa, nombre, descripción, contenido, precio en soles, stock, activación y selector de iconos. Las imágenes se guardan en SQLite como data URL; antes de una tienda grande conviene migrarlas a almacenamiento de objetos.
- **Pedidos:** se elige día y hora, entre las 08:00 y las 22:00 de Lima, con al menos 60 minutos de anticipación. El servidor valida la fecha y hora incluso si se manipula el navegador. La entrega sigue pendiente de confirmación. El horario se aplica provisionalmente todos los días.
- **Acceso por teléfono en la misma red:** iniciar con `npm start`, averiguar la IPv4 de la laptop con `ipconfig`, y abrir en el teléfono `http://IP-DE-LA-LAPTOP:3000`. Ambos deben usar el mismo Wi-Fi, Windows Firewall debe permitir Node.js en redes privadas. **No** usar `localhost` en el teléfono: allí significa el propio teléfono. No abrir puertos en el router ni usar esta dirección por internet.
- **Nombre público:** la URL `https://<nombre>.onrender.com` llegará al desplegar Render; aún no hay despliegue. Render requiere almacenamiento persistente para SQLite; no usar disco efímero para pedidos reales.
- **Conservar los datos:** si ya existe `data/vitasafe.sqlite`, copiar esa carpeta a la nueva versión con el servidor detenido. No sobrescribir la base con una vacía. La migración agrega la columna `requested_time` automáticamente.
- **Pruebas:** `npm test`. El servidor ahora escucha en `0.0.0.0` para permitir pruebas en LAN; en producción proteger la administración con HTTPS y sesiones seguras.
