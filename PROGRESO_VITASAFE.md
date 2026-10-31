# Progreso VitaSafe

## Punto de continuidad

- Versión desplegada en pruebas: **0.10.0-preview**, NO v1.0 lista para lanzamiento.
- Rama: `v06-postgres-excel-onedrive`; PR #2 en borrador, sin fusión.
- Último código verificado y desplegado: `c28becd665777946d9ee5298e225d367c7d9b7c8`.
- Último commit confirmado de evidencia: `65029696b25bcde00215c256fb7f0d9cad0ec3c7` (capturas de navegador; Excel en edbdda954aeb44c6bbccfbd9852e34e534e01785).
- Despliegue confirmado Live: `dep-dbin7rou01pc73ddud40`.
- Servicio permitido: `srv-dbf1pi0473hc73bi5kog`, `vitasafe-v06-pr2-test`.
- Main y servicio público excluidos. DEMO_MODE=true, autoDeploy=no, sin pagos ni correos reales.

## Auditoría inicial y decisiones

Conservados: HTTP Node, pg, catálogo existente, autenticación y sesiones, comercio ficticio commerce_*, inventario transaccional, ExcelJS y Microsoft OAuth. Las 32 pruebas previas pasaron antes de ampliar el código. Las tablas platform_* son aditivas, no reescriben pedidos ni catálogo. No se borra SQLite ni se migran registros descartados por el propietario.

El estado v0.9 tenía un laboratorio administrativo, no un checkout comercial completo. El registro de clientes permanece bloqueado en demostración; no se habilitan cuentas reales para probar Premium. La nueva página Mi suscripción está preparada para sesiones cliente y su aislamiento se prueba con sesiones ficticias locales. No se crea una puerta de entrada alternativa al administrador.

## Implementación v0.10

- Conoce VitaSafe en portada, texto autorizado editable y enlaces discretos.
- Nuestra organización, misión, visión, valores, propósito y enfoque. Apartados legales/historia/calidad pendientes en borrador.
- Editor de páginas, categorías y recursos, revisión editorial, publicar/archivar, vista previa, publicación diferida por fecha.
- Biblioteca gratuita/Premium, guía web, imagen, PDF y MP4 privados en PostgreSQL; 1 MB/archivo, cuota 20 MB de ensayo. Portada opcional, visor y descarga comprobada por servidor. No se sirven archivos Premium desde public/.
- Información esencial no puede marcarse Premium. Editar un recurso invalida su aprobación y lo devuelve a borrador.
- Plan anual sin precio inicial definitivo; confirmaciones exclusivamente simuladas para usuarios @example.invalid; términos, renovaciones idempotentes, cancelación conservando período, suspensión y revocación de períodos.
- Historial de intervención con actor, motivo y fecha. Reanudar no crea pagos ni períodos.
- Excel adicional con 17 hojas (10 existentes + 7 de membresías), IDs de cliente sin nombres/correos. Ingresos simulados de membresías separados de pedidos; ARR no se inventa.
- Cola durable con idempotencia, arrendamiento, reintento y error sanitizado; transporte simulado, SIN envíos externos.
- Siete propuestas privadas de kits y campos editables. No reemplazan ni se sincronizan todavía con el catálogo comercial existente.
- Copia completa ampliada y envoltura AES-256-GCM con clave separada; CLI de exportación y verificación sin imprimir secretos.
- Corrección del carrito de ensayo: actualiza cantidades con el evento input.

## Verificación incremental

Suite ampliada final: 47 pruebas aprobadas localmente y en Render, cero fallos. Incluye ediciones concurrentes, recuperación de trabajos interrumpidos y permisos HTTP de descarga. Incluye revisión/publicación, autorización Premium, año bisiesto, renovaciones concurrentes, cancelación/suspensión/reembolso, cola, 17 hojas, respaldo/restauración local y cifrado/tamper. Render npm ci informó cero vulnerabilidades. Las pruebas locales usan PGlite y no equivalen por sí mismas a PostgreSQL 18 remoto ni a móvil real.

## Límites y bloqueos que NO se ocultan

- v1.0 comercial no alcanzada. Falta unificar el modelo de laboratorio con la tienda definitiva, checkout invitado/cliente completo, recuperación de cuenta y verificación de correo, variantes, componentes de kits y delivery operativo integrado.
- Premium es un motor de ensayo: no hay afiliación, cobro real, renovación automática ni webhooks de membresía certificados; cambio de plan y reembolso parcial por transacción siguen pendientes. La revocación de ensayo afecta todos los períodos de esa suscripción y no afirma un reembolso bancario.
- Carga pequeña en PostgreSQL sirve para el entorno aislado; falta almacenamiento privado definitivo, escáner antimalware, transcodificación y subtítulos. Firmas/magic bytes y bloqueo básico PDF no son un antivirus. No publicar contenido clínico sin revisión profesional.
- Sin archivos Premium externos: no se usan enlaces públicos que eludan permisos. Videos externos y galería múltiple quedan pendientes. Bloquear la descarga no impide que quien puede visualizar copie/capture el contenido.
- Edición guarda en borrador y retira la versión pública hasta volver a publicar; todavía no hay dos versiones simultáneas borrador/publicada.
- Estadísticas son solicitudes agregadas por día, no usuarios únicos; falta protección distribuida contra abuso y análisis de tráfico.
- Cola implementada, no integrada aún con todos los eventos heredados ni proveedor de correo. No hay garantía de horario en Render Free dormido.
- OneDrive no configurado/consentido; sincronización automática sigue desactivada y no incluye aún este reporte ampliado sin aprobación.
- Copia cifrada local y restauración en base vacía probadas; falta copia EXTERNA conservada y restauración PostgreSQL remota. Base Free vence 24/11/2026, no sirve como infraestructura permanente.
- Móvil físico/emulador, revisión WCAG completa, carga distribuida y revisión de seguridad independiente pendientes.

## Manual resumido

Entrar con cuenta administrativa existente → Datos y Excel → Contenidos y suscripciones. Elegir módulo/registro, editar texto plano, guardar borrador. En recurso: subir archivo, conservar identificador, elegir formato/acceso/categoría, guardar, previsualizar, confirmar revisión editorial y publicar. No marcar aprobado hasta verificar profesionalmente el material. Retirar publicación archiva sin borrar.

En planes: precio propuesto en céntimos (vacío por defecto), beneficios y condiciones editables. Para probar: simular pago anual del cliente ficticio; cancelar/suspender/reanudar/revocar exige motivo. Exportar informe registra auditoría y no expone nombres ni correos. Mi suscripción solo devuelve la cuenta autenticada.

Para respaldo: configurar `VITASAFE_BACKUP_KEY` (32 bytes aleatorios codificados base64) en un almacén seguro, distinta de claves OAuth. Ejecutar `node scripts/backup-secure.js /ruta/privada/copia.enc` desde entorno autorizado con DATABASE_URL interna. El archivo se crea con modo 0600 y sin sobrescribir. Verificar con `node scripts/backup-secure.js /ruta/privada/copia.enc --verify`. Custodiar la clave aparte. Nunca subir copia ni clave a GitHub.

Restauración: aprovisionar destino vacío autorizado, abrir adaptador, descifrar con src/backup-secure y ejecutar recovery.restoreEmpty. Rechaza destinos con datos, checksum inválido y corrupción. Comparar todas las filas, probar inicio de sesión, permisos y reportes antes de cambiar conexiones. No borrar ni apuntar al destino original. La prueba local no sustituye este ensayo externo.

Reversión: en SOLO el servicio aislado, desplegar el commit v0.9 anterior. Las tablas platform_* permanecen, no se borran. No volver a un respaldo sobrescribiendo datos sin autorización.

## Intervención del propietario

Aprobar catálogo auténtico, fotos, costos/precios/cobertura, beneficios y condiciones de Premium; responsable editorial y revisión sanitaria; identidad/RUC/contacto y textos legales; proveedor de pagos y credenciales sandbox introducidas en Render seguro; aplicación Microsoft y consentimiento OAuth; proveedor de correo y dominio verificado; almacenamiento/infraestructura permanente y presupuesto. Sin contraseñas por chat. Ninguna contratación realizada.

Para Perú: mantener como borradores los datos empresariales, términos, privacidad/datos personales, cambios/devoluciones, Libro de Reclamaciones, contacto, entrega, suscripciones y comprobantes. Identificar titular/RUC, domicilio/canales, finalidades y plazos de datos, proveedores/transferencias, cobertura y condiciones, emisión SUNAT, tratamiento de reclamos y clasificación sanitaria por componente con asesoría. No se atribuyen registros ni certificaciones.

## Registro histórico — 26 de octubre de 2026 (Lima)

- Código publicado y desplegado: `b743a865e15f767592e8f7cb958509249146626a`.
- Despliegue: `dep-dbfqu7gm7kps739hhaf0`, Live. Primer despliegue v0.10: `dep-dbfqsbjrjlhs73ee6vt0`, Live.
- Los 18 archivos iniciales y los tres ajustes posteriores se compararon con GitHub mediante SHA de blob: coincidencia exacta.
- Main continúa en `d3ba56bebde80c672246c05fc8fa19a67b7d0415`; PR #2 continúa en borrador, sin fusionar. AutoDeploy permanece desactivado.
- Verificación real HTTP dentro de Render: PostgreSQL, contraseña administrativa existente, rechazo de contraseña incorrecta, permisos cliente/administrador, bloqueo de registros/ventas, importación Excel controlada y validación de inventario.
- Módulo editorial: crear, aprobar, publicar y archivar un registro FICTICIO; confirmación anual simulada idempotente; cancelación conserva período y revocación impide acceso; informe de 17 hojas.
- Tras arrancar otra instancia, `platform.previous_record=true`, `commerce.previous_order=true` y `previous_marker=true`: persistencia comprobada de registros anteriores.
- Navegador real: inicio de sesión mediante entrada segura del propietario; dashboard y nuevo gestor abrieron; Conoce VitaSafe y Nuestra organización mostraron el texto; Mi suscripción sin sesión exigió acceso.
- Correcciones finales: bloqueo de fila al editar, cuota de archivos transaccional, fechas ISO en editor, retirada del precio piloto y beneficios no aprobados en portada.
- Pendiente en navegador: subir/visualizar/descargar imagen, PDF y MP4, manipular membresía ficticia y descargar Excel ampliado. No se declara esta prueba terminada por la mera presencia del formulario.
- Evidencia visual: `docs/V010_ORGANIZACION.jpg`.

Próximo paso exacto: abrir el gestor del entorno aislado con una sesión administrativa válida; subir fixtures técnicos sin contenido clínico, guardar/revisar/previsualizar, probar descargas y retirar su publicación. Descargar el Excel de 17 hojas, verificar su contenido y actualizar este registro. Continuar los bloqueos v1.0 enumerados arriba sin activar comercio real.

## Resultados de navegador y continuidad — 28 de octubre de 2026 (Lima)

### Pruebas reales completadas

- Administrador: entrada segura con contraseña existente, panel y sesión persistente; ninguna contraseña se cambió o expuso.
- PDF, PNG y MP4 ficticios: subida, previsualización y descarga con bytes idénticos al original. MP4 de dos segundos reproducido hasta finalizar. PDF público descargado sin sesión; imagen pública cargó a 640x360; video Premium negó acceso a visitante anónimo.
- El inventario privado confirmó exactamente tres archivos técnicos. Reintentar la carga del PDF idéntico devolvió el mismo identificador, sin duplicación. El selector editorial se actualiza inmediatamente al guardar/publicar/archivar.
- Los tres recursos fueron archivados, revisión 4, sin borrar archivos ni datos. La biblioteca dejó de mostrarlos. No volver a crearlos ni cargarlos para retomar pruebas.
- Membresía manual: se inspeccionaron seis períodos históricos revocados antes de crear un período anual ficticio nuevo. Siete períodos históricos en total, vencimiento 28/10/2027. Recorrido desde el panel: Vigente → Cancelado con acceso vigente → Suspendido → Vigente → Reembolsado. La última acción revoca únicamente el acceso de ensayo, no constituye una operación bancaria.
- Cancelar/reanudar no añadió pagos ni períodos. Tras un nuevo despliegue la membresía manual conservó su estado y vencimiento hasta que se revocó expresamente desde el panel.
- Excel descargado de verdad desde el navegador y leído con ExcelJS: 17 hojas, suscripción manual activa, S/1.00 de ingresos ficticios netos y S/0.00 de cobros reales, antes de la revocación final. Archivo confirmado en GitHub: docs/V010_INFORME_FICTICIO.xlsx (commit edbdda954aeb44c6bbccfbd9852e34e534e01785).
- La descarga posterior a revocar devolvió una ruta, pero el archivo no estuvo disponible en el entorno de análisis ni en la ruta del navegador. NO se afirma haber validado ese segundo archivo.

### Identificadores para evitar duplicados

| Recurso | ID del recurso | ID del archivo | Estado final |
|---|---|---|---|
| PDF técnico | 694ab9bb-c89b-41ab-b0bd-ab49987cf2ba | faa495a0-e6d1-47d8-ae00-3034aaf5278f | Archivado |
| Imagen técnica | 3ec86ba3-bca1-4ab3-ba80-84dc414c662a | 7f74ac3f-94e0-468b-8f54-731ed2f93a0f | Archivado |
| MP4 Premium técnico | d59fc4bb-f4c3-416c-adf8-8542c9eb8ad1 | d079dd21-1f73-40a7-b211-3baf4e0efe73 | Archivado |

Membresía manual: 9d1021af-a16c-43ac-8339-307d4c11ffa3, cliente ficticio DEMO-SUB-5c46ce376d84468a. No repetir el pago para recuperar estado. Las ejecuciones automáticas posteriores usan planes separados y archivados.

### Defectos corregidos

1. Cargas repetidas: reutilización por MIME/SHA-256 bajo bloqueo transaccional; auditoría independiente de reutilización, sin alterar aprobación editorial ni permisos.
2. Selector de registros: mantiene la selección y refleja cambios sin obligar a recargar.
3. Prueba de arranque: antes reutilizaba el plan manual y revocaba sus períodos al terminar. Ahora cada ejecución crea y archiva su propio plan. Dos ejecuciones consecutivas preservan una membresía manual en la prueba HTTP local; corroborado después de desplegar en Render.
4. Avisos de pedidos: el registro transaccional commerce_outbox se conecta con platform_jobs usando identificadores estables. No duplica avisos al reintentar; el trabajo conserva solo ID de pedido, audiencia y marca ficticia, sin nombres/correos/direcciones. El botón prepara hasta 100 y procesa hasta 10 por operación con transporte simulado. No hay envío externo ni automatización de correo activada.
5. Panel de avisos: totales globales por estado separados del listado limitado a los 100 más recientes, para no confundir avisos antiguos procesados con los nuevos pendientes.

### Pruebas automatizadas e integración

50 pruebas locales aprobadas, cero fallos. Las 50 también pasaron en el build del despliegue de notificaciones 18b96d93a7eac9b2641bed093406c608a2dc96ed, dep-dbhbh29srm7s73fcf5l0 Live. Esta compilación informó 0 vulnerabilidades en npm ci; no se cambiaron dependencias.

Runtime real en Render: PostgreSQL, autenticación y roles, registro/ventas bloqueados, importación controlada de inventario, checkout ficticio HTTP, cuatro reintentos concurrentes, pago simulado, estados, reembolso y recepción física, stock conservado, checksum de respaldo, editorial, anualidad, permisos, reporte de 17 hojas y avisos simulados. previous_record/previous_order/previous_marker=true.

Las pruebas locales utilizan PGlite. Un transporte simulado NO prueba la entrega de correo. Un checksum local NO prueba respaldo externo ni restauración remota. Los ensayos no acreditan disponibilidad de una pasarela real.

### Pendientes prioritarios

- Acceso positivo en navegador de un cliente Premium distinto con credenciales legítimas y prueba de sus archivos privados. Se verificó administrador y visitante sin sesión, no se falsificaron sesiones de cliente.
- Segundo Excel posterior a revocar: repetir descarga y analizarlo cuando la entrega de archivos del navegador funcione.
- Catálogo definitivo: siete propuestas privadas aún no integradas con la tienda heredada; fotos, precios, contenido y stock reales pendientes del propietario. No reemplazar datos existentes con ejemplos.
- Checkout invitado/cliente integrado, recuperación de cuenta, componentes/lotes/vencimientos, delivery y notificaciones de esos flujos.
- Móvil/emulador, revisión WCAG completa y seguridad/concurrencia de los módulos futuros.
- Pasarela con credenciales sandbox, Microsoft OAuth autorizado, proveedor de correo, almacenamiento privado definitivo/antimalware y copia externa cifrada con restauración PostgreSQL remota.
- Infraestructura permanente antes del vencimiento previsto de la base Free (24/11/2026). No se contrataron planes.

### Próximo paso exacto

Totales de avisos comprobados en navegador: pendientes 194 → 184; simulados sin envío 50 → 60. Total 244 conservado, lote de diez sin nuevos duplicados ni envío real. Evidencia: docs/V010_AVISOS.jpg. Runtime confirmado 29/10/2026 03:09 UTC: PostgreSQL, DEMO_MODE=true, previous_record/previous_order/previous_marker=true y order_notifications_simulated=true.

Continuar la integración del catálogo del editor con la tienda de ensayo, mediante una proyección de campos públicos que excluya costos y sin activar pedidos públicos. Para probar Premium cliente se necesita una cuenta ficticia con inicio de sesión legítimo; no cambiar la contraseña administrativa ni añadir bypass.

PR #2 continúa en borrador. Main debe seguir en d3ba56bebde80c672246c05fc8fa19a67b7d0415. DEMO_MODE=true, autoDeploy=no. V1.0 comercial NO alcanzada.


## Continuidad confirmada — 30 de octubre de 2026 (Lima)

Código al retomar: 01ca17e31f46f115e67d0e4308b494387b449ab1. Render Live confirmado al retomar. PR #2 borrador; main sigue en d3ba56bebde80c672246c05fc8fa19a67b7d0415.

### Terminado y verificado

- Integración del editor comercial existente con PostgreSQL en el entorno aislado. Nombre, descripción, categoría, imagen PNG/JPG/WebP, precio, contenido, stock, publicación y metadatos privados. Costo interno no aparece en la respuesta pública. Siete categorías disponibles sin inventar precios ni reemplazar productos.
- Guardado transaccional, revisión optimista para rechazar ediciones simultáneas, ajustes de stock en inventory_events y auditoría con actor. Despublicar conserva el registro.
- FAQ integrada en el gestor editorial existente: pregunta/respuesta, categoría, orden, borrador, publicación y archivo. Vista pública con respuestas desplegables, texto escapado y enlace en el pie de página.
- Carrito existente: excluye productos despublicados/sin precio/sin stock, limita cantidades a stock y recupera almacenamiento local inválido.
- 54 pruebas locales y 54 en cada build Render, cero fallos. Runtime sobre PostgreSQL confirmó catalogue_editor, catalogue_cost_private y faq_lifecycle, además de las verificaciones anteriores y 17 hojas Excel.
- Navegador: FAQ creada, publicada, expandida y archivada. ID 533d091e-f32f-4496-8672-ae13a413bd8f, versión final 3. No volver a crearla. Evidencia local docs/V010_FAQ_VERIFICADA.jpg.
- Navegador detectó Nuevo producto deshabilitado por la regla visual antigua. Corregido en 01ca17e; después se verificó que el botón abre el formulario con precio, costo privado, stock e imagen.

### Pendiente técnico que todavía puede resolverse

- Completar desde navegador guardar un producto ficticio con imagen, editarlo, verlo en catálogo/carrito y despublicarlo. El formulario se abrió, pero la sesión se interrumpió ANTES de rellenarlo o guardar; no se creó un producto manual en esa prueba.
- Comprobar subtotal y cantidades desde navegador, sin aceptar pedidos reales. El checkout público permanece bloqueado. El motor de compra ficticia está verificado por HTTP, pero su conexión integral con el carrito público no está terminada.
- Integrar componentes, lotes, vencimientos y delivery operativo. Existen módulos previos; auditar antes de extenderlos.
- Completar configuración comercial desde panel, métodos de pago/plantillas seguros, recuperación de cuenta, cliente Premium legítimo y pruebas móviles/accesibilidad.
- Validar descarga del Excel posterior a revocación. La exportación de 17 hojas funciona en integración; la transferencia del segundo archivo desde el navegador no quedó disponible en las sesiones previas.
- Catálogo ampliado y FAQ siguen limitados por VITASAFE_TEST_ENV=true y DEMO_MODE=true. Todavía requiere revisión de habilitación para producción; no basta desactivar DEMO_MODE.

### Pendiente que requiere intervención del propietario

- Datos, fotografías, precios, costos y condiciones comerciales definitivos; datos legales y revisión profesional.
- Credenciales sandbox del proveedor de pago elegido, Microsoft OAuth, proveedor de correo; no se activaron integraciones reales.
- Destino externo de copias cifradas, presupuesto e infraestructura permanente; restauración remota pendiente. Atender vencimiento previsto de PostgreSQL Free 24/11/2026.

### Próximo paso exacto

Abrir SOLO vitasafe-v06-pr2-test con sesión administrativa válida. En Productos, crear un registro inequívocamente FICTICIO, comprobar imagen/precio/costo privado/stock, recorrer carrito y despublicarlo; registrar su ID para evitar duplicados. No modificar los productos existentes ni el fixture automático DEMO-CATALOGUE-VERIFY. Luego continuar los pendientes de integración. No declarar v1.0 terminada ni solicitar lanzamiento mientras falten verificaciones críticas.


## Prueba real de catálogo completada — 30 de octubre de 2026 (Lima)

Autenticación administrativa realizada de nuevo mediante entrada segura de credenciales existentes. Panel abierto correctamente; contraseña no cambiada ni revelada.

- Producto manual único: `DEMO-BROWSER-CATALOGUE-20261030`, nombre `FICTICIO · Prueba catálogo 30 octubre`. No volver a crearlo.
- Creado desde Productos con PNG ficticio, categoría Universitario, precio de ensayo S/12.34, costo privado S/4.32 y stock 2. Al reabrir el editor, se conservaron precio, costo, stock e imagen. No son datos comerciales definitivos.
- Visible en catálogo con imagen y precio. Carrito: una unidad S/12.34; dos unidades S/24.68; tercer incremento rechazado por límite de stock.
- Formulario de checkout invitado abrió. No se envió pedido ni se verificó en esta prueba una compra completa; el bloqueo de ventas sigue validado por pruebas HTTP anteriores.
- Despublicado desde el panel, sin eliminarlo: fila permanece con Visible=No y stock 2. Desapareció del catálogo y la bolsa se normalizó automáticamente a cero.
- Evidencia: `docs/V010_CATALOGO_VERIFICADO.jpg`.
- Defecto de accesibilidad observado: descripción, contenido, mantenimiento, reposición e información adicional no tenían asociación label/control; categoría e imagen tampoco. Se corrigieron las asociaciones HTML en public/app.js, sin cambiar lógica de autenticación o comercio.

Los pendientes de producto manual y subtotal de la sección anterior quedan resueltos por esta evidencia. Permanecen pendientes checkout integral, cliente Premium positivo, Excel posterior a revocación, componentes/lotes/delivery, configuración ampliada y respaldos/restauración externa. La sesión no acredita pruebas físicas en móviles ni lanzamiento comercial.

Siguiente paso: verificar las etiquetas accesibles después del despliegue de la corrección; continuar con descarga Excel posterior a revocación y recorridos de cliente legítimo. Conservar este producto despublicado y los recursos archivados. Main, PR borrador y DEMO_MODE=true se mantienen.


Corrección de accesibilidad: commit `c28becd665777946d9ee5298e225d367c7d9b7c8`. Suite repetida tras el cambio: 54/54 local y 54/54 durante compilación Render, cero fallos. Despliegue aislado `dep-dbin7rou01pc73ddud40` iniciado manualmente con autoDeploy=no.

Excel posterior a revocación: se hizo UN intento desde el enlace Exportar informe de ensayo y suscripciones. El navegador notificó descarga completada, pero el archivo indicado no existía ni en el directorio compartido ni en el entorno del navegador tras esperar cinco segundos. No se afirma verificación de contenido, no se repitieron descargas ni se modificaron membresías.


### Último estado verificado de esta sesión

Código desplegado `c28becd665777946d9ee5298e225d367c7d9b7c8`, despliegue `dep-dbin7rou01pc73ddud40` Live (31/10/2026 04:53 UTC; 30/10/2026 Lima). 54 pruebas locales y 54 en Render, cero fallos. El blob remoto de public/app.js coincide exactamente con el archivo probado: `5fdb931e10e2371ee1738541ca589f9102dd91ad`.

Runtime sobre PostgreSQL confirmó catálogo/costo privado/FAQ, roles, membresía anual, idempotencia, cancelación y reembolso, 17 hojas, cuatro reintentos concurrentes, inventario conservado, registros anteriores presentes y DEMO_MODE=true. OneDrive sigue sin configurar ni conectar.

Después del reinicio: sesión administrativa conservada; producto manual sigue despublicado, con precio S/12.34, costo S/4.32 y stock 2. El editor conserva imagen. Navegador identifica por nombre Descripción, Contenido del kit, Categoría del kit, Mantenimiento, Reposición, Información adicional e Imagen del producto. Corrección de accesibilidad verificada en el despliegue, no solo en código. No equivale a auditoría WCAG completa.

Capturas de catálogo y FAQ guardadas en commit `65029696b25bcde00215c256fb7f0d9cad0ec3c7`. PR #2 permanece borrador; main permanece d3ba56bebde80c672246c05fc8fa19a67b7d0415. AutoDeploy sigue desactivado. Ninguna modificación al servicio comercial.

**Próximo paso exacto actualizado:** no repetir creación del producto ni las pruebas ya completadas. Auditar la conexión entre carrito/checkout heredado y motor commerce de ensayo antes de modificarla; completar una compra ficticia integrada sin abrir el endpoint público de pedidos. Mantener pendiente la prueba positiva de cliente Premium con cuenta ficticia legítima y la entrega utilizable del Excel posterior a revocación. No activar pagos/correos, no fusionar PR ni declarar v1.0 lista.
