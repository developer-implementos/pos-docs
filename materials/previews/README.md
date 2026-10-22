# Vistas PDF de los materiales originales

Estos archivos son vistas estáticas de los ocho materiales catalogados en `portal/catalog.json`. Los originales Word y PowerPoint se conservan sin modificar. `manifest.json` registra el SHA-256 de cada original, el SHA-256 de su PDF, su número de páginas y la versión del conversor.

## Generación local

Requiere Windows con Microsoft Word y PowerPoint instalados, PowerShell y `pdfinfo` de Poppler. Ejecutar con Word y PowerPoint cerrados: el generador comprueba que no haya una sesión interactiva que COM pueda reutilizar. Desde la raíz del repositorio:

```powershell
./tools/generate-material-previews.ps1
```

Puede indicarse `-PdfInfo <ruta-absoluta-a-pdfinfo.exe>` si Poppler no está en `PATH`. El script exporta mediante las APIs nativas de [Word](https://learn.microsoft.com/en-us/office/vba/api/word.document.exportasfixedformat) y [PowerPoint](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentation.exportasfixedformat). Abre instancias dedicadas sin ventanas de documento, sólo lectura y con macros y actualización de campos/enlaces conectados deshabilitadas. Rechaza contenido externo conectado que requiera revisión; conserva los hipervínculos normales sin abrir sus destinos. No guarda los documentos ni cierra sesiones del usuario.

Antes de abrir PowerPoint, registra temporalmente Inter Regular/Bold desde `presentations/architecture/assets/` para la presentación de arquitectura y Rubik Regular/Bold desde `fonts/` para Mountain. Rubik procede del repositorio oficial, con revisión y hashes en `fonts/sources.json` y licencia OFL adjunta. Mountain también requiere IBM Plex Sans instalado o disponible en la caché local de fuentes de Microsoft Office. La comprobación falla cuando falta una familia solicitada por el texto de las diapositivas; la única excepción explícita es Acumin del material histórico, documentada en la revisión de calidad.

Las fuentes se registran para la sesión de Windows y se retiran al cerrar la conversión. No se escriben claves de instalación ni se sustituyen fuentes del sistema. El registro privado de un proceso no serviría para Office, que se ejecuta en otro proceso. Los documentos Word utilizan las fuentes de Office disponibles localmente; la generación revisada embebe Aptos y las fuentes de listas correspondientes.

La exportación usa calidad de impresión, texto seleccionable y etiquetas de estructura. No sustituye texto por bitmaps ni fuerza PDF/A. Comprueba que los originales conservan sus hashes y que las páginas exportadas coinciden con la paginación calculada por Word o el número de diapositivas de PowerPoint. Los archivos se generan primero en `tmp/material-previews/`; sólo se copian al directorio publicado cuando las ocho conversiones pasan estas comprobaciones.

Los materiales que ya sean PDF se copian byte a byte a su ruta de vista previa: no se convierten ni se reescriben. Reciben las mismas comprobaciones de hash y número de páginas. Un catálogo compuesto únicamente por PDF no inicia Word ni PowerPoint.

El build de Vercel publica los derivados versionados. No ejecuta Office, LibreOffice ni este generador. Después de cambiar un original, volver a generar, renderizar todas las páginas con Poppler y revisar texto, tablas, diagramas, tipografía y límites de página antes de actualizar el manifiesto publicado.

## Alcance de la vista

El PDF conserva la revisión del archivo original, que puede diferir de la documentación y Reveal actuales. PowerPoint exporta una página por diapositiva, incluidas las ocultas si existieran; no reproduce animaciones, transiciones ni notas del presentador. Word exporta el documento sin globos de revisión y conserva la paginación que calcula la versión de Office registrada. Cambiar Office o las fuentes instaladas puede cambiar la paginación o los bytes del PDF, aunque el original no cambie.

Las fuentes y el texto seleccionable se inspeccionan en los PDF resultantes; el hash demuestra la correspondencia con el original, no acredita por sí solo la fidelidad visual. Las observaciones de esta generación se documentan en `quality-review.md`.
