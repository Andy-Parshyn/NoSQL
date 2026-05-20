// Частина 3 — Аналітика через Aggregation Pipeline.
//
// Запуск:
//     mongosh "$MONGO_URI" --file queries/part3_aggregations.js

use("spotify");

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 1. Топ-10 виконавців за середньою популярністю (мін. 5 треків).
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 1. Топ-10 виконавців за середньою популярністю ===");
const topArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      tracks_count:   { $sum: 1 },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  { $match: { tracks_count: { $gte: 5 } } },
  { $sort: { avg_popularity: -1 } },
  { $limit: 10 },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      tracks_count: 1,
      avg_popularity: { $round: ["$avg_popularity", 2] }
    }
  }
]).toArray();
printjson(topArtists);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 2. Розподіл треків за настроєм (valence × energy).
//   happy : valence >= 0.5, energy >= 0.5
//   angry : valence <  0.5, energy >= 0.5
//   calm  : valence >= 0.5, energy <  0.5
//   sad   : valence <  0.5, energy <  0.5
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 2. Розподіл треків за настроєм ===");
const moodDistribution = db.tracks.aggregate([
  {
    $addFields: {
      mood: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy",  0.5] }
                ]
              },
              then: "happy"
            },
            {
              case: {
                $and: [
                  { $lt:  ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy",  0.5] }
                ]
              },
              then: "angry"
            },
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $lt:  ["$audio_features.energy",  0.5] }
                ]
              },
              then: "calm"
            }
          ],
          default: "sad"
        }
      }
    }
  },
  { $group: { _id: "$mood", count: { $sum: 1 } } },
  { $project: { _id: 0, mood: "$_id", count: 1 } },
  { $sort: { count: -1 } }
]).toArray();
printjson(moodDistribution);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 3. Найбільш «танцювальний» жанр.
//   Групуємо за жанром, рахуємо avg(danceability/energy/valence),
//   відсікаємо жанри з < 100 треків.
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 3. Найбільш танцювальні жанри ===");
const danceableGenres = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy:       { $avg: "$audio_features.energy" },
      avg_valence:      { $avg: "$audio_features.valence" },
      tracks_count:     { $sum: 1 }
    }
  },
  { $match: { tracks_count: { $gte: 100 } } },
  { $sort: { avg_danceability: -1 } },
  { $limit: 10 },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 3] },
      avg_energy:       { $round: ["$avg_energy",       3] },
      avg_valence:      { $round: ["$avg_valence",      3] },
      tracks_count: 1
    }
  }
]).toArray();
printjson(danceableGenres);
