// Частина 4 — Індекси та оптимізація.
//
// Запуск:
//     mongosh "$MONGO_URI" --file queries/part4_indexes.js
//
// Скрипт ідемпотентний: createIndex по тому самому ключу безпечно повторюється.

use("spotify");

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 1. Аналіз ресурсоємного запиту та підбір індексу.
//   Цільовий запит:
//     track_genre == "pop"  AND  audio_features.danceability >= 0.7
//     SORT BY popularity DESC
// ─────────────────────────────────────────────────────────────────────────────

print("\n=== Завдання 1. EXPLAIN ДО створення індексу ===");

// Спочатку прибираємо існуючий індекс, щоб «до» було чесним COLLSCAN
// (інакше повторні запуски будуть показувати IXSCAN з минулого разу).
db.tracks.dropIndexes();

const explainBefore = db.tracks
  .find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
  })
  .sort({ popularity: -1 })
  .explain("executionStats");
printjson(explainBefore);

// Створюємо складений індекс за правилом ESR (Equality → Sort → Range):
//   track_genre        — рівність,
//   popularity         — сортування (DESC),
//   audio_features.danceability — діапазон.
print("\n=== Створюємо індекс idx_genre_pop_dance ===");
const idxName = db.tracks.createIndex(
  {
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1
  },
  { name: "idx_genre_pop_dance" }
);
print(`Створено індекс: ${idxName}`);

print("\n=== Завдання 1. EXPLAIN ПІСЛЯ створення індексу ===");
const explainAfter = db.tracks
  .find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 }
  })
  .sort({ popularity: -1 })
  .explain("executionStats");
printjson(explainAfter);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 2. Складений індекс для пошуку музики для роботи.
//   Поля фільтра: instrumentalness, speechiness, explicit.
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 2. Створюємо індекс idx_work_tracks ===");
const idxWork = db.tracks.createIndex(
  {
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1,
    explicit: 1
  },
  { name: "idx_work_tracks" }
);
print(`Створено індекс: ${idxWork}`);

print("\n=== Завдання 2. EXPLAIN з усіма трьома фільтрами ===");
const explainWork = db.tracks
  .find({
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness":      { $lt: 0.1 },
    explicit: false
  })
  .explain("executionStats");
printjson(explainWork);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 3. Чи є запит покривним (covered query)?
//   Індекс із завдання 1: { track_genre: 1, popularity: -1, danceability: 1 }.
//   Запит:
//     db.tracks.find({ track_genre: "pop", popularity: { $gte: 70 } })
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 3. EXPLAIN: find() без проєкції (НЕ покривний) ===");
const explainNotCovered = db.tracks
  .find({ track_genre: "pop", popularity: { $gte: 70 } })
  .explain("executionStats");
printjson(explainNotCovered);

print("\n=== Завдання 3. EXPLAIN: та сама вибірка з проєкцією (покривний) ===");
const explainCovered = db.tracks
  .find(
    { track_genre: "pop", popularity: { $gte: 70 } },
    { _id: 0, track_genre: 1, popularity: 1 }
  )
  .explain("executionStats");
printjson(explainCovered);

// Підсумок індексів, що зараз існують
print("\n=== Поточні індекси на tracks ===");
printjson(db.tracks.getIndexes());
