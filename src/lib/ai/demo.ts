import type { AIScenario, IdeaCard, Locale } from "@/lib/types";
import type { AIProvider, AITurnInput, AITurnOutput } from "./types";

/**
 * DEMO provider: a hand-written branching dialogue ("creative ping-pong").
 * It is NOT a language model — the UI labels it as a scripted demo.
 * Free-text answers move along the node's default branch.
 */
type L = Record<"ru" | "en" | "pt" | "es", string>;
interface Node {
  text: L;
  ideas?: { title: L; text: L }[];
  options?: { label: L; next: string }[];
  next?: string; // default branch for free text
}
type Script = { start: L; nodes: Record<string, Node> };

const S: Record<AIScenario, Script> = {
  idea: {
    start: {
      ru: "Давай поищем идею вместе. Я не буду выдавать готовое — буду задавать вопросы. С чего хочется начать: с материала, который уже есть дома, или с вещи, которую хочется получить?",
      en: "Let's look for an idea together. I won't hand you a finished one — I'll ask questions. Where do you want to start: with a material you already have, or with a thing you'd like to end up with?",
      pt: "Vamos procurar uma ideia juntos. Não vou entregar nada pronto — vou fazer perguntas. Por onde começamos: por um material que você já tem ou pelo objeto que gostaria de ter?",
      es: "Busquemos una idea juntos. No te daré nada hecho: te haré preguntas. ¿Por dónde empezamos: por un material que ya tienes o por el objeto que te gustaría conseguir?",
    },
    nodes: {
      root: {
        text: { ru: "", en: "", pt: "", es: "" },
        options: [
          { label: { ru: "У меня старая джинсовая куртка", en: "I have an old denim jacket", pt: "Tenho uma jaqueta jeans velha", es: "Tengo una chaqueta vaquera vieja" }, next: "denim" },
          { label: { ru: "Хочу вещь для дома", en: "I want something for my home", pt: "Quero algo para casa", es: "Quiero algo para casa" }, next: "home" },
        ],
        next: "denim",
      },
      denim: {
        text: {
          ru: "Отличный материал: плотный, с историей и потёртостями. Пара вопросов, прежде чем фантазировать.\n\n1. Что есть под рукой: швейная машина, только иголка, может, краски по ткани?\n2. Куртку жалко резать или она уже «на эксперименты»?\n3. Что ближе — носить, пользоваться или повесить на стену?",
          en: "Great material: dense, with history and wear marks. A few questions before we dream.\n\n1. What do you have: a sewing machine, just a needle, maybe fabric paints?\n2. Are you attached to the jacket or is it 'for experiments' already?\n3. What appeals more — to wear it, to use it, or to hang it on a wall?",
          pt: "Ótimo material: denso, com história e marcas de uso. Algumas perguntas antes de sonhar.\n\n1. O que você tem: máquina de costura, só agulha, talvez tinta para tecido?\n2. Dá pena cortar a jaqueta ou ela já está 'para experimentos'?\n3. O que atrai mais — vestir, usar ou pendurar na parede?",
          es: "Buen material: denso, con historia y desgaste. Unas preguntas antes de soñar.\n\n1. ¿Qué tienes: máquina de coser, solo aguja, quizá pintura textil?\n2. ¿Te da pena cortar la chaqueta o ya es 'para experimentar'?\n3. ¿Qué te atrae más: llevarla, usarla o colgarla en la pared?",
        },
        options: [
          { label: { ru: "Есть машинка, хочу полезную вещь", en: "I have a machine, want something useful", pt: "Tenho máquina, quero algo útil", es: "Tengo máquina, quiero algo útil" }, next: "denimUseful" },
          { label: { ru: "Только иголка, хочу украсить и носить", en: "Just a needle, want to decorate and wear it", pt: "Só agulha, quero decorar e usar", es: "Solo aguja, quiero decorarla y llevarla" }, next: "denimWear" },
        ],
        next: "denimUseful",
      },
      denimUseful: {
        text: {
          ru: "Тогда давай посмотрим на куртку как на набор деталей: спинка — большое полотно, рукава — две трубы, карманы и пуговицы — готовая фурнитура. Вот три направления — какое откликается? Можно смешать.",
          en: "Then let's see the jacket as a kit of parts: the back is a big panel, sleeves are two tubes, pockets and buttons are ready-made hardware. Here are three directions — which resonates? You can mix them.",
          pt: "Então vamos ver a jaqueta como um kit de peças: as costas são um painel grande, as mangas são dois tubos, bolsos e botões são aviamentos prontos. Aqui vão três direções — qual ressoa? Pode misturar.",
          es: "Entonces veamos la chaqueta como un kit de piezas: la espalda es un panel grande, las mangas dos tubos, bolsillos y botones son herrajes listos. Tres direcciones: ¿cuál resuena? Puedes mezclarlas.",
        },
        ideas: [
          { title: { ru: "Шопер из спинки", en: "Tote from the back panel", pt: "Ecobag com as costas", es: "Bolso tote con la espalda" }, text: { ru: "Спинка — корпус, рукава — ручки, нагрудный карман остаётся снаружи как кармашек для телефона.", en: "Back panel as the body, sleeves as handles, the chest pocket stays outside as a phone pocket.", pt: "Costas como corpo, mangas como alças, o bolso do peito fica por fora para o celular.", es: "La espalda como cuerpo, las mangas como asas y el bolsillo del pecho fuera para el móvil." } },
          { title: { ru: "Органайзер для инструментов", en: "Tool roll organiser", pt: "Organizador de ferramentas", es: "Organizador de herramientas" }, text: { ru: "Скрутка с кармашками для кистей, ножей или спиц. Швы куртки — готовые разделители.", en: "A roll with slots for brushes, knives or needles. The jacket seams become ready dividers.", pt: "Um rolo com bolsos para pincéis, facas ou agulhas. As costuras viram divisórias.", es: "Un rollo con bolsillos para pinceles, cuchillos o agujas. Las costuras hacen de separadores." } },
          { title: { ru: "Лоскутная подушка «Оттенки синего»", en: "“Shades of blue” patchwork cushion", pt: "Almofada “Tons de azul”", es: "Cojín “Tonos de azul”" }, text: { ru: "Режем на квадраты по степени потёртости и собираем градиент от светлого к тёмному.", en: "Cut squares sorted by how faded they are and assemble a light-to-dark gradient.", pt: "Corte quadrados pelo desgaste e monte um degradê do claro ao escuro.", es: "Corta cuadrados según el desgaste y monta un degradado de claro a oscuro." } },
        ],
        options: [
          { label: { ru: "Развить шопер", en: "Develop the tote", pt: "Desenvolver a ecobag", es: "Desarrollar el tote" }, next: "develop1" },
          { label: { ru: "А можно неожиданнее?", en: "Can it be more unexpected?", pt: "Dá para ser mais inesperado?", es: "¿Puede ser más inesperado?" }, next: "twist" },
        ],
        next: "develop1",
      },
      denimWear: {
        text: {
          ru: "Иголка — это много! Вышивка по денниму смотрится живо, потому что ткань сама по себе фактурная. Подумай: есть ли образ, мотив или фраза, которые для тебя что-то значат? Его можно «прорастить» по шву или вокруг дыры.",
          en: "A needle is plenty! Embroidery on denim looks alive because the fabric is already textured. Think: is there an image, motif or phrase that means something to you? It can 'grow' along a seam or around a hole.",
          pt: "Agulha já é muito! Bordado no jeans fica vivo porque o tecido já tem textura. Pense: existe uma imagem, motivo ou frase que signifique algo para você? Ela pode 'crescer' ao longo de uma costura ou em volta de um furo.",
          es: "¡Una aguja es mucho! El bordado sobre vaquero se ve vivo porque la tela ya tiene textura. Piensa: ¿hay una imagen, motivo o frase que signifique algo para ti? Puede 'crecer' a lo largo de una costura o alrededor de un roto.",
        },
        ideas: [
          { title: { ru: "Сашико-заплатки", en: "Sashiko patches", pt: "Remendos sashiko", es: "Parches sashiko" }, text: { ru: "Видимая штопка белой ниткой поверх потёртостей — ремонт становится украшением.", en: "Visible mending in white thread over worn spots — the repair becomes decoration.", pt: "Remendo visível com linha branca sobre o desgaste — o conserto vira enfeite.", es: "Zurcido visible con hilo blanco sobre el desgaste: el arreglo se vuelve adorno." } },
          { title: { ru: "Растения по шву", en: "Plants along the seam", pt: "Plantas pela costura", es: "Plantas por la costura" }, text: { ru: "Стебли поднимаются от подола по боковым швам — гладь и французские узелки.", en: "Stems climb from the hem along the side seams — satin stitch and French knots.", pt: "Caules sobem da barra pelas costuras laterais — ponto cheio e nó francês.", es: "Tallos que suben desde el bajo por las costuras — punto relleno y nudos franceses." } },
        ],
        options: [{ label: { ru: "Спланировать работу", en: "Plan the work", pt: "Planejar o trabalho", es: "Planificar el trabajo" }, next: "plan1" }],
        next: "plan1",
      },
      home: {
        text: {
          ru: "Хорошо. Опиши комнату, где эта вещь будет жить, — какой там свет, цвета, чего не хватает? Иногда лучшая идея прячется в мелком неудобстве: «некуда положить ключи», «голая стена над столом».",
          en: "Good. Describe the room where this thing will live — the light, the colours, what's missing? The best idea often hides in a small annoyance: 'nowhere to put keys', 'a bare wall above the desk'.",
          pt: "Ótimo. Descreva o cômodo onde essa peça vai morar — a luz, as cores, o que falta? A melhor ideia costuma se esconder num pequeno incômodo: 'não tenho onde pôr as chaves', 'parede vazia acima da mesa'.",
          es: "Bien. Describe la habitación donde vivirá: la luz, los colores, ¿qué falta? La mejor idea suele esconderse en una pequeña molestia: 'no tengo dónde dejar las llaves', 'pared vacía sobre el escritorio'.",
        },
        next: "twist",
      },
      twist: {
        text: {
          ru: "Попробуем приём «случайного соседа»: соединим твою задумку с техникой, которую ты ещё не пробовал(а). Например, деним + макраме, деним + цианотипия или деним + переплёт. Что из этого вызывает «хм, интересно»?",
          en: "Let's try the 'random neighbour' trick: pair your idea with a technique you haven't tried. For example denim + macramé, denim + cyanotype, or denim + bookbinding. Which one makes you go 'hm, interesting'?",
          pt: "Vamos tentar o truque do 'vizinho aleatório': juntar sua ideia a uma técnica que você nunca experimentou. Por exemplo jeans + macramê, jeans + cianotipia ou jeans + encadernação. Qual faz você pensar 'hum, interessante'?",
          es: "Probemos el truco del 'vecino aleatorio': une tu idea con una técnica que no hayas probado. Por ejemplo vaquero + macramé, vaquero + cianotipia o vaquero + encuadernación. ¿Cuál te hace pensar 'mmm, interesante'?",
        },
        ideas: [
          { title: { ru: "Обложка блокнота из денима", en: "Denim notebook cover", pt: "Capa de caderno de jeans", es: "Tapa de cuaderno vaquera" }, text: { ru: "Коптский переплёт, где обложка — кусок спинки с заклёпками. Карман — для ручки.", en: "Coptic binding with a cover cut from the jacket back, rivets included. The pocket holds a pen.", pt: "Encadernação copta com capa das costas da jaqueta, com rebites. O bolso guarda a caneta.", es: "Encuadernación copta con tapa de la espalda de la chaqueta, remaches incluidos. El bolsillo guarda el boli." } },
        ],
        options: [{ label: { ru: "Спланировать работу", en: "Plan the work", pt: "Planejar o trabalho", es: "Planificar el trabajo" }, next: "plan1" }],
        next: "plan1",
      },
      develop1: {
        text: {
          ru: "Давай доведём шопер до решения. Что для тебя важнее: чтобы он выдерживал тяжёлые покупки, или чтобы был лёгким и складывался в карман? От этого зависит, нужна ли подкладка и как крепить ручки.",
          en: "Let's get the tote to a decision. What matters more: carrying heavy groceries, or being light and folding into a pocket? That decides whether you need a lining and how to attach the handles.",
          pt: "Vamos levar a ecobag a uma decisão. O que importa mais: aguentar compras pesadas ou ser leve e caber no bolso? Isso define se precisa de forro e como prender as alças.",
          es: "Llevemos el tote a una decisión. ¿Qué importa más: aguantar compras pesadas o ser ligero y plegable? Eso decide si necesita forro y cómo fijar las asas.",
        },
        next: "plan1",
      },
      plan1: {
        text: {
          ru: "Соберём план. Предлагаю разбить на три вечера:\n\n• Вечер 1 — распороть, разметить детали, сфотографировать «до».\n• Вечер 2 — основная сборка или вышивка.\n• Вечер 3 — отделка и фото процесса для публикации.\n\nЧто может помешать? Назови один риск — подумаем, как его обойти. А идею можно сохранить и превратить в проект.",
          en: "Let's build a plan. I suggest three evenings:\n\n• Evening 1 — unpick, mark the parts, take a 'before' photo.\n• Evening 2 — main assembly or embroidery.\n• Evening 3 — finishing and process photos for a post.\n\nWhat could get in the way? Name one risk and we'll think how to avoid it. You can also save the idea and turn it into a project.",
          pt: "Vamos montar um plano. Sugiro três noites:\n\n• Noite 1 — descosturar, marcar as peças, foto do 'antes'.\n• Noite 2 — montagem principal ou bordado.\n• Noite 3 — acabamento e fotos do processo para publicar.\n\nO que pode atrapalhar? Diga um risco e pensamos em como contorná-lo. Você também pode salvar a ideia e transformá-la em projeto.",
          es: "Armemos un plan. Propongo tres tardes:\n\n• Tarde 1 — descoser, marcar piezas, foto del 'antes'.\n• Tarde 2 — montaje principal o bordado.\n• Tarde 3 — acabados y fotos del proceso para publicar.\n\n¿Qué podría estorbar? Di un riesgo y pensamos cómo evitarlo. También puedes guardar la idea y convertirla en proyecto.",
        },
        next: "end",
      },
      end: {
        text: {
          ru: "Звучит как хороший план. Помни: первая версия не обязана быть идеальной — это разведка. Когда сделаешь, поделись процессом в ленте: там подскажут то, чего я не знаю. Хочешь начать новую сессию или вернуться к идеям выше?",
          en: "Sounds like a good plan. Remember: the first version doesn't have to be perfect — it's a scouting trip. When you're done, share the process in the feed: people there will tell you things I don't know. Start a new session or go back to the ideas above?",
          pt: "Parece um bom plano. Lembre: a primeira versão não precisa ser perfeita — é um reconhecimento de terreno. Quando terminar, compartilhe o processo no feed: lá vão te contar coisas que eu não sei. Quer começar uma nova sessão ou voltar às ideias acima?",
          es: "Suena a buen plan. Recuerda: la primera versión no tiene que ser perfecta, es una exploración. Cuando termines, comparte el proceso en el feed: allí te dirán cosas que yo no sé. ¿Empezamos otra sesión o vuelves a las ideas de arriba?",
        },
      },
    },
  },
  develop: {
    start: {
      ru: "Расскажи о своей задумке — хотя бы в двух словах. Например: «коллекция керамических чашек, вдохновлённая природой». Я помогу её развернуть.",
      en: "Tell me about your idea — even in a few words. For example: 'a collection of ceramic cups inspired by nature'. I'll help you unfold it.",
      pt: "Conte sua ideia — mesmo em poucas palavras. Por exemplo: 'uma coleção de xícaras de cerâmica inspirada na natureza'. Eu ajudo a desdobrá-la.",
      es: "Cuéntame tu idea, aunque sea en pocas palabras. Por ejemplo: 'una colección de tazas de cerámica inspirada en la naturaleza'. Te ayudo a desplegarla.",
    },
    nodes: {
      root: {
        text: { ru: "", en: "", pt: "", es: "" },
        options: [{ label: { ru: "Коллекция чашек, вдохновлённая природой", en: "Cups collection inspired by nature", pt: "Coleção de xícaras inspirada na natureza", es: "Colección de tazas inspirada en la naturaleza" }, next: "cups" }],
        next: "cups",
      },
      cups: {
        text: {
          ru: "«Природа» — огромное слово. Давай сузим: какой конкретный пейзаж или момент ты видишь? Лес после дождя, северное море, камни на берегу, осенняя трава? И второй вопрос: чашки для себя, для продажи или в подарок?",
          en: "'Nature' is a huge word. Let's narrow it: what specific landscape or moment do you see? A forest after rain, a northern sea, pebbles on a shore, autumn grass? And second: are the cups for you, for sale, or as gifts?",
          pt: "'Natureza' é uma palavra enorme. Vamos afunilar: que paisagem ou momento concreto você vê? Floresta depois da chuva, mar do norte, pedras na praia, capim de outono? E segundo: as xícaras são para você, para vender ou para presentear?",
          es: "'Naturaleza' es una palabra enorme. Acotemos: ¿qué paisaje o momento concreto ves? Un bosque tras la lluvia, un mar del norte, piedras en la orilla, hierba de otoño? Y segundo: ¿las tazas son para ti, para vender o para regalar?",
        },
        options: [
          { label: { ru: "Северное море и камни", en: "Northern sea and pebbles", pt: "Mar do norte e pedras", es: "Mar del norte y piedras" }, next: "sea" },
          { label: { ru: "Лес после дождя", en: "Forest after rain", pt: "Floresta depois da chuva", es: "Bosque tras la lluvia" }, next: "forest" },
        ],
        next: "sea",
      },
      sea: {
        text: {
          ru: "Красивый образ. Давай разложим его на язык керамики: форма, фактура, глазурь. Вот три варианта — выбери то, что ближе, или скажи, чего не хватает.",
          en: "Beautiful image. Let's translate it into the language of ceramics: form, texture, glaze. Here are three options — pick the closest, or tell me what's missing.",
          pt: "Bela imagem. Vamos traduzi-la para a linguagem da cerâmica: forma, textura, esmalte. Aqui vão três opções — escolha a mais próxima ou diga o que falta.",
          es: "Bonita imagen. Traduzcámosla al lenguaje de la cerámica: forma, textura, esmalte. Tres opciones: elige la más cercana o dime qué falta.",
        },
        ideas: [
          { title: { ru: "Форма «галька»", en: "“Pebble” form", pt: "Forma “seixo”", es: "Forma “guijarro”" }, text: { ru: "Чуть сплюснутые чашки без ручек, слегка асимметричные, как обкатанные волной камни.", en: "Slightly flattened handleless cups, a little asymmetric, like wave-rolled stones.", pt: "Xícaras sem alça levemente achatadas e assimétricas, como pedras roladas pelas ondas.", es: "Tazas sin asa algo achatadas y asimétricas, como piedras pulidas por las olas." } },
          { title: { ru: "Глазурь «пасмурная вода»", en: "“Overcast water” glaze", pt: "Esmalte “água nublada”", es: "Esmalte “agua nublada”" }, text: { ru: "Серо-зелёный селадон, собирающийся в углублениях темнее — как глубина у берега.", en: "Grey-green celadon pooling darker in recesses — like depth near the shore.", pt: "Celadon verde-acinzentado que escurece nas reentrâncias — como a profundidade perto da margem.", es: "Celadón gris verdoso que se oscurece en los huecos, como la profundidad junto a la orilla." } },
          { title: { ru: "Фактура «соль и песок»", en: "“Salt and sand” texture", pt: "Textura “sal e areia”", es: "Textura “sal y arena”" }, text: { ru: "Неглазурованный низ с шамотом и гладкий верх: рука чувствует пляж, губы — воду.", en: "Unglazed grogged foot and a smooth top: the hand feels the beach, the lips feel the water.", pt: "Base sem esmalte com chamote e topo liso: a mão sente a praia, os lábios a água.", es: "Base sin esmaltar con chamota y borde liso: la mano siente la playa, los labios el agua." } },
        ],
        options: [{ label: { ru: "Придумать название и описание", en: "Name and describe the collection", pt: "Criar nome e descrição", es: "Nombre y descripción" }, next: "naming" }],
        next: "naming",
      },
      forest: {
        text: {
          ru: "Лес после дождя — это про влажность, мох, тёмную кору и капли. Как думаешь, что из этого важнее передать: цвет, фактуру или ощущение в руке? Ответь — и я предложу формы.",
          en: "A forest after rain is about moisture, moss, dark bark and droplets. What matters most to convey: colour, texture, or the feel in the hand? Answer and I'll suggest forms.",
          pt: "Floresta depois da chuva é umidade, musgo, casca escura e gotas. O que é mais importante transmitir: cor, textura ou a sensação na mão? Responda e eu sugiro formas.",
          es: "Un bosque tras la lluvia es humedad, musgo, corteza oscura y gotas. ¿Qué importa más transmitir: color, textura o la sensación en la mano? Responde y te propongo formas.",
        },
        next: "sea",
      },
      naming: {
        text: {
          ru: "Несколько вариантов названия — не как ответ, а как отправная точка: «Отлив», «Северный берег», «Галька», «После шторма». Какое ближе — или какое слово из них хочется оставить? Для описания попробуй начать с момента: «Я собирала камни на берегу…» — покупатели любят видеть человека за вещью.",
          en: "A few name options — not as an answer but as a starting point: 'Low Tide', 'Northern Shore', 'Pebble', 'After the Storm'. Which is closest — or which word do you want to keep? For the description, try starting with a moment: 'I was collecting stones on the shore…' — buyers love seeing the person behind the piece.",
          pt: "Algumas opções de nome — não como resposta, mas como ponto de partida: 'Maré Baixa', 'Costa Norte', 'Seixo', 'Depois da Tempestade'. Qual é a mais próxima — ou que palavra você quer manter? Para a descrição, comece por um momento: 'Eu juntava pedras na praia…' — os compradores gostam de ver a pessoa por trás da peça.",
          es: "Algunas opciones de nombre, no como respuesta sino como punto de partida: 'Bajamar', 'Costa Norte', 'Guijarro', 'Tras la Tormenta'. ¿Cuál se acerca más, o qué palabra quieres conservar? Para la descripción, empieza por un momento: 'Recogía piedras en la orilla…'; a los compradores les gusta ver a la persona detrás de la pieza.",
        },
        next: "end",
      },
      end: {
        text: {
          ru: "Концепция складывается. Следующий шаг — 3–4 пробные чашки и тест-плитки глазури. Сохрани идеи, превращай в проект, а когда будут первые результаты — выложи процесс: обратная связь сообщества поможет выбрать финальный вариант.",
          en: "The concept is coming together. Next step: 3–4 trial cups and glaze test tiles. Save the ideas, turn them into a project, and when you have first results, post the process: community feedback will help pick the final version.",
          pt: "O conceito está tomando forma. Próximo passo: 3–4 xícaras de teste e plaquinhas de esmalte. Salve as ideias, transforme em projeto e, quando tiver os primeiros resultados, publique o processo: o retorno da comunidade ajuda a escolher a versão final.",
          es: "El concepto toma forma. Siguiente paso: 3–4 tazas de prueba y azulejos de test de esmalte. Guarda las ideas, conviértelas en proyecto y, cuando tengas resultados, publica el proceso: la comunidad te ayudará a elegir la versión final.",
        },
      },
    },
  },
  explore: {
    start: {
      ru: "Исследуем новые техники! Что тебе уже нравится делать руками? От этого оттолкнёмся и найдём «соседние» техники, которые покажутся одновременно знакомыми и новыми.",
      en: "Let's explore new techniques! What do you already enjoy making by hand? We'll start there and find 'neighbouring' techniques that feel both familiar and new.",
      pt: "Vamos explorar novas técnicas! O que você já gosta de fazer com as mãos? Partimos daí para achar técnicas 'vizinhas', ao mesmo tempo familiares e novas.",
      es: "¡Exploremos técnicas nuevas! ¿Qué te gusta ya hacer con las manos? Partimos de ahí para encontrar técnicas 'vecinas', a la vez familiares y nuevas.",
    },
    nodes: {
      root: {
        text: { ru: "", en: "", pt: "", es: "" },
        options: [
          { label: { ru: "Вязание", en: "Knitting", pt: "Tricô", es: "Tejer" }, next: "fromKnit" },
          { label: { ru: "Рисование", en: "Drawing", pt: "Desenho", es: "Dibujo" }, next: "fromDraw" },
        ],
        next: "fromKnit",
      },
      fromKnit: {
        text: {
          ru: "Если руки любят ритм и нить — вот куда можно шагнуть. Что из этого хочется потрогать?",
          en: "If your hands love rhythm and thread — here's where you could step. Which one do you want to touch?",
          pt: "Se suas mãos gostam de ritmo e fio — aqui está para onde você pode ir. Qual dá vontade de tocar?",
          es: "Si a tus manos les gusta el ritmo y el hilo, aquí hay hacia dónde ir. ¿Cuál te apetece tocar?",
        },
        ideas: [
          { title: { ru: "Ткачество на раме", en: "Frame weaving", pt: "Tecelagem em tear de moldura", es: "Tejido en bastidor" }, text: { ru: "Та же пряжа, но рисунок строится как картина. Рама — из старого подрамника.", en: "Same yarn, but the pattern builds like a painting. The frame can be an old stretcher.", pt: "O mesmo fio, mas o desenho se constrói como pintura. O tear pode ser um chassi velho.", es: "El mismo hilo, pero el dibujo se construye como un cuadro. El bastidor puede ser uno viejo." } },
          { title: { ru: "Сухое валяние", en: "Needle felting", pt: "Feltragem a seco", es: "Fieltro con aguja" }, text: { ru: "Шерсть без спиц: скульптура иглой. Быстрый результат и неожиданная объёмность.", en: "Wool without needles: sculpting with a barbed needle. Quick results, surprising volume.", pt: "Lã sem agulhas de tricô: esculpir com agulha. Resultado rápido e volume surpreendente.", es: "Lana sin agujas de tejer: esculpir con aguja. Resultado rápido y volumen sorprendente." } },
          { title: { ru: "Натуральное крашение", en: "Natural dyeing", pt: "Tingimento natural", es: "Tinte natural" }, text: { ru: "Луковая шелуха, кора, ягоды. Ты начнёшь создавать не только вещи, но и цвет.", en: "Onion skins, bark, berries. You'll start creating not just objects but colour itself.", pt: "Casca de cebola, cascas, frutinhas. Você vai criar não só objetos, mas a própria cor.", es: "Piel de cebolla, corteza, bayas. Empezarás a crear no solo objetos, sino el color." } },
        ],
        next: "try",
      },
      fromDraw: {
        text: {
          ru: "Рисование отлично переносится на другие материалы. Подумай, где линия может стать объёмной или фактурной:",
          en: "Drawing transfers well to other materials. Think where a line could become dimensional or textured:",
          pt: "O desenho se transfere bem para outros materiais. Pense onde uma linha pode ganhar volume ou textura:",
          es: "El dibujo se traslada bien a otros materiales. Piensa dónde una línea puede volverse volumen o textura:",
        },
        ideas: [
          { title: { ru: "Контурная вышивка", en: "Outline embroidery", pt: "Bordado de contorno", es: "Bordado de contorno" }, text: { ru: "Твои скетчи нитью — шов «назад иголка» осваивается за вечер.", en: "Your sketches in thread — backstitch is learned in an evening.", pt: "Seus esboços em linha — o ponto atrás se aprende numa noite.", es: "Tus bocetos con hilo: el pespunte se aprende en una tarde." } },
          { title: { ru: "Сграффито по глине", en: "Sgraffito on clay", pt: "Sgraffito na argila", es: "Esgrafiado en arcilla" }, text: { ru: "Рисунок процарапывается по ангобу — графика, которую можно пить из чашки.", en: "The drawing is scratched through slip — graphics you can drink from.", pt: "O desenho é riscado no engobe — gráfico em que se pode beber.", es: "El dibujo se raya sobre engobe: gráfica de la que se puede beber." } },
          { title: { ru: "Линогравюра", en: "Linocut", pt: "Linogravura", es: "Linograbado" }, text: { ru: "Один рисунок — много оттисков: открытки, обложки, принты на ткани.", en: "One drawing, many prints: cards, covers, fabric prints.", pt: "Um desenho, muitas impressões: cartões, capas, estampas em tecido.", es: "Un dibujo, muchas copias: tarjetas, portadas, estampados." } },
        ],
        next: "try",
      },
      try: {
        text: {
          ru: "Выбери одну технику и задай себе маленькую цель на 1–2 часа: не «освоить», а «попробовать». В разделе «Обучение» есть бесплатные инструкции и мастер-классы — посмотри, есть ли что-то рядом с тобой. Что выбираешь?",
          en: "Pick one technique and give yourself a small 1–2 hour goal: not 'master it', just 'try it'. The Learning section has free tutorials and workshops — see if anything is near you. What do you choose?",
          pt: "Escolha uma técnica e um objetivo pequeno de 1–2 horas: não 'dominar', só 'experimentar'. A seção Aprender tem tutoriais gratuitos e oficinas — veja se há algo perto de você. O que escolhe?",
          es: "Elige una técnica y una meta pequeña de 1–2 horas: no 'dominarla', solo 'probarla'. En Aprender hay tutoriales gratis y talleres; mira si hay algo cerca. ¿Qué eliges?",
        },
        next: "end",
      },
      end: {
        text: {
          ru: "Отличный выбор. Сохрани идею, чтобы не потерять, а после первой попытки — покажи её в ленте с пометкой «эксперимент». Неудачи там тоже ценятся.",
          en: "Great choice. Save the idea so you don't lose it, and after your first attempt, show it in the feed tagged 'experiment'. Failures are valued there too.",
          pt: "Ótima escolha. Salve a ideia para não perder e, depois da primeira tentativa, mostre no feed como 'experimento'. Lá os erros também são valorizados.",
          es: "Buena elección. Guarda la idea para no perderla y, tras el primer intento, muéstralo en el feed como 'experimento'. Allí los fallos también se valoran.",
        },
      },
    },
  },
  block: {
    start: {
      ru: "Творческий кризис — нормальная часть процесса. Давай без спешки разберёмся, что именно застряло. Это скорее «не знаю, что делать дальше», «не нравится, что получается» или «нет сил и желания»?",
      en: "A creative block is a normal part of the process. Let's calmly figure out what exactly is stuck. Is it more 'I don't know what to do next', 'I don't like what I'm making', or 'no energy or desire'?",
      pt: "Bloqueio criativo é parte normal do processo. Vamos entender com calma o que travou. É mais 'não sei o que fazer depois', 'não gosto do que está saindo' ou 'sem energia nem vontade'?",
      es: "El bloqueo creativo es parte normal del proceso. Veamos con calma qué se ha atascado. ¿Es más 'no sé qué hacer después', 'no me gusta lo que sale' o 'sin energía ni ganas'?",
    },
    nodes: {
      root: {
        text: { ru: "", en: "", pt: "", es: "" },
        options: [
          { label: { ru: "Не знаю, что делать дальше", en: "I don't know what to do next", pt: "Não sei o que fazer depois", es: "No sé qué hacer después" }, next: "next" },
          { label: { ru: "Не нравится, что получается", en: "I don't like the results", pt: "Não gosto do resultado", es: "No me gusta el resultado" }, next: "dislike" },
          { label: { ru: "Нет сил", en: "No energy", pt: "Sem energia", es: "Sin energía" }, next: "tired" },
        ],
        next: "next",
      },
      next: {
        text: {
          ru: "Расскажи, на каком этапе проект сейчас и какое решение ты откладываешь. Часто «не знаю, что дальше» — это два хороших варианта, между которыми страшно выбрать. Какие это варианты?",
          en: "Tell me what stage the project is at and which decision you keep postponing. Often 'I don't know what's next' is two good options that feel scary to choose between. What are they?",
          pt: "Conte em que etapa está o projeto e que decisão você vem adiando. Muitas vezes 'não sei o que fazer' são duas boas opções entre as quais dá medo escolher. Quais são?",
          es: "Cuéntame en qué etapa está el proyecto y qué decisión estás aplazando. A menudo 'no sé qué sigue' son dos buenas opciones entre las que da miedo elegir. ¿Cuáles son?",
        },
        next: "approaches",
      },
      dislike: {
        text: {
          ru: "Что именно не нравится — можешь назвать одну конкретную вещь? Цвет, пропорции, аккуратность? Иногда помогает посмотреть на работу через неделю или сфотографировать её в чёрно-белом.",
          en: "What exactly don't you like — can you name one concrete thing? Colour, proportions, neatness? Sometimes it helps to look at the work after a week, or photograph it in black and white.",
          pt: "O que exatamente não agrada — consegue nomear uma coisa concreta? Cor, proporção, acabamento? Às vezes ajuda olhar a peça depois de uma semana ou fotografá-la em preto e branco.",
          es: "¿Qué no te gusta exactamente? ¿Puedes nombrar una cosa concreta? ¿Color, proporciones, limpieza? A veces ayuda mirarlo tras una semana o fotografiarlo en blanco y negro.",
        },
        next: "approaches",
      },
      tired: {
        text: {
          ru: "Тогда, может, сейчас не время «доделывать». Как насчёт маленькой игры без результата: 15 минут, один материал, никаких планов? Или посмотреть ленту в незнакомой категории — просто ради удивления.",
          en: "Then maybe it's not the time to 'finish'. How about a small game with no outcome: 15 minutes, one material, no plans? Or browse the feed in an unfamiliar category — just to be surprised.",
          pt: "Então talvez não seja hora de 'terminar'. Que tal um joguinho sem resultado: 15 minutos, um material, sem planos? Ou olhar o feed numa categoria desconhecida — só para se surpreender.",
          es: "Quizá no es momento de 'terminar'. ¿Qué tal un juego sin resultado: 15 minutos, un material, sin planes? O mira el feed en una categoría desconocida, solo para sorprenderte.",
        },
        next: "approaches",
      },
      approaches: {
        text: {
          ru: "Спасибо, это многое проясняет. Вот несколько подходов — не решений, а способов сдвинуться с места. Попробуй тот, который кажется самым лёгким.",
          en: "Thanks, that clarifies a lot. Here are a few approaches — not solutions, just ways to get moving. Try the one that feels easiest.",
          pt: "Obrigado, isso esclarece muito. Aqui vão algumas abordagens — não soluções, apenas jeitos de sair do lugar. Tente a que parecer mais fácil.",
          es: "Gracias, eso aclara mucho. Aquí van algunos enfoques: no soluciones, solo maneras de moverte. Prueba el que parezca más fácil.",
        },
        ideas: [
          { title: { ru: "Три маленькие версии", en: "Three tiny versions", pt: "Três versões pequenas", es: "Tres versiones pequeñas" }, text: { ru: "Сделай три быстрых эскиза-миниатюры разных вариантов. Выбор станет очевиднее на столе, чем в голове.", en: "Make three quick miniature sketches of different options. The choice gets clearer on the table than in your head.", pt: "Faça três miniaturas rápidas de opções diferentes. A escolha fica mais clara na mesa do que na cabeça.", es: "Haz tres miniaturas rápidas de opciones distintas. La elección se aclara más en la mesa que en la cabeza." } },
          { title: { ru: "Спросить сообщество", en: "Ask the community", pt: "Perguntar à comunidade", es: "Preguntar a la comunidad" }, text: { ru: "Опубликуй работу с пометкой «процесс» и одним конкретным вопросом.", en: "Post the work as 'process' with one concrete question.", pt: "Publique como 'processo' com uma pergunta concreta.", es: "Publícalo como 'proceso' con una pregunta concreta." } },
          { title: { ru: "Ограничение", en: "A constraint", pt: "Uma restrição", es: "Una restricción" }, text: { ru: "Убери одну возможность: только два цвета, только один инструмент. Рамки иногда освобождают.", en: "Remove one option: only two colours, only one tool. Limits can be freeing.", pt: "Tire uma possibilidade: só duas cores, só uma ferramenta. Limites às vezes libertam.", es: "Quita una opción: solo dos colores, una herramienta. Los límites a veces liberan." } },
        ],
        next: "end",
      },
      end: {
        text: {
          ru: "Решение за тобой — я лишь подбрасываю мячи. Вернись сюда, когда попробуешь, и расскажи, что изменилось.",
          en: "The decision is yours — I'm just serving balls back. Come back once you've tried and tell me what changed.",
          pt: "A decisão é sua — eu só devolvo a bola. Volte quando tiver tentado e conte o que mudou.",
          es: "La decisión es tuya: yo solo devuelvo la pelota. Vuelve cuando lo hayas probado y cuéntame qué cambió.",
        },
      },
    },
  },
  plan: {
    start: {
      ru: "Спланируем следующий проект. Сначала — что это за проект и к какому сроку хочется его закончить? Даже примерно.",
      en: "Let's plan your next project. First — what is it, and roughly when would you like to finish it?",
      pt: "Vamos planejar seu próximo projeto. Primeiro — o que é e mais ou menos quando quer terminar?",
      es: "Planifiquemos tu próximo proyecto. Primero: ¿qué es y más o menos cuándo quieres terminarlo?",
    },
    nodes: {
      root: { text: { ru: "", en: "", pt: "", es: "" }, next: "time" },
      time: {
        text: {
          ru: "Понял(а). Сколько времени в неделю ты реально можешь выделять — честно, без героизма? И есть ли материалы, которые нужно заказать заранее?",
          en: "Got it. How much time per week can you realistically spend — honestly, no heroics? And are there materials you need to order in advance?",
          pt: "Entendi. Quanto tempo por semana você realmente pode dedicar — honestamente, sem heroísmo? E há materiais que precisa encomendar antes?",
          es: "Entendido. ¿Cuánto tiempo a la semana puedes dedicar de verdad, sin heroísmos? ¿Y hay materiales que debas pedir con antelación?",
        },
        next: "steps",
      },
      steps: {
        text: {
          ru: "Тогда предлагаю такой каркас — подправь под себя:\n\n1. Исследование и эскизы (1 неделя)\n2. Пробный образец (1 неделя)\n3. Основная работа (2–3 недели)\n4. Отделка, фото, публикация\n\nКакой шаг вызывает больше всего сомнений? С него и начнём детализацию.",
          en: "Then here's a skeleton — adjust it:\n\n1. Research and sketches (1 week)\n2. Test sample (1 week)\n3. Main work (2–3 weeks)\n4. Finishing, photos, posting\n\nWhich step makes you most unsure? We'll detail that one first.",
          pt: "Então aqui vai um esqueleto — ajuste:\n\n1. Pesquisa e esboços (1 semana)\n2. Amostra de teste (1 semana)\n3. Trabalho principal (2–3 semanas)\n4. Acabamento, fotos, publicação\n\nQual etapa gera mais dúvidas? Começamos por ela.",
          es: "Entonces aquí va un esqueleto, ajústalo:\n\n1. Investigación y bocetos (1 semana)\n2. Muestra de prueba (1 semana)\n3. Trabajo principal (2–3 semanas)\n4. Acabado, fotos, publicación\n\n¿Qué paso te genera más dudas? Empezamos por ese.",
        },
        next: "end",
      },
      end: {
        text: {
          ru: "Хорошо. Сохрани план как проект — он появится в профиле во вкладке «Проекты». А если проект можно продавать или учить ему других, загляни в «Кабинет автора».",
          en: "Good. Save the plan as a project — it'll appear in your profile under 'Projects'. And if it could be sold or taught, take a look at the Author dashboard.",
          pt: "Ótimo. Salve o plano como projeto — ele aparecerá no seu perfil em 'Projetos'. E se der para vender ou ensinar, dê uma olhada no Painel do autor.",
          es: "Bien. Guarda el plan como proyecto: aparecerá en tu perfil en 'Proyectos'. Y si se puede vender o enseñar, echa un vistazo al Panel de autor.",
        },
      },
    },
  },
  post: {
    start: {
      ru: "Давай обсудим эту публикацию и детали изготовления. Что хочется понять: технику, материалы, последовательность шагов или как адаптировать это под себя?",
      en: "Let's discuss this post and how it was made. What do you want to understand: the technique, materials, sequence of steps, or how to adapt it for yourself?",
      pt: "Vamos discutir esta publicação e como foi feita. O que você quer entender: a técnica, os materiais, a sequência de passos ou como adaptar para você?",
      es: "Hablemos de esta publicación y de cómo se hizo. ¿Qué quieres entender: la técnica, los materiales, la secuencia de pasos o cómo adaptarlo para ti?",
    },
    nodes: {
      root: {
        text: { ru: "", en: "", pt: "", es: "" },
        options: [
          { label: { ru: "Как повторить, но по-своему", en: "How to redo it my own way", pt: "Como refazer do meu jeito", es: "Cómo rehacerlo a mi manera" }, next: "adapt" },
          { label: { ru: "Какие нужны материалы", en: "What materials I need", pt: "Que materiais preciso", es: "Qué materiales necesito" }, next: "materials" },
        ],
        next: "adapt",
      },
      adapt: {
        text: {
          ru: "Копировать чужую работу — хороший способ учиться, но интереснее найти своё отличие. Что в этой работе зацепило тебя сильнее всего — и что бы ты изменил(а)? Ответ подскажет, в какую сторону развить идею. Если остались вопросы к автору — их стоит задать в комментариях: он знает детали, которых не знаю я.",
          en: "Copying is a good way to learn, but it's more interesting to find your own difference. What in this piece hooked you most — and what would you change? That answer shows where to take the idea. If you have questions for the author, ask in the comments: they know details I don't.",
          pt: "Copiar é um bom jeito de aprender, mas é mais interessante achar sua diferença. O que nesta peça mais te pegou — e o que você mudaria? Essa resposta mostra para onde levar a ideia. Se tiver perguntas para o autor, pergunte nos comentários: ele sabe detalhes que eu não sei.",
          es: "Copiar es una buena forma de aprender, pero es más interesante encontrar tu diferencia. ¿Qué te enganchó más de esta pieza y qué cambiarías? Esa respuesta muestra hacia dónde llevar la idea. Si tienes preguntas para el autor, hazlas en los comentarios: conoce detalles que yo no.",
        },
        next: "end",
      },
      materials: {
        text: {
          ru: "По описанию можно восстановить основное, но точные марки и пропорции лучше уточнить у автора в комментариях. Давай составим список того, что у тебя уже есть, — и найдём, чем можно заменить недостающее. Что есть под рукой?",
          en: "From the description we can reconstruct the basics, but exact brands and proportions are better asked from the author in the comments. Let's list what you already have — and find substitutes for what's missing. What do you have?",
          pt: "Pela descrição dá para reconstruir o básico, mas marcas e proporções exatas é melhor perguntar ao autor nos comentários. Vamos listar o que você já tem — e achar substitutos para o que falta. O que tem à mão?",
          es: "Por la descripción se puede reconstruir lo básico, pero marcas y proporciones exactas mejor preguntarlas al autor en los comentarios. Hagamos una lista de lo que ya tienes y busquemos sustitutos para lo que falta. ¿Qué tienes?",
        },
        next: "end",
      },
      end: {
        text: {
          ru: "Если хочешь, сохрани идею и попробуй свою версию — а потом поделись ей и отметь, чем вдохновлялся(ась). Авторам это очень приятно.",
          en: "If you like, save the idea and try your own version — then share it and mention what inspired you. Authors love that.",
          pt: "Se quiser, salve a ideia e tente sua versão — depois compartilhe e cite o que te inspirou. Os autores adoram.",
          es: "Si quieres, guarda la idea y prueba tu versión; luego compártela y menciona qué te inspiró. A los autores les encanta.",
        },
      },
    },
  },
};

const k = (locale: Locale): keyof L => (locale === "pt-BR" ? "pt" : locale === "es" ? "es" : locale === "ru" ? "ru" : "en");

let seq = 0;
function render(scenario: AIScenario, nodeId: string, locale: Locale): AITurnOutput {
  const node = S[scenario].nodes[nodeId];
  const lk = k(locale);
  const ideas: IdeaCard[] | undefined = node.ideas?.map((i) => ({ id: `idea_${Date.now()}_${seq++}`, title: i.title[lk], text: i.text[lk] }));
  return {
    text: node.text[lk],
    ideas,
    options: node.options?.map((o) => ({ label: o.label[lk], next: o.next })),
    nodeId,
  };
}

export function demoStart(scenario: AIScenario, locale: Locale): AITurnOutput {
  const lk = k(locale);
  const root = S[scenario].nodes.root;
  return { text: S[scenario].start[lk], options: root.options?.map((o) => ({ label: o.label[lk], next: o.next })), nodeId: "root" };
}

export const demoProvider: AIProvider = {
  mode: "demo",
  async reply(input: AITurnInput) {
    await new Promise((r) => setTimeout(r, 650 + Math.random() * 500)); // visible "thinking" pause
    const script = S[input.scenario];
    const cur = input.nodeId ? script.nodes[input.nodeId] : script.nodes.root;
    const nextId = input.optionNext ?? cur?.next ?? "end";
    if (!script.nodes[nextId]) return render(input.scenario, "end", input.locale);
    return render(input.scenario, nextId, input.locale);
  },
};
