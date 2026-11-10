import type { Dict } from "../types";

/** Iteration 6: collections, visibility of tutorials and collections, machine translation. */
const en: Dict = {
  vis: {
    title: "Who can see it",
    public: "Public", private: "Only me", link: "Anyone with the link",
    publicHint: "Everyone: in the catalogue, profile and search.",
    privateHint: "Only you — even with a direct link.",
    linkHint: "Opens with the link but never shows up in the catalogue, profile or search.",
    copy: "Copy link", copied: "Link copied — share away",
    changed: "Done: now “{v}”",
    regenerate: "New link", regenerated: "The old link no longer works",
    regenerateHint: "Create a new link — the old one will stop working",
    tutorialNote: "Visibility doesn't change the material itself: switch it any time, nothing gets lost.",
    unavailableText: "It was hidden, deleted, or opens only with the author's link.",
  },
  colx: {
    tab: "Collections",
    new: "New collection", edit: "Collection", create: "Create",
    titleLabel: "Title", titlePh: "E.g. “Ideas for the studio”", titleRequired: "What should we call it?",
    descLabel: "Description",
    addTo: "Add to collection", done: "Done", noneYet: "No collections yet — create the first one right here.",
    newWithItem: "New collection with this",
    items: { one: "{count} item", other: "{count} items" },
    intro: "Group posts, products, tutorials and workshops by theme — everything you liked, neatly sorted.",
    empty: "No collections yet", emptyText: "Time to sort your finds by theme? Create your first collection.",
    unavailable: "Collection unavailable", unavailableText: "It was deleted, made private, or opens only with the author's link.",
    updated: "updated {when}",
    emptyItems: "This collection is empty", emptyItemsText: "Tap “Add to collection” on any post, product, tutorial or workshop.",
    moveUp: "Move up", moveDown: "Move down", removeItem: "Remove from collection",
    deleteTitle: "Delete this collection?", deleteText: "The collection goes away; everything in it stays in your favorites.",
    itemRestricted: "The author restricted access to this", itemGone: "This is no longer on the platform",
    profileEmpty: "No public collections yet", profileEmptyMe: "Your public collections will show up here",
    profileEmptyMeText: "Link-only and private collections never appear in your profile.",
    toast: {
      saved: "Saved", created: "Collection created", createdWith: "Done! Collection created with this in it",
      added: "Added to “{title}”", removed: "Removed from “{title}”", removedKept: "Removed from the collection — still in favorites",
      deleted: "Collection deleted, favorites untouched",
    },
  },
  trx: {
    translating: "Translating…", translatedFrom: "Translated from {lang}", translate: "Translate",
    error: "Translation is unavailable right now", retry: "Try again",
    pdfTranslated: "Download PDF ({lang})", pdfOriginalLang: "Download original ({lang})",
    pdfError: "Couldn't translate — no PDF was made. Download the original?", pdfOriginal: "Download original",
    pdfNote: "machine translation, original: {lang}",
    settingsTitle: "Translation",
    auto: "Translate automatically",
    autoHint: "Posts, products, tutorials and incoming messages in other languages are shown in your interface language right away. The original is one tap away.",
  },
};

export default en;
