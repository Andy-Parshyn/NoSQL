// Частина 2 — Запити до колекції tracks.
//
// Запуск:
//     mongosh "$MONGO_URI" --file queries/part2_queries.js

use("spotify");

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 1. Треки для вечірки:
//   danceability > 0.7, energy > 0.7, тривалість 3–5 хв (180000–300000 мс).
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 1. Треки для вечірки ===");
const partyTracks = db.tracks
  .find(
    {
      "audio_features.danceability": { $gt: 0.7 },
      "audio_features.energy":       { $gt: 0.7 },
      duration_ms: { $gte: 180000, $lte: 300000 }
    },
    {
      _id: 0,
      track_name: 1,
      artists: 1,
      popularity: 1,
      duration_sec: 1,
      "audio_features.danceability": 1,
      "audio_features.energy": 1
    }
  )
  .sort({ popularity: -1 })
  .limit(20)
  .toArray();
printjson(partyTracks);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 2. Артисти, у яких УСІ треки популярні:
//   мін. 3 треки, мінімальна популярність треків >= 60.
//   Топ-20 за середньою популярністю.
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 2. Артисти зі стабільно популярними треками ===");
const topConsistentArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      tracks_count:   { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      tracks_count:   { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      tracks_count: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  { $sort: { avg_popularity: -1 } },
  { $limit: 20 }
]).toArray();
printjson(topConsistentArtists);

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 3. Нетипові треки за tempo в межах жанру:
//   tempo > avg(жанру) + 2 * stdDevPop(жанру).
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 3. Нетипові треки за tempo ===");
const tempoOutliers = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo:    { $avg:       "$audio_features.tempo" },
      stddev_tempo: { $stdDevPop: "$audio_features.tempo" },
      tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: { tempo: "$audio_features.tempo" }
        }
      }
    }
  },
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$stddev_tempo"] }]
      }
    }
  },
  {
    $addFields: {
      outlier_tracks: {
        $filter: {
          input: "$tracks",
          as: "t",
          cond: { $gt: ["$$t.audio_features.tempo", "$outlier_threshold"] }
        }
      }
    }
  },
  { $match: { "outlier_tracks.0": { $exists: true } } },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo:         { $round: ["$avg_tempo", 1] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: 1
    }
  },
  { $sort: { genre: 1 } }
]).toArray();
// Друкуємо тільки перші 3 жанри в повному вигляді, інакше вивід надто великий
print(`Жанрів із нетиповими треками: ${tempoOutliers.length}`);
printjson(tempoOutliers.slice(0, 3));

// ─────────────────────────────────────────────────────────────────────────────
// Завдання 4. Треки для фонової роботи:
//   loudness < -10, speechiness < 0.1, instrumentalness > 0.5, !explicit.
// ─────────────────────────────────────────────────────────────────────────────
print("\n=== Завдання 4. Треки для фонової роботи ===");
const workTracks = db.tracks
  .find(
    {
      "audio_features.loudness":         { $lt: -10 },
      "audio_features.speechiness":      { $lt: 0.1 },
      "audio_features.instrumentalness": { $gt: 0.5 },
      explicit: false
    },
    {
      _id: 0,
      track_name: 1,
      artists: 1,
      track_genre: 1,
      duration_sec: 1,
      "audio_features.loudness": 1,
      "audio_features.speechiness": 1,
      "audio_features.instrumentalness": 1
    }
  )
  .sort({ popularity: -1 })
  .limit(20)
  .toArray();
printjson(workTracks);
