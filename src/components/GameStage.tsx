import { useEffect, useState, useRef, useCallback } from 'react';
import { LANE_CONFIGS, GAME_CONSTANTS, WORD_LIST } from '../constants';
import type { Note, GameState } from '../types';
import { Lane } from './Lane';
import { Note as NoteComponent } from './Note';
import { KeyboardLayout } from './KeyboardLayout';
import { useGameLoop } from '../hooks/useGameLoop';
import { generateNotes } from '../utils/noteGenerator';
import { playHitSound, initAudio } from '../utils/audio';

const { JUDGEMENT_LINE_Y, HIT_WINDOW } = GAME_CONSTANTS;

const WORD_COUNT = 10;

// ランダムにWORD_COUNT個の単語を選んで曲データを作る
function buildSong() {
    const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5);
    const words = shuffled.slice(0, WORD_COUNT);
    // ローマ字をスペース区切りで連結（noteGeneratorがスペースをビート休符にする）
    const romajiText = words.map(w => w.romaji).join(' ');
    const displayWords = words.map(w => w.display);
    return { romajiText, displayWords };
}

export const GameStage = () => {
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        startTime: 0,
        currentTime: 0,
        score: 0,
        combo: 0,
        maxCombo: 0,
    });

    const [notes, setNotes] = useState<Note[]>([]);
    const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());
    const [feedback, setFeedback] = useState<{ text: string, color: string } | null>(null);
    const [displayWords, setDisplayWords] = useState<string[]>([]);
    const [romajiText, setRomajiText] = useState('');

    const notesRef = useRef<Note[]>([]);
    const gameStateRef = useRef(gameState);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const showFeedback = useCallback((text: string, color: string) => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        setFeedback({ text, color });
        feedbackTimerRef.current = setTimeout(() => setFeedback(null), 600);
    }, []);

    const startGame = () => {
        initAudio();
        const { romajiText: rt, displayWords: dw } = buildSong();
        const initialNotes = generateNotes(rt, 40, 4000, GAME_CONSTANTS.SPAWN_PRE_TIME);
        setRomajiText(rt);
        setDisplayWords(dw);
        setNotes(initialNotes);
        setGameState({
            isPlaying: true,
            startTime: performance.now(),
            currentTime: 0,
            score: 0,
            combo: 0,
            maxCombo: 0,
        });
        setFeedback(null);
    };

    const gameLoopCallback = useCallback((_deltaTime: number) => {
        const gs = gameStateRef.current;
        if (!gs.isPlaying) return;

        const currentMs = performance.now() - gs.startTime;

        setGameState(prev => ({
            ...prev,
            currentTime: currentMs,
        }));

        const currentNotes = notesRef.current;
        const hasMissed = currentNotes.some(
            note => !note.hit && !note.missed && currentMs > note.targetTime + HIT_WINDOW.MISS
        );

        if (hasMissed) {
            const updatedNotes = currentNotes.map(note => {
                if (!note.hit && !note.missed && currentMs > note.targetTime + HIT_WINDOW.MISS) {
                    return { ...note, missed: true };
                }
                return note;
            });
            notesRef.current = updatedNotes;
            setNotes(updatedNotes);
            showFeedback('MISS', 'text-red-500');
            playHitSound('miss');
            setGameState(prev => ({ ...prev, combo: 0 }));
        }
    }, [showFeedback]);

    useGameLoop(gameLoopCallback, gameState.isPlaying);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!gameStateRef.current.isPlaying) {
                if (e.code === 'Space') startGame();
                return;
            }

            const key = e.key.toLowerCase();

            const laneConfig = LANE_CONFIGS.find(cfg => cfg.keys.includes(key));
            if (!laneConfig) return;

            const laneId = laneConfig.id;
            setActiveLanes(prev => new Set(prev).add(laneId));

            const currentMs = performance.now() - gameStateRef.current.startTime;

            const candidates = notesRef.current.filter(n =>
                !n.hit && !n.missed &&
                n.lane === laneId &&
                n.char === key &&
                Math.abs(currentMs - n.targetTime) <= HIT_WINDOW.MISS
            );

            if (candidates.length > 0) {
                const target = candidates.reduce((prev, curr) =>
                    Math.abs(currentMs - prev.targetTime) < Math.abs(currentMs - curr.targetTime) ? prev : curr
                );

                const diff = Math.abs(currentMs - target.targetTime);
                let judgement: string;
                let scoreAdd: number;

                if (diff <= HIT_WINDOW.PERFECT) {
                    judgement = 'PERFECT';
                    scoreAdd = 100;
                } else if (diff <= HIT_WINDOW.GOOD) {
                    judgement = 'GOOD';
                    scoreAdd = 50;
                } else {
                    judgement = 'OK';
                    scoreAdd = 10;
                }

                const newNotes = notesRef.current.map(n => n.id === target.id ? { ...n, hit: true } : n);
                notesRef.current = newNotes;
                setNotes(newNotes);

                playHitSound('perfect');
                showFeedback(judgement, judgement === 'PERFECT' ? 'text-yellow-400' : 'text-blue-400');

                setGameState(prev => ({
                    ...prev,
                    score: prev.score + scoreAdd,
                    combo: prev.combo + 1,
                    maxCombo: Math.max(prev.maxCombo, prev.combo + 1)
                }));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const laneConfig = LANE_CONFIGS.find(cfg => cfg.keys.includes(key));
            if (laneConfig) {
                setActiveLanes(prev => {
                    const next = new Set(prev);
                    next.delete(laneConfig.id);
                    return next;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // 処理済みノーツ数（スペースはノーツを生成しないので純粋な文字数）
    const hitCount = notes.filter(n => n.hit || n.missed).length;

    // 各単語のノーツ開始インデックス（スペース抜き累積）
    const wordRomajiList = romajiText ? romajiText.split(' ') : [];
    let noteOffset = 0;
    const wordStates = wordRomajiList.map((word) => {
        const len = word.length;
        const start = noteOffset;
        noteOffset += len; // スペースはノーツなしなので足さない
        const wordHitCount = Math.max(0, Math.min(hitCount - start, len));
        const isDone = wordHitCount >= len;
        const isCurrent = !isDone && hitCount >= start;
        return { isDone, isCurrent, wordHitCount, len };
    });

    return (
        <div className="w-full h-screen bg-slate-900 flex flex-col items-center relative overflow-hidden">

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 text-white z-50">
                <div className="text-xl font-bold">SCORE: {gameState.score}</div>
                <div className="text-xl font-bold">COMBO: {gameState.combo}</div>
            </div>

            {!gameState.isPlaying && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white z-50 text-center">
                    <h1 className="text-4xl font-bold mb-4">Rhythm Typer</h1>
                    <p className="animate-pulse">Press SPACE to Start</p>
                </div>
            )}

            {/* Hit Feedback */}
            {feedback && (
                <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black ${feedback.color} z-50 drop-shadow-lg pointer-events-none`}>
                    {feedback.text}
                </div>
            )}

            {/* Text Progress Display */}
            {gameState.isPlaying && (
                <div className="w-full bg-slate-800/50 py-4 border-b border-white/10 flex flex-col items-center gap-1">
                    {/* 日本語表示 */}
                    <div className="flex gap-4">
                        {displayWords.map((word, wi) => {
                            const ws = wordStates[wi];
                            return (
                                <span
                                    key={wi}
                                    className={`text-2xl font-bold transition-colors ${
                                        ws?.isDone ? 'text-white/25' :
                                        ws?.isCurrent ? 'text-cyan-300' :
                                        'text-white/70'
                                    }`}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </div>
                    {/* ローマ字表示 */}
                    <div className="flex gap-4">
                        {romajiText.split(' ').map((word, wi) => {
                            const ws = wordStates[wi];
                            return (
                                <div key={wi} className="font-mono text-sm tracking-wider flex">
                                    {word.split('').map((char, ci) => {
                                        const charDone = ws ? ci < ws.wordHitCount : false;
                                        const charCurrent = ws?.isCurrent && ci === ws.wordHitCount;
                                        return (
                                            <span
                                                key={ci}
                                                className={`${
                                                    charDone ? 'text-white/25' :
                                                    charCurrent ? 'text-cyan-400 border-b border-cyan-400' :
                                                    ws?.isCurrent ? 'text-white/60' :
                                                    ws?.isDone ? 'text-white/20' :
                                                    'text-white/40'
                                                }`}
                                            >
                                                {char}
                                            </span>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stage Container */}
            <div className="relative w-full max-w-5xl h-full flex flex-col border-x border-slate-700 shadow-2xl bg-black/20">

                <div className="relative flex-1 flex">
                    {/* Lanes */}
                    {LANE_CONFIGS.map(config => (
                        <Lane
                            key={config.id}
                            config={config}
                            isActive={activeLanes.has(config.id)}
                        />
                    ))}

                    {/* Judgement Line */}
                    <div
                        className="absolute w-full h-1 bg-cyan-400 shadow-[0_0_10px_cyan] pointer-events-none"
                        style={{ top: `${JUDGEMENT_LINE_Y}%` }}
                    ></div>

                    {/* Notes */}
                    {notes.map(note => {
                        if (note.hit || note.missed) return null;

                        const timeProgress = (gameState.currentTime - note.spawnTime) / (note.targetTime - note.spawnTime);
                        const topPercent = timeProgress * JUDGEMENT_LINE_Y;

                        if (timeProgress < 0 || timeProgress > 1.2) return null;

                        const laneConfig = LANE_CONFIGS.find(l => l.id === note.lane);
                        return (
                            <NoteComponent
                                key={note.id}
                                note={note}
                                y={topPercent}
                                colorName={laneConfig?.color || 'red'}
                                laneIndex={note.lane - 1}
                            />
                        );
                    })}
                </div>

                {/* Keyboard Layout */}
                <div className="p-4 bg-slate-900 border-t border-white/10">
                    <KeyboardLayout
                        activeLanes={activeLanes}
                        highlightKey={notes.find(n => !n.hit && !n.missed)?.char}
                    />
                </div>
            </div>
        </div>
    );
};
