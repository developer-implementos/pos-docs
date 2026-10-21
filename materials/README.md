# Materiales descargables

Esta carpeta aloja archivos originales que complementan el portal: documentos Word (`.docx`), presentaciones PowerPoint (`.pptx`) y documentos PDF (`.pdf`). Las decisiones vigentes y las fuentes editables de la guía se mantienen en `docs/`; un archivo descargable no sustituye esa documentación canónica.

## Añadir un material

1. Revisar que el archivo sea publicable y corresponda al contenido indicado. No incluir credenciales, datos personales ni información restringida. Conservar el original; si cambia su contenido, identificarlo como una revisión distinta.
2. Guardarlo bajo `materials/<tema>/<archivo>`, usando nombres de carpeta en inglés y descriptivos. El catálogo también admite los antecedentes existentes bajo `docs/referencias/` y los originales de una presentación local bajo `presentations/<tema>/downloads/`.
3. Añadir una entrada a `portal/catalog.json`, dentro de `materials`:

```json
{
  "id": "architecture-review",
  "title": "Revisión de arquitectura",
  "description": "Documento original con el alcance, las observaciones y las decisiones de la revisión.",
  "source": "materials/architecture/architecture-review.docx",
  "format": "docx",
  "date": null,
  "kind": "meeting"
}
```

El ID debe ser único en todo el catálogo, incluidas las presentaciones. `source` es una ruta relativa al repositorio; no admite URLs, escapes ni enlaces simbólicos. `format` debe coincidir con el archivo: `docx`, `pptx` o `pdf`. `kind` distingue `proposal` (material de la propuesta), `historical` (antecedente, sin vigencia implícita) y `meeting` (original de una reunión).

`date` representa la fecha editorial o de emisión documentada del material, en `YYYY-MM-DD`. Usar `null` cuando no exista evidencia: no deducirla de la fecha de copia, subida, modificación del archivo o revisión de la página. El portal obtiene el tamaño del archivo y deriva su enlace; no introducir manualmente `bytes` ni `href`.

4. Ejecutar las pruebas del catálogo y la validación del portal desde la raíz:

```sh
node --test portal/catalog.test.mjs
npm run validate
npm run build
npm run check
npm run portal:check
```

5. Abrir un PR con el archivo y su entrada de catálogo. Explicar su procedencia, alcance y condición de publicación. Revisar el enlace de descarga y cómo se diferencia de la documentación vigente antes de integrar el cambio.

Sólo los archivos registrados en el manifiesto se deben publicar desde `materials/`. No usar una copia recursiva de esta carpeta: puede contener borradores pendientes de revisión. La verificación del catálogo comprueba rutas, presencia y estructura básica del formato; no reemplaza la revisión editorial del contenido ni constituye un análisis antivirus.

## Presentaciones del portal

La sección `presentations` del manifiesto registra fuentes Reveal.js locales bajo `presentations/<tema>/`, con su `deck.json`. El catálogo deriva las rutas de presentación y lectura continua; el build de presentaciones genera esas páginas. El reproductor, el build y sus pruebas deben existir antes de incorporar una presentación nueva. Los enlaces a presentaciones externas no forman parte de este inventario.
