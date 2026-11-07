# 6 de noviembre de 2026, noche de Lima · Inventario por lotes y delivery

VitaSafe 0.10.0-preview. Prevalece esta sección sobre los registros anteriores. Rama `v06-postgres-excel-onedrive`, PR #2 en borrador. Código verificado `758f629108a6615a4ba1996951440166919c6c3f`, despliegue aislado `dep-dbn9vnvf3r2c7381ni5g` Live. Despliegue anterior de lotes `ca8799a` también alcanzó Live. AutoDeploy desactivado. La portada mantiene el aviso de demostración.

## Funciones y alcance

- En Mi panel → Vencimientos → Lotes de almacén por kit, el administrador registra componente, cantidad por kit, lote, vencimiento y recepción. La primera recepción de un componente pide confirmar el cambio en la composición. Cada lote está asignado al kit elegido. El inventario general del producto sigue siendo el límite superior. Los kits históricos sin composición conservan su funcionamiento.
- El catálogo limita la disponibilidad por el componente más escaso. La reserva y los movimientos entran en la misma transacción del pedido. Se eligen los lotes vigentes que vencen antes, se revierten reservas incompletas y se recuperan las unidades del lote original al cancelar o aceptar la recepción física. Una devolución monetaria después del envío conserva la reserva hasta la recepción. La auditoría conserva actor, referencia y cantidades.
- En Contenidos y suscripciones → Condiciones de entrega, usar el título para identificar la zona y definir tarifa en soles y horas de atención en Perú. Guardar en borrador y publicar expresamente para ofrecer esa zona en el checkout ficticio. Se conservan las condiciones históricas de solo texto. El servidor valida la revisión de la zona, el horario, la fecha y el importe. Cada pedido conserva su propia cotización y su horario. El Excel mantiene 17 hojas y añade subtotal de productos, delivery, zona y horario al final de Pedidos.
- Alcance de la entrega: selección manual de zona en el carrito administrativo ficticio, sin cotización geográfica por dirección ni despacho real. Las ventanas configuradas aplican diariamente. La verificación de stock de componentes y delivery se aplica al motor de ensayo del catálogo; se requiere validar los recorridos de clientes e invitados antes de habilitar transacciones públicas.

## Verificado

- **58/58** pruebas locales y **58 aprobadas en el build final de Render**. Se ampliaron pruebas existentes. HTTP local con PGlite: recepción repetida, fecha inválida, prioridad de vencimientos, dos componentes, rechazo de lote vencido y rollback por falta del segundo componente; dos solicitudes concurrentes compiten por el último conjunto disponible (una 201 y otra 409). Reembolso y doble recepción física solo reponen una vez. Panel de administración protegido.
- Delivery por HTTP local: subtotal S/24.68 + envío simulado S/3.50 = S/28.18; se ignoró la tarifa enviada por el navegador, se rechazaron fecha imposible y horario incorrecto. El reintento mantiene pedido y total aun después de archivar la zona. El Excel reconcilió subtotal, tarifa, total, zona, fecha y hora. Restauración local del respaldo mantuvo la comparación de las tablas, incluidos los registros de lote y cotización.
- **PostgreSQL 18 de Render**: la verificación de arranque ejecutó en una transacción revertida la reserva con lote vencido, consumo del último vigente, rechazo por insuficiencia, cancelación y restitución de disponibilidad. También creó y archivó una zona temporal, comprobó el total calculado, el importe guardado y la idempotencia. El servicio emitió `warehouse_lots_rollback_verified=true` y `delivery_quote_rollback_verified=true`, y confirmó 17 hojas y demo activa. Esta verificación de lotes fue secuencial. La carrera HTTP de lotes se ejecutó localmente con PGlite.
- **Navegador real de escritorio**: acceso administrativo con el formulario seguro y la contraseña existente. Principal ensayo manual: una recepción `DEMO-LOTE-20261106-A` en el producto existente `DEMO-BROWSER-CATALOGUE-20261030`, cuatro unidades ficticias, dos por kit, vencimiento 30/06/2027. Se recargó y reabrió el panel y se verificó la fila persistida. Evidencia `docs/V010_LOTES_PANEL_20261106.jpg`. En el gestor se guardó una única zona `FICTICIO · Zona de ensayo 6 noviembre` a S/3.50, 09:00–13:00. Se publicó temporalmente junto con el producto ya existente para probar el checkout. Una unidad S/12.34 + S/3.50 = S/15.84, pedido único `DEMO-566fd5a1-91c5-4e01-8e8f-335b270b009e` para el 09/11/2026 a las 10:30. Se comprobó el horario en seguimiento y se canceló sin pagar. La zona quedó archivada, producto despublicado con stock 2 y lote con sus 4 unidades. Ninguna membresía manual creada.
- Excel real descargado tras cancelar: `docs/V010_LOTES_DELIVERY_20261106.xlsx`. Una fila del pedido, estado Cancelado, 17 hojas, subtotal 12.34, delivery 3.50 y total 15.84, zona y horario coincidentes. No repetir el pedido para verificarlo.

## Próximo paso y bloqueos

1. El recorrido de delivery ficticio por navegador ya está cerrado. Siguiente paso: comprobar la sesión de un cliente ficticio con Premium vigente en un navegador distinto y su pérdida de acceso al revocar. No reutilizar ni cobrar la membresía manual revocada.
2. Completar cliente Premium con inicio de sesión legítimo en un navegador distinto. El demo todavía bloquea el login público de clientes; las pruebas HTTP de permisos no sustituyen esta comprobación. Pendientes recuperación de cuenta, recorridos cliente/invitado, pruebas móvil/tablet y accesibilidad, y cierre de configuración comercial.
3. El destino externo privado para respaldos, la custodia de clave, el destino vacío de restauración y la infraestructura permanente requieren decisión del propietario antes del vencimiento de PostgreSQL, **24/11/2026 00:28 Lima**. La copia externa y la restauración remota siguen sin verificar. OneDrive, correo y cobros reales desactivados. Lanzamiento comercial pendiente.

---

# 6 de noviembre de 2026 · Punto de continuidad

VitaSafe 0.10.0-preview, rama `v06-postgres-excel-onedrive`, PR #2 en borrador. Código desplegado `ab04f5d054dfe4718a3edcac873ff20e8e0a1b36`. Render confirmó Live en `dep-dbmm3l2jnfac73asnav0`, servicio `vitasafe-v06-pr2-test`. Este informe se guarda en un commit documental posterior. Main sigue en `d3ba56bebde80c672246c05fc8fa19a67b7d0415`. AutoDeploy desactivado.

## Terminado y verificado

- Evidencias del navegador del 5/11 guardadas en GitHub en `c057f04c0f21a07cb0425e20bc0149f16aee5015`. El Excel real de 17 hojas conserva el hash verificado, una sola fila del pedido ficticio de S/12.34, dos movimientos que suman cero y stock final de 2. La membresía revocada conserva sus siete transacciones únicas reembolsadas. Ver sección anterior por identificadores. No repetir estos ensayos manuales.
- Registro existente de componentes por cliente: el API valida fechas de calendario y cantidades enteras positivas y registra el alta en auditoría dentro de la misma transacción. El panel muestra lote, cantidad y vencimiento en fecha de Perú. Clasifica vencido, hoy, próximos 30 días, vigente, sin fecha y fecha histórica inválida. Los registros previos se preservan. Las altas comerciales siguen bloqueadas en demostración.
- La pestaña VitaSafe Care dejó de mostrar un precio anual fijo del piloto y enlaza al gestor de planes y suscripciones.
- Copias cifradas: se reprodujo la aceptación de etiquetas AES-GCM truncadas a cuatro bytes. Ahora se exige una etiqueta de 16 bytes, IV de 12 y codificación válida. La descarga administrativa usa exclusivamente el formato cifrado compatible con la restauración. Solo el administrador puede exportar, queda auditoría y la falta de clave bloquea la descarga.
- Pruebas locales HTTP con PGlite: suite de 58/58 aprobadas, 0 fallos. Incluye fechas imposibles, años bisiestos, límites 0/30/31 días, datos antiguos, cantidades incorrectas, permisos, bloqueo sin clave y descifrado de una descarga autorizada con clave temporal. Prueba focal del verificador tras su ajuste: aprobada tras dos aperturas de base. Render ejecutó 58/58 al compilar el código final.
- Verificación HTTP durante arranque sobre PostgreSQL 18 interno: lectura administrativa de componentes, denegación a cliente, escritura demo bloqueada, acceso al respaldo rechazado al cliente y al administrador sin clave. Indicadores emitidos: component_registry_checked=true, backup_access_checked=true, backup_key_configured=false, previous_marker=true, report_sheets=17 y demo=true. No se descargó una copia del servicio. La prueba de descifrado se hizo localmente con datos ficticios.
- El navegador mostró la portada del servicio de pruebas y su barra de demostración. La nueva pantalla autenticada de vencimientos no se verificó visualmente en un dispositivo móvil en esta sesión.

## Pendiente técnico

El registro de insumos por cliente es distinto del inventario comercial por componentes. Falta vincular la composición de cada kit a lotes disponibles, reservarlos transaccionalmente, bloquear lotes vencidos y mantener trazabilidad al cancelar o recibir una devolución física. Delivery tiene campos en pedidos y un editor de condiciones, pero el checkout de ensayo aún no cotiza tarifas según cobertura y horario. Faltan el recorrido positivo de cliente Premium desde navegador, recuperación de cuenta y comprobaciones móviles y de accesibilidad completas.

**Siguiente paso exacto**: enlazar la composición de un kit a lotes de almacén en el entorno aislado y probar dos reservas concurrentes contra la última unidad válida, un lote vencido y la devolución física sin doble reposición. Conservar los pedidos y la membresía de las evidencias anteriores.

## Pendiente del propietario

Render devuelve PostgreSQL 18 Free disponible, con vencimiento el **24/11/2026 a las 00:28 de Lima**. Para verificar una copia fuera del servicio hacen falta un destino privado aprobado, custodia separada de la clave y un destino PostgreSQL vacío distinto para el ensayo de restauración. Introducir `VITASAFE_BACKUP_KEY` directamente en el servicio aislado al aprobar el plan de custodia, nunca en el chat. Procedimiento en `docs/RESPALDO_CIFRADO_Y_RESTAURACION.md`. Siguen pendientes datos comerciales y legales, pasarela sandbox y consentimientos externos. Lanzamiento comercial pendiente.

---

# Estado verificado — 5 de noviembre de 2026 (Lima)

Esta sección prevalece sobre los registros históricos siguientes. Versión 0.10.0-preview; NO lista para ventas reales.

- Código ejecutado: `b268c2e2b2e7077f22d55c82d8d026808a6f4fd9`, servicio aislado Live. Último commit de documentación anterior a esta evidencia: `d77e83fdd3756fdec135061e73466ae0adfb8640`. Sin cambios de código ni nuevo despliegue por estas pruebas de navegador.
- Autenticación administrativa legítima completada mediante formulario seguro. Contraseña existente conservada, sin revelarla ni alterar credenciales.
- Cierre del ensayo interrumpido: `DEMO-fee7fdca-c961-496e-832e-85af8e3655d2` cancelado mediante revisión de reservas vencidas. Stock del producto existente pasó de 1 a 2. No se aprobó pago ni se duplicó ese pedido.
- Compra integral REAL EN NAVEGADOR, exclusivamente ficticia: se añadió una unidad del producto existente `DEMO-BROWSER-CATALOGUE-20261030` al carrito, se confirmó el ensayo y se creó una sola orden `DEMO-88ed00e5-2670-45d5-9bde-74e536fbd2c3`, S/12.34. Recorrido verificado: Pendiente → Confirmado/Pago aprobado simulado → En preparación → Enviado → Entregado → Pago devuelto → Recepción física. Bolsa vacía después de crear el pedido.
- Reembolso sin reposición: panel mostró 1 unidad después del reembolso. Únicamente después de recibir devolución física mostró 2 unidades. Producto despublicado al terminar (Visible: No), conservando imagen, precio, costo y registro. No recrear producto ni pedido para repetir esta prueba.
- Excel posterior a revocación resuelto: el evento download devolvió ruta inexistente; la descarga alternativa documentada del MISMO enlace mediante downloadMedia produjo un archivo accesible de 39 336 bytes. No fue necesario cambiar membresías. Evidencia: `docs/V010_POST_REVOCACION_20261105.xlsx`, SHA-256 `25ae3542ebc24da2dcc139758514be33e19e14394d6ca7f5e8ff902193cc1394`.
- Validación automatizada del archivo REAL descargado: 17 hojas; nuevo pedido aparece exactamente una vez, Entregado/Devuelto, S/12.34; exactamente dos movimientos (-1 Reserva, +1 Retorno físico), saldo cero; inventario vinculado 2. Membresía manual `9d1021af-a16c-43ac-8339-307d4c11ffa3` aparece una vez, refunded, siete transacciones únicas y todas reembolsadas; cero suscripciones activas; ingresos netos de membresías S/0 y cobros reales S/0. Detalle en `docs/V010_VERIFICACION_NAVEGADOR_20261105.json`. No se recalcularon fórmulas en Microsoft Excel ni se validaron gráficos en esta sesión.
- Suite de código previa sigue en 55/55 (local y build). No se ejecutó otra suite completa tras estas operaciones exclusivamente de datos de ensayo/documentación. Las comprobaciones del XLSX son adicionales y no alteran artificialmente el conteo de pruebas.
- PR #2 abierto y borrador, main `d3ba56bebde80c672246c05fc8fa19a67b7d0415`, autoDeploy=no confirmados por conectores. DEMO_MODE visible activo, sin pagos ni correos reales. No se modificó servicio público.

## Pendientes técnicos

1. Cliente Premium positivo en navegador con sesión distinta; no equivale a la prueba HTTP automática ni a la sesión administrativa. No crear accesos alternativos o credenciales fijas.
2. Componentes, lotes y vencimientos; delivery integrado al checkout; configuración comercial y recuperación segura de cuentas. Auditar módulos existentes antes de modificar.
3. Pruebas móviles/tablet completas, accesibilidad y concurrencia final. Las capturas de esta sesión son de navegador de escritorio, no dispositivo físico.
4. Respaldo cifrado/restauración local PGlite ya probados; copia externa durable y restauración PostgreSQL remota todavía NO verificadas.
5. Reporte operativo conserva 17 hojas y datos coherentes. Traducción completa de estados visibles y gráficos del informe de demostración no se declaran resueltos: estados técnicos se conservan y la guía del informe identifica gráficos/comparaciones como pendientes.

## Intervención del propietario para lanzamiento

Destino privado autorizado para respaldos y custodia de clave; infraestructura permanente y presupuesto antes del vencimiento previsto informado 24/11/2026; información comercial/legal; afiliación y credenciales sandbox de pasarela; consentimiento Microsoft y proveedor de correo. No contratar ni activar integraciones reales. No pedir secretos por chat.

**Próximo paso exacto:** conservar cerrados los dos pedidos anteriores y el producto despublicado. No repetir membresías ni exportación por el antiguo bloqueo ya resuelto. Revisar componentes/lotes/delivery y seleccionar el siguiente flujo verificable usando el código actual. Mantener DEMO_MODE=true, PR borrador, main intacta y autoDeploy desactivado. No declarar v1.0 lista.

---

# Estado verificado — 4 de noviembre de 2026 (Lima)

Esta sección prevalece sobre los registros históricos siguientes.

- Código desplegado: `b268c2e2b2e7077f22d55c82d8d026808a6f4fd9`. Despliegue `dep-dbluv3u1egvs73ap7hs0` Live, 04/11/2026 21:54 Lima. Versión 0.10.0-preview; NO lista para ventas.
- Se recuperó el arranque del entorno aislado. El verificador exigía seis productos y fallaba al conservar el producto ficticio publicado. La comparación nueva valida todos los IDs publicados; usa el mismo orden JavaScript en ambas listas para evitar diferencias de colación PostgreSQL/PGlite. No se alteraron productos para hacer pasar la prueba.
- Regresión guardada en `7321129c695f7eb124278163a1a8e6b254c0929c`: reapertura de base con producto adicional publicado, stock conservado y marcador persistente. Suite local final 55/55, cero fallos; builds Render anteriores de esta sesión también 55/55. No se incrementó artificialmente el conteo por ampliar un caso existente.
- Diagnóstico seguro por etapas y ubicación de código en `f479a142ebc869bfccc6d3f631a00c01104627fb`. No imprime errores completos, credenciales ni datos privados. Los despliegues 7321129 y f479a14 fallaron al arrancar; NO tratarlos como versiones verificadas.
- Runtime real de b268c2e: PostgreSQL; autenticación con variable existente; contraseña incorrecta rechazada; roles; registro y ventas bloqueados; cuatro plantillas Excel e importación controlada; catálogo público sin costo privado; concurrencia; pago simulado, estados, reembolso y retorno físico; inventario conservado; anualidad y revocación; informe 17 hojas; previous_record/previous_order/previous_marker=true. OneDrive sin configurar/conectar.
- Navegador: laboratorio y tienda vuelven a cargar; barra DEMOSTRACIÓN visible y producto manual conservado. La sesión administrativa anterior expiró. Falta autenticación legítima para inspeccionar el pedido manual; no se extrajeron credenciales ni se falsificó sesión.
- Pedido manual pendiente sin duplicar: `DEMO-fee7fdca-c961-496e-832e-85af8e3655d2`. Producto `DEMO-BROWSER-CATALOGUE-20261030`, todavía publicado. No se efectuó pago manual ni cancelación en esta reanudación. Su reserva de 15 minutos ya venció; inspeccionar y cancelar/liberar por el flujo normal, comprobar stock y despublicar. No generar un pedido sustituto sin documentar el cierre del anterior.
- PR #2 borrador y main `d3ba56bebde80c672246c05fc8fa19a67b7d0415`; autoDeploy=no confirmado. Servicio público no modificado. DEMO_MODE=true, sin pagos/correos reales ni contrataciones.

## Pendientes y próximo paso

1. Completar acceso administrativo mediante formulario seguro del navegador; no pedir contraseña por chat ni cambiarla. Revisar el pedido anterior, cerrar reserva vencida y comprobar stock/despublicación.
2. Compra integral desde navegador y cliente Premium positivo siguen pendientes; las pruebas HTTP del motor no sustituyen esos recorridos.
3. Excel posterior a revocación: falta archivo descargado utilizable; conservar membresía manual revocada, sin nuevos pagos.
4. Componentes, lotes, vencimientos y delivery integrado; configuración comercial y recuperación de cuenta; móvil/accesibilidad completa: pendientes técnicos, no declarados terminados.
5. Respaldo cifrado y restauración local PGlite probados. Falta destino externo privado autorizado, clave custodiada y restauración PostgreSQL remota. Procedimiento en docs/RESPALDO_CIFRADO_Y_RESTAURACION.md. No contratar ni abrir acceso público a la base. Planificar continuidad antes del vencimiento previsto informado 24/11/2026.
6. Decisiones del propietario: infraestructura/presupuesto; datos comerciales y legales; pasarela y credenciales sandbox; Microsoft OAuth y correo. Integraciones reales apagadas.

---

# Continuidad prioritaria — 31/10/2026

Esta sección sustituye los puntos de continuidad históricos inferiores. Versión 0.10.0-preview; NO lista para ventas.

- Código desplegado: `9004f45e7f90dd07096203994b59fcdd23ab57ec`; Render `dep-dbj169jbc2fs73bicrs0` Live confirmado. 55 pruebas locales y 55 de build aprobadas, cero fallos.
- Rama `v06-postgres-excel-onedrive`, PR #2 borrador. Main sigue `d3ba56bebde80c672246c05fc8fa19a67b7d0415`; autoDeploy=no confirmado. No se modificó el servicio comercial.
- Implementada conexión del carrito existente al motor de pedidos mediante endpoint administrativo exclusivo de DEMO_MODE=true y VITASAFE_TEST_ENV=true. Precio y stock se validan en servidor; reservas, devoluciones y ajustes se sincronizan transaccionalmente con catálogo y auditoría. Checkout público permanece bloqueado.
- Prueba local HTTP integral: cuatro reintentos concurrentes sin duplicación, precio del servidor, rechazo de edición obsoleta, pago simulado, preparación/envío/entrega, reembolso sin restock y recepción física idempotente; 17 hojas y respaldo cifrado/restauración en PGlite vacío. No equivale a restauración remota.
- Navegador anterior creó UN pedido: `DEMO-fee7fdca-c961-496e-832e-85af8e3655d2`, una unidad S/12.34 del producto existente `DEMO-BROWSER-CATALOGUE-20261030`. Confirmación visible: pendiente de pago simulado e inventario reservado. No se comprobó pago ni estados posteriores. NO duplicar pedido ni producto.
- El producto se republicó para ese ensayo y aún debe despublicarse al cerrar el recorrido. Stock anterior 2; la reserva y liberación posteriores deben comprobarse. Pasaron más de 15 minutos: revisar vencimiento antes de intentar pago; no eludir esa validación.
- La sesión anterior quedó bloqueada por límite de uso del navegador al abrir seguimiento. Al retomar el navegador funciona, pero el servicio muestra Application loading; la prueba real sigue pendiente.
- CLI de restauración segura guardado en `5ebfa9d6deafc7e9418ac2a396803f2ef1471625`, posterior al código desplegado. Documentación de copia cifrada confirmada en `b0f9a364e28336acdd9513bd0eade45076beffdf`: `docs/RESPALDO_CIFRADO_Y_RESTAURACION.md`. Rechaza destino igual al origen y destino con datos. Copia externa y restauración PostgreSQL remota NO realizadas.
- Excel posterior a revocación continúa sin archivo utilizable en el entorno de análisis; no repetir membresías ni pagos. Cliente Premium positivo en navegador, componentes/lotes/vencimientos, delivery configurable, recuperación de cuenta, configuración comercial y pruebas móviles integrales siguen pendientes.
- Intervención futura del propietario: destino privado de respaldos y custodia de clave; infraestructura permanente antes del vencimiento previsto 24/11/2026; datos comerciales/legales y credenciales sandbox/OAuth/correo. No solicitar secretos por chat ni activar integraciones reales.

**Próximo paso exacto:** cuando termine el arranque, abrir ensayo con autenticación legítima, localizar el pedido indicado, comprobar/liberar reserva vencida de forma normal y stock del producto, dejarlo despublicado. No crear otro pedido para ocultar el resultado pendiente. Continuar pruebas e integraciones conservando DEMO_MODE=true.

---

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

