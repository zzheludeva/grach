import type { Dict } from "../types";

/** Iteración 5: PDF de materiales, accesos a favoritos, descripción × historia del producto. */
const es: Dict = {
  pdf: {
    download: "Descargar PDF", busy: "Armando el PDF…", done: "PDF listo — búscalo en descargas", error: "El PDF no salió. ¿Probamos otra vez?",
    afterPurchase: "El PDF completo está disponible tras la compra", author: "De {name}", gallery: "Fotos", links: "Vídeo y enlaces",
    page: "Página {n} de {total}", source: "Descargado de GRACH · {date}",
  },
  favx: { post: "Publicaciones guardadas", tutorial: "Materiales guardados", product: "Productos guardados", workshop: "Talleres guardados" },
  sell: {
    form: {
      summary: "Descripción", summaryHint: "Qué es, de qué está hecha, cómo se usa. Las primeras líneas salen en la búsqueda.",
      storyHint: "Cómo surgió la idea, qué te inspiró, cómo fue el trabajo. ¿Nada que contar? Déjalo vacío y el bloque no se mostrará.",
    },
    v: { summary: "Cuenta un poco sobre la pieza." },
  },
};

export default es;
