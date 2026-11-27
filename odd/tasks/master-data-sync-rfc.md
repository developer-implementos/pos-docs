# RFC del sincronizador corporativo de maestros multipaís

Objetivo: registrar como ADR-34, en forma de propuesta (RFC), el sincronizador corporativo de maestros multipaís con su modelo, casos de borde y plan de trabajo, para [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782).
Rama: `work/master-data-sync-rfc`. Entrega: una PR editorial; la implementación sale en POS Platform por unidades M1 a M11.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Propone cómo llegan todos los maestros desde el ERP de cada país.

## Specs

- S1. Pedido literal del responsable: «debes pensarlo en coorporativo. Chile sincroniza contra eso, pero perú y españa pueden tener o manejar otros campos quizas. Por eso debemos tener quizas un sincronizador corporativo multipaís», y «haz todo lo necesario. crea un rfc detallado con el plan de trabajo». `docs/decisions/master-data-sync.md` registra el ADR-34 con su decisión propuesta, lo encontrado en cada país, el modelo, el flujo, los casos de borde, la seguridad, el plan de trabajo y lo abierto. Checks: `npm run verify`.
- S2. La decisión es localizable: fila ADR-34 en `docs/propuesta-arquitectura.md` y entrada en `apps/starlight/content-map.mjs` y su barra lateral. Checks: `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, dominios internos, cuentas, correos, credenciales ni la clase de debilidad de un sistema en producción. Checks: revisión del diff.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-34 · status:done · evidence: `docs/decisions/master-data-sync.md`
- [x] T2 · S2 · route:inline · Registrar la decisión en la propuesta y en la barra lateral · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`
- [x] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:done · evidence: `npm run verify` en verde (un paso del portal falló por un error local de sockets y pasó al repetirlo con los siguientes)

## Log

- L1 · 2026-11-25 · Solicitud original del responsable del producto, literal:

> ademas debes pensarlo en coorporativo. Chile sincroniza contra eso, pero perú y españa pueden tener o manejar otros campos quizas. Por eso debemos tener quizas un sincronizador corporativo multipaís.

Luego, literales: «esta sería una solucion enterprise-grade, sin parches y como lo harian las bigtechs y ademas abarcaria todos los edge cases?» y «s. haz todo lo necesario. crea un rfc detallado con el plan de trabajo».

- L2 · 2026-11-25 · Evidencia, leída en el código de los repositorios de la organización: en Chile el sincronizador de sucursal del legacy busca la caja por el `RecId` de AX (`id_externo`) y guarda el punto de emisión, el nombre, la plaza y el grupo de banco como atributos; las ventas suben a AX con el punto de emisión. Perú y España no tienen sincronización de cajas hacia la tienda: Perú carga la herramienta de reposición y España lee Gira hacia un almacén de lectura; en Gira la caja es un atributo de cada documento de venta.
- L3 · 2026-11-27 · El responsable del producto aceptó el ADR-34, literal: «Si lo acepto». El estado pasa a aceptado en la decisión y en la tabla de la propuesta de arquitectura.
