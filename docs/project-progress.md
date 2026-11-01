# Seguimiento del avance

La [portada de POS Docs](/#progress) muestra el avance técnico verificado del proyecto, de cada fase y de cada aplicación. La aceptación manual del equipo se informa por separado y no condiciona ese porcentaje. La fuente de seguimiento es [`delivery/progress.json` en la revisión publicada de POS Platform](https://github.com/developer-implementos/pos-platform/blob/54331b738b1ea197abebeddd4a6b73f18ef016a6/delivery/progress.json). El roadmap define el alcance; el registro del producto conserva su estado y evidencia. No se editan porcentajes en la portada.

## Qué significa el porcentaje

El denominador corresponde a todos los paquetes del [roadmap versionado](/guide/proposal/roadmap/). La portada muestra su cantidad actual. Todos tienen el mismo peso en esta métrica:

- **Proyecto:** paquetes únicos verificados / paquetes del alcance × 100.
- **Fase:** paquetes verificados de la fase / paquetes de esa fase × 100.
- **Aplicación:** paquetes verificados en los que participa / paquetes que tiene asignados × 100.

Un paquete compartido cuenta una sola vez en el total del proyecto. Aparece también en cada aplicación que participa, por lo que **el avance general no es la media de los porcentajes de las apps**. Los porcentajes se muestran con hasta un decimal; el 100 % requiere que todos los paquetes correspondientes estén verificados. Por ejemplo, tres entregables verificados de 71 representan 4,2 % del proyecto; si pertenecen a una fase con 13 entregables, representan 23,1 % de esa fase. Es un ejemplo del cálculo, no una declaración del estado publicado.

Esta medida expresa implementación y verificación de los entregables acordados, que incluyen capacidades funcionales, infraestructura, gobierno del desarrollo y validaciones. No expresa esfuerzo consumido, tiempo restante, cantidad de código ni preparación para producción. Un paquete aporta cuando la evidencia cubre todos sus criterios dentro del alcance definido, incluido el recorrido integrado si participan varias aplicaciones. El trabajo parcial conserva su resumen y estado, pero no recibe un porcentaje estimado.

El código de F01 está integrado en `main` y combina dos alcances pendientes de aceptación: un incremento operativo para Chile con usuarios y permisos propios POS, provisión persistente, HTTPS y administración desde Angular contra API y PostgreSQL reales; y un laboratorio separado que prueba venta en efectivo y recuperación con datos comerciales sintéticos. Los paquetes Windows Tauri y Android y el gobierno de PR tienen evidencia técnica propia. El conector Mountain permite consultas HTTPS acotadas; la VPN resuelve el nombre del servicio, pero la conexión se rechaza antes de TLS. Sigue sin validación contra la instancia corporativa ni conexión al espejo o a la UI. El perfil operativo mantiene deshabilitados los cobros y precios sin fuente comercial verificada.

El resumen de cada app señala el alcance comprobado y sus límites: una prueba de navegador no acredita instalación nativa, una consulta local de contrato no acredita el proveedor y una CI verde no acredita por sí sola todos los criterios del entregable. La integración en `main` no verifica automáticamente una tarea ni registra aceptación manual. La portada muestra cuántos entregables están verificados, cuántos aceptó el equipo y cuántos verificados esperan esa revisión manual.

## Estados y evidencia

| Estado del registro | Significado | Aporta al porcentaje |
| --- | --- | --- |
| `not_started` | Entregable pendiente según la revisión registrada. | No |
| `in_progress` | Trabajo en curso descrito en el resumen. | No recibe un porcentaje parcial automático. |
| `blocked` | Trabajo bloqueado; el resumen identifica la dependencia. | No |
| `verified` | Entregable implementado y comprobado con revisión técnica y evidencia versionada. | Sí, aunque la aceptación manual esté pendiente. |

El esquema 2 exige `verification` para `verified`: commit del producto, fecha de revisión, revisor técnico y rutas de evidencia versionada. El revisor identifica quién realizó la comprobación, incluida una sesión de agente cuando corresponda; no se presenta como aprobación humana. El informe debe describir el alcance probado y los resultados de los criterios correspondientes, incluidos fallos y recuperación. La presencia de carpetas, un build exitoso o una captura de una pantalla mock no sustituyen esa verificación.

`acceptance` es una revisión manual independiente con los mismos campos. Puede permanecer en `null` después de verificar el entregable. Cuando el equipo la registra, debe revisar una versión que incluya la verificación técnica y una fecha igual o posterior. Sólo los entregables `verified` pueden tener aceptación manual. Los demás estados mantienen ambos campos en `null`. El contador **Aceptación manual** muestra las aceptaciones y los verificados pendientes de revisión; no añade una segunda barra ni modifica el avance técnico.

Los snapshots de esquema 1 conservan su medición histórica de aceptación, identificada como **Aceptación del roadmap**. No se convierten en verificación técnica automáticamente: el porcentaje principal cambia a la nueva medición al importar un registro de esquema 2.

Las validaciones comprueban el formato, las referencias y la correspondencia con el roadmap. **No determinan automáticamente que el comportamiento esté implementado correctamente.** La revisión técnica y funcional sigue siendo responsabilidad del equipo.

El registro separa tres revisiones: el código al que se refiere la evidencia de las aplicaciones (`productRevision`), el commit del roadmap que define el alcance (`scope.revision`) y el commit que contiene el registro importado (`source.revision` en POS Docs). `productRevision` admite un SHA completo o el valor exacto `source`: este último significa **la revisión fuente del registro, resuelta al SHA publicado**. La importación fija ese SHA inmutable en `source.revision` y comprueba los paths de evidencia en ese árbol Git; no consulta después una rama mutable.

El snapshot conserva el contenido original, incluido `productRevision: "source"`, para comprobar su hash contra el JSON del producto. Las salidas derivadas resuelven ese valor al SHA de `source.revision`; los snapshots anteriores con SHA explícito siguen siendo válidos. Así, un squash puede cambiar el SHA del registro sin dejar la evidencia de aplicaciones apuntando a un commit de rama que ya no pertenece al historial integrado.

`verification.revision`, `acceptance.revision` y `scope.revision` siempre requieren un SHA completo; no admiten `source`. La verificación debe pertenecer al historial del producto efectivo. Si hay aceptación, su revisión debe incluir la verificación y pertenecer también a ese historial. Las evidencias se comprueban en el commit de cada revisión y deben ser archivos o directorios versionados, sin enlaces simbólicos. Si un squash deja una verificación o aceptación fuera de ese historial, la importación la rechaza; no la reubica automáticamente. Actualizar la portada o resolver `source` tampoco cambia por sí solo el revisor, la fecha o los estados.

## Actualizar el panel

1. En POS Platform, actualizar `delivery/progress.json` con los estados, resúmenes y evidencias de la revisión. Ejecutar `npm run progress:test` y `npm run progress:check`, revisar el diff y confirmar el cambio en Git.
2. Desde POS Docs, importar el registro del checkout limpio del producto:

   ```sh
   npm run progress:sync -- --workspace ../pos-platform
   ```

3. Revisar el cambio en `portal/data/project-progress.json`. Es una copia de metadatos para publicación: no incluye el código del producto, credenciales ni resultados operativos sensibles.
4. Validar la correspondencia con la fuente, los cálculos y el portal:

   ```sh
   npm run progress:sync -- --workspace ../pos-platform --check
   npm run progress:test
   npm run validate
   npm run typecheck
   npm run build
   npm run portal:check
   ```

5. Confirmar y publicar el cambio revisado de POS Docs. Vercel construye el portal con ese snapshot y la portada identifica la revisión publicada.

`--check` detecta un snapshot desactualizado sin modificarlo. La importación rechaza cambios sin commit en el producto, un repositorio distinto, evidencia inexistente y un alcance que ya no coincide con el roadmap. Ambos checkouts deben incluir los commits referenciados; un clon superficial requiere recuperar esa historia antes de importar. Valida todo antes de reemplazar el snapshot. El hash de la fuente identifica su contenido JSON normalizado; el hash del alcance corresponde al archivo del roadmap con saltos de línea LF.

POS Platform es un repositorio privado. Los enlaces a su registro y evidencia requieren acceso de la empresa; los porcentajes, resúmenes y estados revisados son visibles en el portal público. El build y el navegador no consultan ese repositorio ni necesitan sus credenciales. **Un push a POS Platform no actualiza automáticamente POS Docs:** el nuevo resumen se publica mediante el flujo anterior, no en tiempo real.

## Cambios de alcance

Si se añaden, eliminan o reasignan entregables, revisar conjuntamente `docs/roadmap.json` y el registro de POS Platform. Actualizar la revisión y hash del alcance, incluir todos sus IDs y reevaluar las verificaciones y aceptaciones afectadas antes de importar el nuevo snapshot. No eliminar pendientes para elevar el porcentaje ni conservar un denominador antiguo después de ampliar el alcance.

El roadmap mantiene la propuesta y sus criterios; POS Platform mantiene el avance técnico y las aceptaciones manuales. POS Docs calcula y presenta una copia revisada de esos datos, con trazabilidad a ambas fuentes.
