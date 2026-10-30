# Seguimiento del avance

La [portada de POS Docs](/#progress) muestra el porcentaje de entregables del alcance aceptados del proyecto y de cada aplicación. La fuente de seguimiento es [`delivery/progress.json` en POS Platform](https://github.com/developer-implementos/pos-platform/blob/main/delivery/progress.json). El roadmap define el alcance; el registro del producto conserva su estado y evidencia. No se editan porcentajes en la portada.

## Qué significa el porcentaje

El denominador corresponde a todos los paquetes del [roadmap versionado](/guide/proposal/roadmap/). La portada muestra su cantidad actual. Todos tienen el mismo peso en esta métrica:

- **Proyecto:** paquetes únicos aceptados / paquetes del alcance × 100.
- **Aplicación:** paquetes aceptados en los que participa / paquetes que tiene asignados × 100.

Un paquete compartido cuenta una sola vez en el total del proyecto. Aparece también en cada aplicación que participa, por lo que **el avance general no es la media de los porcentajes de las apps**. Los porcentajes visibles se redondean hacia abajo; el 100 % requiere que todos los paquetes correspondientes estén aceptados.

Esta medida expresa aceptación de los entregables acordados, que incluyen capacidades funcionales, infraestructura, gobierno del desarrollo y validaciones. No expresa esfuerzo consumido, tiempo restante, cantidad de código ni preparación para producción. Cada paquete debe satisfacer sus propios criterios: las capacidades requieren aceptación funcional y las validaciones requieren la evidencia correspondiente. Un paquete compartido se acepta cuando cumple su entrega integrada. Para medir independientemente contribuciones parciales de cada aplicación habría que acordar criterios adicionales en el alcance.

La revisión inicial acredita una demostración de interfaz y una base técnica de APIs y workers, pero todavía no acredita la aceptación completa de esos paquetes. Por eso puede aparecer **0 % de entregables aceptados** junto con capacidades técnicas disponibles. El resumen de cada app distingue ambos hechos.

## Estados y evidencia

| Estado del registro | Significado | Aporta al porcentaje |
| --- | --- | --- |
| `not_started` | Entregable pendiente según la revisión registrada. | No |
| `in_progress` | Trabajo en curso descrito en el resumen. | No recibe un porcentaje parcial automático. |
| `blocked` | Trabajo bloqueado; el resumen identifica la dependencia. | No |
| `accepted` | Entrega aceptada con revisión, responsable y evidencia identificables. | Sí |

Para aceptar un paquete, el equipo registra `acceptance` con el commit del producto, la fecha de revisión, el revisor y rutas de evidencia versionada. La revisión aceptada debe pertenecer a la historia del código revisado en `productRevision`; no puede acreditar cambios posteriores que todavía no se revisaron. Las evidencias deben apuntar a archivos o directorios versionados, sin enlaces simbólicos. El informe debe describir el alcance probado y los resultados de los criterios correspondientes, incluidos fallos y recuperación. La presencia de carpetas, un build exitoso o una captura de una pantalla mock no sustituye esa aceptación.

Las validaciones comprueban el formato, las referencias y la correspondencia con el roadmap. **No determinan automáticamente que el comportamiento esté implementado correctamente.** La revisión técnica y funcional sigue siendo responsabilidad del equipo.

El registro separa tres revisiones: el commit de código revisado (`productRevision`), el commit del roadmap que define el alcance (`scope.revision`) y el commit que contiene el registro importado (`source.revision` en POS Docs). Una actualización de la portada no cambia por sí sola la fecha de revisión de los entregables.

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
