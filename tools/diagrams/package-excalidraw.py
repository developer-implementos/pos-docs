"""Package the editable collection together with its documentation sources."""
from pathlib import Path
import json
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[2]
collection = root / "docs" / "diagramas-excalidraw"
output = collection / "diagramas-c4-excalidraw.zip"
manifest = json.loads((root / "tools/diagrams/collection.json").read_text(encoding="utf-8"))
assert manifest["schemaVersion"] == 1
boards = manifest["boards"]
expected_scenes = {manifest["atlas"] + ".excalidraw", *(board["file"] + ".excalidraw" for board in boards)}
assert {item.name for item in collection.glob("*.excalidraw")} == expected_scenes, "Native scene inventory differs from the collection"
assert {item.name for item in collection.glob("*.svg")} == {board["file"] + ".svg" for board in boards}, "SVG inventory differs from the collection"
files = sorted(p for p in collection.iterdir() if p.is_file() and p.suffix in {".excalidraw", ".svg", ".html", ".md"})
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for item in files:
        archive.write(item, "pos-c4/docs/diagramas-excalidraw/" + item.name)
    for board in boards:
        if board["kind"] == "structural":
            item = collection / "mermaid" / (board["key"] + ".mmd")
            archive.write(item, "pos-c4/docs/diagramas-excalidraw/mermaid/" + item.name)
    # These are the canonical sources directly cited by the collection. Retain
    # the repository layout so their relative links remain useful in POS Docs.
    for item in sorted((root / "docs").glob("*.md")):
        archive.write(item, "pos-c4/docs/" + item.name)
    for item in sorted((root / "docs" / "decisions").glob("*.md")):
        archive.write(item, "pos-c4/docs/decisions/" + item.name)
    for item in sorted((root / "docs" / "contracts").glob("*.md")):
        archive.write(item, "pos-c4/docs/contracts/" + item.name)
    archive.writestr("pos-c4/ABRIR.txt", "Abre docs/diagramas-excalidraw/index.html para consultar la galeria.\nAbre cualquier .excalidraw con Archivo > Abrir en Excalidraw.\nLas fuentes incluidas son documentos de referencia; sus enlaces al resto del repositorio se consultan en developer-implementos/pos-docs.\n")
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert {Path(name).name for name in archive.namelist() if name.endswith(".excalidraw")} == expected_scenes
print(f"Coleccion Excalidraw creada y verificada: {output} ({output.stat().st_size:,} bytes)")
