# VitaSafe v0.9 preview — preparación hacia v1.0

Estado: desarrollo de ensayo, NO apto para recibir clientes reales. Continuación del PR #2, sin fusionar. Main y servicio público excluidos del trabajo. DEMO_MODE=true en Render.

## Arquitectura y auditoría

Se conserva el servidor HTTP Node, frontend HTML/CSS/JS, adaptador asíncrono pg, esquema vitasafe_stage_app, catálogo original, administración, sesiones scrypt, exportaciones Excel y OAuth de v0.6. No se borran módulos ni se sustituyen los archivos duplicados históricos de la raíz. Los archivos servidos son public/*.

Hallazgos corregidos: el registro de cliente emitía vs_customer mientras las lecturas exigían vs_session; la colisión de correo PostgreSQL no devolvía 409; faltaba límite de longitud de contraseña al verificar; se añadieron cabeceras defensivas y rechazo de Sec-Fetch-Site cross-site. Las pruebas antiguas obsoletas fuera del script npm test no constituyen evidencia de la versión actual.

Nuevo motor src/commerce: tablas commerce_* exclusivamente ficticias, con claves foráneas, restricciones, transacciones, bloqueo de filas y bloqueo transaccional para idempotencia. Separarlas evita mezclar ingresos simulados con el historial v0.6. La integración comercial definitiva entre ambos modelos queda pendiente; NO basta con apagar DEMO_MODE.

## Etapas

- v0.7: motor de pedidos y líneas, reservas atómicas, permisos por propietario/rol, ajustes de stock, cancelación, vencimiento revisable. No se ha habilitado un alta pública de clientes.
- v0.8: proveedor simulador firmado; contrato configurable y adaptador Mercado Pago sandbox para crear, consultar/conciliar y devolver pagos, con transporte simulado en pruebas. Sin credenciales ni llamadas reales a pasarelas. Validador de firma HMAC preparado. No hay un webhook comercial público ni formulario tokenizador conectado.
- v0.9 preview: laboratorio administrativo responsive, informe PostgreSQL de 10 hojas, recuperación en destino vacío y reintentos OneDrive. Las cuatro plantillas técnicas v0.6 y el libro de revisión de 15 hojas se conservan.
- v1.0 candidata: NO alcanzada. Requiere completar y certificar los pendientes siguientes, no únicamente cambiar el número de versión.

## Funcionamiento de ensayo

Entrar en la tienda de pruebas con la cuenta administrativa existente; Panel → Datos y Excel → Abrir laboratorio de compra ficticia, o /ensayo.html. Preparar catálogo ficticio, seleccionar cantidades, crear pedido y simular rechazo/aprobación. Seguir confirmado → en preparación → enviado → entregado. Simular devolución monetaria y después recepción física: solo esta última repone stock si ya fue enviado. La cancelación de un pedido pagado exige devolución confirmada.

Cada pedido reserva una vez. Reintentos idénticos comparten pedido; misma clave con otro carrito se rechaza. Los eventos repetidos no vuelven a descontar inventario. Un pago posterior al vencimiento se rechaza para conciliación manual; no resucita reservas. El botón Revisar reservas vencidas libera reservas pendientes. La tarea periódica durable para expiración sigue pendiente.

Los clientes, direcciones, precios e imágenes del laboratorio son ficticios. No hay compra, despacho, reembolso ni correo real. commerce_outbox registra las notificaciones simuladas del administrador y cliente; aún falta proveedor de mensajería, entrega, reintentos y consentimiento aplicable.

## Instalación y mantenimiento

Node >=22.16, npm ci y npm test. Arranque npm start. DATABASE_URL debe introducirse solo en la configuración segura; usar la conexión interna de la base existente en Oregon. No abrir su acceso externo. No escribir secretos en GitHub, documentación o chat.

Variables del entorno aislado: DEMO_MODE=true, VITASAFE_TEST_ENV=true, COOKIE_SECURE=true, EXCEL_IMPORT_ENABLED=false, EXCEL_TEST_IMPORT_ENABLED=true, ONEDRIVE_AUTO_SYNC=false. Conservar VITASAFE_ADMIN_EMAIL y VITASAFE_ADMIN_PASSWORD existentes. El password se utiliza para alta inicial del propietario; no sobrescribe su hash ya guardado.

Render de pruebas: srv-dbf1pi0473hc73bi5kog, rama v06-postgres-excel-onedrive, autoDeploy=no. Build npm ci && npm test. Start node scripts/verify-isolated.js && npm start. El verificador usa la contraseña segura sin imprimirla, ejecuta el flujo HTTP y comprueba el pedido marcador del arranque anterior.

Reversión de código: desplegar el último commit v0.6 aafc7a6ab13b9ffe1b4574a4f4066f96d0e3bd21 en este servicio únicamente. Las tablas nuevas son aditivas; no hace falta borrarlas. No promover el código a main sin aprobación.

## Respaldos y recuperación

GET /api/admin/backup requiere administrador. Incluye tablas heredadas, tokens cifrados y tablas commerce_* cuando existen. Snapshot PostgreSQL REPEATABLE READ, checksum SHA256 y validación. Contiene hashes privados y tokens cifrados: almacenamiento privado y cifrado, nunca GitHub ni el reporte Excel.

src/db/recovery.restoreEmpty restaura solo en un destino completamente vacío. Rechaza corrupción, tabla desconocida y cualquier intento de sobrescribir registros. Pruebas locales reconstruyen otra base PGlite y comparan todas las filas. Eso NO acredita una restauración del PG18 de Render ni una copia externa durable del servicio real. La exportación comprobada en memoria tampoco es un respaldo conservado fuera de Render.

Antes de producción: definir RPO/RTO, copia externa automatizada cifrada, retención, alertas y ensayo periódico de restauración PostgreSQL. La base gratuita dpg-dbep767avr4c73bll9u0-a vence el 24/11/2026 a las 00:28 de Perú (dato de Render consultado el 25/10). No es infraestructura permanente. Ningún plan se contrató.

## Excel

Informe de ensayo: Resumen, Pedidos, Detalle pedidos, Inventario, Movimientos, Más vendidos, Ventas diarias, Ventas semanales, Ventas mensuales y Guía. Importes S/, fórmula de ticket y detalles, filtros y filas congeladas. Ingresos = pago aprobado y pedido no cancelado; los reembolsos quedan excluidos. Semanas lunes-domingo en Perú.

Las variaciones por periodo comparan grupos que tienen registros, y pueden ser periodos incompletos. El libro de demostración de 15 hojas con gráficos y ventanas equivalentes permanece independiente: todavía no se genera íntegramente desde PostgreSQL. No importar el informe analítico. Productos, inventario, pedidos históricos y reportes técnicos conservan los encabezados v0.6 y sus endpoints.

## OneDrive

OAuth personal consumers, PKCE, estado de un uso, tokens AES-GCM y Files.ReadWrite.AppFolder existentes. Se añadieron hasta tres intentos para fallos transitorios; errores 401 no se reintentan automáticamente. Si Retry-After supera cinco segundos se devuelve pendiente en vez de mantener una conexión bloqueada; no se reintenta anticipadamente en esa llamada. El nombre determinista diario sobrescribe el mismo reporte en lugar de crear duplicados.

Pendiente: aplicación Microsoft, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, ONEDRIVE_TOKEN_KEY (32 bytes base64) y APP_ORIGIN HTTPS en configuración segura. Autorizar después desde Panel → Datos y Excel → Autorizar Microsoft. El callback es APP_ORIGIN/api/onedrive/callback. Nunca enviar secretos por chat.

No se dispone de rutas verificadas de carpetas anteriores. Con el alcance mínimo solo se utiliza Apps/{nombre de aplicación}; acceder a otra carpeta puede requerir consentimiento adicional. Automatización desactivada hasta aprobación del Excel. Render Free duerme: un temporizador no garantiza un horario. Pendiente cola durable, reconciliación de subidas y prueba de revocación/rotación real.

Fuentes Microsoft: https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder y https://learn.microsoft.com/en-us/graph/throttling

## Seguridad pendiente para lanzamiento

Rate limiting distribuido, límite de abuso por cuenta/IP confiable detrás del proxy, verificación de correo y recuperación de contraseña, revisión de autorización del historial heredado, pruebas de carga con clientes PostgreSQL independientes, MFA administrativo si se adopta, alertas y retención de logs, páginas legales definitivas, respaldos externos y pruebas reales de pasarela. El nuevo modelo aún no reemplaza las operaciones comerciales heredadas. Los endpoints de ensayo exigen administrador + DEMO_MODE + VITASAFE_TEST_ENV; no son una puerta de acceso de clientes.

No se ha probado un dispositivo físico. El CSS se adapta a pantallas pequeñas; eso por sí solo no acredita pruebas móviles ni accesibilidad completa.

## Comparación de pagos para Perú — consulta 25/10/2026

Arquitectura elegida: motor de pedidos independiente del proveedor, importes enteros en céntimos, tokenización fuera del servidor VitaSafe, confirmación por consulta del proveedor después de verificar el webhook, referencia del pedido/moneda/importe y clave idempotente. Mercado Pago se usa como primer adaptador experimental por disponer de firma documentada y API de conciliación; no implica contratación ni selección comercial definitiva. No almacenar PAN/CVV ni confirmar por capturas o redirección del navegador.

| Proveedor | Medios y tecnología | Costos y abono observados | Pendiente contractual |
|---|---|---|---|
| CulqiOnline | Tarjetas y Yape; órdenes de billeteras documentan Yape/Plin; API, checkout, eventos y devoluciones | Ayuda publica nacional/Yape 3.44% + US$0.20; internacional 3.99% + US$0.20. Tratamiento de IGV depende del componente. Ayuda online indica desfase de dos días, sujeto a modalidad | RUC/identidad, afiliación, cuenta de abono, tarifa contractual, habilitación de cada billetera y seguridad de eventos |
| Mercado Pago | Tarjetas, Yape documentado; API/SDK, HMAC x-signature, consulta de pago y reembolsos. Plin no confirmado | Fuentes oficiales recuperadas muestran cifras distintas para Link de pago (3.49/3.29% + S/1 frente a resultado indexado 3.99/3.79% + S/1 + IGV). No extrapolar a Checkout ni fijar una comisión definitiva. Modalidades inmediata/14 días según producto | Cuenta comercial, aplicación, credenciales de prueba y productivas, confirmar tarifa/IGV/abono del producto exacto |
| Niubiz | Pago Web para carrito; verificar habilitación Yape y Plin por producto. Integración y certificación comercial por confirmar | Tarifario por giro disponible, pero no se obtuvo cotización completa de Pago Web. No usar precios de Pago Link/POS como equivalentes | Afiliación, RUC, cuenta, costos de alta/mensualidad/antifraude/fijo/IGV, abono, reversos y contrato API vigentes |
| Izipay | SDK web/móvil; tarjetas, QR, Yape y Plin Interbank documentados; sandbox API y notificaciones | Resultado oficial Online: referencia 3.44% + S/0.69, ambos más IGV. Condiciones y habilitación por cuenta; plazo exacto no verificado | Afiliación, cuenta, llaves, medios habilitados, tarifa internacional, abono, reembolsos y firma de notificación |

Fuentes oficiales: https://ayuda.culqi.com/portal/es/kb/articles/cual-es-la-comision-de-culqionline ; https://ayuda.culqi.com/portal/es/kb/articles/horarios-abonos-culqi ; https://docs.culqi.com/es/documentacion/pagos-online/ordenes-de-pago/billetera-moviles/ ; https://apidocs.culqi.com/ ; https://www.mercadopago.com.pe/developers/es/docs/your-integrations/notifications/webhooks ; https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/payment-integration/websites/yape ; https://www.mercadopago.com.pe/herramientas-para-vender/link-de-pago ; https://www.niubiz.com.pe/legales/tarifario-niubiz ; https://contactos.niubiz.com.pe/soluciones-de-pago/pago-web/ ; https://developers.izipay.pe/web-core/ ; https://developers.izipay.pe/api/ ; https://www.izipay.pe/izipay-online/

## Preparación comercial y legal peruana

- Titular: definir razón social/RUC, domicilio, contacto y régimen con asesoría contable. Emitir boletas/facturas y notas correspondientes; un Excel o correo de pedido no es comprobante SUNAT. Fuentes: https://www.gob.pe/7334-emitir-boleta-de-venta-electronica y https://www.gob.pe/7309-emitir-factura-electronica-sistema-de-emision-electronica-sol
- Libro de Reclamaciones: completar formato aplicable, constancia/copia, registro y atención dentro del plazo legal (15 días hábiles según Indecopi). Formulario actual no certificado. Fuentes: https://consumidor.gob.pe/libro-de-reclamaciones/ y https://www.gob.pe/institucion/indecopi/noticias/641594-modifican-reglamento-del-libro-de-reclamaciones-para-que-proveedores-atiendan-reclamos-y-quejas-de-clientes-en-15-dias-habiles
- Privacidad: evaluar Ley 29733 y reglamento vigente, responsable, finalidades/base jurídica, información y consentimiento, banco de datos, encargados/transferencias internacionales, derechos, retención e incidentes. Revisar aplicabilidad con asesor peruano. Fuente: https://www.gob.pe/institucion/minjus/noticias/1067368-ejecutivo-aprueba-nuevo-reglamento-de-la-ley-de-proteccion-de-datos-personales
- Kits: inventariar componentes y clasificar producto por producto con DIGEMID; verificar registro o excepción, proveedor, almacenamiento, lotes, vencimientos y autorizaciones del establecimiento que correspondan. No atribuir una autorización genérica al kit. Fuentes: https://www.digemid.minsa.gob.pe/rsDispositivos/ y https://www.digemid.minsa.gob.pe/webDigemid/registro-sanitario/dispositivos-medicos/
- Publicar términos y políticas solo después de decidir cobertura/plazos/precios reales, cambios, devoluciones y garantía aplicables. /preparacion.html es un borrador informativo, no sustituye las políticas definitivas.

## Costos e intervención del propietario

Reserva presupuestaria orientativa, NO cotización: US$20–50/mes para un arranque pequeño con servidor siempre activo, PostgreSQL permanente y respaldos; dominio, correo transaccional, almacenamiento, impuestos, tipo de cambio, tráfico extra y comisiones de pago se cotizan aparte. La página de precios recuperada no expuso una tabla numérica suficiente para confirmar el importe exacto. Confirmar el total en Render antes de contratar. Se conservan los planes Free existentes.

Render documenta suspensión tras 15 minutos sin tráfico, expiración PostgreSQL a 30 días y ausencia de respaldo administrado Free. Los planes pagos ofrecen recuperación, según plan. Fuentes: https://render.com/docs/free ; https://render.com/docs/compute-plans ; https://render.com/docs/postgresql-backups ; https://render.com/pricing

Acciones del propietario: aprobar proveedor/presupuesto y contrato; aportar catálogo/fotos/precios/cobertura auténticos; completar identidad tributaria y revisión legal/sanitaria; introducir credenciales sandbox en Render seguro; registrar aplicación Microsoft y consentir OAuth después de aprobar el Excel; aprobar infraestructura permanente y respaldo probado. No se requieren contraseñas por chat. La fusión del PR y el lanzamiento requieren aprobación separada después de cerrar las pruebas críticas.
