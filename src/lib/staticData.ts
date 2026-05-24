// src/lib/staticData.ts
// Static game catalog and puzzle content — no network fetch needed.

import type { Game, PuzzleDetail } from "./api/storyApi";

export const STATIC_GAMES: Game[] = [
  {
    id: "game_celebrity_hat",
    name: "Mother's Hat",
    genre: "Horror",
    genreZh: "恐怖",
    level: 1,
    status: "available",
    shortIntro: "A dark secret behind a mother's gift",
    shortIntroZh: "母亲的礼物背后，藏着一个黑暗的秘密",
    puzzleId: "celebrity_daughter_hat",
    experience: 50,
  },
  {
    id: "game_three_brothers",
    name: "Three Brothers",
    genre: "Horror",
    genreZh: "恐怖",
    level: 1,
    status: "available",
    shortIntro: "Horror story about three brothers",
    shortIntroZh: "三兄弟之间的恐怖故事",
    puzzleId: "three_brothers",
    experience: 50,
  },
  {
    id: "game_1778255135026",
    name: "The Magician's Apprentice",
    genre: "Tragedy",
    genreZh: "悲剧",
    level: 2,
    status: "available",
    shortIntro: "A child's attempt to impress his father leads to a gruesome reality.",
    shortIntroZh: "孩子为了让父亲刮目相看，却铸成了一场残忍的悲剧。",
    puzzleId: "puzzle_1778255135026",
    experience: 100,
  },
  {
    id: "game_blind_man",
    name: "The Blind Man",
    genre: "Dark Thriller",
    genreZh: "黑暗惊悚",
    level: 3,
    status: "locked",
    shortIntro:
      "A birthday song followed by a round of applause. To anyone else, it's a celebration. To him, it's the sound of a deadly betrayal.",
    shortIntroZh:
      "生日歌响起，掌声随之而来。对旁人而言，这是欢庆；对他而言，这是背叛的回声。",
    puzzleId: "blind_man",
    experience: 200,
  },
];

// STATIC_PUZZLES is kept as an offline reference only.
// At runtime, puzzle content (including translations) is always fetched from
// the backend via storyApi.getPuzzle(puzzleId, language).
export const STATIC_PUZZLES: Record<string, PuzzleDetail> = {
  three_brothers: {
    id: "three_brothers",
    title: "Three Brothers",
    content:
      "There were three brothers, the eldest and the second were twins. The three brothers had a very good relationship and often slept together. After the eldest brother died of illness, the youngest brother killed the second brother. Why.",
    fullAnswer:
      "The third brother had a mental illness. After the eldest brother died of illness, the younger brother dismembered the second brother into two halves, sleeping on the right half of the second brother on the left side and the left half of the second brother on the right side, making it look as if the eldest brother had not died.",
    parts: [
      "mental illness",
      "dismemberment",
      "recreating the twins",
      "visual symmetry",
      "illusion of the eldest brother",
    ],
    hint: "",
  },
  celebrity_daughter_hat: {
    id: "celebrity_daughter_hat",
    title: "The Celebrity's Daughter",
    content:
      "A female celebrity has a daughter. Since childhood, she would often put a hat on her daughter. One day, she took her daughter to the hospital. After learning the truth in the hospital, her daughter committed suicide.",
    hint: "Why would a mother need a hat to fit a child perfectly before going to a hospital?",
    fullAnswer: "",
    parts: [
      "facial disfigurement",
      "measuring head growth",
      "face transplant",
      "biological donor",
      "raised as a spare part",
    ],
  },
  puzzle_1778255135026: {
    id: "puzzle_1778255135026",
    title: "The Magician's Apprentice",
    content: "",
    fullAnswer: "",
    parts: [],
    hint: "",
  },
  blind_man: {
    id: "blind_man",
    title: "The Blind Man",
    content:
      "A group of friends is celebrating a blind man's birthday. They are very close. They happily light the candles, sing the birthday song, and clap for him. After hearing the clapping, the blind man kills them all. Why?",
    fullAnswer:
      "The group had previously been stranded on a deserted island following a shipwreck. To survive the starvation, they agreed to each cut off one arm to provide food for the group. Because the man was blind, his friends conspired to keep their own arms intact while only cutting off his. During the birthday party, when he heard everyone \"clapping,\" he realized that clapping requires two hands—meaning his friends had lied to him and he was the only one who had sacrificed a limb.",
    parts: [
      "shipwreck survival",
      "cannibalism pact",
      "amputation deception",
      "clapping requires two hands",
      "betrayal discovery",
    ],
    hint: "",
  },
};
