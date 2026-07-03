import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const textNodeSources = new WeakMap<Text, string>();

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
  'Начать примерку': 'Start fitting',
  'Смотреть каталог': 'View catalog',
  'Фото остается в браузере': 'Photo stays in browser',
  'Оптики после подбора': 'Stores after fitting',
  'Салоны после подбора': 'Stores after fitting',
  'Примерка. Score. Салон.': 'Try. Score. Store.',
  'Фото → Score → Салон': 'Photo → Score → Store',
  'ViLu примерка': 'ViLu try-on',
  'Результат посадки': 'Fit result',
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
  'База знаний ViLu': 'ViLu Knowledge Base',
  'Разбираем Face-fit score, размер оправы, PD, сильные диоптрии и ограничения онлайн-примерки простым языком.': 'We explain Face-fit score, frame size, PD, high prescriptions, and online try-on limits in plain language.',
  'Размер оправы 52-18-140': 'Frame size 52-18-140',
  'PD и выбор оправы': 'PD and frame choice',
  'Сильные диоптрии': 'High prescriptions',
  'Все модели': 'All models',
  'Витрина': 'Showcase',
  'ВИТРИНА': 'SHOWCASE',
  'Хиты, которые хочется примерить первыми': 'Popular frames to try first',
  'Линзы по подписке и личный кабинет зрения': 'Lens subscription and vision profile',
  'Кабинет зрения ViLu': 'Vision Hub',
  'Подписка помогает не вспоминать о покупке линз в последний момент: мы привозим запас вовремя, а в кабинете можно хранить рецепт и дату следующего осмотра.': 'The subscription removes last-minute lens purchases: we deliver supply on time, and the profile can store your prescription and next exam date.',
  'Напоминания': 'Reminders',
  'Осмотр, замена линз, повтор заказа.': 'Exam, lens replacement, repeat order.',
  'Салоны рядом': 'Nearby stores',
  'Выберите удобную точку для примерки.': 'Choose a convenient store for fitting.',
  'ПОДПИСКА МЕСЯЦА': 'MONTHLY SUBSCRIPTION',
  'Подписка месяца': 'Monthly subscription',
  'ОТ': 'FROM',
  'от': 'from',
  'Каталог + подбор': 'Catalog + fitting',
  'Каталог подбора': 'Fitting catalog',
  'Выберите свои 3.': 'Choose your 3.',
  'Готово к Face-fit': 'Face-fit ready',
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
  'салон': 'store',
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
  'Подписка Кабинет зрения ViLu': 'Vision Hub subscription',
  'Кабинет зрения ViLu Premium': 'Vision Hub Premium',
  'Ежемесячная доставка и напоминания': 'Monthly delivery and reminders',
  'Разовая покупка': 'One-time purchase',
  'Одна упаковка без автопродления': 'One box without auto-renewal',
  'Итого': 'Total',
  'Оформить': 'Checkout',
  'Бесплатная доставка в салон или курьером от 7 000 ₽.': 'Free delivery to store or courier delivery from 7,000 ₽.',
  'Линзы и покрытия подбираются по вашему рецепту.': 'Lenses and coatings are selected according to your prescription.',
  'Можно отложить модель и примерить в салоне.': 'You can save a model and try it in store.',
  'Возврат оправы в течение 14 дней.': 'Frame returns within 14 days.',
  'Легкая прозрачная оправа из ацетата с антибликовым покрытием и мягкой посадкой для ежедневной работы за экраном.': 'Light transparent acetate frame with anti-reflective coating and a soft fit for daily screen work.',
  'Графичная черная оправа с тонким профилем. Хорошо держит форму и подходит для сильных диоптрий.': 'A graphic black frame with a slim profile. Holds its shape well and works for higher prescriptions.',
  'Солнцезащитные очки в теплом медовом оттенке с линзами UV400 и поляризацией для яркого города и отпуска.': 'Sunglasses in a warm honey tone with UV400 polarized lenses for bright city days and vacations.',
  'Матовая стальная оправа с поляризацией, созданная для вождения и долгих прогулок без бликов.': 'Matte steel polarized frame made for driving and long glare-free walks.',
  'Однодневные контактные линзы с высокой кислородопроницаемостью и увлажнением на весь день.': 'Daily contact lenses with high oxygen permeability and all-day hydration.',
  'Месячные линзы для стабильного зрения, мягкой посадки и удобной подписки с доставкой.': 'Monthly lenses for stable vision, soft fit, and convenient delivery subscription.',
  'Store locator': 'Store locator',
  'Поиск салонов': 'Store locator',
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
  'Ваш центр управления зрением.': 'Your vision management center.',
  'Создайте demo-аккаунт, сохраните рецепт, контактные данные, график осмотров и проверьте тренажеры для глаз. Все данные сохраняются локально в браузере.': 'Create a demo account, save prescription details, contact data, exam schedule, and try eye exercises. Everything is stored locally in your browser.',
  'Открыть demo-кабинет': 'Open demo profile',
  'Создать demo-кабинет': 'Create demo profile',
  'Войти': 'Sign in',
  'Demo-режим можно открыть без реальных персональных данных. Профиль хранится только на этом устройстве.': 'Demo mode can be opened without real personal data. The profile is stored only on this device.',
  'Рецепт': 'Prescription',
  'Осмотры': 'Eye exams',
  'Напоминания и история': 'Reminders and history',
  'Тренажеры': 'Exercises',
  'Фокус, пальминг, 20-20-20': 'Focus, palming, 20-20-20',
  'Рекомендации': 'Recommendations',
  'Подбор линз и оправ': 'Lens and frame selection',
  'Кабинет зрения': 'Vision profile',
  'Данные клиента': 'Client data',
  'Demo-режим: данные анкеты и рецепта сохраняются только на этом устройстве.': 'Demo mode: profile and prescription data are stored only on this device.',
  'ФИО': 'Full name',
  'Дата рождения': 'Date of birth',
  'Последний осмотр': 'Last exam',
  'Следующий осмотр': 'Next exam',
  'Особенности и жалобы': 'Notes and complaints',
  'Упражнения для глаз': 'Eye exercises',
  'Начать': 'Start',
  'Инфографика зрения': 'Vision infographic',
  'Сводка строится из рецепта, даты осмотра и регулярности упражнений.': 'The summary is built from prescription data, exam date, and exercise regularity.',
  'Риск усталости': 'Eye strain risk',
  'Привычка тренировок': 'Exercise habit',
  'Заполненность рецепта': 'Prescription completeness',
  'По вашим покупкам': 'Based on your purchases',
  'Релевантные модели для примерки': 'Relevant models to try on',
  'Подборка строится локально и учитывает только demo-историю в этом браузере.': 'The selection is built locally and uses only demo history in this browser.',
  'Персональное предложение': 'Personal offer',
  'Скидка 15% на вторую пару': '15% off a second pair',
  'Добавьте солнцезащитные линзы к рабочей оправе и получите персональную скидку.': 'Add sun lenses to your work frame and get a personal discount.',
  'Подобрать пару': 'Choose a pair',
  'Узнать больше': 'Learn more',
  'Политика конфиденциальности': 'Privacy policy',
  'Условия': 'Terms',
  'Дисклеймер': 'Disclaimer',
  'Demo-режим: данные анкеты и рецепта сохраняются только в вашем браузере и не отправляются на сервер.': 'Demo mode: profile and prescription data are saved only in your browser and are not sent to the server.',
  'Сохранить': 'Save',
  'Сохранено локально. Данные не отправлены на сервер.': 'Saved locally. Data was not sent to the server.',
  'Контакт для уведомлений': 'Notification contact',
  'Уведомления в MVP-версии не отправляются. Блок показывает будущий сценарий сервиса.': 'MVP notifications are not sent. This block shows a future service scenario.',
  'Пилот примерки': 'Try-on pilot',
  'Проверка зрения': 'Eye Check',
  'ViLu Проверка зрения': 'ViLu Eye Check',
  'Проверка зрения ViLu': 'ViLu Eye Check',
  'Забота о зрении до визита в салон': 'Vision care before the store visit',
  'ViLu помогает подготовиться к проверке зрения и выбору очков: онлайн-примерка, предварительный Face-fit score, чеклист для визита и оптики рядом. Это справочный lifestyle-сценарий, а не диагностика и не замена консультации специалиста.': 'ViLu helps you prepare for an eye check and glasses selection: online try-on, preliminary Face-fit score, visit checklist, and nearby optical stores. This is an informational lifestyle flow, not diagnosis or a replacement for a specialist consultation.',
  'Self-check перед очной проверкой': 'Self-check before an in-person eye check',
  'Короткий сценарий без диагноза: зрительная нагрузка, детские признаки, сравнение глаз и Amsler-гайд. Ответы остаются в браузере, а результат помогает понять, стоит ли запланировать очную проверку.': 'A short no-diagnosis flow: eye strain, child signs, one-eye comparison, and an Amsler guide. Answers stay in the browser, and the result helps decide whether to schedule an in-person eye check.',
  'Не измеряет диоптрии': 'Does not measure diopters',
  'Не ставит диагноз': 'Does not diagnose',
  'Не отправляет ответы в аналитику': 'Does not send answers to analytics',
  'Пройти self-check': 'Start self-check',
  'Примерь. Оцени. Салон.': 'Fit. Score. Store.',
  'Найти салон': 'Find store',
  'Сценарий подбора': 'Pick use case',
  'Автопосадка': 'Auto-fit',
  'Автопосадка оправы': 'Frame auto-fit',
  'Автопосадка готова': 'Auto-fit ready',
  'Лицо найдено': 'Face detected',
  'Нужно другое фото': 'Use another photo',
  'На фото несколько лиц': 'Multiple faces detected',
  'Формат не поддержан': 'Unsupported format',
  'Автопосадка недоступна': 'Auto-fit unavailable',
  'Анализируем фото': 'Analyzing photo',
  'Можно подстроить': 'Ready to adjust',
  'Анализ фото': 'Photo analysis',
  'Ждем фото': 'Waiting for photo',
  'Ручной режим': 'Manual mode',
  'Фото: анализируем': 'Photo: analyzing',
  'Фото: нужна проверка': 'Photo: needs check',
  'Фото: хорошее': 'Photo: good',
  'Фото: среднее': 'Photo: medium',
  'Фото: лучше переснять': 'Photo: retake recommended',
  'анализируем': 'analyzing',
  'нужна проверка': 'needs check',
  'хорошее': 'good',
  'среднее': 'medium',
  'лучше переснять': 'retake recommended',
  'Ищем глаза и переносицу, чтобы поставить оправу ближе к реальной посадке.': 'Finding eyes and bridge to place the frame closer to a real fit.',
  'Лицо найдено. ViLu может выровнять оправу по глазам и переносице.': 'Face detected. ViLu can align the frame to the eyes and bridge.',
  'Лицо не найдено. Попробуйте фото анфас при хорошем освещении.': 'No face detected. Try a front-facing photo in good light.',
  'Найдено несколько лиц. Для примерки нужно одно лицо.': 'Multiple faces detected. Try-on needs one face.',
  'Фото не открылось в браузере. Нужен JPEG, PNG или WebP.': 'The photo could not open in the browser. Use JPEG, PNG, or WebP.',
  'Автопосадка не загрузилась, базовая ручная примерка продолжает работать.': 'Auto-fit did not load, but manual try-on still works.',
  'Загрузите фото, чтобы ViLu нашел глаза и переносицу и предложил стартовую посадку оправы.': 'Upload a photo so ViLu can find the eyes and bridge and suggest a starting frame fit.',
  'Оправа выровнена по глазам и переносице. Теперь можно оценить общий баланс и сохранить модель в подбор.': 'The frame is aligned to the eyes and bridge. Now you can check the overall balance and save the model.',
  'Посадка применена': 'Fit applied',
  'Оправа стоит по центру глаз и переносице.': 'The frame is centered on the eyes and bridge.',
  'ViLu нашел глаза, переносицу и центр лица.': 'ViLu found the eyes, bridge, and face center.',
  'Масштаб': 'Scale',
  'Проверка фото': 'Photo check',
  'Линия глаз ровная для предварительной оценки.': 'The eye line is level enough for a preliminary check.',
  'Фото немного наклонено, посадку лучше перепроверить.': 'The photo is slightly tilted, so check the fit again.',
  'Ищем ориентиры': 'Finding landmarks',
  'Определяем глаза, переносицу и центр лица.': 'Detecting eyes, bridge, and face center.',
  'Готовим посадку': 'Preparing fit',
  'После анализа предложим стартовую позицию оправы.': 'After analysis, we will suggest a starting frame position.',
  'Контроль вручную': 'Manual control',
  'Ручная подстройка остается доступной.': 'Manual adjustment remains available.',
  'Фото анфас': 'Front-facing photo',
  'Смотрите прямо в камеру.': 'Look straight at the camera.',
  'Уровень глаз': 'Eye level',
  'Держите телефон на уровне глаз.': 'Keep the phone at eye level.',
  'Дистанция': 'Distance',
  'Лицо занимает 40-60% кадра.': 'Face fills 40-60% of the frame.',
  'Нужна проверка': 'Needs check',
  'Автопосадка не смогла уверенно оценить фото.': 'Auto-fit could not confidently evaluate the photo.',
  'Без блокировки': 'No blocking',
  'Ручная примерка продолжает работать.': 'Manual try-on still works.',
  'Что попробовать': 'What to try',
  'Загрузите JPEG, PNG или WebP при хорошем свете.': 'Upload JPEG, PNG, or WebP in good light.',
  'Face-fit score': 'Face-fit score',
  'Смотрим посадку после автоподстройки': 'Checking fit after auto-adjustment',
  'Предварительная оценка модели': 'Preliminary model score',
  'Ограничение': 'Limitation',
  'Это не медицинская проверка. Размер, PD, мост и комфорт подтверждаются в салоне.': 'This is not a medical check. Size, PD, bridge fit, and comfort are confirmed in store.',
  'Подстроить еще раз': 'Adjust again',
  'Подстроить автоматически': 'Auto-adjust',
  'Скрыть ориентиры': 'Hide landmarks',
  'Показать ориентиры': 'Show landmarks',
  'Ориентиры скрыты по умолчанию. Они нужны только для проверки, куда ViLu поставил оправу.': 'Landmarks are hidden by default. They are only for checking where ViLu placed the frame.',
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
  'Влево / вправо': 'Left / right',
  'Выше / ниже': 'Up / down',
  'Помощник выбора перед визитом': 'Pre-visit selection assistant',
  'Оценка помогает выбрать оправы для салона. Финальную посадку проверяет консультант.': 'The score helps choose frames for the store visit. Final fit is checked by a consultant.',
  'Оценка помогает выбрать оправы для салона. Если автопосадка готова, учитываем центр глаз, переносицу и качество фото.': 'The score helps choose frames for the store visit. If auto-fit is ready, we account for eye center, bridge, and photo quality.',
  'Автопосадка учтена в предварительной проверке': 'Auto-fit is included in the preliminary check',
  'Что дала автопосадка:': 'What auto-fit added:',
  'центр оправы поставлен по глазам, стартовый масштаб': 'frame center was aligned to the eyes, starting scale',
  'центр оправы можно поставить по глазам, стартовый масштаб': 'frame center can be aligned to the eyes, starting scale',
  'качество фото': 'photo quality',
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
  'Москва': 'Moscow',
  'Санкт-Петербург': 'Saint Petersburg',
  'Екатеринбург': 'Yekaterinburg',
  'Новосибирск': 'Novosibirsk',
  'Казань': 'Kazan',
  'Нижний Новгород': 'Nizhny Novgorod',
  'Краснодар': 'Krasnodar',
  'Ростов-на-Дону': 'Rostov-on-Don',
  'Самара': 'Samara',
  'Уфа': 'Ufa',
  'Челябинск': 'Chelyabinsk',
  'Пермь': 'Perm',
  'Воронеж': 'Voronezh',
  'Амурск': 'Amursk',
  'Ангарск': 'Angarsk',
  'Белогорск': 'Belogorsk',
  'Биробиджан': 'Birobidzhan',
  'Благовещенск': 'Blagoveshchensk',
  'Большой Камень': 'Bolshoy Kamen',
  'Владивосток': 'Vladivostok',
  'Иркутск': 'Irkutsk',
  'Канск': 'Kansk',
  'Комсомольск-на-Амуре': 'Komsomolsk-on-Amur',
  'Краснокаменск': 'Krasnokamensk',
  'Магадан': 'Magadan',
  'Находка': 'Nakhodka',
  'Нерюнгри': 'Neryungri',
  'Свободный': 'Svobodny',
  'Тайшет': 'Tayshet',
  'Трудовое': 'Trudovoye',
  'Улан-Удэ': 'Ulan-Ude',
  'Усолье-Сибирское': 'Usolye-Sibirskoye',
  'Уссурийск': 'Ussuriysk',
  'Усть-Кут': 'Ust-Kut',
  'Хабаровск': 'Khabarovsk',
  'Чита': 'Chita',
  'Якутск': 'Yakutsk',
  'Городская оптика': 'City Optics',
  'Оптика Профи': 'Optics Pro',
  'Оптика на Ленина': 'Optics on Lenina',
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
  'Самостоятельный подбор': 'Self-service selection',
  'нет': 'none',
  'из': 'of',
  'км': 'km',
  'Найдено:': 'Found:',
  '152-ФЗ о персональных данных': 'Russian Personal Data Law 152-FZ',
  'Прозрачный кристалл': 'Transparent crystal',
  'Графитовый черный': 'Graphite black',
  'Медовый': 'Honey',
  'Матовая сталь': 'Matte steel',
  'Пыльная роза': 'Dusty rose',
  'Темная черепаха': 'Dark tortoise',
  'ацетат': 'acetate',
  'титан': 'titanium',
  'металл': 'metal',
  'Москва, Тверская ул., 18': 'Moscow, Tverskaya St., 18',
  'Москва, Земляной Вал, 33, ТЦ Атриум': 'Moscow, Zemlyanoy Val, 33, Atrium mall',
  'Москва, Кутузовский пр-т, 30': 'Moscow, Kutuzovsky Ave., 30',
  'Москва, ул. Ленинская Слобода, 19': 'Moscow, Leninskaya Sloboda St., 19',
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
  [/^(\d+) дн\.$/, (match) => `${match[1]} days`],
  [/^(\d+) сек\.$/, (match) => `${match[1]} sec.`],
  [/^Вариант (\d+)$/, (match) => `Option ${match[1]}`],
  [/^Оправа (\d+)$/, (match) => `Frame ${match[1]}`],
  [/^Стартовая ширина оправы: (\d+)%\.$/, (match) => `Starting frame width: ${match[1]}%.`],
  [/^Глаза найдены, межзрачковая линия наклонена примерно на (.+) градуса\.$/, (match) => `Eyes detected, the eye line is tilted by about ${match[1]} degrees.`],
  [/^Рекомендуемый стартовый масштаб оправы: (\d+)%\.$/, (match) => `Recommended starting frame scale: ${match[1]}%.`],
  [/^центр оправы (поставлен|можно поставить) по глазам, стартовый масштаб (\d+)%, качество фото (.+)\.$/, (match) => {
    const fitVerb = match[1] === 'поставлен' ? 'was aligned' : 'can be aligned';
    return `frame center ${fitVerb} to the eyes, starting scale ${match[2]}%, photo quality ${translateValue(match[3])}.`;
  }],
  [/^Сегодня открыто до (.+)$/, (match) => `Open today until ${match[1]}`],
  [/^(.+) км from (.+)$/, (match) => `${match[1]} km from ${match[2]}`],
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
    const storedSource = textNodeSources.get(node);
    const original = storedSource && !(language === 'en' && hasCyrillic(currentText) && currentText !== storedSource)
      ? storedSource
      : currentText;
    textNodeSources.set(node, original);
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

  document.querySelectorAll<HTMLElement>('[aria-label]').forEach((element) => {
    if (element.closest('[data-no-translate="true"]')) return;
    const original = element.dataset.i18nAriaLabelSource ?? element.getAttribute('aria-label') ?? '';
    element.dataset.i18nAriaLabelSource = original;
    const nextLabel = language === 'en' ? translateValue(original) : original;
    if (element.getAttribute('aria-label') !== nextLabel) element.setAttribute('aria-label', nextLabel);
  });
}

function updateDefaultPageMeta(language: 'en' | 'ru') {
  const knowledgeJsonLd = document.getElementById('vilu-json-ld');
  if (knowledgeJsonLd) return;

  const title = language === 'en'
    ? 'ViLu - online frame selection and Face-fit score'
    : 'ViLu - онлайн-подбор оправ и Face-fit score';
  const description = language === 'en'
    ? 'ViLu is an online glasses try-on, Face-fit score, and knowledge base for choosing frames by face, size, PD, and use case.'
    : 'ViLu - онлайн-примерка очков, Face-fit score и knowledge base по выбору оправы по лицу, размеру, PD и сценарию носки.';

  document.title = title;
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDescription) metaDescription.content = description;
}

export function LanguageDomBridge() {
  const { language } = useLanguage();

  useEffect(() => {
    updateDefaultPageMeta(language);
    translateDom(document.body, language);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        updateDefaultPageMeta(language);
        translateDom(document.body, language);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
