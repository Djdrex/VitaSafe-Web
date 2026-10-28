# Progreso VitaSafe

## Punto de continuidad

- Versión desplegada en pruebas: **0.10.0-preview**, NO v1.0 lista para lanzamiento.
- Rama: `v06-postgres-excel-onedrive`; PR #2 en borrador, sin fusión.
- Último código verificado y desplegado: `08ce19f16c91b94a2fe8e9b3ad3014aed5d5e89e`.
- Último commit confirmado de evidencia: `edbdda954aeb44c6bbccfbd9852e34e534e01785` (Excel de navegador).
- Despliegue confirmado Live: `dep-dbh160c9v7es73bj3vbg`.
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

## Continuación verificada — 28 de octubre de 2026 (Lima)

Punto de partida remoto: `7f53415237f1be1d19d619d65395fcf953ac9f81`. PR #2 sigue en borrador; main continúa en `d3ba56bebde80c672246c05fc8fa19a67b7d0415`. El servicio aislado tiene autoDeploy=no. No se modifica producción.

### Navegador: evidencia conservada y comprobaciones nuevas

- Los tres recursos de la sesión anterior permanecen publicados en el entorno aislado, una instancia de cada uno. No se repitieron las cargas.
- PDF `694ab9bb-c89b-41ab-b0bd-ab49987cf2ba`, archivo `faa495a0-e6d1-47d8-ae00-3034aaf5278f`: subida, vista previa integrada y descarga administrativa verificadas en la sesión anterior. Hoy, descarga anónima verificada de nuevo: 1450 bytes idénticos al fixture mediante cmp.
- Imagen `3ec86ba3-bca1-4ab3-ba80-84dc414c662a`, archivo `7f74ac3f-94e0-468b-8f54-731ed2f93a0f`: subida, previsualización y descarga idéntica verificadas anteriormente. Hoy render público sin sesión: complete=true, 640x360.
- MP4 Premium `d59fc4bb-f4c3-416c-adf8-8542c9eb8ad1`, archivo `d079dd21-1f73-40a7-b211-3baf4e0efe73`: subida, reproducción de dos segundos hasta ended=true y descarga idéntica verificadas con administrador en la sesión anterior. Hoy la página del recurso sin sesión muestra «Requiere una suscripción Premium vigente».
- Los fixtures contienen solamente texto técnico FICTICIO, sin instrucciones médicas ni datos personales. Quedan publicados temporalmente para finalizar las pruebas; archivar después, sin borrar sus archivos.
- La sesión administrativa anterior ya no está autenticada. El gestor rechaza el acceso. No se cambia contraseña ni se crea un mecanismo de acceso alternativo.
- La última acción de membresía fue pulsar una vez «Simular pago anual del cliente ficticio». Su resultado NO quedó confirmado: inspeccionar suscripción y períodos antes de volver a simular para evitar una renovación involuntaria.
- Pendientes de navegador autenticado: cancelación/suspensión/reanudación/revocación anual, descarga y revisión del Excel de 17 hojas. La prueba local de 17 hojas no sustituye esa descarga.
- Permisos probados en navegador: administrador en la sesión anterior y visitante anónimo hoy. Acceso positivo de un cliente Premium distinto sigue pendiente. El cliente creado por el simulador no tiene una contraseña conocida; no se falsifican sus cookies ni se evita la autenticación.
- Captura nueva: docs/V010_PREMIUM_ANONIMO.jpg. La captura anterior del PDF no se conservó en el directorio; no se adjunta un archivo inexistente.

### Correcciones incrementales

- Cargas idénticas (MIME + SHA-256) reutilizan el identificador existente bajo el bloqueo transaccional de cuota. No borran archivos ni cambian permisos/revisión de los recursos. La reutilización se registra separadamente en auditoría.
- Inventario de metadatos solo para administrador, sin bytes, para encontrar archivos guardados antes de una interrupción y reutilizarlos.
- Selector de registros se actualiza después de guardar/publicar, conservando la selección. Antes podía obligar a recargar para encontrar un registro nuevo.
- 48 pruebas locales aprobadas, cero fallos, incluida concurrencia de cuatro cargas idénticas, una sola inserción, inventario sin contenido y denegación a clientes. Base local PGlite; no se presenta como validación remota de este cambio.

Próximo paso exacto: recuperar sesión administrativa mediante formulario seguro; abrir Contenidos y suscripciones; consultar los períodos existentes antes de simular de nuevo; finalizar operaciones de membresía y descargar el XLSX de 17 hojas. Verificar los ajustes nuevos en Render antes de declararlos operativos. Mantener DEMO_MODE=true, autoDeploy=no y PR en borrador. Las limitaciones v1.0 anteriores siguen vigentes.

### Recuperación de acceso y cierre de pruebas del panel (misma sesión)

La autenticación segura terminó correctamente y el panel abrió con la contraseña existente, sin revelarla ni modificarla. Se inspeccionó la membresía anterior antes de actuar: seis períodos revocados. Se creó un nuevo período ficticio, siete períodos históricos en total, vencimiento 28/10/2027. Se verificaron desde la interfaz: Vigente → Cancelado con acceso vigente → Suspendido → Vigente. Cancelar y reanudar conservaron vencimiento y número de períodos.

Descarga real de navegador `docs/V010_INFORME_FICTICIO.xlsx`: 17 hojas leídas con ExcelJS; suscripción 9d1021af-a16c-43ac-8339-307d4c11ffa3 activa, siete transacciones históricas, ingresos netos ficticios S/1.00 y cobros reales S/0.00. No es el libro de presentación con gráficos pendiente de revisión visual; es el informe operativo generado por PostgreSQL. Captura docs/V010_MEMBRESIA.jpg.

Defecto encontrado: scripts/verify-platform.js reutilizaba el plan del ensayo manual y al concluir el arranque revocaba todos sus períodos. Corrección: cada ejecución crea su propio plan ficticio y lo archiva al terminar. Los planes archivados se excluyen de la selección manual. Prueba HTTP local nueva ejecuta dos verificaciones seguidas y comprueba que la membresía manual conserva acceso, período y fecha. Suite final: 49 pruebas aprobadas, cero fallos. Aún debe corroborarse el cambio tras despliegue real.

## Último punto verificado de continuidad

- Despliegue `dep-dbh160c9v7es73bj3vbg` Live, código `08ce19f16c91b94a2fe8e9b3ad3014aed5d5e89e`. 49 pruebas aprobadas también durante la compilación Render; npm ci informó 0 vulnerabilidades.
- Verificación real de arranque sobre PostgreSQL: editorial, permisos, anualidad, confirmación duplicada, cancelación, revocación, informe de 17 hojas, compra ficticia HTTP, cuatro reintentos concurrentes, pago simulado, entrega, reembolso y retorno físico, conservación de stock y checksum de copia. previous_record/previous_order/previous_marker=true.
- Navegador tras desplegar: sesión administrativa conservada; membresía manual 9d1021af-a16c-43ac-8339-307d4c11ffa3 todavía Vigente, siete períodos, fin 28/10/2027. La suscripción automática es independiente y está revocada. Corrección de aislamiento verificada en el entorno real.
- Inventario administrativo muestra exactamente los tres archivos técnicos PNG/PDF/MP4. Al volver a seleccionar el PDF idéntico el servidor devuelve «Archivo existente reutilizado: faa495a0-e6d1-47d8-ae00-3034aaf5278f». No se creó un duplicado.
- PDF e imagen fueron archivados desde el editor, revisión 4. Selector de registros actualizado inmediatamente sin recargar: corrección visual verificada. Sus archivos se conservan. MP4 pendiente de archivar al retomar.
- Informe descargado de 17 hojas guardado en GitHub: `docs/V010_INFORME_FICTICIO.xlsx`, commit `edbdda954aeb44c6bbccfbd9852e34e534e01785`. Contiene datos ficticios anteriores a la revocación final.
- Pendientes reales de navegador: revocación final de membresía manual, acceso positivo con una cuenta cliente Premium legítima distinta, descarga directa privada con esa cuenta y pruebas móviles. No se equiparan pruebas de HTTP/local con una sesión cliente real.
- No se activaron correos, pagos, registros ni ventas reales. No hay nuevas contrataciones. Main no fue modificado; PR #2 sigue en borrador.

Próximo paso exacto: abrir el gestor autenticado; archivar únicamente el recurso MP4 d59fc4bb-f4c3-416c-adf8-8542c9eb8ad1; inspeccionar la membresía manual antes de revocarla con motivo ficticio. Guardar resultados, continuar la integración de catálogo/checkout de ensayo y la revisión de permisos. Nunca volver a subir los tres fixtures ni repetir pagos para recuperar estado.
