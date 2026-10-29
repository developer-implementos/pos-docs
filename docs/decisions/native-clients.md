# ADR-14 · Clientes de escritorio y móvil independientes

**Estado:** decisión aceptada el 21 de octubre de 2026. **Alcance:** composición del cliente y artefactos de entrega. No acredita operación productiva ni homologación de sistemas operativos, dispositivos o proveedores.

## Decisión

POS Platform tiene dos **aplicaciones cliente completas**: `apps/pos-desktop` para el puesto de escritorio y `apps/pos-mobile` para Android e iOS. Cada una reúne una **shell nativa** y el **frontend Angular/PrimeNG** que se ejecuta dentro de ella. Tauri proporciona la shell nativa de escritorio; Capacitor, la móvil. Cada aplicación posee su arranque Angular, configuración nativa y build.

## Shell nativa y frontend

| Pieza | Responsabilidad | Ubicación |
| --- | --- | --- |
| Aplicación cliente completa | Componer y entregar la shell nativa con su frontend. | `apps/pos-desktop` o `apps/pos-mobile`. |
| Shell nativa (host) | Alojar el frontend en un WebView y controlar el ciclo de vida, permisos e integración con el sistema operativo. | Tauri en escritorio; Capacitor en móvil. |
| Frontend Angular/PrimeNG | Presentar pantallas, navegación y estado de interfaz; consumir contratos de API y capacidades autorizadas. | Bundle Angular de cada aplicación, construido a partir de código compartido. |
| Composición de interfaz Angular | Reunir componente raíz, configuración, rutas, guards y marco de navegación. | `libs/client-shell`, biblioteca incluida en ambos bundles Angular. |

```mermaid
flowchart LR
    subgraph Desktop["pos-desktop · aplicación completa"]
        subgraph Tauri["Shell nativa · Tauri"]
            DesktopUI["Frontend Angular + PrimeNG"]
        end
    end
    subgraph Mobile["pos-mobile · aplicación completa"]
        subgraph Capacitor["Shell nativa · Capacitor"]
            MobileUI["Frontend Angular + PrimeNG"]
        end
    end
```

Los bordes muestran qué contiene cada aplicación. El frontend se ejecuta en el WebView de su shell nativa; compartir código Angular produce bundles para ambas plataformas, con configuraciones y adaptadores propios. Las capacidades nativas se consumen mediante puertos y adaptadores autorizados. [Tauri](https://v2.tauri.app/start/) y [Capacitor](https://capacitorjs.com/docs) proporcionan esa integración con la plataforma.

En el mapa general y C2, los nodos `pos-desktop` y `pos-mobile` representan la aplicación completa. `libs/client-shell` pertenece al frontend Angular: su nombre identifica composición de interfaz, mientras que **shell nativa** identifica Tauri o Capacitor.

El servidor Angular de desarrollo permite trabajar y probar la interfaz. No constituye otro cliente de producto ni una oferta PWA. El sitio Vercel se construye desde el repositorio editorial **pos-docs**: `/` publica el portal de recursos, `/guide/` contiene Starlight y `/presentations/architecture/` aloja la presentación de arquitectura y roadmap.

## Código compartido y dependencias

`libs/client-shell` compone `AppComponent`, `createClientConfig(platform)`, rutas, guards y marco de navegación Angular. Tiene tags `type:shell` y `env:browser`: aquí `type:shell` identifica la composición de interfaz. Las aplicaciones eligen su plataforma y arrancan Angular desde sus propios `main.ts`; ambas consumen esta biblioteca compartida.

```mermaid
flowchart TB
    Desktop["Arranque Angular de pos-desktop"] --> Shell["client-shell · composición Angular"]
    Mobile["Arranque Angular de pos-mobile"] --> Shell
    Shell --> Features["features · pantallas y recorridos"]
    Shell --> UI["ui · componentes, tokens, assets y estilos"]
    Features --> UI
    Features --> Data["data-access · adaptadores mock actuales"]
    Data --> Domain["domain · reglas actuales del prototipo"]
```

Las flechas representan imports de código. `libs/ui/assets` y `libs/ui/src/styles.css` sirven a ambos builds. La composición Angular reutiliza las mismas features y adaptadores; no se crean copias de ventas, pagos o permisos por sistema operativo. `libs/client-shell` es código del frontend incluido en cada aplicación, sin proceso ni despliegue adicional. Su composición pertenece a la interfaz del producto, fuera de la infraestructura técnica genérica de `shared`.

El código nativo y sus permisos pertenecen al host correspondiente. Una integración de periféricos requiere un contrato de capacidad y un adaptador homologado; añadir Tauri o Capacitor no habilita por sí solo impresoras, lectores ni cobros. Las features compartidas no deben depender directamente de SDK de Tauri o Capacitor.

## Datos y acceso

Los dos clientes consumirán la API autorizada de sucursal; PostgreSQL conserva la autoridad transaccional de la tienda. La interfaz no accede directamente a SQL ni mantiene una base transaccional de ventas por móvil en el perfil de continuidad ante caída de WAN.

El cliente móvil depende de la conectividad autorizada al backend para las operaciones que la requieran. Compartir interfaz no habilita venta fuera de la sucursal, operación sin LAN, acceso remoto público ni permisos adicionales. Esos recorridos necesitan una decisión y pruebas propias.

Actualmente ambos clientes utilizan datos sintéticos y adaptadores mock. La autenticación corporativa, el almacenamiento seguro de credenciales y las operaciones comerciales contra el backend están pendientes. Tauri utiliza el identificador `com.floxcristian.corporatepos`, cuya estabilidad debe respetarse por compatibilidad; Capacitor utiliza `com.implementos.posplatform.mobile`. Sus almacenes locales son independientes: compartir código no sincroniza datos ni sesiones entre dispositivos.

## Entrega y verificación

| Etapa | Qué acredita | Qué queda por comprobar |
| --- | --- | --- |
| Build Angular de cada cliente | Su configuración y bundle se compilan | Ejecución dentro del host nativo |
| Pruebas de navegador | Recorridos compartidos y comportamiento adaptable en el entorno probado | Permisos, ciclo de vida, almacenamiento y APIs del dispositivo |
| Sincronización Capacitor | Copia del bundle y actualización de dependencias del proyecto nativo | Compilación e instalación Android/iOS |
| Empaquetado Tauri o compilación móvil | Generación del artefacto en la plataforma usada | Firma, distribución, instalación, operación y recuperación sobre equipos reales |
| Homologación | Comportamiento observado para el dispositivo, versión y proveedor probados | Plataformas o capacidades fuera de ese alcance |

Las guías de [escritorio](../desktop.md) y [móvil](../mobile.md) mantienen los comandos y prerrequisitos, sin duplicarlos aquí. El [catálogo del monorepo](../monorepo.md) registra seis aplicaciones operativas. La guía Starlight se mantiene por separado en el repositorio editorial [POS Docs](https://github.com/developer-implementos/pos-docs).

<span id="consecuencias-y-alternativas"></span>

## Consecuencias

Esta separación permite evolucionar permisos, integración nativa, empaquetado y distribución por plataforma, conservando una sola implementación de las pantallas compartidas. Exige verificar los dos builds y probar los hosts de manera independiente; el resultado de Windows no certifica Android o iOS.

La composición Angular compartida centraliza las pantallas y permite mantener reglas de interfaz, accesibilidad y experiencia comunes. Cada shell nativa conserva sus permisos, integración con la plataforma y ciclo de entrega.
