import type {
  AppNotification,
  CartItem,
  Comment,
  Enrollment,
  Favorite,
  Follow,
  Like,
  Message,
  Order,
  OrderStatus,
  Post,
  Product,
  SavedIdea,
  Tutorial,
  TutorialPurchase,
  User,
  Workshop,
  WorkshopSession,
  Address,
  AIConversation,
  Review,
  Project,
} from "@/lib/types";
import { DAY, HOUR, hashStr } from "@/lib/utils";
import { legacyEnrollment, splitLegacy, type LegacyWorkshop } from "@/lib/workshops";

/* All dates are relative to the moment the demo database is first created, so the
   demo always looks "fresh" (upcoming workshops stay upcoming). */

export function buildSeed(now = Date.now()) {
  const ago = (d: number, h = 0) => new Date(now - d * DAY - h * HOUR).toISOString();
  /** A future date at a given UTC hour. */
  const ahead = (d: number, utcHour: number) => {
    const x = new Date(now + d * DAY);
    x.setUTCHours(utcHour, 0, 0, 0);
    return x.toISOString();
  };

  /** Techniques of seeded content (ids from i18n/content TECHNIQUES). */
  const TECH: Record<string, string> = {
    p1: "glazing", p2: "wheel", p3: "knitting", p4: "dyeing", p5: "felting", p6: "freeEmbroidery", p7: "turning", p8: "bookbinding",
    p9: "reworking", p10: "watercolor", p11: "chainmaille", p12: "macrame", p13: "acrylic", p14: "sgraffito", p15: "patchwork", p17: "origami",
    p18: "carving", p19: "crochet", p20: "freeEmbroidery", p21: "reworking", p22: "polymerClay", p23: "watercolor", p24: "papercut", p25: "patchwork",
    p26: "sewing", p27: "knitting", p28: "mosaic",
    pr1: "sgraffito", pr2: "glazing", pr3: "wheel", pr4: "wheel", pr5: "wheel", pr6: "dyeing", pr7: "crochet", pr8: "sewing", pr9: "metalsmithing",
    pr10: "metalsmithing", pr11: "oil", pr12: "carving", pr13: "turning", pr14: "freeEmbroidery", pr15: "reworking", pr16: "bookbinding",
    t1: "handbuilding", t2: "glazing", t3: "knitting", t4: "patchwork", t5: "beading", t6: "watercolor", t7: "turning", t8: "freeEmbroidery", t9: "origami",
  };

  const users: User[] = [
    {
      id: "u_anya",
      username: "anya.knits",
      name: "Аня Соколова",
      email: "anya@demo.remeslo",
      avatarColor: "#F66483",
      bio: "Учусь вязать и вышивать по вечерам. Пока больше путаю петли, чем вяжу, — и мне это нравится.",
      city: "Казань",
      country: "RU",
      interests: ["knitting", "embroidery", "paper"],
      skills: ["лицевая гладь", "крестик"],
      links: [],
      status: "hobbyist",
      goals: ["inspiration", "skills", "community"],
      joinedAt: ago(40),
      contentLang: "ru",
      demoRole: "beginner",
    },
    {
      id: "u_marina",
      username: "marina.clay",
      name: "Марина Гончарова",
      email: "marina@demo.remeslo",
      avatarColor: "#BE6334",
      bio: "Керамист, 12 лет у гончарного круга. Делаю посуду, которой хочется пользоваться каждый день. Веду мастер-классы в Петербурге.",
      city: "Санкт-Петербург",
      country: "RU",
      interests: ["ceramics", "pottery", "painting"],
      skills: ["гончарный круг", "ручная лепка", "сграффито", "восстановительный обжиг"],
      links: [
        { label: "Портфолио", url: "https://example.com/marina-clay" },
        { label: "Telegram", url: "https://t.me/example" },
      ],
      status: "pro",
      goals: ["share", "sell", "community"],
      joinedAt: ago(420),
      contentLang: "ru",
      demoRole: "master",
    },
    {
      id: "u_lucas",
      username: "lucas.andrade",
      name: "Lucas Andrade",
      email: "lucas@demo.remeslo",
      avatarColor: "#30B8B2",
      bio: "Coleciono cerâmica e peças feitas à mão. Gosto de saber quem fez e como.",
      city: "São Paulo",
      country: "BR",
      interests: ["ceramics", "jewelry", "woodwork"],
      skills: [],
      links: [],
      status: "hobbyist",
      goals: ["inspiration", "community"],
      joinedAt: ago(90),
      contentLang: "pt-BR",
      demoRole: "buyer",
    },
    {
      id: "u_ilya",
      username: "ilya.wood",
      name: "Илья Резников",
      avatarColor: "#15484C",
      bio: "Режу ложки и точу чаши из уральских пород: берёза, вишня, яблоня. Мастерская в Перми.",
      city: "Пермь",
      country: "RU",
      interests: ["woodwork", "other"],
      skills: ["резьба ложек", "токарное дело", "масло-воск"],
      links: [{ label: "Мастерская", url: "https://example.com/ilya-wood" }],
      status: "independent",
      goals: ["share", "sell"],
      joinedAt: ago(300),
      contentLang: "ru",
    },
    {
      id: "u_beatriz",
      username: "bia.joias",
      name: "Beatriz Moura",
      avatarColor: "#FF9F00",
      bio: "Joias autorais em prata, inspiradas nas plantas do Rio. Ateliê em Santa Teresa.",
      city: "Rio de Janeiro",
      country: "BR",
      interests: ["jewelry", "other"],
      skills: ["prata 950", "chainmaille", "fundição"],
      links: [{ label: "Ateliê", url: "https://example.com/bia" }],
      status: "independent",
      goals: ["sell", "share"],
      joinedAt: ago(260),
      contentLang: "pt-BR",
    },
    {
      id: "u_sofia",
      username: "sofia.pinta",
      name: "Sofía Ruiz",
      avatarColor: "#F66483",
      bio: "Pintora. Acrílico y óleo, puertos y luz del Mediterráneo. Doy clases online.",
      city: "Valencia",
      country: "ES",
      interests: ["painting"],
      skills: ["acrílico", "óleo", "color"],
      links: [],
      status: "pro",
      goals: ["share", "sell"],
      joinedAt: ago(210),
      contentLang: "es",
    },
    {
      id: "u_olga",
      username: "olga.stitch",
      name: "Ольга Ленская",
      avatarColor: "#30B8B2",
      bio: "Вышиваю гладью и шью лоскутные одеяла. Люблю, когда нитка рисует.",
      city: "Москва",
      country: "RU",
      interests: ["embroidery", "sewing"],
      skills: ["гладь", "свободная вышивка", "пэчворк"],
      links: [],
      status: "independent",
      goals: ["share", "sell", "community"],
      joinedAt: ago(350),
      contentLang: "ru",
    },
    {
      id: "u_tiago",
      username: "tiago.reuso",
      name: "Tiago Costa",
      avatarColor: "#15484C",
      bio: "Transformo jeans velhos e tecidos esquecidos em bolsas. Upcycling em Porto Alegre.",
      city: "Porto Alegre",
      country: "BR",
      interests: ["upcycling", "sewing"],
      skills: ["costura", "modelagem", "reaproveitamento"],
      links: [],
      status: "independent",
      goals: ["sell", "share"],
      joinedAt: ago(180),
      contentLang: "pt-BR",
    },
    {
      id: "u_kate",
      username: "kate.binds",
      name: "Kate Morgan",
      avatarColor: "#BE6334",
      bio: "Bookbinder and paper folder in Edinburgh. Coptic stitch, marbled paper, small editions.",
      city: "Edinburgh",
      country: "GB",
      interests: ["paper", "other"],
      skills: ["coptic binding", "paper marbling", "origami"],
      links: [{ label: "Studio", url: "https://example.com/kate" }],
      status: "pro",
      goals: ["share", "sell"],
      joinedAt: ago(500),
      contentLang: "en",
    },
    {
      id: "u_dasha",
      username: "dasha.knots",
      name: "Даша Мельник",
      avatarColor: "#FF9F00",
      bio: "Макраме, ткачество и всё, где есть узелки. Новосибирск.",
      city: "Новосибирск",
      country: "RU",
      interests: ["other", "knitting", "upcycling"],
      skills: ["макраме", "ткачество на раме"],
      links: [],
      status: "hobbyist",
      goals: ["share", "community"],
      joinedAt: ago(120),
      contentLang: "ru",
    },
    {
      id: "u_ana",
      username: "ana.fios",
      name: "Ana Lima",
      avatarColor: "#F66483",
      bio: "Tinjo lã à mão e faço mantas de crochê. Belo Horizonte.",
      city: "Belo Horizonte",
      country: "BR",
      interests: ["knitting", "other"],
      skills: ["tingimento natural", "crochê", "tricô"],
      links: [],
      status: "independent",
      goals: ["sell", "community"],
      joinedAt: ago(230),
      contentLang: "pt-BR",
    },
    {
      id: "u_pavel",
      username: "pavel.aqua",
      name: "Павел Орлов",
      avatarColor: "#30B8B2",
      bio: "Акварель на пленэре. Балтика, дюны, туман.",
      city: "Калининград",
      country: "RU",
      interests: ["painting", "paper"],
      skills: ["акварель", "скетчинг"],
      links: [],
      status: "independent",
      goals: ["share", "skills"],
      joinedAt: ago(160),
      contentLang: "ru",
    },
    {
      id: "u_nina",
      username: "nina.felt",
      name: "Нина Войтова",
      avatarColor: "#BE6334",
      bio: "Валяю игрушки из шерсти. Сначала это был способ успокоиться, теперь — способ жить.",
      city: "Екатеринбург",
      country: "RU",
      interests: ["other", "knitting"],
      skills: ["сухое валяние"],
      links: [],
      status: "hobbyist",
      goals: ["share", "community"],
      joinedAt: ago(75),
      contentLang: "ru",
    },
    {
      id: "u_joao",
      username: "joao.torno",
      name: "João Pereira",
      avatarColor: "#15484C",
      bio: "Ceramista e professor de torno em São Paulo. Esmaltes de alta temperatura.",
      city: "São Paulo",
      country: "BR",
      interests: ["pottery", "ceramics"],
      skills: ["torno", "esmaltes", "queima a gás"],
      links: [{ label: "Ateliê", url: "https://example.com/joao" }],
      status: "pro",
      goals: ["sell", "share", "community"],
      joinedAt: ago(390),
      contentLang: "pt-BR",
    },
  ];

  const P = (
    id: string,
    authorId: string,
    kind: Post["kind"],
    category: Post["category"],
    image: string,
    title: string,
    body: string,
    d: number,
    lang: string,
    views: number,
    extra: Partial<Post> = {},
  ): Post => ({ id, authorId, kind, category, images: [`/img/${image}.jpg`], title, body, createdAt: ago(d, (hashStr(id) % 20) + 1), lang, views, technique: TECH[id], ...extra });

  const posts: Post[] = [
    P("p1", "u_marina", "finished", "ceramics", "post-ceramic-plate", "Тарелка «Отлив»", "Глазурь легла так, будто на тарелке застыла вода во время отлива. Три слоя: белая основа, кобальт и капля медной зелени по краю. Восстановительный обжиг, 1280°.", 1, "ru", 2140, {
      translations: {
        en: { title: "“Low tide” plate", body: "The glaze settled as if water froze on the plate at low tide. Three layers: white base, cobalt and a drop of copper green along the rim. Reduction firing, 1280°C." },
        "pt-BR": { title: "Prato “Maré baixa”", body: "O esmalte assentou como se a água tivesse congelado no prato na maré baixa. Três camadas: base branca, cobalto e uma gota de verde de cobre na borda. Queima de redução, 1280 °C." },
      },
    }),
    P("p2", "u_joao", "process", "pottery", "post-kiln-unload", "Abrindo o forno", "O momento mais tenso da semana: abrir o forno depois de 14 horas. Desta vez, os azuis vieram profundos e o celadon ficou exatamente como eu queria.", 2, "pt-BR", 1650, {
      translations: { ru: { title: "Открываю печь", body: "Самый напряжённый момент недели: открыть печь через 14 часов. В этот раз синие вышли глубокими, а селадон получился именно таким, как я хотел." } },
    }),
    P("p3", "u_anya", "experiment", "knitting", "post-green-yarn", "Моя первая пряжа ручного прядения", "Подруга дала попробовать прялку — и вот первый моток. Толщина гуляет от нитки до каната, но я невероятно горда. Что из такого можно связать?", 3, "ru", 320),
    P("p4", "u_ana", "process", "knitting", "post-wool-colors", "Tingimento natural: casca de cebola e urucum", "Os laranjas vieram do urucum, os amarelos da casca de cebola. Nenhum corante sintético. Cada lote fica um pouco diferente — e essa é a graça.", 4, "pt-BR", 980),
    P("p5", "u_nina", "finished", "other", "post-felt-dragon", "Дракон на зиму", "Две недели сухого валяния, около 200 г шерсти мериноса. Чешуя — отдельными слоями, глаза — стеклянные бусины.", 2, "ru", 1890),
    P("p6", "u_olga", "finished", "embroidery", "post-embroidered-eye", "Взгляд", "Свободная вышивка гладью на льне. Ресницы — одна нить мулине, радужка — французские узелки. Хотелось поймать живой взгляд.", 5, "ru", 1430),
    P("p7", "u_ilya", "process", "woodwork", "post-woodturning", "Чаша из берёзового капа", "Первый проход резцом — самый честный: сразу видно, какой рисунок прячет древесина. Эта заготовка сохла полтора года.", 1, "ru", 1210),
    P("p8", "u_kate", "finished", "paper", "post-marbled-book", "Marbled endpapers, coptic stitch", "A small run of six notebooks. The paper was marbled on carrageenan size with four colours — each sheet is unique, so each book is too.", 6, "en", 760, {
      translations: { ru: { title: "Мраморная бумага и коптский переплёт", body: "Небольшой тираж из шести блокнотов. Бумага мраморирована на каррагинане в четыре цвета — каждый лист уникален, а значит, и каждая книга." } },
    }),
    P("p9", "u_tiago", "finished", "upcycling", "post-iris-bag", "Bolsa “Íris” de jeans e linho", "Feita com uma calça jeans esquecida e retalhos de linho. As íris são aplicação com ponto zigue-zague.", 3, "pt-BR", 870),
    P("p10", "u_pavel", "tools", "painting", "post-watercolor-kit", "Что лежит в моём пленэрном наборе", "12 кювет, две кисти-белки, водяная кисть и маленький блок 300 г/м². Всё влезает в карман куртки. Главное правило — меньше цветов, больше воды.", 7, "ru", 1120),
    P("p11", "u_beatriz", "process", "jewelry", "post-chainmaille", "Chainmaille: 1.200 argolas", "Colar em trama europeia 4 em 1. Fecho cada argola com dois alicates — paciência pura, quase uma meditação.", 4, "pt-BR", 940),
    P("p12", "u_dasha", "finished", "other", "post-macrame", "Мандала из хлопкового шнура", "Плела три вечера под подкасты. Шнур 3 мм, центр — деревянное кольцо. Скоро будет схема для начинающих.", 8, "ru", 640),
    P("p13", "u_sofia", "finished", "painting", "post-acrylic-river", "Río en otoño", "Acrílico sobre lienzo, 50×40. Quería que el agua tuviera más color que los árboles.", 5, "es", 1010, {
      translations: { ru: { title: "Река осенью", body: "Акрил на холсте, 50×40. Хотелось, чтобы в воде было больше цвета, чем в деревьях." } },
    }),
    P("p14", "u_marina", "tip", "ceramics", "post-painted-bowl", "Как я переношу эскиз на сырую чашу", "Рисую карандашом прямо по кожетвёрдой глине — графит выгорит в печи. Потом ангоб и процарапывание. Совет: держите чашу под плёнкой, иначе край пересохнет раньше дна.", 9, "ru", 2560),
    P("p15", "u_olga", "process", "sewing", "post-crazy-quilt", "«Безумное» одеяло из бабушкиных лоскутов", "Crazy quilt — никакой схемы, только интуиция и декоративные швы. Половина лоскутов — платья 70-х.", 10, "ru", 1180),
    P("p16", "u_lucas", "finished", "ceramics", "post-blue-mug", "Minha caneca favorita chegou", "Comprei do João no mês passado. Uso todos os dias e ela fica ainda mais bonita com o café.", 6, "pt-BR", 210),
    P("p17", "u_kate", "tip", "paper", "post-origami-lotus", "Wet-folding a lotus", "Lightly mist heavy paper before the last folds: the curves hold their shape once dry. Works best with 120–160 g/m² paper.", 11, "en", 690),
    P("p18", "u_ilya", "finished", "woodwork", "post-walnut-spoon", "Ложка из ореха", "Вырезана одним ножом и одним косяком. Пропитка — льняное масло и воск. Сервировочная, 28 см.", 12, "ru", 1340),
    P("p19", "u_ana", "process", "knitting", "post-crochet-pattern", "Padrão em ondas", "Testando um padrão de ondas para a próxima manta. Azul petróleo e branco cru.", 13, "pt-BR", 520),
    P("p20", "u_nina", "experiment", "embroidery", "post-brain-embroidery", "Анатомическая вышивка — эксперимент", "Попробовала себя в вышивке: мозг одной контурной линией. Не моя техника, но было интересно выйти за пределы шерсти.", 14, "ru", 450),
    P("p21", "u_tiago", "finished", "upcycling", "post-suitcase-table", "Mesa de mala antiga", "Uma mala de 1960 virou mesinha de canto. Pés de madeira, tampo com xadrez pintado à mão.", 15, "pt-BR", 1560),
    P("p22", "u_beatriz", "finished", "jewelry", "post-polymer-bracelet", "Pulseira com flores de argila", "Experimento com argila polimérica e prata. Cada flor é modelada à mão com um palito.", 16, "pt-BR", 610),
    P("p23", "u_pavel", "video", "painting", "post-tulips-sketch", "Тюльпаны за 40 минут", "Ускоренная запись: от карандаша до последнего мазка. Работа по-сырому, бумага 100% хлопок.", 6, "ru", 1980, { videoLength: "0:48" }),
    P("p24", "u_dasha", "experiment", "paper", "post-papercut", "Вырезанки: грибы", "Первый опыт с бумажной вырезкой — макетный нож и терпение. Оказалось, это очень похоже на макраме: всё держится на тонких перемычках.", 17, "ru", 380),
    P("p25", "u_olga", "process", "sewing", "post-sewing-process", "Стёжка по линиям", "Простёгиваю подушку по спирали. Лапка с верхним транспортёром — лучшее, что я купила в этом году.", 18, "ru", 720),
    P("p26", "u_joao", "video", "pottery", "post-patchwork-cushion", "Almofada para o banco do torno", "Pequeno desvio da cerâmica: costurei uma almofada de retalhos para o banco do ateliê. Vídeo do processo em 1 minuto.", 19, "pt-BR", 410, { category: "sewing", videoLength: "1:02" }),
    P("p27", "u_anya", "finished", "knitting", "post-mini-sweater", "Свитер для ёлки", "Первая вещь, которую я довязала до конца! Да, она размером с ладонь. Но с вышитой птичкой.", 20, "ru", 560),
    P("p28", "u_sofia", "tip", "painting", "post-mosaic-frog", "Mosaico como ejercicio de color", "Antes de pintar, a veces armo una pequeña composición con teselas: obliga a decidir cada color sin mezclar.", 21, "es", 480, { category: "other" }),
  ];

  const C = (id: string, postId: string, authorId: string, text: string, d: number, h = 0): Comment => ({ id, postId, authorId, text, createdAt: ago(d, h) });
  const comments: Comment[] = [
    C("c1", "p1", "u_joao", "Que azul! Qual a temperatura do cobalto?", 0, 20),
    C("c2", "p1", "u_marina", "Спасибо! Всё на 1280°, кобальт в составе основной глазури.", 0, 18),
    C("c3", "p1", "u_anya", "Это невероятно. Хочу когда-нибудь научиться так же.", 0, 10),
    C("c4", "p3", "u_dasha", "Неровная пряжа — лучшая для шапки крупной вязкой! Спицы 8 мм.", 2, 5),
    C("c5", "p3", "u_ana", "Parabéns! O primeiro fio é sempre o mais especial.", 2, 2),
    C("c6", "p5", "u_anya", "Какая чешуя! Сколько слоёв на каждую?", 1, 4),
    C("c7", "p5", "u_nina", "По три тонких слоя, иначе чешуйки топорщатся.", 1, 2),
    C("c8", "p7", "u_marina", "Илья, это не дерево, а пейзаж.", 0, 12),
    C("c9", "p8", "u_pavel", "Beautiful marbling. Do you sell the papers separately?", 5, 3),
    C("c10", "p8", "u_kate", "Not yet — thinking about it for spring!", 5, 1),
    C("c11", "p9", "u_lucas", "Linda! Tem para vender?", 2, 6),
    C("c12", "p10", "u_anya", "Спасибо, с этого и начну. А какая водяная кисть?", 6, 8),
    C("c13", "p14", "u_olga", "Очень полезно про плёнку, сохраняю.", 8, 4),
    C("c14", "p14", "u_joao", "Ótima dica. Eu uso a mesma técnica com engobe preto.", 8, 2),
    C("c15", "p15", "u_anya", "Платья 70-х! Представляю, сколько в этом одеяле историй.", 9, 6),
    C("c16", "p18", "u_lucas", "Que trabalho bonito.", 11, 3),
    C("c17", "p21", "u_dasha", "Гениально. У меня как раз лежит старый чемодан.", 14, 5),
    C("c18", "p23", "u_sofia", "¡Qué frescura! Me encanta cómo dejas respirar el papel.", 5, 7),
    C("c19", "p27", "u_olga", "Птичка — прекрасна. С первой довязанной вещью!", 19, 3),
    C("c20", "p27", "u_nina", "Ура! Дальше будет только интереснее.", 19, 1),
    C("c21", "p2", "u_marina", "Селадон мечты. Какой у вас состав?", 1, 9),
    C("c22", "p11", "u_kate", "1,200 rings! The patience.", 3, 2),
    C("c23", "p12", "u_anya", "Жду схему!", 7, 4),
    C("c24", "p6", "u_pavel", "Взгляд действительно живой.", 4, 6),
    C("c25", "p4", "u_dasha", "Цвета как осенний лес.", 3, 5),
  ];

  // Demo likes: deterministic pseudo-random subset of users for each post.
  const likes: Like[] = [];
  for (const p of posts) {
    for (const u of users) {
      if (u.id === p.authorId) continue;
      if (hashStr(p.id + u.id) % 100 < 38) likes.push({ userId: u.id, postId: p.id, at: ago(Math.max(0, (hashStr(u.id + p.id) % 5)), 2) });
    }
  }

  const follows: Follow[] = [];
  const F = (a: string, b: string, d: number) => follows.push({ followerId: a, followingId: b, at: ago(d) });
  // Marina has a steadily growing audience (used by the author dashboard).
  ["u_anya", "u_lucas", "u_ilya", "u_olga", "u_joao", "u_pavel", "u_nina", "u_dasha", "u_kate", "u_ana", "u_beatriz", "u_sofia"].forEach((u, i) => F(u, "u_marina", 2 + i * 14));
  F("u_anya", "u_olga", 30);
  F("u_anya", "u_nina", 20);
  F("u_anya", "u_dasha", 15);
  F("u_anya", "u_ana", 12);
  F("u_lucas", "u_joao", 80);
  F("u_lucas", "u_beatriz", 60);
  F("u_lucas", "u_ilya", 40);
  F("u_lucas", "u_tiago", 30);
  F("u_marina", "u_joao", 200);
  F("u_marina", "u_ilya", 150);
  F("u_marina", "u_kate", 100);
  F("u_marina", "u_pavel", 70);
  F("u_joao", "u_marina", 190);
  F("u_olga", "u_nina", 50);
  F("u_ilya", "u_joao", 120);
  F("u_beatriz", "u_ana", 90);
  F("u_ana", "u_beatriz", 85);
  F("u_tiago", "u_ana", 60);
  F("u_kate", "u_pavel", 45);
  F("u_pavel", "u_sofia", 44);
  F("u_sofia", "u_pavel", 40);
  F("u_nina", "u_anya", 18);
  F("u_dasha", "u_anya", 14);
  F("u_olga", "u_anya", 10);

  const PR = (
    p: Omit<Product, "images" | "createdAt" | "status" | "saleType"> & Partial<Pick<Product, "status" | "saleType">> & { images: string[]; d: number },
  ): Product => {
    const { d, images, ...rest } = p;
    return {
      status: "published",
      saleType: rest.availability === "made_to_order" ? "to_order" : "ready",
      technique: TECH[rest.id],
      ...rest,
      images: images.map((i) => `/img/${i}.jpg`),
      createdAt: ago(d),
      updatedAt: ago(d),
    };
  };

  const products: Product[] = [
    PR({
      id: "pr1", sellerId: "u_marina", title: "Чаша «Сграффито»", price: { amount: 3200, currency: "RUB" }, category: "ceramics",
      summary: "Глубокая чаша с процарапанным узором, ручная работа.",
      description: "Чаша из шамотной глины, покрыта чёрным ангобом, узор процарапан вручную. Внутри — прозрачная пищевая глазурь. Подходит для супа, салата, фруктов. Можно в посудомоечную машину и микроволновку.",
      story: "Узор родился из зимних набросков: я рисовала ветки за окном мастерской, пока ждала обжиг. Каждую чашу процарапываю около трёх часов, поэтому двух одинаковых не бывает.",
      materials: ["шамотная глина", "чёрный ангоб", "прозрачная глазурь"], dimensions: "Ø 16 см, высота 8 см, 600 мл",
      availability: "in_stock", stock: 3, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-sgraffito-bowl", "gal-wheel-studio"], lang: "ru", views: 1840, d: 20,
    }),
    PR({
      id: "pr2", sellerId: "u_marina", title: "Пиала «Тушь»", price: { amount: 2800, currency: "RUB" }, category: "ceramics",
      summary: "Пиала с узором в технике росписи тушью, делается под заказ.",
      description: "Фарфоровая масса, роспись подглазурным пигментом, перекликающаяся с каллиграфией. Изготавливается под заказ — небольшие отличия в рисунке неизбежны и желанны.",
      story: "Эту серию я начала после поездки на Байкал: трещины во льду и следы кисти оказались удивительно похожи.",
      materials: ["фарфоровая масса", "подглазурный пигмент"], dimensions: "Ø 11 см, высота 7 см, 250 мл",
      availability: "made_to_order", stock: 0, makeDays: 14, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-ink-bowl"], lang: "ru", views: 1210, d: 35,
    }),
    PR({
      id: "pr3", sellerId: "u_joao", title: "Vaso “Mar de Dentro”", price: { amount: 240, currency: "BRL" }, category: "pottery",
      summary: "Vaso torneado com esmalte verde-azulado e alças modeladas.",
      description: "Vaso em grés torneado à mão, esmalte de alta temperatura em verde-azulado, alças e borda modeladas. Impermeável — pode receber flores frescas.",
      story: "As alças foram inspiradas nas grades antigas do centro de São Paulo. Fiz uma série de apenas cinco.",
      materials: ["grés", "esmalte de alta temperatura"], dimensions: "Altura 24 cm, Ø 14 cm",
      availability: "in_stock", stock: 2, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-teal-vase", "gal-wood-cups"], lang: "pt-BR", views: 990, d: 12,
    }),
    PR({
      id: "pr4", sellerId: "u_joao", title: "Garrafa “Âmbar”", price: { amount: 180, currency: "BRL" }, category: "pottery",
      summary: "Vaso-garrafa esguio com esmalte âmbar em degradê.",
      description: "Garrafa torneada em grés, esmalte âmbar que escorre em degradê. Ideal para um único galho seco.",
      story: "O degradê surge sozinho no forno — eu só decido onde o esmalte começa.",
      materials: ["grés", "esmalte âmbar"], dimensions: "Altura 28 cm, Ø 7 cm",
      availability: "sold_out", stock: 0, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-bottle-vase"], lang: "pt-BR", views: 640, d: 40,
    }),
    PR({
      id: "pr5", sellerId: "u_marina", title: "Кувшин «Кобальт»", price: { amount: 4500, currency: "RUB" }, category: "ceramics",
      summary: "Кувшин на 1 литр в глубокой синей глазури.",
      description: "Кувшин вытянут на гончарном круге, ручка налеплена вручную. Глубокая кобальтовая глазурь с потёками. Для воды, молока, морса или цветов.",
      story: "Цвет я искала два года — хотелось синевы, как в сумерках над Невой в ноябре.",
      materials: ["каменная масса", "кобальтовая глазурь"], dimensions: "Высота 18 см, 1 л",
      availability: "in_stock", stock: 1, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-cobalt-jug"], lang: "ru", views: 2230, d: 8,
    }),
    PR({
      id: "pr6", sellerId: "u_ana", title: "Lã tingida à mão “Jardim”", price: { amount: 65, currency: "BRL" }, category: "knitting",
      summary: "Meada de lã merino tingida com corantes naturais, 100 g.",
      description: "Lã merino superwash, 100 g / 400 m. Tingimento manual com corantes naturais e fixação ecológica. Cada lote é único.",
      story: "As cores vêm do meu quintal: casca de cebola, urucum, folhas de eucalipto.",
      materials: ["lã merino", "corantes naturais"], dimensions: "100 g / 400 m",
      availability: "in_stock", stock: 12, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-handdyed-yarn", "gal-pink-yarn", "gal-tweed-yarn"], lang: "pt-BR", views: 760, d: 6,
    }),
    PR({
      id: "pr7", sellerId: "u_ana", title: "Manta de crochê “Avó”", price: { amount: 420, currency: "BRL" }, category: "knitting",
      summary: "Manta de quadradinhos (granny squares), feita sob encomenda.",
      description: "Manta com 48 quadradinhos em lã e algodão. Você escolhe a paleta — eu envio as opções antes de começar.",
      story: "Aprendi o ponto com minha avó. Essa manta é minha homenagem a ela.",
      materials: ["lã", "algodão"], dimensions: "120 × 150 cm",
      availability: "made_to_order", stock: 0, makeDays: 21, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-granny-blanket", "gal-crochet-stack"], lang: "pt-BR", views: 540, d: 26,
    }),
    PR({
      id: "pr8", sellerId: "u_tiago", title: "Bolsa “Flores” de algodão", price: { amount: 150, currency: "BRL" }, category: "sewing",
      summary: "Bolsa transversal em algodão estampado e forro reaproveitado.",
      description: "Bolsa transversal com alça regulável, forro de lençol reaproveitado e bolso interno.",
      story: "O tecido estampado era uma cortina de uma casa demolida no meu bairro.",
      materials: ["algodão", "forro reaproveitado"], dimensions: "30 × 22 × 8 cm",
      availability: "in_stock", stock: 4, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-floral-bag"], lang: "pt-BR", views: 480, d: 10,
    }),
    PR({
      id: "pr9", sellerId: "u_beatriz", title: "Anel “Hibisco”", price: { amount: 210, currency: "BRL" }, category: "jewelry",
      summary: "Anel em prata 950 com flor modelada à mão.",
      description: "Anel em prata 950, flor modelada em cera e fundida. Aro ajustável do 14 ao 20.",
      story: "Um hibisco caiu no meu caminho para o ateliê — modelei a flor no mesmo dia.",
      materials: ["prata 950"], dimensions: "Flor Ø 2,2 cm, aro ajustável",
      availability: "in_stock", stock: 5, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-flower-ring", "gal-chain-necklace"], lang: "pt-BR", views: 1320, d: 15,
    }),
    PR({
      id: "pr10", sellerId: "u_beatriz", title: "Brincos “Folha de outono”", price: { amount: 95, currency: "BRL" }, category: "jewelry",
      summary: "Brincos leves de folhas pintadas à mão.",
      description: "Brincos em latão banhado e folhas de resina pintadas à mão. Muito leves (4 g cada).",
      story: "Uma coleção pequena para quem sente falta do outono no Rio.",
      materials: ["latão banhado", "resina"], dimensions: "Comprimento 6 cm",
      availability: "in_stock", stock: 8, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-leaf-earrings", "gal-earrings-card"], lang: "pt-BR", views: 860, d: 9,
    }),
    PR({
      id: "pr11", sellerId: "u_sofia", title: "Puerto de Altea (óleo)", price: { amount: 180, currency: "EUR" }, category: "painting",
      summary: "Óleo original sobre lienzo, 40×30.",
      description: "Pintura original al óleo sobre lienzo de algodón, 40×30 cm, barnizada. Se envía con certificado firmado.",
      story: "La pinté una mañana de marzo, en una sola sesión, desde el muelle.",
      materials: ["óleo", "lienzo de algodón"], dimensions: "40 × 30 cm",
      availability: "in_stock", stock: 1, shipsFrom: "ES", shipsTo: ["ES", "PT", "BR"], images: ["prod-harbor-painting"], lang: "es", views: 690, d: 18,
    }),
    PR({
      id: "pr12", sellerId: "u_ilya", title: "Набор кухонных лопаток", price: { amount: 1900, currency: "RUB" }, category: "woodwork",
      summary: "Пять лопаток и ложек из вишни и берёзы.",
      description: "Набор из пяти предметов: две лопатки, сервировочная ложка, ложка для специй и мешалка. Пропитка — льняное масло и пчелиный воск.",
      story: "Вишню мне отдал сосед после обрезки сада. Из одного ствола вышло двенадцать наборов.",
      materials: ["вишня", "берёза", "льняное масло", "воск"], dimensions: "Длина 18–30 см",
      availability: "in_stock", stock: 6, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-wooden-spoons", "gal-spoons-pile"], lang: "ru", views: 1080, d: 14,
    }),
    PR({
      id: "pr13", sellerId: "u_ilya", title: "Точёный сосуд из ореха", price: { amount: 5600, currency: "RUB" }, category: "woodwork",
      summary: "Декоративный сосуд, выточенный на станке, под заказ.",
      description: "Сосуд из маньчжурского ореха, точение на станке, полировка воском. Изготавливается под заказ из выбранной вами заготовки.",
      story: "Каждая заготовка сохнет год-полтора. Я присылаю фото рисунка древесины до начала работы.",
      materials: ["маньчжурский орех", "воск"], dimensions: "Высота 12 см, Ø 10 см",
      availability: "made_to_order", stock: 0, makeDays: 10, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-turned-vessel"], lang: "ru", views: 520, d: 28,
    }),
    PR({
      id: "pr14", sellerId: "u_olga", title: "Пяльцы «Бумажный самолётик»", price: { amount: 2400, currency: "RUB" }, category: "embroidery",
      summary: "Вышитая картина в пяльцах, Ø 20 см.",
      description: "Вышивка гладью на хлопке, оформлена в буковые пяльцы с петелькой для подвеса. Обратная сторона закрыта фетром.",
      story: "Самолётик — про письма, которые мы так и не отправили. Мне хотелось, чтобы он улетал за край пялец.",
      materials: ["хлопок", "мулине", "бук", "фетр"], dimensions: "Ø 20 см",
      availability: "in_stock", stock: 2, shipsFrom: "RU", shipsTo: ["RU"], images: ["prod-plane-hoop", "gal-hoop-orange"], lang: "ru", views: 610, d: 7,
    }),
    PR({
      id: "pr15", sellerId: "u_tiago", title: "Bolsa carteiro de jeans", price: { amount: 260, currency: "BRL" }, category: "upcycling",
      summary: "Bolsa carteiro feita de três calças jeans.",
      description: "Bolsa carteiro com aba magnética, compartimento para notebook de 13'' e alça acolchoada.",
      story: "Três calças, três tons de azul. Uma delas era do meu pai.",
      materials: ["jeans reaproveitado", "lona"], dimensions: "36 × 28 × 9 cm",
      availability: "in_stock", stock: 2, shipsFrom: "BR", shipsTo: ["BR"], images: ["prod-messenger-bag", "gal-green-bag"], lang: "pt-BR", views: 730, d: 5,
    }),
    PR({
      id: "pr16", sellerId: "u_kate", title: "Coptic-bound sketchbook", price: { amount: 38, currency: "GBP" }, category: "paper",
      summary: "A5 sketchbook, coptic stitch, 120 pages of cotton paper.",
      description: "Hand-bound A5 sketchbook with exposed coptic stitch so it lies flat. 120 pages of 160 g/m² cotton paper, suitable for light watercolour.",
      story: "The covers are offcuts from a local frame shop — each book carries a bit of someone else's picture.",
      materials: ["cotton paper", "linen thread", "bookboard"], dimensions: "A5, 2 cm thick",
      availability: "in_stock", stock: 7, shipsFrom: "GB", shipsTo: ["GB", "BR", "RU", "ES"], images: ["prod-coptic-notebook", "gal-notebook-bow"], lang: "en", views: 580, d: 22,
    }),
    PR({
      id: "pr17", sellerId: "u_marina", title: "Кружка «Северное море»", price: { amount: 2200, currency: "RUB" }, category: "ceramics", status: "draft", saleType: "personalized",
      summary: "Черновик: кружка из серии «Северное море», можно добавить инициалы на дно.",
      description: "Тёмная шамотная масса, селадон снаружи, белый ангоб внутри. Объём около 300 мл.",
      story: "", materials: ["шамотная масса", "селадон"], dimensions: "Высота 9 см, 300 мл",
      specs: [{ label: "Объём", value: "300 мл" }, { label: "Посудомоечная машина", value: "можно" }],
      availability: "made_to_order", stock: 0, makeDays: 21, shipsFrom: "RU", shipsTo: ["RU"], images: ["gal-wood-cups"], lang: "ru", views: 0, d: 1,
      shipping: { mode: "fixed", cost: 450, terms: "Отправляю СДЭК или Почтой России в двойной коробке." },
    }),
  ];

  const T = (t: Omit<Tutorial, "cover" | "createdAt" | "status"> & Partial<Pick<Tutorial, "status">> & { cover: string; d: number }): Tutorial => {
    const { d, cover, ...rest } = t;
    return {
      technique: TECH[rest.id],
      format: "steps",
      status: "published",
      ...rest,
      views: rest.status === "draft" ? 0 : 300 + (hashStr(rest.id) % 1500),
      cover: cover.startsWith("/") ? cover : `/img/${cover}.jpg`,
      createdAt: ago(d),
      updatedAt: ago(d),
    };
  };
  const tutorials: Tutorial[] = [
    T({
      id: "t1", authorId: "u_marina", title: "Чаша щипком: первая керамика без круга", summary: "Самый простой способ начать: чаша из одного кома глины руками.", cover: "tut-pinch-bowl", category: "ceramics", level: "beginner", durationMin: 60, price: null, lang: "ru", d: 60,
      materials: ["500 г глины самоотвердевающей или шамотной", "губка", "миска с водой", "деревянный стек"],
      steps: [
        { title: "Скатайте шар", text: "Разомните глину и скатайте шар размером с апельсин. Трещин быть не должно." },
        { title: "Откройте форму", text: "Вдавите большой палец в центр, оставив около 1 см до дна." },
        { title: "Щипки по спирали", text: "Поворачивая шар, мягко сжимайте стенку большим и указательным пальцами, поднимаясь по спирали." },
        { title: "Выровняйте край", text: "Пройдитесь влажной губкой по краю. Неровный край — тоже красиво." },
        { title: "Сушка", text: "Сушите под плёнкой 2–3 дня, чтобы стенки сохли равномерно." },
      ],
      reviews: [
        { authorId: "u_anya", rating: 5, text: "Получилось с первого раза! Немного кривая, но моя.", at: ago(20) },
        { authorId: "u_lucas", rating: 4, text: "Clara e direta. Usei argila de secagem ao ar.", at: ago(15) },
      ],
    }),
    T({
      id: "t2", authorId: "u_marina", title: "Слоёные глазури: как получить глубину цвета", summary: "Наношу три глазури поверх друг друга и разбираю, что происходит в печи.", cover: "tut-glaze-bowls", category: "ceramics", level: "intermediate", durationMin: 90, price: { amount: 990, currency: "RUB" }, lang: "ru", d: 45,
      materials: ["утельные изделия", "2–3 глазури одного диапазона", "кисти-флейцы", "весы"],
      steps: [
        { title: "Тест-плитки", text: "Сделайте 6 плиток и подпишите комбинации на обороте оксидом." },
        { title: "Основа", text: "Окуните изделие в базовую глазурь на 3 секунды." },
        { title: "Второй слой", text: "Нанесите контрастную глазурь на верхнюю треть — она потечёт вниз." },
        { title: "Акцент", text: "Каплями нанесите третью глазурь по краю." },
        { title: "Обжиг", text: "Обжигайте на подставке-отбойнике при первых тестах — потёки бывают сильными." },
      ],
      reviews: [{ authorId: "u_joao", rating: 5, text: "Excelente explicação sobre espessura.", at: ago(30) }],
    }),
    T({
      id: "t3", authorId: "u_ana", title: "Tricô do zero: montagem e ponto meia", summary: "Do primeiro ponto ao primeiro quadrado — sem pressa.", cover: "tut-knit-basics", category: "knitting", level: "beginner", durationMin: 45, price: null, lang: "pt-BR", d: 50,
      materials: ["agulhas 5 mm", "novelo de lã grossa clara", "tesoura"],
      steps: [
        { title: "Nó corrediço", text: "Faça um nó corrediço e coloque na agulha esquerda." },
        { title: "Montagem", text: "Monte 20 pontos com o método do polegar." },
        { title: "Ponto meia", text: "Insira a agulha direita, passe o fio e puxe a laçada." },
        { title: "Repita", text: "Tricote 30 carreiras em ponto meia (tricô) para formar um quadrado." },
        { title: "Arremate", text: "Arremate todos os pontos e esconda o fio." },
      ],
      reviews: [{ authorId: "u_anya", rating: 5, text: "Понятно даже без перевода — по фото.", at: ago(10) }],
    }),
    T({
      id: "t4", authorId: "u_olga", title: "Лоскутное одеяло: блок «Колодец»", summary: "Классический блок пэчворка, из которого собирается целое одеяло.", cover: "tut-patchwork", category: "sewing", level: "intermediate", durationMin: 180, price: { amount: 790, currency: "RUB" }, lang: "ru", d: 70,
      materials: ["хлопковые лоскуты", "роторный нож и коврик", "линейка для пэчворка", "швейная машина"],
      steps: [
        { title: "Раскрой", text: "Нарежьте полосы шириной 4 см и центральный квадрат 6×6 см." },
        { title: "Первый круг", text: "Пришейте полосы по часовой стрелке вокруг квадрата." },
        { title: "Заутюживание", text: "Заутюживайте каждый шов от центра." },
        { title: "Следующие круги", text: "Чередуйте светлые и тёмные полосы." },
        { title: "Обрезка", text: "Подровняйте блок до 30×30 см." },
      ],
      reviews: [{ authorId: "u_dasha", rating: 4, text: "Хорошо, но нужен роторный нож — ножницами долго.", at: ago(25) }],
    }),
    T({
      id: "t5", authorId: "u_beatriz", title: "Colar de contas com fecho de nó", summary: "Um colar simples, sem fecho de metal, com nós entre as contas.", cover: "tut-bead-necklace", category: "jewelry", level: "beginner", durationMin: 40, price: null, lang: "pt-BR", d: 33,
      materials: ["cordão encerado 1 mm", "30 contas de 8 mm", "pingente de madeira"],
      steps: [
        { title: "Medida", text: "Corte 90 cm de cordão." },
        { title: "Centro", text: "Passe o pingente e posicione no meio." },
        { title: "Contas e nós", text: "Faça um nó, passe uma conta, faça outro nó." },
        { title: "Fecho corrediço", text: "Cruze as pontas e faça dois nós corrediços." },
      ],
      reviews: [],
    }),
    T({
      id: "t6", authorId: "u_pavel", title: "Акварель по-сырому: небо за 20 минут", summary: "Учимся отпускать воду и не мешать краске.", cover: "tut-watercolor", category: "painting", level: "beginner", durationMin: 20, price: null, lang: "ru", d: 25,
      materials: ["бумага 300 г/м², 100% хлопок", "ультрамарин и умбра", "круглая кисть №10"],
      steps: [
        { title: "Намочите лист", text: "Равномерно смочите бумагу чистой водой — до матового блеска." },
        { title: "Первая заливка", text: "Положите ультрамарин сверху, оставляя пробелы для облаков." },
        { title: "Тени облаков", text: "Смешайте ультрамарин с умброй и коснитесь нижних краёв облаков." },
        { title: "Не трогайте", text: "Дайте бумаге высохнуть самой. Это самое трудное." },
      ],
      reviews: [
        { authorId: "u_anya", rating: 5, text: "Самое трудное — правда «не трогайте».", at: ago(12) },
        { authorId: "u_sofia", rating: 5, text: "Muy claro y bonito.", at: ago(8) },
      ],
    }),
    T({
      id: "t7", authorId: "u_ilya", title: "Точение веретена: основы токарного дела", summary: "Безопасность, хват резца и первая деталь на станке.", cover: "tut-spindle", category: "woodwork", level: "advanced", durationMin: 120, price: { amount: 690, currency: "RUB" }, lang: "ru", d: 55,
      materials: ["токарный станок", "мейсель и рейер", "заготовка 40×40×250 мм", "защитные очки"],
      steps: [
        { title: "Безопасность", text: "Очки, убранные волосы, никаких перчаток и свободных рукавов." },
        { title: "Цилиндр", text: "Рейером снимите углы заготовки до цилиндра." },
        { title: "Разметка", text: "Карандашом отметьте элементы веретена на вращающейся заготовке." },
        { title: "Формы", text: "Мейселем сформируйте валики и выкружки." },
        { title: "Шлифовка", text: "Шлифуйте на низких оборотах, зернистость 180 → 400." },
      ],
      reviews: [{ authorId: "u_marina", rating: 5, text: "Подробно про безопасность — спасибо.", at: ago(40) }],
    }),
    T({
      id: "t8", authorId: "u_olga", title: "Шов «назад иголка»: контурная вышивка", summary: "Один шов — и уже можно вышивать графику.", cover: "tut-backstitch", category: "embroidery", level: "beginner", durationMin: 30, price: null, lang: "ru", d: 15,
      materials: ["пяльцы 15 см", "хлопок или лён", "мулине в 2 сложения", "игла с большим ушком"],
      steps: [
        { title: "Перенос рисунка", text: "Переведите контур исчезающим маркером." },
        { title: "Первый стежок", text: "Выведите иглу на 3 мм впереди начала линии и вернитесь назад." },
        { title: "Ритм", text: "Каждый новый стежок начинается на длину стежка впереди предыдущего." },
        { title: "Закрепка", text: "Закрепите нить под стежками на изнанке, без узелков." },
      ],
      reviews: [],
    }),
    T({
      id: "t9", authorId: "u_kate", title: "Folding a traditional paper crane", summary: "A calm 15-minute fold that teaches the bird base.", cover: "tut-origami-crane", category: "paper", level: "beginner", durationMin: 15, price: null, lang: "en", d: 80,
      materials: ["15×15 cm square of thin paper"],
      steps: [
        { title: "Square base", text: "Fold diagonals and the middle, then collapse into a square base." },
        { title: "Bird base", text: "Petal-fold front and back." },
        { title: "Neck and tail", text: "Narrow the lower flaps and inside-reverse fold them up." },
        { title: "Head and wings", text: "Reverse-fold the head, then gently pull the wings apart." },
      ],
      reviews: [{ authorId: "u_dasha", rating: 5, text: "Сложила с дочкой, обе счастливы.", at: ago(30) }],
    }),
    T({
      id: "t10", authorId: "u_marina", title: "Отводка ручки для кружки", status: "draft", cover: "gal-wood-cups", category: "ceramics", level: "intermediate", durationMin: 40,
      summary: "Черновик: как вытянуть ручку из глины и прилепить её так, чтобы не треснула.", price: null, lang: "ru", d: 1, direction: "Посуда",
      materials: ["пластичная глина", "шликер", "губка"], steps: [{ title: "Заготовка", text: "Скатайте морковку из глины и смочите руку." }], reviews: [],
    }),
  ];

  /** Seed authored in the old one-date shape, then split into templates + sessions. */
  const W = (w: Omit<LegacyWorkshop, "cover"> & { cover: string }): LegacyWorkshop => ({
    level: "any",
    createdAt: ago(20),
    updatedAt: ago(20),
    ...w,
    cover: w.cover.startsWith("/") ? w.cover : `/img/${w.cover}.jpg`,
  });
  const legacyWorkshops: LegacyWorkshop[] = [
    W({
      id: "w1", hostId: "u_marina", title: "Лепка без круга: чаша и тарелка", cover: "ws-handbuilding", category: "ceramics",
      startsAt: ahead(6, 9), durationMin: 180, timeZone: "Europe/Moscow", format: "offline", country: "RU", city: "Санкт-Петербург", venue: "Мастерская «Глина», наб. Обводного канала, 74",
      price: { amount: 3500, currency: "RUB" }, seatsTotal: 8, seatsTaken: 5, lang: "ru",
      description: "Три часа ручной лепки: делаем чашу щипком и тарелку из пласта. Все материалы и два обжига включены. Готовые изделия можно забрать через три недели.",
      program: ["Знакомство с глиной и инструментами", "Чаша щипком", "Тарелка из пласта и декор штампами", "Покрытие ангобом, обсуждение глазурей"],
    }),
    W({
      id: "w2", hostId: "u_joao", title: "Primeiros passos no torno", cover: "ws-wheel-class", category: "pottery",
      startsAt: ahead(9, 13), durationMin: 240, timeZone: "America/Sao_Paulo", format: "offline", country: "BR", city: "São Paulo", venue: "Ateliê Barro Vivo, Rua Harmonia, 120 — Vila Madalena",
      price: { amount: 180, currency: "BRL" }, seatsTotal: 6, seatsTaken: 4, lang: "pt-BR",
      description: "Aula introdutória de torno: centralizar, abrir e levantar um cilindro. Avental e argila incluídos.",
      program: ["Preparação da argila", "Centralização", "Abertura e paredes", "Acabamento e retirada da peça"],
    }),
    W({
      id: "w3", hostId: "u_sofia", title: "Abstracción con acrílico (online)", cover: "ws-acrylic", category: "painting",
      startsAt: ahead(4, 17), durationMin: 120, timeZone: "Europe/Madrid", format: "online", country: "ES",
      price: { amount: 25, currency: "EUR" }, seatsTotal: 30, seatsTaken: 18, lang: "es",
      description: "Clase en directo por videollamada: capas, espátula y gestos. Recibirás la lista de materiales al inscribirte.",
      program: ["Paleta limitada", "Capas transparentes", "Espátula y textura", "Revisión de trabajos"],
    }),
    W({
      id: "w4", hostId: "u_ilya", title: "Режем ложку за один день", cover: "ws-spoon-carving", category: "woodwork",
      startsAt: ahead(12, 7), durationMin: 360, timeZone: "Europe/Moscow", format: "offline", country: "RU", city: "Москва", venue: "Лофт «Цех», ул. Электрозаводская, 21",
      price: { amount: 2900, currency: "RUB" }, seatsTotal: 10, seatsTaken: 10, lang: "ru",
      description: "От берёзового полена до готовой ложки. Ножи и косяки выдаём, заготовку забираете с собой.",
      program: ["Техника безопасности и хваты ножа", "Раскол и разметка", "Черновая форма топором", "Чистовая резьба", "Пропитка маслом"],
    }),
    W({
      id: "w5", hostId: "u_dasha", title: "Ткачество на раме: первое панно (онлайн)", cover: "ws-weaving", category: "other",
      startsAt: ahead(3, 13), durationMin: 150, timeZone: "Asia/Novosibirsk", format: "online", country: "RU",
      price: { amount: 1500, currency: "RUB" }, seatsTotal: 20, seatsTaken: 7, lang: "ru",
      description: "Онлайн-занятие: собираем раму из подрамника, натягиваем основу и ткём панно с ворсом и рельефом.",
      program: ["Рама и основа", "Полотняное переплетение", "Ворс «рия»", "Снятие с рамы и оформление"],
    }),
    W({
      id: "w6", hostId: "u_ana", title: "Clube de tricô de domingo", cover: "ws-knitting", category: "knitting",
      startsAt: ahead(7, 14), durationMin: 120, timeZone: "America/Sao_Paulo", format: "offline", country: "BR", city: "Belo Horizonte", venue: "Café Novelo, Rua Pernambuco, 880 — Savassi",
      price: null, seatsTotal: 15, seatsTaken: 9, lang: "pt-BR",
      description: "Encontro livre para tricotar juntos. Traga seu projeto — ou venha aprender o primeiro ponto.",
      program: ["Café e apresentações", "Tira-dúvidas", "Tricô livre"],
    }),
    W({
      id: "w7", hostId: "u_marina", title: "Глазури для начинающих: тестовые плитки", cover: "tut-glaze-bowls", category: "ceramics",
      startsAt: ahead(-18, 9), durationMin: 150, timeZone: "Europe/Moscow", format: "offline", country: "RU", city: "Санкт-Петербург", venue: "Мастерская «Глина», наб. Обводного канала, 74",
      price: { amount: 2500, currency: "RUB" }, seatsTotal: 8, seatsTaken: 8, lang: "ru", level: "beginner",
      description: "Делали тестовые плитки и разбирались, как глазурь ведёт себя на разных массах.",
      program: ["Типы глазурей", "Нанесение окунанием и кистью", "Подписываем плитки для обжига"],
    }),
    W({
      id: "w8", hostId: "u_marina", title: "Открытый стол: лепим пиалы", cover: "gal-wheel-studio", category: "ceramics", status: "draft",
      startsAt: ahead(20, 8), durationMin: 300, timeZone: "Europe/Moscow", format: "offline", country: "RU", city: "Санкт-Петербург", venue: "Мастерская «Глина», наб. Обводного канала, 74",
      price: null, seatsTotal: 60, seatsTaken: 0, lang: "ru",
      description: "Черновик: свободная лепка пиал с подсказками мастера, чай из наших пиал.",
      program: ["Показ приёмов", "Свободная лепка", "Чай и разбор работ"],
    }),
  ];

  const enrollments: Enrollment[] = [
    { userId: "u_anya", workshopId: "w5", at: ago(3) },
    { userId: "u_olga", workshopId: "w1", at: ago(9) },
    { userId: "u_pavel", workshopId: "w1", at: ago(7) },
    { userId: "u_lucas", workshopId: "w2", at: ago(5) },
  ].map(legacyEnrollment);
  const workshops: Workshop[] = [];
  const sessions: WorkshopSession[] = [];
  for (const lw of legacyWorkshops) {
    const { template, session } = splitLegacy(lw, enrollments.filter((e) => e.workshopId === lw.id).length);
    workshops.push(template);
    sessions.push(session);
  }
  // One template, several dates: extra sessions created from existing templates.
  const extra = (base: WorkshopSession, id: string, startsAt: string, patch: Partial<WorkshopSession> = {}): WorkshopSession => ({
    ...base,
    id,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + (new Date(base.endsAt).getTime() - new Date(base.startsAt).getTime())).toISOString(),
    externalSeats: 0,
    createdAt: ago(2),
    updatedAt: ago(2),
    ...patch,
  });
  const w1s1 = sessions.find((x) => x.id === "w1_s1")!;
  const w7s1 = sessions.find((x) => x.id === "w7_s1")!;
  sessions.push(extra(w1s1, "w1_s2", ahead(13, 9), { externalSeats: 1 }));
  // Starts in ~20 hours: the host gets the 24-hour reminder on the first load.
  sessions.push(extra(w7s1, "w7_s2", new Date(Math.ceil((now + 20 * HOUR) / HOUR) * HOUR).toISOString(), { externalSeats: 3 }));
  enrollments.push({ id: "e_w7s2_anya", userId: "u_anya", workshopId: "w7", sessionId: "w7_s2", seats: 2, at: ago(1) });

  // Tutorial purchases feed the author dashboard (education income).
  const tutorialPurchases: TutorialPurchase[] = [];
  const tpBuyers = ["u_anya", "u_olga", "u_pavel", "u_nina", "u_dasha", "u_ilya", "u_joao"];
  for (let i = 0; i < 14; i++) {
    tutorialPurchases.push({ userId: tpBuyers[i % tpBuyers.length], tutorialId: "t2", at: ago(3 + i * 11), price: { amount: 990, currency: "RUB" } });
  }
  tutorialPurchases.push({ userId: "u_marina", tutorialId: "t7", at: ago(35), price: { amount: 690, currency: "RUB" } });
  tutorialPurchases.push({ userId: "u_anya", tutorialId: "t4", at: ago(9), price: { amount: 790, currency: "RUB" } });

  /* ---------------- Orders ---------------- */
  const flow: OrderStatus[] = ["pending", "confirmed", "preparing", "handed_over", "in_transit", "arrived", "delivered", "received"];
  const prod = (id: string) => products.find((p) => p.id === id)!;
  let orderSeq = 1040;
  const orders: Order[] = [];
  const addressRU = (name: string, city: string): Order["address"] => ({
    country: "RU",
    recipient: name,
    phone: "+7 (912) 345-67-89",
    email: "demo@example.com",
    fields: { postalCode: "420111", region: "Республика Татарстан", city, street: "ул. Баумана", house: "12", apartment: "34" },
  });
  const addressBR: Order["address"] = {
    country: "BR",
    recipient: "Lucas Andrade",
    phone: "+55 (11) 98765-4321",
    email: "lucas@demo.remeslo",
    fields: { cep: "05433-000", state: "SP", city: "São Paulo", neighborhood: "Vila Madalena", street: "Rua Fradique Coutinho", number: "450", complement: "apto 21" },
  };
  function makeOrder(o: {
    buyerId: string;
    items: [string, number][];
    status: OrderStatus;
    createdDaysAgo: number;
    delivery: string;
    country: "RU" | "BR";
    shipping: number;
    address: Order["address"];
    cancelledFrom?: OrderStatus;
  }) {
    const items = o.items.map(([pid, qty]) => {
      const p = prod(pid);
      return { productId: pid, title: p.title, image: p.images[0], qty, unitPrice: p.price };
    });
    const currency = items[0].unitPrice.currency;
    const subtotal = items.reduce((s, i) => s + i.unitPrice.amount * i.qty, 0);
    const created = now - o.createdDaysAgo * DAY;
    const history: Order["history"] = [];
    const steps = o.status === "cancelled" ? flow.slice(0, flow.indexOf(o.cancelledFrom ?? "pending") + 1) : flow.slice(0, flow.indexOf(o.status) + 1);
    // spread history between creation and now
    const span = Math.max(1, o.createdDaysAgo * DAY - 2 * HOUR);
    steps.forEach((s, i) => history.push({ status: s, at: new Date(created + (steps.length === 1 ? 0 : (span * i) / (steps.length - (o.status === "cancelled" ? 0 : 0.5)))).toISOString() }));
    if (o.status === "cancelled") history.push({ status: "cancelled", at: new Date(created + span * 0.9).toISOString() });
    const seq = orderSeq++;
    orders.push({
      id: `o${seq}`,
      number: `RM-${seq}`,
      groupId: `g${seq}`,
      buyerId: o.buyerId,
      sellerId: prod(o.items[0][0]).sellerId,
      createdAt: new Date(created).toISOString(),
      items,
      deliveryMethod: o.delivery,
      address: o.address,
      subtotal: { amount: subtotal, currency },
      shipping: { amount: o.shipping, currency },
      total: { amount: subtotal + o.shipping, currency },
      status: o.status,
      history,
      tracking: `DEMO-${o.country}-${(hashStr(String(seq)) % 900000) + 100000}`,
      eta: ["delivered", "received", "cancelled"].includes(o.status) ? undefined : new Date(created + 9 * DAY).toISOString(),
    });
  }

  // Lucas (buyer, BR) — orders on every stage
  makeOrder({ buyerId: "u_lucas", items: [["pr10", 2]], status: "pending", createdDaysAgo: 0.2, delivery: "standard", country: "BR", shipping: 24.9, address: addressBR });
  makeOrder({ buyerId: "u_lucas", items: [["pr6", 3]], status: "preparing", createdDaysAgo: 2, delivery: "express", country: "BR", shipping: 42.5, address: addressBR });
  makeOrder({ buyerId: "u_lucas", items: [["pr15", 1]], status: "in_transit", createdDaysAgo: 5, delivery: "standard", country: "BR", shipping: 24.9, address: addressBR });
  makeOrder({ buyerId: "u_lucas", items: [["pr16", 1]], status: "delivered", createdDaysAgo: 18, delivery: "standard", country: "BR", shipping: 12, address: addressBR });
  makeOrder({ buyerId: "u_lucas", items: [["pr7", 1]], status: "cancelled", cancelledFrom: "confirmed", createdDaysAgo: 25, delivery: "standard", country: "BR", shipping: 24.9, address: addressBR });
  makeOrder({ buyerId: "u_lucas", items: [["pr3", 1]], status: "received", createdDaysAgo: 40, delivery: "express", country: "BR", shipping: 42.5, address: addressBR });

  // Anya (beginner, RU)
  makeOrder({ buyerId: "u_anya", items: [["pr2", 1]], status: "in_transit", createdDaysAgo: 16, delivery: "pickup", country: "RU", shipping: 250, address: addressRU("Аня Соколова", "Казань") });
  makeOrder({ buyerId: "u_anya", items: [["pr12", 1]], status: "received", createdDaysAgo: 34, delivery: "post", country: "RU", shipping: 350, address: addressRU("Аня Соколова", "Казань") });

  // Sales history for Marina's dashboard (real orders from other demo users)
  const marinaBuyers: [string, string][] = [["u_olga", "Москва"], ["u_pavel", "Калининград"], ["u_nina", "Екатеринбург"], ["u_dasha", "Новосибирск"], ["u_ilya", "Пермь"]];
  const marinaSales: [string, number, number][] = [
    ["pr1", 1, 8], ["pr5", 1, 15], ["pr1", 2, 27], ["pr2", 1, 38], ["pr5", 1, 52], ["pr1", 1, 64], ["pr2", 2, 79], ["pr1", 1, 95], ["pr5", 1, 110], ["pr1", 1, 128], ["pr2", 1, 140], ["pr1", 1, 158], ["pr5", 1, 170],
  ];
  marinaSales.forEach(([pid, qty, d], i) => {
    const [buyer, city] = marinaBuyers[i % marinaBuyers.length];
    makeOrder({ buyerId: buyer, items: [[pid, qty]], status: d < 10 ? "preparing" : "received", createdDaysAgo: d, delivery: "post", country: "RU", shipping: 350, address: addressRU(users.find((u) => u.id === buyer)!.name, city) });
  });
  // Marina also has one fresh order waiting for confirmation (seller-side demo)
  makeOrder({ buyerId: "u_olga", items: [["pr5", 1]], status: "pending", createdDaysAgo: 0.1, delivery: "courier", country: "RU", shipping: 600, address: addressRU("Ольга Ленская", "Москва") });

  /* ---------------- Personal state ---------------- */
  const favorites: Favorite[] = [
    { userId: "u_anya", type: "post", id: "p6", at: ago(3) },
    { userId: "u_anya", type: "post", id: "p14", at: ago(5) },
    { userId: "u_anya", type: "post", id: "p12", at: ago(7) },
    { userId: "u_anya", type: "tutorial", id: "t1", at: ago(10) },
    { userId: "u_anya", type: "tutorial", id: "t8", at: ago(4) },
    { userId: "u_anya", type: "workshop", id: "w5", at: ago(3) },
    { userId: "u_anya", type: "workshop", id: "w1", at: ago(2) },
    { userId: "u_olga", type: "workshop", id: "w1", at: ago(9) },
    { userId: "u_anya", type: "product", id: "pr14", at: ago(2) },
    { userId: "u_lucas", type: "product", id: "pr1", at: ago(6) },
    { userId: "u_lucas", type: "product", id: "pr9", at: ago(4) },
    { userId: "u_lucas", type: "product", id: "pr11", at: ago(3) },
    { userId: "u_lucas", type: "post", id: "p2", at: ago(2) },
    { userId: "u_lucas", type: "post", id: "p21", at: ago(8) },
    { userId: "u_lucas", type: "workshop", id: "w2", at: ago(5) },
    { userId: "u_marina", type: "post", id: "p7", at: ago(1) },
    { userId: "u_marina", type: "post", id: "p8", at: ago(6) },
    { userId: "u_marina", type: "tutorial", id: "t7", at: ago(30) },
  ];

  const carts: Record<string, CartItem[]> = {
    // Lucas' cart demonstrates price change + unavailable product + normal item
    u_lucas: [
      { productId: "pr3", qty: 1, priceAtAdd: { amount: 220, currency: "BRL" }, addedAt: ago(4) },
      { productId: "pr4", qty: 1, priceAtAdd: { amount: 180, currency: "BRL" }, addedAt: ago(9) },
      { productId: "pr9", qty: 1, priceAtAdd: { amount: 210, currency: "BRL" }, addedAt: ago(1) },
    ],
    u_anya: [{ productId: "pr14", qty: 1, priceAtAdd: { amount: 2400, currency: "RUB" }, addedAt: ago(1) }],
  };

  const addresses: Address[] = [
    { id: "a1", userId: "u_lucas", ...addressBR },
    { id: "a2", userId: "u_anya", ...addressRU("Аня Соколова", "Казань") },
  ];

  const N = (n: Omit<AppNotification, "id" | "read"> & { read?: boolean }, i: number): AppNotification => ({ id: `n${i}`, read: false, ...n });
  const notifications: AppNotification[] = [
    N({ userId: "u_marina", type: "comment", actorId: "u_joao", key: "comment", params: { title: "Тарелка «Отлив»" }, href: "/post/p1", at: ago(0, 20) }, 1),
    N({ userId: "u_marina", type: "order", key: "newOrder", params: { number: "RM-" + (orderSeq - 1) }, href: "/dashboard", at: ago(0, 2) }, 2),
    N({ userId: "u_marina", type: "follow", actorId: "u_anya", key: "follow", at: ago(2), read: true }, 3),
    N({ userId: "u_marina", type: "workshop", actorId: "u_pavel", key: "enrolled", params: { title: "Лепка без круга" }, href: "/learn/workshop/w1", at: ago(7), read: true }, 4),
    N({ userId: "u_anya", type: "like", actorId: "u_olga", key: "like", params: { title: "Свитер для ёлки" }, href: "/post/p27", at: ago(0, 5) }, 5),
    N({ userId: "u_anya", type: "follow", actorId: "u_nina", key: "follow", at: ago(1) }, 6),
    N({ userId: "u_anya", type: "workshop", key: "workshopSoon", params: { title: "Ткачество на раме" }, href: "/learn/workshop/w5", at: ago(0, 1) }, 7),
    N({ userId: "u_lucas", type: "order", key: "orderStatus", params: { number: "RM-1042" }, href: "/orders/o1042", at: ago(0, 6) }, 8),
    N({ userId: "u_lucas", type: "comment", actorId: "u_tiago", key: "reply", params: { title: "Bolsa “Íris”" }, href: "/post/p9", at: ago(1) }, 9),
    N({ userId: "u_lucas", type: "system", key: "priceChanged", params: { title: "Vaso “Mar de Dentro”" }, href: "/cart", at: ago(0, 9) }, 10),
  ];

  const messages: Message[] = [
    { id: "m1", fromId: "u_lucas", toId: "u_tiago", text: "Olá! A bolsa carteiro cabe um notebook de 14''?", at: ago(5, 3) },
    { id: "m2", fromId: "u_tiago", toId: "u_lucas", text: "Oi Lucas! Cabe até 13''. Para 14'' posso fazer uma sob medida.", at: ago(5, 1) },
  ];

  const ideas: SavedIdea[] = [
    { id: "i1", userId: "u_marina", title: "Серия «Северное море»", text: "Чашки с глазурью цвета пасмурной воды, ручки как обкатанные камни.", tags: ["керамика", "коллекция"], isProject: true, projectId: "prj1", createdAt: ago(12) },
    { id: "i2", userId: "u_anya", title: "Шапка из первой пряжи", text: "Крупная вязка резинкой 2×2 на спицах 8 мм — неровность пряжи станет фактурой.", tags: ["вязание"], isProject: false, createdAt: ago(2) },
  ];

  const conversations: AIConversation[] = [];

  const projects: Project[] = [
    {
      id: "prj1", userId: "u_marina", title: "Серия «Северное море»", status: "in_progress", category: "ceramics", technique: "wheel",
      description: "Небольшая серия чашек: глазурь цвета пасмурной воды, ручки как обкатанные камни.",
      idea: "Чашки с глазурью цвета пасмурной воды, ручки как обкатанные камни.",
      cover: "/img/gal-wood-cups.jpg",
      recommendations: [{ id: "r1", text: "Сделать тест-плитки трёх оттенков селадона на тёмной массе, прежде чем глазуровать всю серию.", at: ago(11) }],
      materials: ["тёмная шамотная масса", "селадон", "белый ангоб"], tools: ["гончарный круг", "петли для обточки"],
      plan: [
        { id: "pl1", text: "Тест-плитки глазурей", at: ago(12) },
        { id: "pl2", text: "Выточить 8 чашек", at: ago(12) },
        { id: "pl3", text: "Ручки из пласта", at: ago(12) },
        { id: "pl4", text: "Утильный и глазурный обжиг", at: ago(12) },
      ],
      checklist: [
        { id: "c1", text: "Тест-плитки глазурей", done: true, at: ago(12) },
        { id: "c2", text: "Выточить 8 чашек", done: true, at: ago(12) },
        { id: "c3", text: "Ручки из пласта", done: false, at: ago(12) },
        { id: "c4", text: "Утильный и глазурный обжиг", done: false, at: ago(12) },
      ],
      notes: [{ id: "n1", text: "Второй оттенок селадона на тёмной массе почти чёрный — брать светлую массу для внутренней стороны.", at: ago(6) }],
      photos: [{ id: "ph1", src: "/img/gal-wheel-studio.jpg", at: ago(8), final: false }],
      createdAt: ago(12), updatedAt: ago(6),
    },
  ];

  const productReviews: (Review & { productId: string })[] = [
    { productId: "pr1", authorId: "u_olga", rating: 5, text: "Чаша ещё красивее, чем на фото. Упаковано идеально.", at: ago(20) },
    { productId: "pr1", authorId: "u_pavel", rating: 5, text: "Пользуюсь каждый день, узор не стирается.", at: ago(60) },
    { productId: "pr5", authorId: "u_nina", rating: 5, text: "Глубокий синий цвет, тяжёлый и устойчивый.", at: ago(45) },
    { productId: "pr12", authorId: "u_anya", rating: 4, text: "Очень приятные в руке. Одна лопатка чуть темнее остальных — но так даже интереснее.", at: ago(28) },
    { productId: "pr3", authorId: "u_lucas", rating: 5, text: "Chegou muito bem embalado. A cor é ainda mais bonita ao vivo.", at: ago(30) },
  ];

  /** Demo view counters per category for the recommendation engine. */
  const categoryViews: Record<string, Record<string, number>> = {
    u_anya: { knitting: 6, embroidery: 4, ceramics: 2 },
    u_lucas: { ceramics: 5, jewelry: 3 },
    u_marina: { ceramics: 8, woodwork: 3 },
  };

  return {
    users,
    posts,
    comments,
    likes,
    follows,
    products,
    tutorials,
    workshops,
    sessions,
    enrollments,
    tutorialPurchases,
    orders,
    favorites,
    carts,
    addresses,
    notifications,
    messages,
    ideas,
    conversations,
    projects,
    reminderLog: [] as string[],
    productReviews,
    categoryViews,
  };
}

export type SeedData = ReturnType<typeof buildSeed>;

export const DEMO_ACCOUNTS = ["u_anya", "u_marina", "u_lucas"] as const;
