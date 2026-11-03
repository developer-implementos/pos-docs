# Emitir y consultar un documento

La fuente comercial, la identidad fiscal y el resultado del emisor se conservan por separado. La [fiscalidad por país](/guide/proposal/fiscal-compliance/) define el alcance objetivo; los [proveedores y sus contratos](/guide/architecture/providers/) identifican las condiciones de integración.

## Evidencia del documento

Consultar un documento no debe volver a emitirlo. Una respuesta perdida conserva la incertidumbre hasta recuperar evidencia válida. Un PDF o la aceptación técnica del proveedor no acreditan por sí solos el estado de la autoridad tributaria. La [guía F02](/guide/implementation/phase-2/#qué-conserva-cada-contexto) mantiene esas reglas y los límites de la composición disponible.

El [ciclo del documento fiscal](/explore/state-fiscal/) distingue preparación, despacho, recepción y resultado fiscal, con enlaces a los predicados de `98f8987`. Describe el comportamiento del software; la homologación del emisor se verifica por separado.

La impresión es otro trabajo: [consultar su recorrido](printing.md). Una copia del original no crea otro cobro ni otra emisión fiscal.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | Solicitud, consulta y acceso al original fiscal |
| [Ciclo fiscal con PostgreSQL](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/libs/backend/fiscal/test/fiscal.integration.test.ts) | Identidad inmutable, envío después del commit, evidencia contradictoria y consulta segura |
| [Original fiscal protegido](/guide/implementation/phase-2/#búsqueda-y-original-fiscal-protegido) | Autorización, contenido y límites de exportación |
| [F02-02](https://github.com/developer-implementos/pos-platform/issues/24) | Emisión fiscal y primer proveedor homologado |

La revisión `98f8987` conserva contratos y pruebas con adaptadores aislados. No habilita Acepta/Ingydev ni un numerador productivo; la evidencia de una emisión real debe corresponder al proveedor, país y entorno autorizados.
