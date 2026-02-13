import { useEffect, useState, useRef, useCallback } from 'react';
import { LANE_CONFIGS, GAME_CONSTANTS, WORD_LIST } from '../constants';
import type { Note, GameState, SkinEquip, ResultData } from '../types';
import { calcRank, calcCoins } from '../utils/rank';
import { Lane } from './Lane';
import { Note as NoteComponent } from './Note';
import { KeyboardLayout } from './KeyboardLayout';
import { useGameLoop } from '../hooks/useGameLoop';
import { generateNotes } from '../utils/noteGenerator';
import { playHitSound, initAudio } from '../utils/audio';

const { JUDGEMENT_LINE_Y, HIT_WINDOW } = GAME_CONSTANTS;
const WORD_COUNT = 10;

function buildSong() {
    const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5);
    const words = shuffled.slice(0, WORD_COUNT);
    const romajiText = words.map(w => w.romaji).join(' ');
    const displayWords = words.map(w => w.display);
    return { romajiText, displayWords };
}

interface GameStageProps {
    skin: SkinEquip;
    onGameEnd: (result: ResultData) => void;
}

export const GameStage = ({ skin, onGameEnd }: GameStageProps) => {
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

    const [hasBomb, setHasBomb] = useState(true);

    // 判定カウント
    const judgeCountRef = useRef({ perfect: 0, good: 0, ok: 0, miss: 0 });
    const notesRef = useRef<Note[]>([]);
    const gameStateRef = useRef(gameState);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const gameEndedRef = useRef(false);

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

    // 全ノーツ終了チェック
    const checkGameEnd = useCallback((currentNotes: Note[], currentScore: number, currentMaxCombo: number) => {
        if (gameEndedRef.current) return;
        const allDone = currentNotes.length > 0 && currentNotes.every(n => n.hit || n.missed);
        if (!allDone) return;

        gameEndedRef.current = true;
        const maxScore = currentNotes.length * 100;
        const { perfect, good, ok, miss } = judgeCountRef.current;
        const rank = calcRank(currentScore, maxScore);
        const coinsEarned = calcCoins(rank);

        // 少し待ってからリザルトへ
        setTimeout(() => {
            onGameEnd({ score: currentScore, maxScore, perfect, good, ok, miss, maxCombo: currentMaxCombo, rank, coinsEarned });
        }, 800);
    }, [onGameEnd]);

    const startGame = () => {
        initAudio();
        judgeCountRef.current = { perfect: 0, good: 0, ok: 0, miss: 0 };
        gameEndedRef.current = false;
        setHasBomb(true);
        const { romajiText: rt, displayWords: dw } = buildSong();
        const initialNotes = generateNotes(rt, 80, 4000, GAME_CONSTANTS.SPAWN_PRE_TIME);
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
        setGameState(prev => ({ ...prev, currentTime: currentMs }));

        const currentNotes = notesRef.current;
        const hasMissed = currentNotes.some(
            note => !note.hit && !note.missed && currentMs > note.targetTime + HIT_WINDOW.MISS
        );

        if (hasMissed) {
            const updatedNotes = currentNotes.map(note => {
                if (!note.hit && !note.missed && currentMs > note.targetTime + HIT_WINDOW.MISS) {
                    judgeCountRef.current.miss++;
                    return { ...note, missed: true };
                }
                return note;
            });
            notesRef.current = updatedNotes;
            setNotes(updatedNotes);
            showFeedback('MISS', 'text-red-500');
            playHitSound('miss');
            setGameState(prev => {
                checkGameEnd(updatedNotes, prev.score, prev.maxCombo);
                return { ...prev, combo: 0 };
            });
        }
    }, [showFeedback, checkGameEnd]);

    useGameLoop(gameLoopCallback, gameState.isPlaying);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!gameStateRef.current.isPlaying) {
                if (e.code === 'Space') startGame();
                return;
            }

            // Bomb Trigger
            if (e.code === 'Space') {
                setHasBomb(prev => {
                    if (prev) {
                        const currentNotes = notesRef.current;
                        const activeNotes = currentNotes.filter(n => !n.hit && !n.missed);
                        const hitCount = activeNotes.length;

                        if (hitCount > 0) {
                            const newNotes = currentNotes.map(n =>
                                (!n.hit && !n.missed) ? { ...n, hit: true } : n
                            );
                            notesRef.current = newNotes;
                            setNotes(newNotes);
                            playHitSound('perfect');
                            showFeedback('FULL BURST', 'text-yellow-300');

                            judgeCountRef.current.perfect += hitCount;

                            setGameState(state => {
                                const scoreAdd = hitCount * 100;
                                const newScore = state.score + scoreAdd;
                                const newCombo = state.combo + hitCount;
                                const newMaxCombo = Math.max(state.maxCombo, newCombo);
                                checkGameEnd(newNotes, newScore, newMaxCombo);
                                return { ...state, score: newScore, combo: newCombo, maxCombo: newMaxCombo };
                            });
                        }
                        return false;
                    }
                    return prev;
                });
                return;
            }

            const key = e.key.toLowerCase();
            const laneConfig = LANE_CONFIGS.find(cfg => cfg.keys.includes(key));
            if (!laneConfig) return;

            setActiveLanes(prev => new Set(prev).add(laneConfig.id));

            const currentMs = performance.now() - gameStateRef.current.startTime;
            const candidates = notesRef.current.filter(n => {
                if (n.hit || n.missed) return false;
                if (n.lane !== laneConfig.id) return false;
                if (n.char !== key) return false;
                // Free-Timing Mode: Allow hitting any visible note
                // if (Math.abs(currentMs - n.targetTime) > HIT_WINDOW.MISS) return false;
                if (currentMs < n.spawnTime) return false; // Not yet visible
                if (currentMs > n.targetTime + HIT_WINDOW.MISS) return false; // Already passed

                // Sequential Check
                if (n.wordId !== undefined && n.wordIndex !== undefined) {
                    const wordNotes = notesRef.current.filter(wn =>
                        wn.wordId === n.wordId && !wn.hit && !wn.missed
                    );
                    if (wordNotes.length === 0) return true;
                    // Strict strict sequence: must be the smallest index available
                    const minIndex = Math.min(...wordNotes.map(wn => wn.wordIndex!));
                    return n.wordIndex === minIndex;
                }
                return true;
            });

            if (candidates.length > 0) {
                // Target the closest one (or just the first one since sequence matters more)
                const target = candidates.reduce((prev, curr) =>
                    Math.abs(currentMs - prev.targetTime) < Math.abs(currentMs - curr.targetTime) ? prev : curr
                );

                // Always PERFECT in Free-Timing Mode
                const judgement = 'PERFECT';
                const scoreAdd = 100;
                judgeCountRef.current.perfect++;

                const newNotes = notesRef.current.map(n => n.id === target.id ? { ...n, hit: true } : n);
                notesRef.current = newNotes;
                setNotes(newNotes);
                playHitSound('perfect');
                showFeedback(judgement, judgement === 'PERFECT' ? 'text-yellow-400' : 'text-blue-400');

                setGameState(prev => {
                    const newScore = prev.score + scoreAdd;
                    const newCombo = prev.combo + 1;
                    const newMaxCombo = Math.max(prev.maxCombo, newCombo);
                    checkGameEnd(newNotes, newScore, newMaxCombo);
                    return { ...prev, score: newScore, combo: newCombo, maxCombo: newMaxCombo };
                });
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

    const hitCount = notes.filter(n => n.hit || n.missed).length;
    const wordRomajiList = romajiText ? romajiText.split(' ') : [];
    let noteOffset = 0;
    const wordStates = wordRomajiList.map((word) => {
        const len = word.length;
        const start = noteOffset;
        noteOffset += len;
        const wordHitCount = Math.max(0, Math.min(hitCount - start, len));
        const isDone = wordHitCount >= len;
        const isCurrent = !isDone && hitCount >= start;
        return { isDone, isCurrent, wordHitCount, len };
    });

    // スキン: フィードバック文字スタイル
    const feedbackClass = (() => {
        switch (skin.feedbackStyle) {
            case 'retro': return 'font-mono text-4xl border-2 border-white px-3 py-1';
            case 'minimal': return 'text-3xl font-light opacity-70';
            default: return 'text-5xl font-black drop-shadow-lg font-mono tracking-widest';
        }
    })();

    // スキン: 背景エフェクト
    const bgClass = skin.bgEffect === 'particles'
        ? 'bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-950'
        : 'bg-slate-900';

    return (
        <div className={`w-full h-screen ${bgClass} flex flex-col items-center relative overflow-hidden`}>

            {/* パーティクル背景 */}
            {skin.bgEffect === 'particles' && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                            style={{
                                left: `${(i * 37 + 13) % 100}%`,
                                top: `${(i * 53 + 7) % 100}%`,
                                animationDelay: `${(i * 0.3) % 3}s`,
                                animationDuration: `${2 + (i % 3)}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 text-white z-50">
                <div className="text-xl font-bold font-mono">SCORE: {gameState.score.toString().padStart(6, '0')}</div>
                <div className="text-xl font-bold font-mono">COMBO: {gameState.combo}</div>
            </div>

            {/* Bomb Indicator */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <div className={`text-sm font-bold ${hasBomb ? 'text-white' : 'text-gray-500'}`}>BOMB [SPACE]</div>
                <div className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-colors ${hasBomb
                    ? 'bg-red-600 border-red-400 shadow-[0_0_10px_red] animate-pulse'
                    : 'bg-gray-800 border-gray-600'
                    }`}>
                    <div className={`w-4 h-4 rounded-full ${hasBomb ? 'bg-white' : 'bg-gray-600'}`} />
                </div>
            </div>

            {!gameState.isPlaying && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white z-50 text-center">
                    <h1 className="text-6xl font-black mb-4 tracking-tighter text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">TYPE INVADER</h1>
                    <p className="animate-pulse font-mono text-xl">PRESS SPACE TO START</p>
                </div>
            )}

            {/* Hit Feedback */}
            {feedback && (
                <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 ${feedback.color} z-50 pointer-events-none ${feedbackClass}`}>
                    {feedback.text}
                </div>
            )}

            {/* Text Progress Display */}
            {gameState.isPlaying && (
                <div className="w-full bg-slate-800/50 py-4 border-b border-white/10 flex flex-col items-center gap-1 z-10">
                    <div className="flex gap-4 flex-wrap justify-center">
                        {displayWords.map((word, wi) => {
                            const ws = wordStates[wi];
                            return (
                                <span key={wi} className={`text-2xl font-bold transition-colors ${ws?.isDone ? 'text-white/25' : ws?.isCurrent ? 'text-cyan-300' : 'text-white/70'
                                    }`}>{word}</span>
                            );
                        })}
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {romajiText.split(' ').map((word, wi) => {
                            const ws = wordStates[wi];
                            return (
                                <div key={wi} className="font-mono text-sm tracking-wider flex">
                                    {word.split('').map((char, ci) => {
                                        const charDone = ws ? ci < ws.wordHitCount : false;
                                        const charCurrent = ws?.isCurrent && ci === ws.wordHitCount;
                                        return (
                                            <span key={ci} className={`${charDone ? 'text-white/25' :
                                                charCurrent ? 'text-cyan-400 border-b border-cyan-400' :
                                                    ws?.isCurrent ? 'text-white/60' :
                                                        ws?.isDone ? 'text-white/20' : 'text-white/40'
                                                }`}>{char}</span>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stage Container */}
            <div className="relative w-full max-w-5xl h-full flex flex-col border-x border-slate-700 shadow-2xl bg-black/20 z-10">
                <div className="relative flex-1 flex">
                    {LANE_CONFIGS.map(config => (
                        <Lane key={config.id} config={config} isActive={activeLanes.has(config.id)} />
                    ))}
                    <div
                        className="absolute w-full h-1 bg-cyan-400 shadow-[0_0_10px_cyan] pointer-events-none"
                        style={{ top: `${JUDGEMENT_LINE_Y}%` }}
                    />
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
                                colorTheme={skin.colorTheme}
                            />
                        );
                    })}
                </div>
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
