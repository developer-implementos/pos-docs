# Identidad y confianza entre fronteras

**Estado: propuesta de implementación — ADR-16.** Precisa autenticación, autorización y continuidad para las seis aplicaciones. No selecciona un proveedor de identidad, PKI ni plataforma de dispositivos; no acredita integración corporativa. F01 prueba el alcance de autorización en laboratorio; F03/F05 deben comprobar identidades y ciclo de vida reales antes de una habilitación productiva.

## Identidades distintas

| Identidad | Qué representa | Quién comprueba su autoridad |
| --- | --- | --- |
| Operador | Persona autorizada para operaciones y ámbitos concretos | `branch-api` verifica sesión, permisos, país/entidad/sucursal/caja y límites del comando |
| Puesto | Instalación de `pos-desktop` o `pos-mobile`, identificada por `deviceId` y época de instalación | Registro de dispositivos y backend de sucursal; posesión de una clave no concede permisos del operador |
| Sucursal | Instalación y escritor autorizado del backend local, con época de recuperación | Registro de instalaciones en país; restaurar una copia no crea otro escritor autorizado |
| Workload | Instancia/capacidad de `branch-sync-worker` o `erp-worker` y de las APIs | API receptora valida audiencia, identidad, ámbito y capacidades; un worker no usa la sesión personal de un administrador |

`country-api` mantiene el registro POS de instalaciones, workloads, ámbitos y revocaciones. El proveedor de identidad corporativo propuesto autentica personas; `branch-api` decide la autorización del comando POS mediante políticas y asignaciones del producto. La operación de PKI y la integración con ese proveedor deben asignarse a plataforma/seguridad. No se añade una séptima aplicación `identity-api` ni se atribuye ese servicio al legacy.

## Autenticación por frontera

| Frontera | Contrato propuesto | Denegación obligatoria |
| --- | --- | --- |
| Operador → cliente nativo → `branch-api` | Inicio de sesión OIDC/OAuth con Authorization Code + PKCE en agente de usuario externo; token de acceso para la API POS. El puesto aporta una prueba de posesión de su clave registrada, ligada al token mediante DPoP cuando se homologue ese perfil | Firma/emisor/audiencia/expiración inválidos, puesto no inscrito o ámbito incompatible. Un ID token no sustituye el token de acceso de API |
| `branch-sync-worker` → `country-api` | OAuth de workload con mTLS y token ligado al certificado; permisos de entrega y descarga limitados a su instalación y entidades | Certificado/token no relacionados, audiencia distinta o lote que declara otra sucursal |
| `erp-worker` → `country-api` | Identidad de workload y mTLS; capacidades separadas `erp.execute`, `masters.prepare` y entrega de sus resultados autorizados | Reclamar un trabajo de otra entidad/origen/capacidad o finalizar con un claim antiguo |
| `erp-worker` → origen/ERP | Credencial de servicio propia del destino, mínimo privilegio y almacenamiento seguro | No reutilizar el token de país como credencial del ERP ni suponer que el proveedor admite OAuth/mTLS |
| `branch-api` → cliente nativo → puente local de periféricos | `branch-api` autoriza el comando, dispositivo y operación. El cliente transporta esa autorización al puente por IPC o loopback homologado; el puente verifica identidad, integridad y vigencia antes de ejecutar | El cliente no concede permisos por sí mismo. La LAN o una dirección IP conocida no acreditan identidad. La recepción del comando no demuestra un cobro o impresión |

Estos perfiles deben validarse con bibliotecas y componentes mantenidos; no se diseña un algoritmo criptográfico propio. OAuth y OIDC no conceden autorización de negocio por sí solos. El receptor comprueba el permiso sobre la operación y su objeto: una venta o un resultado no se autoriza sólo porque el token contenga un rol.

La clave del puesto se genera y protege en el almacén nativo; nunca se incluye un secreto compartido en el bundle Angular. El perfil DPoP debe validarse en Tauri y Capacitor, incluido ciclo de vida y reloj; si no es interoperable con los componentes elegidos, requiere una decisión de seguridad equivalente antes de habilitar ese cliente. No se degrada silenciosamente a un token reutilizable en cualquier equipo.

## Datos del contrato y comprobaciones

Un contexto autorizado conserva `subjectId`, `actorType`, `deviceId` cuando aplica, `installationEpoch`, `countryId`, `legalEntityIds`, `branchIds`, `audience`, `capabilities`, `policyVersion`, `issuedAt`, `expiresAt`, `keyId` y vinculación a la clave/certificado. Son atributos del contrato propuesto: los nombres finales y su mapeo a claims estándar se fijan al homologar el emisor. No se confía en esos campos si llegan sólo en el cuerpo de una petición.

La API coteja identidad autenticada y ámbito del mensaje; deriva su propietario a partir del contexto autorizado. `eventId`, `commandId` y `publicationId` identifican trabajo, no autenticación. `correlationId` sirve para diagnóstico, no para conceder acceso. Las operaciones rechazadas registran motivo técnico sin volcar tokens, claves, contraseñas o datos personales completos.

Si TLS termina en un proxy, sólo se aceptan atributos certificados desde ese proxy autenticado y configurado; se eliminan cabeceras de identidad aportadas por clientes. El canal proxy→API y su lista de confianza forman parte de la homologación. La aplicación no convierte cualquier cabecera `X-Client-Cert` en identidad válida.

## Alta, rotación, revocación y recuperación

| Etapa | Cambio durable | Qué se comprueba |
| --- | --- | --- |
| Alta | Administrador autorizado registra equipo/instalación, genera un desafío de uso único y aprueba el ámbito; se prueba posesión de la clave antes de activar | Caducidad y consumo único del desafío, inventario y auditoría. Requiere conexión y no permite autoasignar una sucursal |
| Rotación | Se registra la nueva clave/certificado, se prueba posesión y se publica la transición; el solapamiento y sus fechas son acotados | La clave anterior deja de autorizar al terminar su ventana. Rotar no altera IDs de negocio ni reclamos pendientes |
| Revocación | Se marca identidad/clave/política revocada, se incrementa su versión y se distribuye a receptores | Online se deniegan nuevos comandos y claims según el estado vigente; el TTL no reemplaza la revocación conocida |
| Cambio de equipo o restore | Se crea una época nueva y se excluye al escritor anterior antes de admitir negocio | Una copia de disco no puede clonar indefinidamente la autoridad. Se recuperan pendientes sin duplicar efectos ni renovar permisos por restaurar datos viejos |
| Baja | Se bloquea admisión, se concilian pendientes y se retiran credenciales | La revocación no borra auditoría, ventas o resultados ya producidos; la recuperación usa una identidad de servicio autorizada para esa tarea |

Los tiempos de token, rotación, propagación y tolerancia offline requieren aprobación de seguridad y operaciones por alcance; este contrato no inventa valores. Las pruebas registran el límite acordado y rechazan credenciales fuera de él. Certificados fiscales y credenciales de pago tienen ciclos de vida propios; no se distribuyen como una credencial genérica de puesto.

## Operación durante una caída de WAN

El perfil inicial mantiene `branch-api`, LAN y PostgreSQL de sucursal disponibles. Antes del aislamiento, la sucursal recibe una **autorización de continuidad firmada**, vinculada a operador, puesto, instalación, política, capacidades, importes y vencimiento. No es un token central de duración ilimitada ni una contraseña corporativa almacenada para imitar al proveedor.

La capacidad de administración/autorización de `country-api` emite ese grant sólo después de verificar la identidad del operador y las asignaciones aprobadas del POS; conserva su ID, política y auditoría. La firma se realiza con claves de servicio bajo custodia de plataforma/seguridad, cuyo mecanismo debe seleccionarse y operarse. `branch-api` recibe de forma autenticada el conjunto de claves públicas y sus ventanas de confianza; una clave desconocida, retirada o fuera de vigencia no habilita emisión local ni descarga desde una URL suministrada por el token.

El desbloqueo local prueba presencia mediante un mecanismo nativo homologado y protegido contra intentos repetidos. La API local verifica firma, vinculación, reloj confiable, vigencia y revocaciones conocidas, y aplica las restricciones aprobadas. No se admiten alta de usuarios/equipos, elevación de permisos, publicación global de campañas ni otras capacidades no concedidas durante el aislamiento. La política puede bloquear operaciones sensibles aunque exista una autorización vigente.

Una revocación central posterior al corte no puede conocerse inmediatamente en la sucursal aislada. Esa ventana residual debe aceptarse expresamente y limitarse por vigencia y capacidades. Si no hay autorización previa válida, el reloj no es verificable, se detecta retroceso o se pierde LAN/escritor, se bloquean nuevos comandos dependientes de esa autoridad. No se amplía la vigencia para evitar el bloqueo.

Al reconectar se actualizan políticas, revocaciones y hora antes de renovar admisión. Las operaciones aceptadas bajo la autorización válida conservan evidencia del grant, política, operador e instalación y se concilian; no se borran ni se declaran automáticamente inválidas por una revocación posterior. El transporte de pendientes usa la identidad del workload, sin necesitar que el operador mantenga una sesión abierta. Si esa identidad también fue revocada, se utiliza el procedimiento supervisado de recuperación con identidad nueva y preservación de los IDs.

## Pruebas y evidencia

| ID | Escenario | Resultado que debe conservarse |
| --- | --- | --- |
| IDN-01 | Operador válido desde otro puesto, entidad o sucursal | Rechazo del comando y ningún efecto; [F01-V03](/guide/roadmap/phase-01/#f01-v03) |
| IDN-02 | Reutilizar un token sin su clave/certificado o enviar cabeceras de certificado desde un cliente | Rechazo antes del caso de uso; traza sin secretos |
| IDN-03 | Rotación con peticiones en curso y posterior uso de la clave retirada | Intentos existentes recuperables; nuevos accesos con la clave retirada rechazados |
| IDN-04 | Revocación durante aislamiento, vencimiento, retroceso de reloj y reconexión | Límites acordados aplicados y nueva admisión sólo tras renovar la autoridad; [F05-V08](/guide/roadmap/phase-05/#f05-v08) |
| IDN-05 | Dos equipos restaurados con la misma identidad de sucursal | Sólo el escritor con época vigente admite negocio; el otro conserva evidencia para recuperación |
| IDN-06 | Worker de maestros intenta reclamar o finalizar trabajo financiero | Denegación por capacidad/ámbito, incluso si la conexión mTLS es válida; [F03-V08](/guide/roadmap/phase-03/#f03-v08) |

Los resultados humanos y las pruebas del producto siguen pendientes. El laboratorio de [F01-01](/guide/roadmap/phase-01/#work-f01-01) no acredita federación corporativa. [F03-01](/guide/roadmap/phase-03/#work-f03-01), [F03-03](/guide/roadmap/phase-03/#work-f03-03) y [F05-03](/guide/roadmap/phase-05/#work-f05-03) deben incorporar estas fronteras; el móvil requiere además sus pruebas nativas en F06.

## Referencias del perfil propuesto

El perfil de OAuth sigue las recomendaciones de seguridad de [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700). La vinculación de tokens a certificados se define en [RFC 8705](https://www.rfc-editor.org/rfc/rfc8705) y DPoP en [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449). Estos estándares sustentan mecanismos; no demuestran compatibilidad del proveedor corporativo ni resuelven la política offline del POS. La selección, interoperabilidad y operación se deben homologar.
