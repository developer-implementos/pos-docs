# Revisión de las vistas PDF

Revisión del 22 de octubre de 2026. Conversión local con Microsoft Word y PowerPoint 16.0.20430.20182, usando sus exportadores PDF nativos. Los hashes de los ocho originales permanecieron idénticos antes y después de la exportación. La correspondencia exacta de originales y derivados está en `manifest.json`.

| Material | Páginas PDF | Referencia de paginación |
| --- | ---: | --- |
| Arquitectura y roadmap | 16 | 16 diapositivas del PowerPoint original |
| Ecosistema de Caja Mountain | 15 | 15 diapositivas del PowerPoint original |
| Cuestionario de Perú | 7 | Word: 7 páginas |
| Primera reunión de Perú | 6 | Word: 6 páginas |
| Segunda reunión de Perú | 9 | Word: 9 páginas |
| Cuestionario de España | 6 | Word: 6 páginas |
| Primera reunión de España | 2 | Word: 2 páginas |
| Segunda reunión de España | 3 | Word: 3 páginas |

## Comprobaciones

Los ocho PDF contienen texto seleccionable en todas sus páginas. Todas las fuentes utilizadas por el PDF están embebidas; esto incluye las sustituciones indicadas a continuación. Se renderizaron las 64 páginas con Poppler para revisar su composición. Las 33 páginas de Word conservan texto, listas, tablas, tildes y límites de página legibles. Tras la actualización de fuentes para PowerPoint, los renders de los documentos Word resultaron idénticos píxel a píxel a los ya revisados.

La presentación de arquitectura utiliza Inter Regular y Bold embebidas. Se resolvió la sustitución inicial por Calibri registrando temporalmente las fuentes del repositorio antes de abrir PowerPoint. Mountain utiliza Rubik e IBM Plex Sans embebidas en sus títulos y contenidos. El generador comprueba las familias explícitas de los textos de las diapositivas antes de convertirlas.

## Limitaciones observadas y conservadas

- **Mountain, página 2:** los títulos de las tarjetas «AX se entera después» y «Ecosistema heterogéneo» ocupan dos líneas e interfieren con el comienzo del párrafo siguiente. El render PNG nativo de PowerPoint del archivo original también presenta solape en esas tarjetas. No se movieron cajas ni se reescribió el original para corregirlo. Con Rubik disponible desaparece la repetición visual de la última palabra observada en la primera exportación, pero permanece el espacio insuficiente entre título y párrafo.
- **Mountain, tipografía de marca:** el original solicita Acumin Variable Concept y una variante Black I en algunos textos de marca. Esa fuente licenciada no está disponible en el entorno de conversión. Se conserva la sustitución que realiza Office y se advierte expresamente en el preflight; esos elementos no tienen fidelidad tipográfica exacta. Inter, Rubik y los textos principales de IBM Plex Sans sí están disponibles y embebidos.
- **Documentos Word:** se conserva la paginación nativa, incluidas respuestas que continúan en la página siguiente, encabezados al final de página y páginas finales con pocas líneas. No se reorganizaron tablas, columnas ni párrafos de los originales.
- **PowerPoint:** la vista PDF es estática. No conserva animaciones, transiciones ni notas del presentador. El PowerPoint de arquitectura refleja su revisión original, que difiere de la presentación Reveal mantenida actualmente.

El generador también se probó con un material que ya era PDF: el derivado conservó exactamente los bytes, el hash y las dos páginas del archivo de prueba. Esa prueba se ejecutó con Windows PowerShell 5.1 y no inició Office. Los archivos temporales de inspección permanecen en `tmp/material-preview-qa/`, excluidos de Git.
