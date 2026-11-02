# Pruebas del monorepo

La organización del producto separa aplicaciones operativas y proyectos de pruebas en **pos-platform**. Define `tests/pos-clients-e2e` para los recorridos Angular de escritorio y móvil y `libs/shared/backend/testing` para el soporte técnico reutilizable. La documentación se valida desde **pos-docs**. La cobertura revisada y los proyectos previstos se presentan por separado: describir una suite no acredita su implementación. El [mapa del monorepo](monorepo.md) detalla responsabilidades y estado del producto.

## Cobertura existente y ubicación

| Comprobación | Ruta en el snapshot revisado | Qué verifica | Límite |
| --- | --- | --- | --- |
| Playwright demo | `tests/pos-clients-e2e/` y `mobile/` | Acceso, checkout y navegación con datos sintéticos | No acredita operación real o capacidades nativas |
| Playwright conectado | `tests/pos-clients-e2e/branch/` | Angular → API → PostgreSQL: confirmación, recuperación y supervisor separado | Laboratorio, sin fiscalidad, ERP ni periféricos |
| HTTP de sucursal y país | `apps/branch-api/test` y `apps/country-api/test` | Composición Nest/Fastify, identidad, permisos, caja y operación comercial de laboratorio con PostgreSQL | No acredita homologación ni producción |
| Contextos F02 | `libs/backend/payments/test`, `libs/backend/fiscal/test`, `libs/backend/devices/test` | Intenciones, intentos, ámbitos, concurrencia y evidencia con PostgreSQL real | Adaptadores exclusivos de pruebas; sin conexión a proveedores, cobros ni emisión externa |
| Host .NET | `tests/device-agent` | SQLite real, contrato compartido, transporte, caídas de procesos y recuperación sin repetir efectos | Driver runtime no disponible; no acredita instalación de servicio ni hardware |
| Interoperabilidad del host | `apps/branch-api/native-integration/device-host.test.ts` | .NET → HTTPS/Nest → PostgreSQL, SQLite persistente y reinicio sin repetir reportes | CA y trabajos sintéticos; no homologa credenciales o dispositivos productivos |
| Base técnica común | `libs/shared/backend/runtime/test` | Logging, Sentry y ciclo de vida de workers | No acredita colas ni integraciones operativas |
| Reglas puras y mock | Tests junto a las bibliotecas | Invariantes y comportamiento local implementado | No sustituye pruebas HTTP/PostgreSQL o de los hosts nativos |
| Fronteras arquitectónicas | `tools/eslint` | Reglas de imports y calidad existentes | La organización objetivo requiere comprobar todos sus límites con casos negativos |
| Artefactos backend | `tools/verify-api-artifact.mjs` | Arranque fuera del workspace con dependencias de producción | No acredita recuperación comercial |
| Documentación, en POS Docs | `apps/starlight/scripts` | Fuentes, catálogo, build, enlaces, búsqueda y navegador | Se ejecuta en otro repositorio; no acredita funcionamiento del POS |
| Escritorio Windows | Job `windows-desktop` de CI | Compilación y empaquetado Tauri | No es una suite E2E nativa |

El [corte F02](phase-2-payments-documents.md) incorpora `npm run device:check` para build, formato y pruebas .NET, y `npm run device:interop` para el recorrido entre procesos. Los fixtures comunes validan sobre, resultado, recepción y permiso de ejecución tanto en TypeScript como en C#. La comprobación negativa de TLS ocurre antes de transmitir credenciales; la confianza en la CA efímera sólo existe en el helper de pruebas.

## Proyecto E2E de clientes objetivo

`tests/pos-clients-e2e` es un proyecto de pruebas Nx vinculado a `pos-desktop`, `pos-mobile` y `branch-api` mediante dependencias explícitas, porque visitar una URL no permite inferir el vínculo por imports. No se añade a las siete aplicaciones objetivo ni se publica como servicio.

Los recorridos de escritorio y móvil tienen configuración, fixtures, control de tiempo, reportes y capturas de fallos propios. Los comandos son `npm run test:e2e` y `npm run test:e2e:mobile`. Localmente las suites pueden iniciar el servidor de desarrollo; CI debe probar el build de producción. Si se activa caché o ejecución affected, sus entradas deben incluir la configuración, fixtures y aplicación probada; entornos externos mutables no se consideran reproducibles por defecto.

## Soporte compartido de pruebas

`shared/backend/testing` aporta infraestructura sintética PostgreSQL con bases y roles aislados. Los escenarios comerciales permanecen en cada contexto. No se mezclan fixtures de navegador, configuración Vitest y dependencias de base de datos en un único barrel obligatorio.

Su alcance son mecanismos técnicos usados por varias suites: relojes controlables, capturadores de logs, preparación de infraestructura o simuladores de transporte. Las fábricas y escenarios comerciales de ventas, caja o pagos permanecen cerca del contexto propietario. Producción no puede importar soporte de pruebas; esa prohibición requiere reglas y casos negativos.

`tools/backend` contiene configuración de compiladores y ejecutores del workspace. Estas herramientas de build son independientes del soporte que consumen las suites.

## Suites futuras y garantías

- **Sistema:** una futura `apps/pos-system-e2e` recorrerá APIs, PostgreSQL, entrega y recepción entre procesos cuando estén implementados. Deberá verificar commit de venta y outbox, duplicados, reinicios, pérdida de acuses, concurrencia y resultados externos inciertos.
- **Hosts nativos:** las futuras suites nativas verificarán capacidades implementadas de Tauri y Capacitor en sus entornos homologados. Chromium sobre la web no demuestra instalación, actualización, WebView ni periféricos.
- **Trabajos BullMQ:** probar con Redis y PostgreSQL reales en entornos de prueba: commit sin enqueue, enqueue con respuesta perdida, reconstrucción de Redis, lock perdido, claims vencidos, calendario en dos réplicas, contrapresión y separación de recursos. Una repetición conserva la identidad; un efecto ERP incierto deriva a consulta/conciliación. El [ADR-18](decisions/job-processing.md) fija la aceptación de esta implementación pendiente.
- **Adaptadores:** contratos y pruebas de integración se añaden con cada proveedor, sin ejecutar pagos o dispositivos productivos en suites ordinarias.

Estas suites no existen por describirlas aquí. La ausencia de un recorrido implementado no se resuelve creando proyectos vacíos ni pruebas que devuelvan éxitos ficticios.

<span id="comandos-actuales-y-aceptación-de-la-migración"></span>

## Comandos y criterios de aceptación

Desde la raíz del repositorio del producto:

```sh
npm test
npm run test:e2e
npm run test:e2e:mobile
npm run test:e2e:branch
npm run backend:check
npm run backend:smoke
npm run structure:check
```

El runner `test:e2e:branch` requiere `POS_TEST_ADMIN_URL` de laboratorio loopback; aprovisiona, migra, siembra datos sintéticos, arranca artefactos y ejecuta la suite real. La [guía F01](phase-1-laboratory.md) detalla condiciones y recuperación. Los resultados se registran como evidencia de ejecución, sin aprobar automáticamente entregables.

Para la documentación se ejecutan `validate`, `typecheck`, `build` y `check` desde `apps/starlight` en **pos-docs**. El build documental usa una revisión identificada del producto y no requiere instalar sus dependencias. Los [criterios técnicos de la base](implementation-plan.md) incluyen imports, empaquetado, comportamiento de los clientes y correspondencia entre catálogo y código verificado.

## Agente de periféricos y contratos entre runtimes

La futura app `device-agent` requiere pruebas .NET y de contrato con `branch-api`, usando esquemas y fixtures del contexto `devices`. El build del agente no valida drivers. Probar ACK perdido, deduplicación, hash conflictivo, reinicio antes/después de envío, registros SQLite y estado incierto; banco Windows para spooler, permisos, SDK, x86/x64, sesión y exclusión por equipo físico. F02/F05 cubren el agente en el puesto: MICR cancelado, comandos concurrentes, rechazo de destinos de otra caja y actualización con pendientes. F06 añade concurrencia de puestos/móvil sobre impresoras de red homologadas, aislamiento entre sucursales, cambio de dirección y reasignación segura de controlador. La [aceptación del ADR-17](decisions/device-agent.md#entrega-y-aceptación) se vincula con F02/F05/F06; los casos físicos no forman parte de una suite que simule éxito.
