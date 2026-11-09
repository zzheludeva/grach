import type { Dict } from "../types";

/** Iteração 5: PDF de materiais, atalhos para favoritos, descrição × história do produto. */
const ptBR: Dict = {
  pdf: {
    download: "Baixar PDF", busy: "Montando o PDF…", done: "PDF pronto — veja nos downloads", error: "O PDF não saiu. Tentar de novo?",
    afterPurchase: "O PDF completo fica disponível após a compra", author: "Por {name}", gallery: "Fotos", links: "Vídeo e links",
    page: "Página {n} de {total}", source: "Baixado do GRACH · {date}",
  },
  favx: { post: "Publicações salvas", tutorial: "Materiais salvos", product: "Produtos salvos", workshop: "Oficinas salvas" },
  sell: {
    form: {
      summary: "Descrição", summaryHint: "O que é, de que é feita, como usar. As primeiras linhas aparecem na busca.",
      storyHint: "Como surgiu a ideia, o que inspirou, como foi o trabalho. Nada a contar? Deixe vazio e o bloco não aparece.",
    },
    v: { summary: "Conte um pouco sobre a peça." },
  },
};

export default ptBR;
