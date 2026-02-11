import type { LaneConfig } from './types';

export const LANE_CONFIGS: LaneConfig[] = [
    { id: 1, finger: 'Left Pinky', color: 'red', keys: ['q', 'a', 'z'] },
    { id: 2, finger: 'Left Ring', color: 'orange', keys: ['w', 's', 'x'] },
    { id: 3, finger: 'Left Middle', color: 'yellow', keys: ['e', 'd', 'c'] },
    { id: 4, finger: 'Left Index', color: 'green', keys: ['r', 't', 'f', 'g', 'v', 'b'] },
    { id: 5, finger: 'Right Index', color: 'cyan', keys: ['y', 'u', 'h', 'j', 'n', 'm'] },
    { id: 6, finger: 'Right Middle', color: 'blue', keys: ['i', 'k', ','] },
    { id: 7, finger: 'Right Ring', color: 'indigo', keys: ['o', 'l', '.'] },
    { id: 8, finger: 'Right Pinky', color: 'fuchsia', keys: ['p', ';', '/'] },
];

// 日本語単語リスト（表示用の日本語とローマ字入力のペア）
export const WORD_LIST: { display: string; romaji: string }[] = [
    { display: 'そら', romaji: 'sora' },
    { display: 'くも', romaji: 'kumo' },
    { display: 'かぜ', romaji: 'kaze' },
    { display: 'うみ', romaji: 'umi' },
    { display: 'やま', romaji: 'yama' },
    { display: 'はな', romaji: 'hana' },
    { display: 'ひかり', romaji: 'hikari' },
    { display: 'つき', romaji: 'tuki' },
    { display: 'ほし', romaji: 'hosi' },
    { display: 'かわ', romaji: 'kawa' },
    { display: 'もり', romaji: 'mori' },
    { display: 'ゆき', romaji: 'yuki' },
    { display: 'あめ', romaji: 'ame' },
    { display: 'たいよう', romaji: 'taiyou' },
    { display: 'こころ', romaji: 'kokoro' },
    { display: 'ことば', romaji: 'kotoba' },
    { display: 'さくら', romaji: 'sakura' },
    { display: 'あさひ', romaji: 'asahi' },
    { display: 'なみ', romaji: 'nami' },
    { display: 'みどり', romaji: 'midori' },
];

export const GAME_CONSTANTS = {
    JUDGEMENT_LINE_Y: 80, // % from top
    NOTE_SPEED: 0.5, // px/ms
    HIT_WINDOW: {
        PERFECT: 65,  // ms (+30%)
        GOOD: 130,    // ms (+30%)
        MISS: 260,    // ms (+30%)
    },
    SPAWN_PRE_TIME: 3077, // ms (+30% speed: 4000/1.3)
};
