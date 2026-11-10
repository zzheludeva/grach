import type { Dict } from "../types";

/** Iteración 6: colecciones, visibilidad de materiales y colecciones, traducción automática. */
const es: Dict = {
  vis: {
    title: "Quién puede verlo",
    public: "Para todos", private: "Solo yo", link: "Con el enlace",
    publicHint: "Lo ven todos: en el catálogo, el perfil y la búsqueda.",
    privateHint: "Solo tú — incluso con el enlace directo.",
    linkHint: "Se abre con el enlace, pero no aparece en el catálogo, el perfil ni la búsqueda.",
    copy: "Copiar enlace", copied: "Enlace copiado — ¡a compartir!",
    changed: "Listo: ahora «{v}»",
    regenerate: "Nuevo enlace", regenerated: "El enlace anterior ya no funciona",
    regenerateHint: "Crear un enlace nuevo — el anterior dejará de funcionar",
    tutorialNote: "La visibilidad no cambia el material: cámbiala cuando quieras, no se pierde nada.",
    unavailableText: "Se ocultó, se eliminó o solo se abre con el enlace del autor.",
  },
  colx: {
    tab: "Colecciones",
    new: "Nueva colección", edit: "Colección", create: "Crear",
    titleLabel: "Nombre", titlePh: "P. ej.: «Ideas para el taller»", titleRequired: "¿Cómo la llamamos?",
    descLabel: "Descripción",
    addTo: "A una colección", done: "Listo", noneYet: "Aún no hay colecciones — crea la primera aquí mismo.",
    newWithItem: "Nueva colección con esto",
    items: { one: "{count} elemento", many: "{count} elementos", other: "{count} elementos" },
    intro: "Agrupa publicaciones, productos, materiales y talleres por tema — todo lo que te gustó, ordenado.",
    empty: "Aún no hay colecciones", emptyText: "¿Ordenamos tus hallazgos por tema? Crea tu primera colección.",
    unavailable: "Colección no disponible", unavailableText: "Se eliminó, se hizo privada o solo se abre con el enlace del autor.",
    updated: "actualizada {when}",
    emptyItems: "La colección está vacía", emptyItemsText: "Pulsa «A una colección» en cualquier publicación, producto, material o taller.",
    moveUp: "Subir", moveDown: "Bajar", removeItem: "Quitar de la colección",
    deleteTitle: "¿Eliminar la colección?", deleteText: "La colección desaparece; todo lo que había en ella sigue en favoritos.",
    itemRestricted: "El autor restringió el acceso a esto", itemGone: "Esto ya no está en la plataforma",
    profileEmpty: "Aún no hay colecciones públicas", profileEmptyMe: "Aquí aparecerán tus colecciones públicas",
    profileEmptyMeText: "Las colecciones por enlace y privadas nunca aparecen en el perfil.",
    toast: {
      saved: "Guardado", created: "Colección creada", createdWith: "¡Listo! Colección creada, y esto ya está dentro",
      added: "Añadido a «{title}»", removed: "Quitado de «{title}»", removedKept: "Quitado de la colección — sigue en favoritos",
      deleted: "Colección eliminada, favoritos intactos",
    },
  },
  trx: {
    translating: "Traduciendo…", translatedFrom: "Traducido del idioma: {lang}", translate: "Traducir",
    error: "La traducción no está disponible ahora", retry: "Otra vez",
    pdfTranslated: "Descargar PDF ({lang})", pdfOriginalLang: "Descargar original ({lang})",
    pdfError: "No se pudo traducir — no se generó el PDF. ¿Descargas el original?", pdfOriginal: "Descargar original",
    pdfNote: "traducción automática, original: {lang}",
    settingsTitle: "Traducción",
    auto: "Traducir automáticamente",
    autoHint: "Publicaciones, productos, materiales y mensajes recibidos en otro idioma se muestran en el idioma de la interfaz. El original, a un toque.",
  },
};

export default es;
