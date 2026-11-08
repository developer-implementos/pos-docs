# Pruebas del monorepo

La organización del producto separa aplicaciones operativas y proyectos de pruebas en **pos-platform**. Define `tests/pos-clients-e2e` para los recorridos Angular de escritorio y móvil y `libs/shared/backend/testing` para el soporte técnico reutilizable. La documentación se valida desde **pos-docs**. La cobertura revisada y los proyectos previstos se presentan por separado: describir una suite no acredita su implementación. El [mapa del monorepo](monorepo.md) detalla responsabilidades y estado del producto.

## Política de CI del producto

Contrastada el 2026-11-08 con POS Platform [`c131147216e1998321016afd87b019bacd045935`](https://github.com/developer-implementos/pos-platform/commit/c131147216e1998321016afd87b019bacd045935). Es una revisión de su política de verificación, independiente de los snapshots de implementación publicados en este portal.

El producto exige cuatro checks: `delivery-progress`, `api`, `clients` y `PR policy`, en runners propios. La política estricta está desactivada: actualizar con `main` no es obligatorio para cada integración. Se mantienen PR, conversaciones resueltas y revisión humana según la [política propietaria](https://github.com/developer-implementos/pos-platform/blob/main/.github/rulesets/README.md). La CI local acompaña la evidencia; no sustituye los checks requeridos.

En las PR, `clients` conserva los controles estáticos, pruebas unitarias y builds; ejecuta el recorrido de escritorio cuando el alcance lo requiere. Los recorridos conectados y móvil corren después de integrar y cada noche, sin caché de Nx en el nocturno. Un fallo se comunica mediante `main-rojo`. El [nocturno del 2026-11-08](https://github.com/developer-implementos/pos-platform/actions/runs/42455497478) completó `clients-integration` sobre esa revisión: acredita los recorridos de prueba, no integraciones productivas ni una alerta real ante fallo. Los comandos, alcance y recuperación pertenecen a la [guía del runner](https://github.com/developer-implementos/pos-platform/blob/main/tools/runner/README.md).

Las compilaciones nativas viven en `native.yml` y no son checks obligatorios: Android corre semanalmente y en las PR que afectan a su superficie; Windows e iOS sólo por despacho manual, en runners alojados y con costo. La capacidad propia de Windows/macOS sigue en [TASK-206](https://github.com/developer-implementos/pos-platform/issues/206). Un cambio nativo sin compilación de su revisión no está verificado; no se acredita por el verde de los cuatro checks.

Hay [evidencia nativa conservada de `aa373b2`](https://github.com/developer-implementos/pos-platform/blob/c131147216e1998321016afd87b019bacd045935/delivery/evidence/native-ci-aa373b2.json), compilada el 2026-11-05: iOS para simulador sin firma, instalador Windows, host .NET Windows y APK Android. Esa evidencia corresponde a aquel commit; no acredita el HEAD actual, instalación, ejecución en dispositivo, firma de distribución ni homologación. Una suite portable tampoco acredita esas etapas.

[POS Docs](https://github.com/developer-implementos/pos-docs/blob/main/.github/rulesets/README.md#github-actions-en-este-repositorio) se verifica aparte: GitHub Actions alojado, CI local opcional y sin checks obligatorios; conserva la revisión exigida y la lectura de resultados del candidato.

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
| Escritorio Windows | Job manual `windows-desktop` de `native.yml`, en runner alojado | Compilación y empaquetado Tauri de la revisión ejecutada | No es una suite E2E nativa ni prueba instalación, firma o hardware; no corre en cada PR |

El [corte F02](phase-2-payments-documents.md) incorpora `pnpm run device:check` para build, formato y pruebas .NET, y `pnpm run device:interop` para el recorrido entre procesos. Los fixtures comunes validan sobre, resultado, recepción y permiso de ejecución tanto en TypeScript como en C#. La comprobación negativa de TLS ocurre antes de transmitir credenciales; la confianza en la CA efímera sólo existe en el helper de pruebas.

## Proyecto E2E de clientes objetivo

`tests/pos-clients-e2e` es un proyecto de pruebas Nx vinculado a `pos-desktop`, `pos-mobile` y `branch-api` mediante dependencias explícitas, porque visitar una URL no permite inferir el vínculo por imports. No se añade a las siete aplicaciones objetivo ni se publica como servicio.

Los recorridos de escritorio y móvil tienen configuración, fixtures, control de tiempo, reportes y capturas de fallos propios. Los comandos son `pnpm run test:e2e` y `pnpm run test:e2e:mobile`. Localmente las suites pueden iniciar el servidor de desarrollo; CI debe probar el build de producción. Si se activa caché o ejecución affected, sus entradas deben incluir la configuración, fixtures y aplicación probada; entornos externos mutables no se consideran reproducibles por defecto.

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
pnpm test
pnpm run test:e2e
pnpm run test:e2e:mobile
pnpm run test:e2e:branch
pnpm run backend:check
pnpm run backend:smoke
pnpm run structure:check
```

El runner `test:e2e:branch` requiere `POS_TEST_ADMIN_URL` de laboratorio loopback; aprovisiona, migra, siembra datos sintéticos, arranca artefactos y ejecuta la suite real. La [guía F01](phase-1-laboratory.md) detalla condiciones y recuperación. Los resultados se registran como evidencia de ejecución, sin aprobar automáticamente entregables.

Para la documentación se ejecutan `validate`, `typecheck`, `build` y `check` desde `apps/starlight` en **pos-docs**. El build documental usa una revisión identificada del producto y no requiere instalar sus dependencias. Los [criterios técnicos de la base](implementation-plan.md) incluyen imports, empaquetado, comportamiento de los clientes y correspondencia entre catálogo y código verificado.

## Agente de periféricos y contratos entre runtimes

`apps/device-agent` ya contiene el host .NET y sus pruebas de SQLite, permisos de ejecución y transporte. El [corte F02](phase-2-payments-documents.md) identifica la revisión integrada, la interoperabilidad con `branch-api` y sus resultados; los esquemas y fixtures compartidos pertenecen al contexto `devices`. La compilación y la prueba del protocolo no homologan drivers.

La matriz física pendiente debe comprobar spooler, permisos, SDK, x86/x64, contexto de servicio/sesión y exclusión por equipo. F02/F05 cubren el perfil por puesto: MICR cancelado, comandos concurrentes, rechazo de destinos de otra caja y actualización con pendientes. F06 añade concurrencia de puestos/móvil sobre impresoras de red homologadas, aislamiento entre sucursales, cambio de dirección y reasignación segura de controlador. La [aceptación del ADR-17](decisions/device-agent.md#entrega-y-aceptación) conserva esos criterios; las pruebas con dispositivos simulados no acreditan los efectos físicos.

El [recorrido de impresión](flows/printing.md) enlaza autorización, recepción, permiso de ejecución y recuperación con sus fuentes. El [sistema documental](documentation-system.md) distingue esas comprobaciones del código de la revisión humana de comprensión.
