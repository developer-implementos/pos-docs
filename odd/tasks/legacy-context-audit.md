# Contraste editorial del contexto operativo de Chile

Objetivo: explicar el contraste de la reunión con legacy y producto sin convertir hipótesis o acceso histórico en capacidades verificadas. Issue: [TASK-258](https://github.com/developer-implementos/pos-platform/issues/258).
Rama: `codex/legacy-context-audit`, desde `3dc039e0e8bc58e29b0568b01589499d24fd3442`. Entrega: `ask-on-risk`, corte editorial estimado en 180 líneas de autor; fuente técnica propietaria en POS Platform.
Checks: editorial, ODD, skills, contenido, Astro, build y enlaces de los recorridos afectados. Documentación pasiva, sin RED funcional aplicable. Espejo Engram pendiente: MCP no disponible.

## Specs

- S1. «Recuerda que trabajamos con pos-docs y pos-platform»: conservar producto como fuente de contratos, evidencia y seguimiento; POS Docs explica decisiones y recorridos. No editar snapshots ni duplicar backlog.
- S2. «no lo tomes como una verdad»: distinguir anotaciones, fuentes estáticas y observación fechada de los sistemas; usar referencias inmutables, sin secretos, hosts ni datos personales.
- S3. «si nuestro proyecto no pierde ninguna de las funcionalidades»: explicar cobertura y límites con enlaces a fichas/seguimientos, sin presentar fixtures, presencia de código o una sucursal como paridad completa.

## Tasks

- [x] T1 · S1,S2,S3 · route:inline · Contrastar recorridos con la evidencia propietaria · status:done · commit: 509493a306f3d6c4c3e417658b375bc290e9af7a
- [x] T2 · S1,S2,S3 · route:inline · Corregir fuentes editoriales y navegación afectada · status:done · commit: 509493a306f3d6c4c3e417658b375bc290e9af7a
- [x] T3 · S1,S2,S3 · route:delegated · Validar fuentes, build y enlaces y registrar límites · status:done · commit: 509493a306f3d6c4c3e417658b375bc290e9af7a
- [ ] T4 · S1,S2,S3 · route:delegated · Contrastar y validar la ampliación de lectura directa del 10 de noviembre · status:in_progress · evidence: nota incremental de conexiones, TLS, artefacto servido y diferencias QA/producción; pendiente revisión y verificación editorial.

## Log

- L1 · 2026-11-09 · Solicitud directa: «Recuerda que trabajamos con pos-docs y pos-platform.» El adjunto solicita análisis crítico y correcciones del contexto operativo, funcionalidades y fases. Se registra sólo alcance saneado porque contiene credenciales y destinos privados; el original no se copia al repositorio público.

> Recuerda que trabajamos con pos-docs y pos-platform.

- L2 · 2026-11-09 · Se consultan producto integrado 2985aa799165af300f8a522349803548d4415c7b y documentación 3dc039e0e8bc58e29b0568b01589499d24fd3442. Ramas propias preservan las sesiones ajenas. Los hallazgos de acceso no resuelven automáticamente FOLLOWUP-001 ni homologan proveedores.
- L3 · 2026-11-09 · Respuesta literal del usuario: «Es una hipótesis; falta confirmarlo con Comercial». El contenido conserva la regla batería/OV como pregunta y no modifica contratos de ejecución.
- L4 · 2026-11-09 · Verificación con Node 22.23.3 y npm temporal 11.6.0; instalación inicial con npm 10.9.9 conservó lockfile. Build y navegador aprobados, tres rutas con HTTP 200/ancla y sin overflow o errores JS; capturas móvil/escritorio inspeccionadas. ODD check falló inicialmente por la cita L1, después pasó. La revisión independiente de preparar_verificacion se registra como agente con hash de cada fuente y producto 2985aa7; no es comprensión humana ni RDD. El enlace inmutable al informe del producto queda condicionado a publicar su commit; TASK-258 mantiene trazabilidad inmediata. Risk: none; cambio editorial pasivo. Engram y RDD no disponibles; publicación e integración no realizadas.
- L5 · 2026-11-09 · Después de actualizar el ledger se repitieron validate, build y las tres rutas: aprobados, sin modificar hashes canónicos. Los badges muestran changed porque la captura automática conserva 3929549 y esta revisión consultó 2985aa7; se mantiene esa distinción, sin editar el snapshot ni simular reviewed. El próximo corte de captura limpia deberá coordinar su evidencia; no se atribuye revisión global por estas tres páginas.
- L6 · 2026-11-09 · Corte editorial creado en 509493a306f3d6c4c3e417658b375bc290e9af7a (120 altas/2 bajas), coordinado con producto a70091458c836b93d7241a1bdbba50e177dc0130. Ambos locales, sin push/PR/merge; RDD no ejecutado por herramienta no disponible. origin/main recibió después la versión 0.4.2; este corte conserva su base 3dc039e y debe actualizarse antes de publicación.
- L7 · 2026-11-10 · El usuario pide repetir la conexión con VPN activa. TASK-258 amplía lectura directa SSH/SQL y configura una nota editorial sobre certificado vencido, artefacto servido, diferencias de esquema y equivalencia limitada de controles de cierre. Se conserva el ancla pública del apartado 10 y se añaden observaciones fechadas, sin reemplazar revisiones históricas ni snapshots. Las solicitudes de login QA tienen evidencia temporal de sesiones, sin respuesta HTTP conservada; no se atribuye UI ni permisos efectivos.
- L8 · 2026-11-10 · Revisión incremental independiente favorable de preparar_verificacion; ledger añade una revisión por agente, preservando las 12 anteriores. editorial:check/test (28/28), odd:check, skills:check, validate, typecheck, build y tests de ledger (7/7) aprobados. Ruta afectada HTTP 200 en escritorio/móvil, ancla 10 y tres párrafos nuevos presentes, sin overflow ni errores JS; capturas inspeccionadas. Un primer script temporal de navegador falló al repetir navegación al mismo fragmento; corregido sólo en scratch y reejecutado satisfactoriamente. Nueve hashes de fuentes/ledger/lockfiles permanecieron idénticos tras los checks. Badge changed conservado; no acredita CI nativa/portable completa, login QA, operación ni comprensión humana. Risk: none para la nota pasiva.
