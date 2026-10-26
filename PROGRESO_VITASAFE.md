# Progreso VitaSafe

## Punto de continuidad

- Versión en preparación: **0.10.0-preview**, NO v1.0 lista para lanzamiento.
- Rama: `v06-postgres-excel-onedrive`; PR #2 en borrador, sin fusión.
- Último commit confirmado al iniciar: `2fada7fa5a932899f5d36060270c1ac44b24d01e` (evidencia v0.9).
- Último código desplegado al iniciar: `57c3f9ff955743a76f7612fd8eff6dc8d9650d1e`.
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

Suite ampliada final: 44 pruebas aprobadas, cero fallos, incluyendo el ajuste de métricas agregadas. Incluye revisión/publicación, autorización Premium, año bisiesto, renovaciones concurrentes, cancelación/suspensión/reembolso, cola, 17 hojas, respaldo/restauración local y cifrado/tamper. La ejecución en Render está pendiente. Las pruebas locales usan PGlite y no equivalen por sí mismas a PostgreSQL 18 remoto ni a móvil real.

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

Próximo paso exacto: terminar validación de métricas y permisos HTTP de archivos, publicar únicamente en la rama indicada, desplegar manualmente el servicio de ensayo, verificar el nuevo registro persistente y el editor por navegador. Actualizar este documento con evidencia real y commit antes de entregar.
