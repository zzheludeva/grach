import type { Dict } from "../types";

/** Iteration 5: tutorial PDF, favorites shortcuts, product description vs story. */
const ru: Dict = {
  pdf: {
    download: "Скачать PDF", busy: "Собираем PDF…", done: "PDF готов — ищи в загрузках", error: "PDF не собрался. Попробуем ещё раз?",
    afterPurchase: "PDF целиком будет доступен после покупки", author: "Автор: {name}", gallery: "Фото", links: "Видео и ссылки",
    page: "Стр. {n} из {total}", source: "Скачано с ГРАЧ · {date}",
  },
  favx: { post: "Сохранённые публикации", tutorial: "Избранные уроки", product: "Избранные товары", workshop: "Избранные мастер-классы" },
  sell: { form: { storyHint: "Как родилась идея, что вдохновило, как шла работа, в чём секрет. Если рассказывать нечего — оставь пустым, блок просто не покажется." } },
};

export default ru;
