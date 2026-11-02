# Avatares del equipo

Imágenes públicas de las cuentas GitHub confirmadas por el equipo, consultadas el 2 de noviembre de 2026 mediante `User.avatarUrl(size: 160)`. Los archivos conservan los bytes y el formato entregados por GitHub, incluidos sus avatares geométricos predeterminados.

| Cuenta | Archivo | Fuente |
| --- | --- | --- |
| floxcristian | `floxcristian.jpg` | [GitHub](https://avatars.githubusercontent.com/u/28737734?s=160&u=869e0667654319739639fa3a0d6c287ab506ec6e&v=4) |
| mrcoto | `mrcoto.jpg` | [GitHub](https://avatars.githubusercontent.com/u/43283997?s=160&u=6f73242bd4f40dd5ec88095d57a46da8dd28231f&v=4) |
| javieruribe89 | `javieruribe89.jpg` | [GitHub](https://avatars.githubusercontent.com/u/60083892?s=160&v=4) |
| JesusAbdul | `JesusAbdul.png` | [GitHub](https://avatars.githubusercontent.com/u/175339215?s=160&v=4) |
| pymimtos | `pymimtos.png` | [GitHub](https://avatars.githubusercontent.com/u/251239630?s=160&v=4) |

`portal/team.mjs` es la lista compartida por el renderer y el build. Sólo se copian al artefacto los avatares allí declarados; este archivo de procedencia no se publica como recurso del portal.

Para actualizar una foto, consultar de nuevo el avatar de la cuenta, reemplazar su archivo y actualizar la referencia de `portal/team.mjs` si cambia el formato. Comprobar la decodificación de las imágenes y el equipo en escritorio/móvil. La actualización es explícita: el build y el navegador no consultan GitHub ni requieren credenciales, y la CSP conserva las imágenes del mismo origen.
