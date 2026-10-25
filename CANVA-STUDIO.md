# Canva en TZALAM Command — estado del 25 de octubre de 2026

## Auditoría comprobada

- Producción: `https://digital-command-center-5659.onrender.com` responde; Render confirma `22918701176f6a43b127b3b90f0c6ab347234d6c` como versión inicial de esta auditoría, igual que main.
- Acceso de propietario verificado en la sesión de Chrome del usuario. No fue necesario cambiar la contraseña.
- La página de Canva decía «Autorización guardada» aunque el token había vencido el 23 de octubre a las 03:00 en Cancún. La API respondió 401.
- Se renovó el permiso existente dentro de Render y se guardó cifrado con reemplazo atómico y permisos 0600. Canva respondió 200. Ningún secreto salió del servidor.
- Capacidades confirmadas por la API: autofill, brand_template, design_generation, image_generation, image_to_design_imports, resize, background_removal, export_png_transparency.
- Búsqueda de plantillas RUTA y TZALAM: ambas respondieron 200, sin resultados. Los diseños existentes de RUTA no son por sí mismos plantillas de Autofill.
- El panel contiene RUTA como piloto interno, sin piezas producidas en el ciclo. No se ejecutó el borrado/seed de la base real.

## Cambios de esta entrega

Renovación de tokens en servidor con una cola compartida para impedir renovaciones simultáneas. Errores seguros, sin respuestas privadas del proveedor. El estado guardado se distingue de una comprobación API real.

Estudio privado en `/integraciones/canva/estudio`: cuatro composiciones originales para RUTA (dos posts 1080×1350 y dos stories 1080×1920), copy, brief, estrategia, vista previa, versiones, rechazo con motivo y registro de decisiones. El servidor comprueba tamaños, contraste y anchura del texto. Las imágenes y metadatos permanecen en el disco persistente, dentro de la carpeta privada de autorización.

La referencia de marca procede del sitio público oficial: `https://www.rutatraveldesign.com/`. Logo: `https://static.wixstatic.com/media/aa1df6_8eb1e35c0d8d428aa02258e82a2de7c4~mv2.png`. Paleta de la web: tinta #1F4D4A, fondo #F7F4EF y acento #B89A63. Son referencias observadas; se requiere aprobación humana antes de declarar una pieza final.

Canva recibe el PNG compuesto mediante asset upload, crea un diseño del mismo tamaño y lo exporta. Cada operación guarda su identificador. Un fallo incierto detiene los reintentos para evitar duplicados. El exportado se descarga al almacenamiento privado, se comprueban formato y dimensiones y vuelve a revisión. La descarga final y el texto solo se habilitan tras aprobar ese archivo. Un rechazo los bloquea.

No hay llamadas de generación de pago, compra de elementos ni publicación social. El logo público se reproduce sin alterar sus píxeles; su fondo blanco se integra en una cabecera blanca.

## Límites que permanecen

- No afirmar «100 % terminado» hasta completar la prueba real de las cuatro piezas y la aprobación visual del diseñador.
- El generador local usa composición editorial y cuatro propuestas de copy predefinidas. La API permite entregar cuatro objetos `copies` con `headline`, `body`, `cta`, `caption`; registra brief y estrategia, pero no los interpreta automáticamente. No simula IA.
- El usuario puede rechazar y dejar observaciones. Un rediseño abierto requiere todavía al asistente o un motor creativo; no se promete que una nota produzca por sí sola una revisión inteligente. Una revisión sin cambio real se rechaza.
- En esta vía Canva contiene una imagen compuesta. No hay capas de texto editables, sincronización de modificaciones realizadas en Canva ni editor de Canva embebido. La revisión está dentro de Command; el editor se abre aparte.
- La equivalencia con la referencia premium de TZALAM es una condición pendiente de evaluación humana. Las pruebas técnicas no certifican calidad creativa.
- No hay plantillas de Autofill preparadas. Para capas editables sostenibles: desarrollar y aprobar una familia de plantillas con campos, publicar/configurar su dataset y conectarla al mismo flujo de revisión/exportación. No hace falta que el usuario diseñe cada pieza.
- Para creatividad original a partir de brief libre: incorporar un motor de imagen y dirección de arte con identidad de marca, límites explícitos de coste y trabajos durables. Ningún motor de pago está habilitado en esta entrega. La generación de imágenes de Canva exige comprobar créditos; la generación de diseños documentada solo admite doc/presentation y está en preview.
- El almacenamiento está diseñado para la instancia única de Render ya configurada. Antes de ampliar a múltiples instancias, sustituir las colas de memoria por bloqueos y trabajos compartidos.
- Si Canva devuelve un error después de una posible escritura, revisar los IDs y el historial antes de crear otra versión. No hay reintento automático de mutaciones ambiguas.

## Verificación reproducible

`bun install --frozen-lockfile --ignore-scripts`

`bun run build:render` (incluye tipos del servidor y del frontend)

`bun run verify:canva`

`bun scripts/verify-render.ts`

Las verificaciones de Canva locales usan respuestas simuladas y almacenamiento temporal; su salida dice `productionValidated:false`. Cubren renovación concurrente, cifrado, ausencia de secretos, cuatro dimensiones, bloqueo por marca, aprobación de versión incorrecta, revisiones, exportación con segunda revisión, persistencia tras reinicio, rechazo y errores inciertos. El logo sintético del test solo existe en la carpeta temporal, nunca en los diseños reales.

El primer lote local tardó aproximadamente 0.12 segundos de composición, con variación entre ejecuciones. No representa la latencia de Canva ni la de Render. Los tiempos reales de Canva deben registrarse al ejecutar el piloto desplegado.

## Fuentes oficiales consultadas

- [Renovar tokens](https://www.canva.dev/docs/apps/rest-apis/reference/authentication/generate-access-token/): renovación y rotación del refresh token.
- [Crear diseño](https://www.canva.dev/docs/apps/rest-apis/reference/designs/create-design/): tamaño custom y asset_id.
- [Subir recurso](https://www.canva.dev/docs/apps/rest-apis/reference/assets/create-asset-upload-job/): bytes e identificador asíncrono.
- [Exportar](https://www.canva.dev/docs/apps/rest-apis/reference/exports/create-design-export-job/): PNG, trabajos asíncronos y URLs de descarga temporales.
- [Autofill](https://www.canva.dev/docs/apps/rest-apis/autofill-guide/): plantillas con campos y planes compatibles, incluidos Pro, Teams y Enterprise.
- [Generación de diseños](https://www.canva.dev/docs/apps/rest-apis/reference/generations/create-design-generation-job/): preview, créditos y formatos doc/presentation.

## Criterio de cierre

Cuatro archivos exportados realmente por Canva, vistos dentro del Command, con copy, logo y colores aprobados; una revisión solicitada y resuelta; historial y archivo recuperables; tiempos reales registrados. Hasta entonces, el estado es «integración en validación», no «producción creativa autónoma terminada».
