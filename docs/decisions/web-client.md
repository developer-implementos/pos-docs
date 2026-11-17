# ADR-21 · Cliente web conectado

**Estado:** decisión del responsable del producto del 17-11-2026, en implementación en [TASK-403](https://github.com/developer-implementos/pos-platform/issues/403). Amplía el [ADR-14](native-clients.md), que sigue vigente para escritorio y móvil. No acredita homologación de navegadores, publicación en un servidor ni operación productiva.

**Decisión:** POS Platform tiene un tercer cliente completo, `apps/pos-web`, que ejecuta el mismo frontend Angular/PrimeNG en un navegador, sin shell nativa. Cada navegador se aprovisiona y se registra como una instalación de canal `web`: no se presenta como escritorio ni como móvil. Usa las mismas pantallas, permisos y contratos que los otros dos clientes.

## Qué resuelve

El ADR-14 definió dos aplicaciones completas, cada una con su shell nativa, y dejó fuera el navegador: el servidor de desarrollo de Angular no es producto. Para mostrar el avance y hacer QA manual sin instalar la app de escritorio ni la móvil, el responsable decidió agregar el navegador como canal propio. El ambiente QA que lo publica es otra tarea ([TASK-402](https://github.com/developer-implementos/pos-platform/issues/402)).

## Composición

| Pieza | Escritorio | Móvil | Web |
| --- | --- | --- | --- |
| Aplicación completa | `apps/pos-desktop` | `apps/pos-mobile` | `apps/pos-web` |
| Host | Shell nativa Tauri | Shell nativa Capacitor | Navegador, sin shell nativa |
| Plataforma en `client-shell` | `desktop` | `mobile` | `web` |
| Canal de la instalación | `desktop` | `mobile` | `web` |
| Documentos protegidos | Diálogo nativo de guardado | No habilitado | Descarga del navegador |
| Periféricos | Mediante `device-agent` | Pendiente de su fase | No |

`libs/client-shell` compone los tres clientes con la misma configuración, rutas y guards; cada aplicación tiene su arranque propio y ninguna importa a otra. Las fronteras Nx de `pos-web` (`scope:web`) prohíben los SDK de Tauri y de Capacitor.

## Reglas

- **Canal verdadero.** El canal es parte de la identidad inmutable de la instalación. La base acepta `desktop`, `mobile` y `web` mediante una migración de expansión; las instalaciones existentes no cambian.
- **Solo cliente conectado.** El build de `pos-web` exige una política con un origen HTTPS exacto, como los otros clientes. Su CSP no declara el origen IPC de Tauri. La composición rechaza la demo y el modo de laboratorio en la web: un archivo de perfil reemplazado en el servidor no la convierte en demo.
- **Registro por navegador.** Cada navegador y perfil de usuario es una instalación distinta, con su `registerId` e `installationId` aprovisionados. El navegador guarda la URL y los IDs, nunca contraseñas ni tokens.
- **Publicación.** El servidor que publica el cliente lo sirve solo por HTTPS confiable y envía la misma CSP como cabecera, más `frame-ancestors 'none'`, que el `<meta>` no puede expresar.
- **Telemetría.** Los fallos del cliente se identifican como `pos-web` en el contrato `client-failure-v1`.

## Límites

- Sin acceso a impresora, cajón, lector ni terminal de pago: esas capacidades exigen un host homologado.
- Sin PWA instalable ni operación sin conexión.
- El servidor de desarrollo de Angular sigue sin ser producto, como dice el ADR-14.

## Verificación

El producto prueba la migración contra PostgreSQL real (una instalación `web` se rechaza antes de la migración y se aprovisiona después) y recorre una instalación `web` contra la API HTTPS y PostgreSQL con perfil operacional (`test:e2e:web`), que corre al integrar. Esa evidencia acredita Chromium; no acredita otros navegadores, la confianza TLS de un equipo real ni la publicación en un servidor.
