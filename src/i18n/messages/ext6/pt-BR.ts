import type { Dict } from "../types";

/** Iteração 6: coleções, visibilidade de materiais e coleções, tradução automática. */
const ptBR: Dict = {
  vis: {
    title: "Quem pode ver",
    public: "Para todos", private: "Só eu", link: "Com o link",
    publicHint: "Todos veem: no catálogo, no perfil e na busca.",
    privateHint: "Só você vê — mesmo com o link direto.",
    linkHint: "Abre com o link, mas não aparece no catálogo, no perfil nem na busca.",
    copy: "Copiar link", copied: "Link copiado — pode compartilhar",
    changed: "Pronto: agora “{v}”",
    regenerate: "Novo link", regenerated: "O link antigo não funciona mais",
    regenerateHint: "Criar um novo link — o antigo deixará de funcionar",
    tutorialNote: "A visibilidade não muda o material: troque quando quiser, nada se perde.",
    unavailableText: "Foi ocultado, excluído ou abre só com o link do autor.",
  },
  colx: {
    tab: "Coleções",
    new: "Nova coleção", edit: "Coleção", create: "Criar",
    titleLabel: "Nome", titlePh: "Ex.: “Ideias para o ateliê”", titleRequired: "Qual vai ser o nome?",
    descLabel: "Descrição",
    addTo: "Na coleção", done: "Pronto", noneYet: "Ainda não há coleções — crie a primeira aqui mesmo.",
    newWithItem: "Nova coleção com isto",
    items: { one: "{count} item", many: "{count} itens", other: "{count} itens" },
    intro: "Junte publicações, produtos, materiais e oficinas por tema — tudo o que você curtiu, organizado.",
    empty: "Ainda não há coleções", emptyText: "Que tal organizar seus achados por tema? Crie a primeira coleção.",
    unavailable: "Coleção indisponível", unavailableText: "Foi excluída, ficou privada ou abre só com o link do autor.",
    updated: "atualizada {when}",
    emptyItems: "A coleção está vazia", emptyItemsText: "Toque em “Na coleção” em qualquer publicação, produto, material ou oficina.",
    moveUp: "Subir", moveDown: "Descer", removeItem: "Tirar da coleção",
    deleteTitle: "Excluir a coleção?", deleteText: "A coleção some; tudo o que estava nela continua nos favoritos.",
    itemRestricted: "O autor restringiu o acesso a isto", itemGone: "Isto não está mais na plataforma",
    profileEmpty: "Ainda não há coleções públicas", profileEmptyMe: "Suas coleções públicas aparecerão aqui",
    profileEmptyMeText: "Coleções por link e privadas nunca aparecem no perfil.",
    toast: {
      saved: "Salvo", created: "Coleção criada", createdWith: "Pronto! Coleção criada, e isto já está nela",
      added: "Adicionado a “{title}”", removed: "Removido de “{title}”", removedKept: "Removido da coleção — continua nos favoritos",
      deleted: "Coleção excluída, favoritos intactos",
    },
  },
  trx: {
    translating: "Traduzindo…", translatedFrom: "Traduzido do idioma: {lang}", translate: "Traduzir",
    error: "Tradução indisponível no momento", retry: "Tentar de novo",
    pdfTranslated: "Baixar PDF ({lang})", pdfOriginalLang: "Baixar original ({lang})",
    pdfError: "Não foi possível traduzir — o PDF não foi gerado. Baixar o original?", pdfOriginal: "Baixar original",
    pdfNote: "tradução automática, original: {lang}",
    settingsTitle: "Tradução",
    auto: "Traduzir automaticamente",
    autoHint: "Publicações, produtos, materiais e mensagens recebidas em outro idioma aparecem no idioma da interface. O original fica a um toque.",
  },
};

export default ptBR;
