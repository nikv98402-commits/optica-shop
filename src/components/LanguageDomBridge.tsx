import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const textTranslations: Record<string, string> = {
  'Онлайн-примерка': 'Online try-on',
  'Каталог': 'Catalog',
  'О бренде': 'About',
  'Салоны': 'Stores',
  'Примерка': 'Try-on',
  'Наши салоны': 'Our stores',
  'Личный кабинет': 'Profile',
  'Выйти': 'Sign out',
  'Онлайн-подбор и оптики рядом': 'Online fitting and nearby optical stores',
  'Подберите очки онлайн и найдите, где примерить похожие рядом.': 'Choose glasses online and find where to try similar frames nearby.',
  'Подберите очки онлайн и найдите, где примерить похожие рядом': 'Choose glasses online and find where to try similar frames nearby',
  'Загрузите фото, выберите 2-3 подходящих стиля и получите список ближайших оптик для финальной примерки.': 'Upload a photo, choose 2-3 suitable styles, and get nearby optical stores for the final fitting.',
  'Начать подбор': 'Start fitting',
  'Смотреть каталог': 'View catalog',
  'Фото остается в браузере': 'Photo stays in browser',
  'Оптики после подбора': 'Stores after fitting',
  'Подбор перед салоном': 'Fitting before store visit',
  'локально': 'local only',
  'Офис / каждый день': 'Office / everyday',
  'Подходит для первого визита. Проверьте мост и ширину в салоне.': 'Good for the first visit. Check bridge fit and width in store.',
  'Сохранено': 'Saved',
  'Фото': 'Photo',
  'Салон': 'Store',
  'Найти салон после подбора': 'Find a store after fitting',
  'Проверка зрения в салонах': 'Eye checks in stores',
  'Подбор линз по рецепту': 'Prescription lens selection',
  'Доставка и самовывоз': 'Delivery and pickup',
  'Методология подбора оправ, которую можно процитировать': 'A frame-fitting methodology that can be cited',
  'Каталог + подбор': 'Catalog + fitting',
  'Выберите оправы, проверьте посадку и идите в салон с коротким списком.': 'Choose frames, check the fit, and visit a store with a short list.',
  'Каталог работает как лаборатория подбора: сохраните 2-3 модели, получите ориентир по стилю и откройте ближайшие оптики для финальной примерки.': 'The catalog works like a fitting lab: save 2-3 models, get style guidance, and open nearby optical stores for the final try-on.',
  'В примерке': 'In fitting',
  'в браузере': 'in browser',
  'предварительно': 'preliminary',
  'после подбора': 'after fitting',
  'Лаборатория': 'Lab',
  'Категория': 'Category',
  'Все': 'All',
  'Оправы': 'Frames',
  'Солнцезащитные': 'Sunglasses',
  'Линзы': 'Lenses',
  'Бренд': 'Brand',
  'Все бренды': 'All brands',
  'Партнерские': 'Partner brands',
  'Только для примерки': 'Try-on only',
  'Без контактных линз': 'No contact lenses',
  'Сбросить': 'Reset',
  'Контактные линзы': 'Contact lenses',
  'Солнцезащитные очки': 'Sunglasses',
  'Оправа': 'Frame',
  'до салона': 'to store',
  'Подробнее': 'Details',
  'Примерить': 'Try on',
  'Подписка': 'Subscription',
  'Назад в каталог': 'Back to catalog',
  'Модель не найдена': 'Model not found',
  'Вернуться в каталог': 'Back to catalog',
  'Наличие': 'Stock',
  'Гарантия': 'Warranty',
  '12 мес.': '12 mo.',
  'Да': 'Yes',
  'Нет': 'No',
  'Подписка Vision Hub': 'Vision Hub subscription',
  'Ежемесячная доставка и напоминания': 'Monthly delivery and reminders',
  'Разовая покупка': 'One-time purchase',
  'Одна упаковка без автопродления': 'One box without auto-renewal',
  'Итого': 'Total',
  'Оформить': 'Checkout',
  'Бесплатная доставка в салон или курьером от 7 000 ₽.': 'Free delivery to store or courier delivery from 7,000 ₽.',
  'Линзы и покрытия подбираются по вашему рецепту.': 'Lenses and coatings are selected according to your prescription.',
  'Можно отложить модель и примерить в салоне.': 'You can save a model and try it in store.',
  'Возврат оправы в течение 14 дней.': 'Frame returns within 14 days.',
  'Store locator': 'Store locator',
  'Телефон уточняется': 'Phone to be confirmed',
  'Открыто': 'Open',
  'Уточнить': 'Check first',
  'По этому запросу салон не найден.': 'No store found for this query.',
  'Закрыть': 'Close',
  'Виртуальная примерка': 'Virtual try-on',
  'Затемнение линз показано в демо-режиме, посадка адаптируется под форму лица.': 'Lens tint is shown in demo mode, and fit adapts to face shape.',
  'Демо-посадка помогает оценить ширину оправы и форму линз онлайн.': 'Demo fit helps estimate frame width and lens shape online.',
  'Форма лица': 'Face shape',
  'Овал': 'Oval',
  'Круг': 'Round',
  'Углы': 'Angular',
  'Размер': 'Size',
  'В реальной интеграции сюда подключается камера или загрузка фото, а сейчас показан безопасный demo-режим примерки.': 'A real integration would connect camera or photo upload here; for now this is a safe demo try-on mode.',
  'Оформление заказа': 'Checkout',
  'Имя': 'Name',
  'Телефон': 'Phone',
  'Получение': 'Delivery method',
  'Самовывоз': 'Pickup',
  'Примерка и настройка в салоне': 'Fitting and adjustment in store',
  'Курьер': 'Courier',
  'Доставка по городу за 1-2 дня': 'City delivery in 1-2 days',
  'Это demo-оформление: платежная интеграция не подключена, но сценарий заказа уже показывает будущую логику магазина.': 'This is demo checkout: payments are not connected, but the order flow shows the future shop logic.',
  'Ваш заказ': 'Your order',
  'Оправа + базовые линзы': 'Frame + basic lenses',
  'Товар': 'Item',
  'Доставка': 'Delivery',
  'Создаем заказ...': 'Creating order...',
  'Подтвердить': 'Confirm',
  'После подтверждения менеджер ViLu свяжется для уточнения рецепта и времени примерки.': 'After confirmation, a ViLu manager will contact you to clarify the prescription and fitting time.',
  'Анкета и рецепт': 'Profile and prescription',
  'Demo-режим: данные анкеты и рецепта сохраняются только в вашем браузере и не отправляются на сервер.': 'Demo mode: profile and prescription data are saved only in your browser and are not sent to the server.',
  'Сохранить': 'Save',
  'Сохранено локально. Данные не отправлены на сервер.': 'Saved locally. Data was not sent to the server.',
  'Контакт для уведомлений': 'Notification contact',
  'Уведомления в MVP-версии не отправляются. Блок показывает будущий сценарий сервиса.': 'MVP notifications are not sent. This block shows a future service scenario.',
  'Try-on pilot': 'Try-on pilot',
  'Подбор пока пуст.': 'Selection is empty for now.',
  'Примерил': 'Tried on',
  'Оценил посадку': 'Checked fit',
  'Сохранил 2-3 оправы': 'Saved 2-3 frames',
  'Открыл маршрут или контакт': 'Opened route or contact',
  'Список оптик появляется после персонального подбора, чтобы пользователь шел в салон уже с коротким чеклистом.': 'The store list appears after personal fitting, so the user visits a store with a short checklist.',
  'Цель подбора': 'Fitting goal',
  'Выберите сценарий': 'Choose a use case',
  'Для офиса': 'For office',
  'На каждый день': 'Everyday',
  'Для компьютера': 'For computer',
  'Выразительная оправа': 'Statement frame',
  'Минимализм': 'Minimalism',
  'Выберите оправу': 'Choose a frame',
  'Загрузить фото': 'Upload photo',
  'Фото используется только в вашем браузере для примерки и не отправляется на сервер.': 'Your photo is used only in your browser for try-on and is not sent to the server.',
  'Фото для примерки': 'Try-on photo',
  'Загрузите фото лица': 'Upload a face photo',
  'После загрузки можно подвинуть оправу и оценить посадку.': 'After upload, you can move the frame and check the fit.',
  'Масштаб': 'Scale',
  'Влево / вправо': 'Left / right',
  'Выше / ниже': 'Up / down',
  'Помощник выбора перед визитом': 'Pre-visit selection assistant',
  'Оценка помогает выбрать оправы для салона. Финальную посадку проверяет консультант.': 'The score helps choose frames for the store visit. Final fit is checked by a consultant.',
  'Оценить посадку': 'Check fit',
  'Скор': 'Score',
  'из 100': 'out of 100',
  'Что проверить в салоне:': 'What to check in store:',
  'Сохранить в подбор': 'Save to selection',
  'Каталог пилота': 'Pilot catalog',
  'Примерьте 6 оправ и выберите до 3': 'Try 6 frames and choose up to 3',
  'Убрать': 'Remove',
  'Выбрать': 'Select',
  'Мой подбор': 'My selection',
  'Чеклист для визита': 'Visit checklist',
  'Сохраните 2-3 варианта, а затем выберите ближайшую оптику для финальной примерки.': 'Save 2-3 options, then choose a nearby optical store for the final fitting.',
  'Пока нет сохраненных оправ. Нажмите “Сохранить в подбор” после Face-fit score или выберите оправу в каталоге.': 'No saved frames yet. Press “Save to selection” after Face-fit score or select a frame in the catalog.',
  'Найти оптику рядом': 'Find nearby optical stores',
  'Подготовить подбор к визиту': 'Prepare selection for visit',
  'Контакт передается только после согласия. Фото, рецепт и точное местоположение не отправляются.': 'Contact is shared only after consent. Photo, prescription, and exact location are not sent.',
  'Готовность к визиту': 'Visit readiness',
  'Сохраняем только локальные действия: маршрут, звонок, мессенджер или копирование подбора. Фото, рецепт и точное местоположение не сохраняются.': 'Only local intent actions are saved: route, call, messenger, or copied selection. Photo, prescription, and exact location are not stored.',
  'Вернуться в магазин': 'Back to shop',
  'Ближайшие оптики': 'Nearby optical stores',
  'Показываем рядом после подбора': 'Showing nearby after fitting',
  'Чтобы показать ближайшие оптики, разрешите доступ к геолокации. Мы используем координаты только для сортировки оптик рядом и не сохраняем точное местоположение.': 'Allow geolocation to show nearby optical stores. We use coordinates only to sort nearby stores and do not save exact location.',
  'Показать рядом': 'Show nearby',
  'Партнер ViLu': 'ViLu partner',
  'Открытые источники': 'Open sources',
  'Перед визитом уточните наличие похожих моделей.': 'Before visiting, check availability of similar models.',
  'Маршрут': 'Route',
  'Позвонить': 'Call',
  'Скопировано': 'Copied',
  'Подбор': 'Selection',
  'Подбор к визиту': 'Visit selection',
  'Можно просто скопировать чеклист без контакта или подготовить заявку с удобным способом связи. Фото, рецепт и точные координаты не отправляются.': 'You can copy the checklist without contact details or prepare a request with a preferred contact method. Photo, prescription, and exact coordinates are not sent.',
  'Закрыть форму': 'Close form',
  'Согласен передать контакт и выбранные оправы для подготовки визита. Я понимаю, что фото, рецепт и параметры зрения не отправляются.': 'I agree to share my contact and selected frames to prepare the visit. I understand that photo, prescription, and vision parameters are not sent.',
  'Город': 'City',
  'Способ связи': 'Contact method',
  'Контакт': 'Contact',
  'Комментарий': 'Comment',
  'Политика': 'Privacy policy',
  'Открыть заявку': 'Open request',
  'Скопировать заявку': 'Copy request',
  'Скопировать без контакта': 'Copy without contact',
  'Подходит для первого визита': 'Good for the first visit',
  'Хорошо для первого отбора': 'Good for first shortlist',
  'Стоит сравнить размер в салоне': 'Compare the size in store',
  'Ширина оправы выглядит сбалансированной.': 'Frame width looks balanced.',
  'Глаза близко к центру линз.': 'Eyes are close to the lens centers.',
  'Стиль подходит для прогулок, вождения и яркого повседневного образа.': 'The style suits walks, driving, and expressive everyday wear.',
  'Стиль подходит для офиса и повседневной носки.': 'The style suits office and everyday wear.',
  'посадку на переносице;': 'bridge fit;',
  'комфорт дужек после 5-10 минут примерки.': 'temple comfort after 5-10 minutes of fitting.',
  'размер M, если L окажется широковат.': 'size M if L feels too wide.',
  'Геолокация недоступна в этом браузере. Выберите город вручную.': 'Geolocation is unavailable in this browser. Choose a city manually.',
  'Запрашиваем разрешение браузера...': 'Requesting browser permission...',
  'Показываем оптики рядом. Точные координаты не сохраняются.': 'Showing nearby optical stores. Exact coordinates are not saved.',
  'Не получилось получить геолокацию. Можно выбрать город вручную.': 'Could not get geolocation. You can choose a city manually.',
  'Сохраните минимум 2 оправы, чтобы подготовить подбор к визиту.': 'Save at least 2 frames to prepare a visit selection.',
  'Укажите контакт и подтвердите согласие, чтобы подготовить заявку к визиту.': 'Enter contact details and confirm consent to prepare a visit request.',
  'Форма для визита открыта. Фото и рецепт не передаются.': 'Visit form opened. Photo and prescription are not sent.',
  'Подбор скопирован. Данные не отправлены на сервер.': 'Selection copied. Data was not sent to the server.',
  'Подбор скопирован без контакта. Вы можете показать его консультанту в салоне.': 'Selection copied without contact. You can show it to a consultant in store.',
  'прогулки / вождение': 'walks / driving',
  'минимализм / офис': 'minimalism / office',
  'офис / каждый день': 'office / everyday',
  'ваше местоположение': 'your location',
  'центра Москвы': 'Moscow center',
  'нет': 'none',
};

const placeholderTranslations: Record<string, string> = {
  'Введите город или адрес': 'Enter a city or address',
  'Анна': 'Anna',
  '@username или +7 900 000-00-00': '@username or +7 900 000-00-00',
  'Например: хочу примерить похожие прозрачные оправы в выходные': 'Example: I want to try similar transparent frames on the weekend',
};

const textPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^(\d+) салонов в справочнике$/, (match) => `${match[1]} stores in directory`],
  [/^Найдено: (\d+)$/, (match) => `Found: ${match[1]}`],
  [/^(\d+) шт\.$/, (match) => `${match[1]} pcs.`],
  [/^(\d+) из (\d+)$/, (match) => `${match[1]} of ${match[2]}`],
  [/^Вариант (\d+)$/, (match) => `Option ${match[1]}`],
  [/^Оправа (\d+)$/, (match) => `Frame ${match[1]}`],
  [/^(.+) от (.+) - (.+)$/, (match) => `${match[1]} from ${match[2]} - ${match[3]}`],
  [/^Показываем оптики для города: (.+)\.$/, (match) => `Showing optical stores for: ${match[1]}.`],
  [/^(.+) от (ваше местоположение|центра Москвы)$/, (match) => `${match[1]} from ${translateValue(match[2])}`],
];

function hasCyrillic(value: string) {
  return /[А-Яа-яЁё]/.test(value);
}

function translateValue(value: string) {
  const trimmed = value.trim();
  const direct = textTranslations[trimmed];
  if (direct) return value.replace(trimmed, direct);

  for (const [pattern, replacer] of textPatterns) {
    const match = trimmed.match(pattern);
    if (match) return value.replace(trimmed, replacer(match));
  }

  return value;
}

function translateDom(root: ParentNode, language: 'en' | 'ru') {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-translate="true"]')) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  textNodes.forEach((node) => {
    const element = node.parentElement;
    if (!element) return;
    const currentText = node.textContent ?? '';
    const storedSource = element.dataset.i18nSource;
    const original = storedSource && !(language === 'en' && hasCyrillic(currentText) && currentText !== storedSource)
      ? storedSource
      : currentText;
    element.dataset.i18nSource = original;
    const nextText = language === 'en' ? translateValue(original) : original;
    if (node.textContent !== nextText) node.textContent = nextText;
  });

  document.querySelectorAll<HTMLElement>('[placeholder]').forEach((element) => {
    if (element.closest('[data-no-translate="true"]')) return;
    const original = element.dataset.i18nPlaceholderSource ?? element.getAttribute('placeholder') ?? '';
    element.dataset.i18nPlaceholderSource = original;
    const nextPlaceholder = language === 'en' ? placeholderTranslations[original] ?? original : original;
    if (element.getAttribute('placeholder') !== nextPlaceholder) element.setAttribute('placeholder', nextPlaceholder);
  });

  document.querySelectorAll<HTMLElement>('[title]').forEach((element) => {
    if (element.closest('[data-no-translate="true"]')) return;
    const original = element.dataset.i18nTitleSource ?? element.getAttribute('title') ?? '';
    element.dataset.i18nTitleSource = original;
    const nextTitle = language === 'en' ? translateValue(original) : original;
    if (element.getAttribute('title') !== nextTitle) element.setAttribute('title', nextTitle);
  });
}

export function LanguageDomBridge() {
  const { language } = useLanguage();

  useEffect(() => {
    translateDom(document.body, language);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => translateDom(document.body, language));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title'],
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
