# Comprobación del cliente Premium en navegador

Usar exclusivamente vitasafe-v06-pr2-test, con DEMO_MODE=true, VITASAFE_TEST_ENV=true y autoDeploy desactivado. Las pruebas HTTP del arranque se ejecutan en una instancia local del servidor dentro de Render, con PostgreSQL interno. El verificador inicia sesión por contraseña y comprueba los bytes del archivo, el bloqueo anónimo y el rechazo posterior a revocar usando la misma sesión. Su cuenta y plan son distintos del ensayo manual.

## Habilitar una cuenta de cliente ficticia

En el dashboard del servicio aislado, abrir Environment, agregar VITASAFE_TEST_CUSTOMER_PASSWORD y guardar una contraseña aleatoria de entre 16 y 256 caracteres distinta de la administrativa. Introducirla solo en Render y en el formulario de inicio de sesión. Aplicar el cambio al servicio de pruebas mediante Save and deploy o un despliegue manual. El correo de esa cuenta es premium-ensayo@example.invalid. El registro de usuarios y las ventas continúan bloqueados.

## Prueba manual con dos sesiones

1. Conservar la sesión administrativa en una ventana. En otro perfil o ventana privada, usar Iniciar sesión con el correo ficticio y la clave elegida. Al recargar la tienda debe aparecer Mi cuenta. Abrir Mi suscripción y comprobar acceso gratuito inicialmente.
2. En la ventana administrativa, abrir Datos y Excel → Contenidos y suscripciones. Seleccionar un plan ficticio con precio de ensayo y un recurso técnico Premium publicado con descarga habilitada. Antes de conceder la membresía, verificar que la ventana de cliente no pueda descargarlo. No usar instrucciones médicas esenciales como contenido de prueba.
3. En Confirmación ficticia seleccionar **Cliente de navegador** y confirmar una sola operación simulada. Anotar el identificador de la suscripción creada. La opción **Suscriptor ficticio del panel** corresponde al ensayo manual anterior y conserva su historial.
4. En la ventana de cliente, actualizar Mi suscripción y comprobar nombre del plan, estado, vigencia e historial. Abrir y descargar el archivo. Conservar la URL de descarga para comprobar el permiso después de revocar.
5. Desde el panel, localizar exclusivamente la nueva suscripción del cliente de navegador. Revocar sus períodos con motivo de ensayo. Sin cerrar la sesión de cliente, repetir la solicitud al archivo privado. Debe responder 403. La copia que el usuario ya descargó permanece en su equipo.
6. Retirar los recursos publicados exclusivamente para este ensayo. Para deshabilitar la cuenta, retirar VITASAFE_TEST_CUSTOMER_PASSWORD y aplicar la configuración al servicio aislado. El siguiente arranque invalida las sesiones de esa cuenta. Las suscripciones y su auditoría se conservan.

La cuenta automática de verificación solo puede iniciar sesión en el servidor privado del ensayo de arranque. Las llamadas públicas no pueden habilitar ese modo ni elegir un identificador de cliente arbitrario.
