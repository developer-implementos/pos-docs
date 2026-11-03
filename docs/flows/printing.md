# Imprimir y recuperar un trabajo

[Explorar la impresión por puesto](/explore/local-printing/) sitúa `branch-api`, `device-agent`, el registro SQLite y el periférico. El perfil inicial ejecuta el host .NET en el puesto Windows conectado al hardware. La [decisión de dispositivos](/guide/architecture/device-agent/) mantiene el contrato y el alcance de despliegue.

## Del trabajo al efecto físico

La [secuencia durable implementada](/guide/implementation/phase-2/#recorrido-durable-del-host) distingue autorización del trabajo, recepción, permiso de ejecución de un uso y resultado. SQLite conserva evidencia técnica; PostgreSQL de sucursal mantiene la autoridad del trabajo. Los logs diagnósticos tienen otra finalidad.

Si el host pierde la respuesta al reportar, recupera el acuse de su evidencia. Ese caso no autoriza otra impresión. Una copia intencional necesita un trabajo nuevo autorizado. Aceptación por el spooler y papel impreso conservan significados distintos.

El [ciclo del trabajo de impresión](/explore/state-printing/) permite inspeccionar recepción, permiso y resultados en `branch-api` según `98f8987`. Es una proyección del trabajo del backend; el registro SQLite del host y el spooler mantienen responsabilidades distintas.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | Operaciones de dispositivos e identidad del host |
| [Interoperabilidad .NET y API](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/native-integration/device-host.test.ts) | HTTPS, PostgreSQL, SQLite y reinicio entre procesos |
| [Pruebas del registro SQLite](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/tests/device-agent/DeviceJournalTests.cs) | Persistencia y recuperación local |
| [F02-03](https://github.com/developer-implementos/pos-platform/issues/25) | Host por puesto, pruebas físicas y condiciones pendientes |

El host existe en `98f8987`, pero su driver operativo y homologación física siguen pendientes. [Red, estación compartida y móvil](/explore/shared-printing/) corresponden a la evolución [F06-05](https://github.com/developer-implementos/pos-platform/issues/76).
