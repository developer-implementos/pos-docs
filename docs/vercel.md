# Publicación de la documentación en Vercel

El repositorio editorial [**POS Docs**](https://github.com/developer-implementos/pos-docs) construye un único sitio estático para Vercel. La entrada `/` reúne la guía Starlight en `/guide/`, las presentaciones Reveal.js de `/presentations/` y los originales catalogados de reuniones y antecedentes. El código de `pos-desktop`, `pos-mobile`, las APIs y los workers se mantiene en POS Platform, con entregas independientes.

## Configuración del proyecto documental

Conectar el proyecto Vercel al repositorio **developer-implementos/pos-docs**, con la raíz como **Root Directory**: la guía consume fuentes de `docs/` y modelos de `tools/diagrams/`, además de `apps/starlight/`. La aplicación y su lockfile se instalan sin dependencias del producto. No se requiere un checkout de POS Platform o del legacy para construirla.

| Ajuste | Valor |
| --- | --- |
| Production Branch | `main` |
| Root Directory | Raíz del repositorio |
| Framework Preset | `Other` |
| Aplicación publicada | Portal, Starlight, Reveal.js y materiales catalogados |
| Install Command | `npx --yes npm@11.6.0 ci --prefix apps/starlight` |
| Build Command | `npm run build` |
| Salida estática | `dist` |
| Entrada | `/`, conservando `/guide/` para la documentación |
| Node.js | `24.x`, compatible con el rango del paquete |
| Variable pública | `PUBLIC_SITE_URL`: origen HTTPS verificado del sitio, sin ruta `/guide` |
| Credenciales | El build documental no requiere secretos del producto o del legacy |

`vercel.json` fija instalación, build, salida, cabeceras y redirecciones. `PUBLIC_SITE_URL` debe coincidir con el dominio público confirmado en Vercel para que canonical y sitemap identifiquen el sitio correcto; configurar el dominio no acredita que un despliegue haya terminado. Las ramas y la versión de Node se comprueban en el proyecto Vercel.

## Comprobación antes y después de publicar

Desde la raíz de **pos-docs**, `npm --prefix apps/starlight ci` instala el compilador documental. Los comandos `npm --prefix apps/starlight run validate`, `typecheck`, `build` y `check` comprueban fuentes, tipos, generación e interacción; para el último se instala Chromium con `npm --prefix apps/starlight exec playwright install chromium`. Sus resultados no certifican el funcionamiento del POS. El workflow `Documentation quality` ejecuta esos controles de forma independiente.

Antes de publicar, `npm run verify` incluye además las pruebas del catálogo y de navegación del portal y Reveal.js. Tras el despliegue, abrir `/` y comprobar los accesos a `/guide/`, `/presentations/architecture/` y las descargas. Recargar una página interna, buscar un término, recorrer los catálogos y abrir un diagrama. `documentation.snapshot.json` debe identificar el repositorio editorial y el commit publicado, con `dirty: false`. La evidencia del producto se identifica por separado: el commit del sitio no es un commit de POS Platform.

Si cambia el dominio, conservar las rutas y configurar redirecciones desde la publicación anterior cuando se controle su proyecto. Actualizar los enlaces de la presentación y sus consumidores mediante una revisión explícita; cambiar un dominio no actualiza automáticamente snapshots ni narraciones existentes.

El proyecto `pos-docs-starlight` publica `https://pos-docs-starlight.vercel.app` desde `main` de **pos-docs**. No crear proyectos Vercel separados para cada presentación: el build las reúne con la guía y el portal. La configuración de despliegues del producto sigue siendo independiente.

## Publicar materiales de reuniones

`portal/catalog.json` registra los originales con título, descripción, formato, tipo y fecha conocida. Los nuevos archivos se organizan en `materials/` siguiendo [el manual de incorporación](https://github.com/developer-implementos/pos-docs/blob/main/materials/README.md). El build admite PPTX, DOCX y PDF, conserva los bytes originales y sólo copia archivos catalogados de esa carpeta. Un material histórico no sustituye una decisión canónica de `docs/`.

El build local y CI utilizan un dominio reservado cuando no se define `PUBLIC_SITE_URL`; ese valor no representa una publicación real. En Vercel la variable es obligatoria para evitar publicar enlaces canónicos con un dominio provisional.

La política CSP admite los scripts y activos del propio sitio; Pagefind necesita `wasm-unsafe-eval` para su búsqueda. No se habilita evaluación JavaScript arbitraria ni se agregan orígenes de APIs del producto. Los activos generados no contienen credenciales, repositorios legacy completos ni datos de producción.

## Separación de entregas

En el repositorio **pos-platform**, `npm run build` construye los clientes Angular; `npm run desktop:build` empaqueta Tauri y los comandos `mobile:*` construyen, sincronizan o ejecutan Capacitor según la etapa. Sus guías están en [escritorio](desktop.md) y [móvil](mobile.md). Ninguna de esas acciones publica Starlight, instala automáticamente un cliente en sucursales o lo publica en una tienda.

El [backend](api.md#artefacto-y-ejecución) conserva sus propios artefactos y supervisión de procesos. Publicar Starlight no inicia una API, un worker, una base de datos ni un sincronizador.

## Referencias

- [Configuración de build y directorio de salida](https://vercel.com/docs/builds/configure-a-build).
- [Configuración versionada con vercel.json](https://vercel.com/docs/project-configuration/vercel-json).
