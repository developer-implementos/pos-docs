# Materiales y vistas previas

Esta carpeta aloja archivos originales que complementan el portal: documentos Word (`.docx`), presentaciones PowerPoint (`.pptx`) y documentos PDF (`.pdf`). Su formato no determina su función editorial. Un PowerPoint puede ser una propuesta o un antecedente; un Word puede contener un cuestionario o notas de una reunión.

## Tres funciones editoriales

| Función | Dónde se mantiene | Cómo se interpreta |
| --- | --- | --- |
| Fuentes originales | Archivos descargables registrados en `portal/catalog.json`, con `kind: meeting`, `questionnaire` o `historical`. | Evidencia recibida. Conservar sus bytes; distinguir respuestas, preguntas, pendientes y contexto histórico. No convertir unas notas en un acta formal ni tratar un cuestionario como si todas sus preguntas tuvieran respuesta. |
| Síntesis derivada | Fuentes canónicas en `docs/`, publicadas en Starlight. | Explicación mantenida por el equipo, con enlaces a los originales y procedencia explícita. Separar lo documentado, lo inferido y lo pendiente de confirmar. Una síntesis no reemplaza ni modifica el original. |
| Propuestas | Presentaciones locales y descargables con `kind: proposal`. | Decisiones y soluciones propuestas para POS Platform. Se presentan bajo Propuestas, separadas de las fuentes de reuniones y cuestionarios. Deben enlazar la documentación que las sustenta. |

Los originales no acreditan por sí solos una decisión vigente ni una funcionalidad implementada. Las decisiones y fuentes editables de la guía siguen en `docs/`; si una síntesis cambia, actualizarla allí sin reescribir el archivo recibido.

El [registro de procedencia de las reuniones](meetings/provenance.json) conserva los nombres originales recibidos, su correspondencia con las rutas del repositorio y sus hashes SHA-256. La fecha de incorporación no reemplaza la fecha de cada reunión.

## Añadir un material

1. Revisar que el archivo sea publicable y corresponda al contenido indicado. No incluir credenciales, datos personales ni información restringida. Conservar el original; si cambia su contenido, identificarlo como una revisión distinta.
2. Guardarlo bajo `materials/<tema>/<archivo>`, usando nombres de carpeta y archivo en inglés y descriptivos. Las fuentes de reuniones y cuestionarios por país se guardan en `materials/meetings/peru/` o `materials/meetings/spain/`. El catálogo también admite los antecedentes existentes bajo `docs/referencias/` y los originales de una presentación local bajo `presentations/<tema>/downloads/`. Al copiar o renombrar, comparar SHA-256 con el archivo recibido y conservar el nombre original en la evidencia del PR.
3. Añadir una entrada a `portal/catalog.json`, con `schemaVersion: 2`, dentro de `materials`:

```json
{
  "id": "architecture-review",
  "title": "Revisión de arquitectura",
  "description": "Documento original con el alcance, las observaciones y las decisiones de la revisión.",
  "source": "materials/architecture/architecture-review.docx",
  "format": "docx",
  "date": null,
  "kind": "meeting",
  "country": "regional"
}
```

El ID debe ser único en todo el catálogo, incluidas las presentaciones. `source` es una ruta relativa al repositorio; no admite URLs, escapes ni enlaces simbólicos. `format` debe coincidir con el archivo: `docx`, `pptx` o `pdf`. `kind` distingue `proposal` (propuesta), `historical` (antecedente, sin vigencia implícita), `meeting` (resumen o notas de reunión) y `questionnaire` (cuestionario, con o sin respuestas). Esta clasificación es independiente del formato del archivo.

`country` es obligatorio: `chile`, `peru`, `spain`, `regional` o `null`. Indica el ámbito principal del material; `regional` corresponde a un alcance multinacional explícito y `null` a uno desconocido o no aplicable. Mencionar Chile como referencia dentro de un cuestionario de Perú o España no cambia su país principal. No deducir el país automáticamente del título o la carpeta.

`date` representa la fecha documentada del material o de la reunión resumida, en `YYYY-MM-DD`. Usar `null` cuando no exista evidencia clara: no deducirla de la fecha de copia, subida, modificación del archivo, revisión de la página o cabecera de una plantilla. Una fecha escrita en una columna ajena a la fecha de respuesta tampoco confirma la fecha del cuestionario. Las reuniones de Perú del 9 y 13 de octubre de 2026 se fechan por sus nombres originales; los cuestionarios y reuniones de España conservan `null`. El portal obtiene el tamaño del archivo y deriva su enlace; no introducir manualmente `bytes` ni `href`.

4. Generar una vista previa PDF con `npm run materials:previews` en Windows con Microsoft Word y PowerPoint instalados. El generador abre los originales en lectura y exporta sus páginas, sin reescribirlos. Revisar todas las páginas y guardar los PDF y `materials/previews/manifest.json` en el mismo cambio. El manifiesto vincula cada vista previa con el SHA-256 del original y del PDF; si cambia cualquiera, el build exige regenerarla. Las vistas previas son derivados de lectura y conservan la clasificación editorial del original.

5. Ejecutar las pruebas del catálogo y la validación del portal desde la raíz:

```sh
npm run portal:test
npm run validate
npm run build
npm run check
npm run portal:check
npm run viewer:check
```

6. Abrir un PR con el original, su entrada de catálogo y su vista previa. Explicar su procedencia, alcance y condición de publicación. Revisar tanto «Visualizar» como «Descargar» y cómo se diferencia de la documentación vigente antes de integrar el cambio.

Sólo los archivos registrados en el manifiesto se deben publicar desde `materials/`. No usar una copia recursiva de esta carpeta: puede contener borradores pendientes de revisión. La verificación del catálogo comprueba rutas, presencia y estructura básica del formato; no reemplaza la revisión editorial del contenido ni constituye un análisis antivirus.

## Visualización en el portal

Cada material tiene una página permanente `/materials/view/<id>/`. El visor usa PDF.js servido desde este repositorio, con navegación por página, ampliación y texto seleccionable. La opción «Descargar original» conserva el Word, PowerPoint o PDF recibido. El visor muestra una conversión PDF del archivo original; las revisiones posteriores de Reveal.js se consultan en la presentación web correspondiente.

Vercel sólo verifica hashes y publica los PDF revisados. No necesita Microsoft Office, LibreOffice ni un servicio de conversión remoto. El build copia exclusivamente los derivados declarados, junto con la versión de PDF.js fijada en el lockfile. El visor no ejecuta scripts del PDF ni carga documentos desde URLs indicadas por el visitante.

## Presentaciones del portal

La sección `presentations` del manifiesto registra fuentes Reveal.js locales bajo `presentations/<tema>/`, con su `deck.json`. El catálogo deriva las rutas de presentación y lectura continua; el build de presentaciones genera esas páginas. El reproductor, el build y sus pruebas deben existir antes de incorporar una presentación nueva. Los enlaces a presentaciones externas no forman parte de este inventario.
