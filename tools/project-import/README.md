# Importación automática de los snapshots del producto

[`project-import.yml`](../../.github/workflows/project-import.yml) mantiene al día lo que el portal publica de POS Platform: avance, seguimientos, planificación, preguntas y el índice de reglas. Cuando cambian en `main` del producto, o cambia el estado de sus issues en GitHub, abre o actualiza **una** PR que importa los cinco snapshots. Una persona la revisa y la integra, como cualquier PR editorial. Issue: [TASK-283](https://github.com/developer-implementos/pos-platform/issues/283).

## Qué hace cada corrida

1. **Checkouts:** hace checkout de `main` de POS Docs y de `main` de POS Platform, con historia completa para validar las revisiones de la evidencia.
2. **Importadores:** ejecuta los cinco en orden de dependencia: avance, seguimientos, planificación, preguntas y reglas.
   - Cada uno compara primero los hechos en modo de sólo lectura y sólo escribe si su snapshot está desactualizado (`StaleSnapshotError`).
   - Renovar la hora de observación de GitHub no cuenta como cambio.
   - Cualquier otro error detiene la corrida sin publicar nada.
3. **Sin cambios:** si ningún snapshot cambió, termina. Lo mismo si sólo avanzó la revisión del producto: un commit que no toca los registros de entrega ni las issues no es noticia, así que descarta lo escrito y conserva el corte publicado (`publishedFacts` ignora sólo `source.revision` e `issues.observedAt`). Si había una PR de importación abierta, la cierra con un comentario, porque `main` ya publica el corte vigente.
4. **Con cambios:**
   - importa los cinco snapshots a la misma revisión, aunque sólo cambien los datos de uno, y el cuerpo distingue cuáles cambian;
   - calcula las entradas del historial con la misma función que usa la política editorial;
   - genera el título y el cuerpo;
   - los valida con `validatePullRequest` y `validateChangelogOverride` antes de tocar GitHub.
5. **Publicación:** escribe la rama `automation/project-import` mediante la API de Git, con un solo commit sobre `main` que firma GitHub para la App, y crea o actualiza la PR. Una corrida idéntica no escribe nada.
6. **Checks:** `Documentation quality` y `Editorial PR policy` verifican la PR como cualquier otra.

## Garantías

- **Revisión inmutable y limpia:** importa siempre `main` del producto, desde un checkout limpio. Nunca ejecuta código de una PR ni descarga sus artefactos.
- **Integración humana:** no integra nada. El auto-merge sigue deshabilitado y la App no tiene bypass de revisión (`.github/rulesets/review.json`).
- **Mínimo privilegio:** una App propia, separada de la App de versiones. Emite dos tokens por corrida, cada uno reducido a un repositorio:
  - POS Platform: `contents:read` e `issues:read`;
  - POS Docs: `contents:write` y `pull-requests:write`.
- **Endpoints acotados:** el cliente de [`github.mjs`](github.mjs) sólo alcanza los endpoints que la publicación necesita. Rechaza integrar, borrar ramas, escribir en `main` o tocar otro repositorio.
- **Propiedad de la rama y la PR:** si la rama o la PR no las creó la App, la corrida aborta en lugar de sobrescribirlas o cerrarlas.
- **Logs públicos:** este repositorio es público, así que la corrida sólo imprime revisiones, estados y el enlace de la PR, nunca el contenido de los snapshots ni código del producto. Los snapshots ya son públicos una vez integrados.
- **Una corrida a la vez:** una publicación en curso nunca se interrumpe (`concurrency: project-import`).

Las pruebas de [`project-import.test.mjs`](project-import.test.mjs) y de [`repository-governance.test.mjs`](../repository-governance.test.mjs) fijan estas propiedades.

## Configuración inicial

La hace un administrador de la organización. Hasta que esté completa, el workflow no corre por calendario; un despacho manual falla al pedir el token y lo dice.

1. **Crear la App** en la organización `developer-implementos`, con:
   - nombre sugerido `implementos-pos-docs-import`;
   - sin webhook;
   - instalable sólo en esta cuenta;
   - permisos de repositorio: **Contents** lectura y escritura, **Pull requests** lectura y escritura, **Issues** sólo lectura, **Metadata** sólo lectura;
   - sin permisos de organización.

   Los tokens de cada corrida se reducen a lo que usa cada repositorio.
2. **Instalarla** sólo en `pos-platform` y `pos-docs`.
3. **Crear el environment `project-import`** en POS Docs, con la regla de despliegue «sólo `main`». Cargar allí:
   - la variable `IMPORT_APP_CLIENT_ID`, con el Client ID de la App;
   - el secreto `IMPORT_APP_PRIVATE_KEY`, con una clave privada generada para ella.
4. **Probar:** ejecutar el workflow a mano (`gh workflow run project-import.yml -R developer-implementos/pos-docs`) y revisar el resumen de la corrida.
5. **Activar el calendario** con la variable de **repositorio** `PROJECT_IMPORT_ENABLED=true`. Tiene que ser de repositorio porque la condición del job se evalúa antes de cargar el environment.

No agregar la App a los rulesets ni a `CODEOWNERS`: sus PR las revisa e integra una persona.

## Operación

- **Revisar la PR:** el diff de `portal/data/` y el bloque de entradas del historial. Si la PR sigue abierta y el producto vuelve a cambiar, la corrida siguiente la actualiza en lugar de abrir otra.
- **Despachar a mano:** `gh workflow run project-import.yml -R developer-implementos/pos-docs`.
- **Disparo desde POS Platform:** el workflow acepta `repository_dispatch` con el tipo `pos-platform-delivery-changed`. Ignora la carga del evento e importa `main`. Configurar ese emisor es una mejora opcional: requiere un token de POS Platform con permiso para despachar aquí. Sin él, la latencia máxima es de una hora.
- **Si una corrida falla:** el resumen del job dice en qué paso. Una validación fallida significa que el registro o la evidencia del producto no son coherentes: se corrige en POS Platform, no aquí.
- **Desactivar:** quitar `PROJECT_IMPORT_ENABLED` o deshabilitar el workflow (`gh workflow disable project-import.yml -R developer-implementos/pos-docs`). La importación manual de [`docs/project-progress.md`](../../docs/project-progress.md) sigue disponible.
- **Rotar la clave:** generar una nueva en la App, reemplazar el secreto y revocar la anterior.

## Uso local

```sh
node tools/project-import/run.mjs --workspace ../pos-platform
```

Sin `--publish`, importa en el checkout local y muestra el plan, sin tocar GitHub. Requiere los dos checkouts limpios y `gh` autenticado con lectura de las issues del producto.
