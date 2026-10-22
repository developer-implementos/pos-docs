# Diagramas C4 para draw.io

Conversión editable de la [colección Excalidraw](../diagramas-excalidraw/README.md): siete vistas estructurales y dos dinámicas. Conserva contenido, distribución, colores, notas y fuentes. Los diagramas describen la propuesta; la conversión no acredita implementación ni homologación de sus componentes.

## Archivos

- [Atlas completo: nueve pestañas](00-atlas-completo.drawio).
- [C1 · Contexto](01-contexto.drawio).
- [C2 · Contenedores](02-contenedores.drawio).
- [C3 · Backend de sucursal](03-backend-sucursal.drawio).
- [C3 · Sincronizador](04-sincronizador.drawio).
- [Despliegue](05-despliegue.drawio).
- [Flujo de precios](06-flujo-precios.drawio).
- [Flujo de venta](07-flujo-venta.drawio).
- [C3 · API de país](08-country-api.drawio).
- [C3 · Worker ERP](09-erp-worker.drawio).
- [Paquete ZIP](diagramas-c4-drawio.zip).

## Abrir y editar

Abre draw.io Desktop o [diagrams.net](https://app.diagrams.net/), selecciona **Archivo → Abrir desde → Dispositivo** y elige un `.drawio`. El atlas organiza las vistas en pestañas inferiores.

Las formas, los textos, los grupos y las flechas son elementos nativos editables. Los textos de los nodos se desplazan con su forma; las etiquetas de relaciones se desplazan con el conector. Los conectores estructurales conservan sus extremos asociados a los nodos y sus puntos de recorrido. Los flujos dinámicos conservan las líneas de vida y los recorridos fijos de la fuente: al reorganizar sus participantes, ajusta también las interacciones.

Puedes editar un texto con doble clic. Para editar elementos dentro de un grupo, selecciónalos dentro del grupo o utiliza **Organizar → Desagrupar**. Guarda una copia antes de regenerar.

## Regeneración

La colección y su conversor se mantienen en **pos-docs**, junto a los modelos y documentos de arquitectura. El código operativo pertenece a **pos-platform**. La presentación consume los derivados fijados a una revisión editorial. Consulta la [guía de autoría](../../tools/diagrams/README.md) para actualizar las fuentes canónicas antes de exportar.

Desde la raíz de POS Docs:

```powershell
python tools/diagrams/export-drawio.py
```

El conversor utiliza la biblioteca estándar de Python y toma los nueve `.excalidraw` individuales como fuente. Regenera los diez `.drawio` —nueve vistas y un atlas— y el ZIP; sobrescribe las salidas. No requiere un MCP. Los cambios manuales hechos en draw.io no se sincronizan con Excalidraw ni con los documentos de arquitectura.
