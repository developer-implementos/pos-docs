# Seguimiento del avance

La [portada de POS Docs](/#progress) muestra el porcentaje de entregables del alcance aceptados del proyecto y de cada aplicación. La fuente de seguimiento es [`delivery/progress.json` en la revisión publicada de POS Platform](https://github.com/developer-implementos/pos-platform/blob/2bca6dff9150a54dcbeb7c72e8744211790af677/delivery/progress.json). El roadmap define el alcance; el registro del producto conserva su estado y evidencia. No se editan porcentajes en la portada.

## Qué significa el porcentaje

El denominador corresponde a todos los paquetes del [roadmap versionado](/guide/proposal/roadmap/). La portada muestra su cantidad actual. Todos tienen el mismo peso en esta métrica:

- **Proyecto:** paquetes únicos aceptados / paquetes del alcance × 100.
- **Aplicación:** paquetes aceptados en los que participa / paquetes que tiene asignados × 100.

Un paquete compartido cuenta una sola vez en el total del proyecto. Aparece también en cada aplicación que participa, por lo que **el avance general no es la media de los porcentajes de las apps**. Los porcentajes visibles se redondean hacia abajo; el 100 % requiere que todos los paquetes correspondientes estén aceptados.

Esta medida expresa aceptación de los entregables acordados, que incluyen capacidades funcionales, infraestructura, gobierno del desarrollo y validaciones. No expresa esfuerzo consumido, tiempo restante, cantidad de código ni preparación para producción. Cada paquete debe satisfacer sus propios criterios: las capacidades requieren aceptación funcional y las validaciones requieren la evidencia correspondiente. Un paquete compartido se acepta cuando cumple su entrega integrada. Para medir independientemente contribuciones parciales de cada aplicación habría que acordar criterios adicionales en el alcance.

El código de F01 está integrado en `main` y combina dos alcances pendientes de aceptación: un incremento operativo para Chile con usuarios y permisos propios POS, provisión persistente, HTTPS y administración desde Angular contra API y PostgreSQL reales; y un laboratorio separado que prueba venta en efectivo y recuperación con datos comerciales sintéticos. El conector Mountain permite consultas HTTPS acotadas, todavía sin validación contra la instancia corporativa ni conexión al espejo o a la UI. El perfil operativo mantiene deshabilitados los cobros y precios sin fuente comercial verificada.

Los trece entregables F01 siguen en desarrollo y requieren su aceptación completa. Por eso el registro conserva **0 entregables aceptados** y la portada puede mostrar **0 %** junto con capacidades implementadas y pruebas satisfactorias. El resumen de cada app debe señalar el alcance comprobado y sus límites: una prueba de navegador no acredita instalación nativa, una consulta local de contrato no acredita el proveedor y una CI verde no acredita aceptación funcional. La revisión publicada identifica el código integrado; la integración no cambia automáticamente la aceptación.

## Estados y evidencia

| Estado del registro | Significado | Aporta al porcentaje |
| --- | --- | --- |
| `not_started` | Entregable pendiente según la revisión registrada. | No |
| `in_progress` | Trabajo en curso descrito en el resumen. | No recibe un porcentaje parcial automático. |
| `blocked` | Trabajo bloqueado; el resumen identifica la dependencia. | No |
| `accepted` | Entrega aceptada con revisión, responsable y evidencia identificables. | Sí |

Para aceptar un paquete, el equipo registra `acceptance` con el commit del producto, la fecha de revisión, el revisor y rutas de evidencia versionada. La revisión aceptada debe pertenecer a la historia del código revisado en `productRevision`; no puede acreditar cambios posteriores que todavía no se revisaron. Las evidencias deben apuntar a archivos o directorios versionados, sin enlaces simbólicos. El informe debe describir el alcance probado y los resultados de los criterios correspondientes, incluidos fallos y recuperación. La presencia de carpetas, un build exitoso o una captura de una pantalla mock no sustituye esa aceptación.

Las validaciones comprueban el formato, las referencias y la correspondencia con el roadmap. **No determinan automáticamente que el comportamiento esté implementado correctamente.** La revisión técnica y funcional sigue siendo responsabilidad del equipo.

El registro separa tres revisiones: el código al que se refiere la evidencia de las aplicaciones (`productRevision`), el commit del roadmap que define el alcance (`scope.revision`) y el commit que contiene el registro importado (`source.revision` en POS Docs). `productRevision` admite un SHA completo o el valor exacto `source`: este último significa **la revisión fuente del registro, resuelta al SHA publicado**. La importación fija ese SHA inmutable en `source.revision` y comprueba los paths de evidencia en ese árbol Git; no consulta después una rama mutable.

El snapshot conserva el contenido original, incluido `productRevision: "source"`, para comprobar su hash contra el JSON del producto. Las salidas derivadas resuelven ese valor al SHA de `source.revision`; los snapshots anteriores con SHA explícito siguen siendo válidos. Así, un squash puede cambiar el SHA del registro sin dejar la evidencia de aplicaciones apuntando a un commit de rama que ya no pertenece al historial integrado.

`acceptance.revision` y `scope.revision` siempre requieren un SHA completo; no admiten `source`. La aceptación debe pertenecer al historial del producto efectivo y sus evidencias deben existir en el commit aceptado. Si un squash deja una aceptación fuera de ese historial, la importación la rechaza; no la reubica ni la convierte en aceptada automáticamente. Actualizar la portada o resolver `source` tampoco cambia por sí solo el revisor, la fecha de revisión o los estados de los entregables.

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

Si se añaden, eliminan o reasignan entregables, revisar conjuntamente `docs/roadmap.json` y el registro de POS Platform. Actualizar la revisión y hash del alcance, incluir todos sus IDs y reevaluar las aceptaciones afectadas antes de importar el nuevo snapshot. No eliminar pendientes para elevar el porcentaje ni conservar un denominador antiguo después de ampliar el alcance.

El roadmap mantiene la propuesta y sus criterios; POS Platform mantiene el avance y las aceptaciones. POS Docs calcula y presenta una copia revisada de esos datos, con trazabilidad a ambas fuentes.
