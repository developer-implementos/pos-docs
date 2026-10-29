# Pruebas del monorepo

La organización del producto separa aplicaciones operativas y proyectos de pruebas en **pos-platform**. Define `apps/pos-clients-e2e` para los recorridos Angular de escritorio y móvil y `libs/shared/testing` para el soporte técnico reutilizable. La documentación se valida desde **pos-docs**. La cobertura revisada y los proyectos previstos se presentan por separado: describir una suite no acredita su implementación. El [mapa del monorepo](monorepo.md) detalla responsabilidades y estado del producto.

## Cobertura existente y ubicación

| Comprobación | Ruta en el snapshot revisado | Qué verifica | Límite |
| --- | --- | --- | --- |
| Playwright web | `e2e/`, `e2e-mobile/` y sus configuraciones Playwright | Acceso, checkout, administración, navegación y comportamiento visual con datos sintéticos | No recorre una venta persistida en PostgreSQL ni sincronizada con país |
| HTTP de sucursal y país | `apps/branch-api/test` y `apps/country-api/test` | Composición Nest/Fastify, sondas, errores y políticas HTTP mediante la aplicación real | No hay operaciones comerciales ni persistencia |
| Base técnica común | `libs/platform/backend/test` | Logging, Sentry y ciclo de vida de workers | No acredita colas ni integraciones operativas |
| Reglas puras y mock | Tests junto a las bibliotecas | Invariantes y comportamiento local implementado | No sustituye pruebas del backend futuro |
| Fronteras arquitectónicas | `tools/eslint` | Reglas de imports y calidad existentes | La organización objetivo requiere comprobar todos sus límites con casos negativos |
| Artefactos backend | `tools/verify-api-artifact.mjs` | Arranque fuera del workspace con dependencias de producción | No acredita recuperación comercial |
| Documentación, en POS Docs | `apps/starlight/scripts` | Fuentes, catálogo, build, enlaces, búsqueda y navegador | Se ejecuta en otro repositorio; no acredita funcionamiento del POS |
| Escritorio Windows | Job `windows-desktop` de CI | Compilación y empaquetado Tauri | No es una suite E2E nativa |

## Proyecto E2E de clientes objetivo

`apps/pos-clients-e2e` será un proyecto de pruebas Nx vinculado a `pos-desktop` y `pos-mobile` mediante dependencias explícitas, porque visitar una URL no permite inferir el vínculo por imports. No se añade a las siete aplicaciones objetivo ni se publica como servicio.

Los recorridos de escritorio y móvil tienen configuración, fixtures, control de tiempo, reportes y capturas de fallos propios. Los comandos son `npm run test:e2e` y `npm run test:e2e:mobile`. Localmente las suites pueden iniciar el servidor de desarrollo; CI debe probar el build de producción. Si se activa caché o ejecución affected, sus entradas deben incluir la configuración, fixtures y aplicación probada; entornos externos mutables no se consideran reproducibles por defecto.

## Soporte compartido de pruebas

`shared/testing` será una agrupación de utilidades de pruebas con entradas explícitas según consumidor. No se mezclan fixtures de navegador, configuración Vitest y dependencias de base de datos en un único barrel obligatorio.

Su alcance son mecanismos técnicos usados por varias suites: relojes controlables, capturadores de logs, preparación de infraestructura o simuladores de transporte. Las fábricas y escenarios comerciales de ventas, caja o pagos permanecen cerca del contexto propietario. Producción no puede importar soporte de pruebas; esa prohibición requiere reglas y casos negativos.

`tools/backend` contiene configuración de compiladores y ejecutores del workspace. Estas herramientas de build son independientes del soporte que consumen las suites.

## Suites futuras y garantías

- **Sistema:** una futura `apps/pos-system-e2e` recorrerá APIs, PostgreSQL, entrega y recepción entre procesos cuando estén implementados. Deberá verificar commit de venta y outbox, duplicados, reinicios, pérdida de acuses, concurrencia y resultados externos inciertos.
- **Hosts nativos:** las futuras suites nativas verificarán capacidades implementadas de Tauri y Capacitor en sus entornos homologados. Chromium sobre la web no demuestra instalación, actualización, WebView ni periféricos.
- **Adaptadores:** contratos y pruebas de integración se añaden con cada proveedor, sin ejecutar pagos o dispositivos productivos en suites ordinarias.

Estas suites no existen por describirlas aquí. La ausencia de un recorrido implementado no se resuelve creando proyectos vacíos ni pruebas que devuelvan éxitos ficticios.

<span id="comandos-actuales-y-aceptación-de-la-migración"></span>

## Comandos y criterios de aceptación

Desde la raíz del repositorio del producto:

```sh
npm test
npm run test:e2e
npm run test:e2e:mobile
npm run backend:check
npm run backend:smoke
npm run structure:check
```

Para la documentación se ejecutan `validate`, `typecheck`, `build` y `check` desde `apps/starlight` en **pos-docs**. El build documental usa una revisión identificada del producto y no requiere instalar sus dependencias. Los [criterios técnicos de la base](implementation-plan.md) incluyen imports, empaquetado, comportamiento de los clientes y correspondencia entre catálogo y código verificado.

## Agente de periféricos y contratos entre runtimes

La futura app `device-agent` requiere pruebas .NET y de contrato con `branch-api`, usando esquemas y fixtures del contexto `devices`. El build del agente no valida drivers. Probar ACK perdido, deduplicación, hash conflictivo, reinicio antes/después de envío, registros SQLite y estado incierto; banco Windows para spooler, permisos, SDK, x86/x64, sesión y exclusión por equipo físico. F02/F05 cubren el agente en el puesto: MICR cancelado, comandos concurrentes, rechazo de destinos de otra caja y actualización con pendientes. F06 añade concurrencia de puestos/móvil sobre impresoras de red homologadas, aislamiento entre sucursales, cambio de dirección y reasignación segura de controlador. La [aceptación del ADR-17](decisions/device-agent.md#entrega-y-aceptación) se vincula con F02/F05/F06; los casos físicos no forman parte de una suite que simule éxito.
