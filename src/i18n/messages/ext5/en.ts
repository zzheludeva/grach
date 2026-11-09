import type { Dict } from "../types";

/** Iteration 5: tutorial PDF, favorites shortcuts, product description vs story. */
const en: Dict = {
  pdf: {
    download: "Download PDF", busy: "Putting the PDF together…", done: "PDF is ready — check your downloads", error: "The PDF didn't come together. Try again?",
    afterPurchase: "The full PDF is available after purchase", author: "By {name}", gallery: "Photos", links: "Video and links",
    page: "Page {n} of {total}", source: "Downloaded from GRACH · {date}",
  },
  favx: { post: "Saved posts", tutorial: "Saved tutorials", product: "Saved products", workshop: "Saved workshops" },
  sell: {
    form: {
      summary: "Description", summaryHint: "What it is, what it's made of, how to use it. The first lines show up in search.",
      storyHint: "How the idea came up, what inspired you, how the work went. Nothing to tell? Leave it empty and the block won't show.",
    },
    v: { summary: "Say a few words about the piece." },
  },
};

export default en;
