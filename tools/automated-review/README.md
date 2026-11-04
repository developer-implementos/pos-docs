# Revisión automática remota

**Preparada, pendiente de conexión.** No se ha invocado un modelo ni acreditado una revisión real con este integrador. La tarea de adopción es [TASK-122](https://github.com/developer-implementos/pos-platform/issues/122). Este proceso remoto es independiente de RDD nativo local: no genera recibos RDD ni representa aprobación humana.

## Activación posterior

El administrador debe autorizar el proveedor y su consumo antes de configurar:

| Configuración de GitHub Actions  | Valor                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Variable `POS_AI_REVIEW_ENABLED` | `true`, únicamente tras autorizar la conexión                                                    |
| Variable `POS_AI_REVIEW_AUTH`    | `api` para una clave del equipo; `oauth` para un token oficial autorizado                        |
| Variable `POS_AI_REVIEW_MODEL`   | Identificador explícito del modelo `claude-…` autorizado; no se selecciona un modelo por defecto |
| Secret `ANTHROPIC_API_KEY`       | Sólo si la modalidad elegida es `api`                                                            |
| Secret `CLAUDE_CODE_OAUTH_TOKEN` | Sólo si se elige `oauth`, obtenido mediante el procedimiento oficial del proveedor               |

No copiar archivos de autenticación personales, cookies, sesiones ni credenciales desde la máquina de un desarrollador. El workflow se entrega sin credenciales y no se configura como required check todavía. Tras integrar esta preparación, el administrador lo deshabilita explícitamente en GitHub hasta que el equipo autorice conectar el proveedor. Configurar las variables y el secret elegidos, habilitar después el workflow y ejecutar las pruebas reales indicadas a continuación precede a exigirlo como control de integración. Un intento sin habilitación o credencial falla explícitamente; un job omitido o un workflow deshabilitado nunca acredita una revisión.

Antes de exigir `AI review` en las reglas: activar el workflow, probar una PR válida y otra con un defecto conocido, comprobar que el defecto bloquea, cambiar el head y verificar que se exige evidencia nueva. Revisar en GitHub la asociación del check al candidato actual, porque `pull_request_target` ejecuta la política de la base. También probar ausencia de credencial, draft y respuesta inválida. No marcarlo obligatorio mientras estas pruebas sigan pendientes. La ejecución con una API de pago tiene consumo; `--max-budget-usd 2` es un límite estimado del cliente, no una garantía de facturación máxima del proveedor.

## Frontera de confianza

1. `pull_request_target` carga exclusivamente el commit de base. Ningún checkout, dependencia, script, hook, configuración o comando del head se ejecuta.
2. La API de GitHub se limita a lecturas en los dos repositorios autorizados. Se exige una PR abierta de `main`, del mismo repositorio, no draft y un actor humano con escritura. Los bots y forks no gastan credenciales automáticamente.
3. Se capturan el merge-base, el head, los diffs completos y todos los archivos cambiados antes/después. Los blobs se verifican por su SHA Git. El candidato tiene SHA-256; cualquier cambio de base/head detectado antes o después del modelo invalida la revisión.
4. El runner Linux instala sólo el paquete nativo oficial de Claude Code fijado en el lockfile, sin scripts de instalación, en un directorio temporal. La instalación no recibe credenciales de GitHub ni del modelo. El ejecutable verifica su versión exacta antes de usarse.
5. Claude recibe archivos como JSON no confiable por stdin. No recibe token GitHub. Usa `--safe-mode`, herramientas vacías, MCP estricto vacío, hooks desactivados, sin fuentes de configuración, sin persistir sesión y sin acceso al checkout. No existe aprobación automática de comandos. El aislamiento de herramientas reduce la superficie de prompt injection; no demuestra inmunidad semántica del modelo.
6. Se valida un veredicto estructurado con digest, base/head, cobertura exacta y ubicaciones reales. Hallazgos altos/medios, contexto insuficiente o cualquier fallo bloquean. Un resultado favorable acredita una comprobación de máquina acotada, no ausencia de defectos ni aceptación operativa.
7. GitHub recibe evidencia de revisiones, hashes, ubicaciones y severidades, más una descripción validada de hasta 600 caracteres que explique el defecto y su desencadenante. Antes de publicar se eliminan credenciales conocidas y patrones sensibles; el renderizador escapa Markdown/HTML activo y omite enlaces. No se publican archivos, prompts ni transcripciones. El informe conserva la misma audiencia del repositorio revisado: no se exportan hallazgos privados del producto al portal público. Esta reducción no garantiza detectar todo secreto arbitrario; el código y sus hallazgos requieren las mismas precauciones de publicación que la PR.

El CLI corre en un runner hospedado limpio; no se reutilizan caches ni perfiles personales. La política administrada del proveedor conserva su autoridad según su contrato oficial; este integrador no promete desactivar controles corporativos externos.

## Límites que bloquean

Hasta 30 archivos, 1.200 líneas modificadas, 64 KiB por versión de archivo y 256 KiB de candidato serializado. Se rechazan binarios, UTF-8 inválido, enlaces simbólicos, submódulos, inventarios o diffs truncados y respuestas de API mayores de 2 MiB. No se recorta silenciosamente el alcance para obtener un resultado favorable. Dividir una PR sólo cuando conserve una unidad de cambio coherente; los casos fuera de cobertura requieren un mecanismo de revisión aprobado por la política del repositorio. No convertir un resultado incompleto en un pase manual del bot.

Un candidato puede cambiar justo después de la última lectura remota. La evidencia siempre conserva el SHA revisado; la regla futura debe exigir el check del head vigente y una rama actualizada. No hay publicación `APPROVE`, cambios de permisos ni escritura en ramas desde este integrador.

## Mantenimiento y distribución

Fuente única: `developer-implementos/pos-platform/tools/automated-review`. POS Docs recibe una copia byte por byte del bundle y su workflow. `distribution.json` fija versión y hashes; una edición en la copia falla hasta distribuir una revisión de la fuente. La revisión de seguridad de la base y las protecciones de PR siguen siendo necesarias: quien pueda modificar la política confiable puede modificar sus controles.

```text
node --test tools/automated-review/review.test.mjs
node tools/automated-review/distribute.mjs --record
node tools/automated-review/distribute.mjs --check
node tools/automated-review/distribute.mjs --write C:/ruta/pos-docs
```

El lockfile fija `@anthropic-ai/claude-code-linux-x64@2.1.296`, el paquete nativo distribuido por el CLI oficial, con integridad SHA-512. Actualizarlo requiere verificar publicación e integridad oficiales, compatibilidad de flags, pruebas locales y prueba remota autorizada; no usar `latest` ni autoactualización. El bundle no requiere instalar dependencias del producto para sus pruebas.

Referencias primarias: [CLI y safe mode](https://code.claude.com/docs/en/cli-reference), [salida estructurada](https://code.claude.com/docs/en/headless), [autenticación en Actions](https://code.claude.com/docs/en/github-actions), [evaluación de required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
