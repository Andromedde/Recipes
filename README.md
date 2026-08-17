# Что готовить 🍳

Банк рецептов с синхронизацией через Firebase и рулеткой «что приготовить сегодня».

## Возможности

- **Рецепты** — категории: суп, горячее, салаты, десерты, завтраки, закуски
- **Добавление рецепта** — название, ингредиенты с граммовкой, инструкция, фото
- **Поиск в интернете** — готовые рецепты и фото через TheMealDB и Wikimedia (бесплатно)
- **Рулетка** — лента фото блюд с выбором категорий; выпавший рецепт реже выпадает снова (возврат к обычному шансу через 30 дней)
- **Синхронизация** — Firebase Firestore между устройствами

## Быстрый старт (локально)

```bash
npx serve .
# или
python -m http.server 8080
```

Откройте `http://localhost:8080`

Без Firebase сайт работает в **локальном режиме** (данные в `localStorage`).

## Настройка Firebase

1. Создайте проект на [Firebase Console](https://console.firebase.google.com/)
2. Включите **Firestore Database** (режим test или production)
3. Project Settings → Your apps → Web → скопируйте конфиг
4. Вставьте в `js/firebase-config.js`:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  // ...
};

export const RECIPES_COLLECTION = "recipes-bank"; // общий ID для всех устройств
```

### Правила Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /banks/{bankId} {
      allow read, write: if true;
    }
  }
}
```

> Для личного использования достаточно. Для публичного доступа настройте аутентификацию.

## Фото (бесплатно, без Firebase Storage)

Firebase Storage не используется. Три способа добавить фото:

1. **Найти в интернете** — бесплатный поиск через TheMealDB и Wikimedia Commons
2. **Вставить ссылку** — любой URL картинки (`https://...`)
3. **С устройства** — фото сжимается и сохраняется прямо в Firestore (без Storage)

Для синхронизации между устройствами лучше использовать **ссылку или поиск в интернете** — они занимают мало места. Фото с устройства автоматически сжимаются до ~100 КБ.

## Деплой на GitHub Pages

1. Создайте репозиторий на GitHub
2. Загрузите файлы проекта
3. Settings → Pages → Source: **main** branch, folder **/** (root)
4. Сайт будет доступен по адресу `https://<username>.github.io/<repo>/`

## Алгоритм рулетки

- Каждый рецепт имеет вес от 0.1 до 1.0
- После выпадения вес снижается до минимума (10% шанса)
- За 30 дней вес линейно восстанавливается до 100%

## Структура проекта

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── constants.js
│   ├── recipes-tab.js
│   ├── roulette-tab.js
│   ├── firebase-service.js
│   ├── api-service.js
│   ├── image-service.js
│   ├── firebase-config.js
│   └── firebase-config.example.js
└── README.md
```
