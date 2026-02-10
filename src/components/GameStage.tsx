import { useEffect, useState, useRef } from 'react';
import { LANE_CONFIGS, GAME_CONSTANTS } from '../constants';
import type { Note, GameState } from '../types';
import { Lane } from './Lane';
import { Note as NoteComponent } from './Note';
import { KeyboardLayout } from './KeyboardLayout';
import { useGameLoop } from '../hooks/useGameLoop';
import { generateNotes } from '../utils/noteGenerator';
import { playHitSound, initAudio } from '../utils/audio';

const { JUDGEMENT_LINE_Y, HIT_WINDOW } = GAME_CONSTANTS;

const PRACTICE_TEXT = "the quick brown fox jumps over the lazy dog";

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

    // Use Ref for notes to access latest state in event listeners/loop without re-render dependency issues
    const notesRef = useRef<Note[]>([]);
    const gameStateRef = useRef(gameState); // Keep track of latest state for input handler

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);


    // Initialize Game
    const startGame = () => {
        initAudio();
        // Lower BPM to 40 for much slower pace
        const initialNotes = generateNotes(PRACTICE_TEXT, 40, 4000, 4000);

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

    // Game Loop
    useGameLoop((_) => {
        if (!gameState.isPlaying) return;

        setGameState(prev => ({
            ...prev,
            currentTime: performance.now() - prev.startTime
        }));

        // Miss detection logic can go here (optimization: limit frequency)
        const currentMs = performance.now() - gameState.startTime;

        // Check for missed notes
        let missedUpdate = false;
        const updatedNotes = notesRef.current.map(note => {
            if (!note.hit && !note.missed && currentMs > note.targetTime + HIT_WINDOW.MISS) {
                missedUpdate = true;
                setFeedback({ text: 'MISS', color: 'text-red-500' });
                playHitSound('miss');
                // Reset combo
                setGameState(prev => ({ ...prev, combo: 0 }));
                return { ...note, missed: true };
            }
            return note;
        });

        if (missedUpdate) {
            setNotes(updatedNotes);
        }

    }, gameState.isPlaying);


    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!gameStateRef.current.isPlaying) {
                if (e.code === 'Space') startGame();
                return;
            }

            const key = e.key.toLowerCase();

            // Find which lane this key belongs to
            const laneConfig = LANE_CONFIGS.find(cfg => cfg.keys.includes(key));
            if (!laneConfig) return;

            const laneId = laneConfig.id;
            setActiveLanes(prev => new Set(prev).add(laneId));

            const currentMs = performance.now() - gameStateRef.current.startTime;

            // Find hit target:
            // 1. Same Lane
            // 2. Not hit/missed
            // 3. Within window
            // 4. Closest to judgement line (lowest absolute diff)

            // Note: We might want to check exact key match or just lane match?
            // Spec says: "Input: keydown event... corresponding to lane"
            // "Notes have 'type specific character'"
            // Ideally we check if the key matches the note's character.

            const candidates = notesRef.current.filter(n =>
                !n.hit && !n.missed &&
                n.lane === laneId &&
                // Strict key check? Or just Rhythm check?
                // Let's enforce Correct Key for typing practice!
                n.char === key &&
                Math.abs(currentMs - n.targetTime) <= HIT_WINDOW.MISS
            );

            if (candidates.length > 0) {
                // Find closest
                const target = candidates.reduce((prev, curr) =>
                    Math.abs(currentMs - prev.targetTime) < Math.abs(currentMs - curr.targetTime) ? prev : curr
                );

                const diff = Math.abs(currentMs - target.targetTime);
                let judgement = 'MISS';
                let scoreAdd = 0;

                if (diff <= HIT_WINDOW.PERFECT) {
                    judgement = 'PERFECT';
                    scoreAdd = 100;
                } else if (diff <= HIT_WINDOW.GOOD) {
                    judgement = 'GOOD';
                    scoreAdd = 50;
                } else {
                    // Inside window but > good? Treated as Good or Miss? 
                    // Logic above said <= MISS is candidate.
                    // Let's say it's OK/BAD or just GOOD with low score.
                    judgement = 'OK';
                    scoreAdd = 10;
                }

                // Process Hit
                const newNotes = notesRef.current.map(n => n.id === target.id ? { ...n, hit: true } : n);
                setNotes(newNotes);

                playHitSound('perfect');
                setFeedback({
                    text: judgement,
                    color: judgement === 'PERFECT' ? 'text-yellow-400' : 'text-blue-400'
                });

                setGameState(prev => ({
                    ...prev,
                    score: prev.score + scoreAdd,
                    combo: prev.combo + 1,
                    maxCombo: Math.max(prev.maxCombo, prev.combo + 1)
                }));

            } else {
                // Wrong key or timing -> Miss penalty?
                // For rhythm games, usually ghost tapping is allowed or specialized.
                // For typing, maybe penalize errors? 
                // MVP: Do nothing for empty taps.
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
                <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black ${feedback.color} z-50 animate-bounce transition-all drop-shadow-lg`}>
                    {feedback.text}
                </div>
            )}

            {/* Text Progress Display */}
            {gameState.isPlaying && (
                <div className="w-full bg-slate-800/50 py-6 border-b border-white/10 flex justify-center items-center">
                    <div className="text-3xl font-mono tracking-wider flex">
                        {PRACTICE_TEXT.split('').map((char, i) => {
                            // Calculate which notes are hit
                            const hitCount = notes.filter(n => n.hit || n.missed).length;
                            const isPast = i < hitCount;
                            const isCurrent = i === hitCount;

                            return (
                                <span
                                    key={i}
                                    className={`${isPast ? 'text-white/20' : isCurrent ? 'text-cyan-400 border-b-2 border-cyan-400 animate-pulse' : 'text-white'}`}
                                >
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
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

                    {/* Global Judgement Line (Visual) */}
                    <div
                        className="absolute w-full h-1 bg-cyan-400 shadow-[0_0_10px_cyan]"
                        style={{ top: `${JUDGEMENT_LINE_Y}%` }}
                    ></div>

                    {/* Notes */}
                    {notes.map(note => {
                        if (note.hit || note.missed) return null; // Don't render processed notes

                        // Calculate Y position
                        // Target Time corresponds to JUDGEMENT_LINE_Y (e.g. 80%)
                        // We need to map time to pixels/percentage.
                        // Let's say top (0%) is (TargetTime - SPAWN_TIME)
                        // Actually, let's use pixels for smoother movement.

                        /*
                          Position calculation:
                          0 at SpawnTime
                          JudgementY at TargetTime
                          
                          Distance = Speed * (CurrentTime - SpawnTime)
                          
                          Wait, if we defined speed and position:
                          Let's standardize: Judgement Line is at Y=500px (arbitrary).
                          TargetTime is when Note reaches 500px.
                          
                          Y = (TargetTime - CurrentTime) * Speed * -1 + JudgementLine
                          Y = JudgementLine - (TargetTime - CurrentTime) * Speed
                          
                          At CurrentTime = TargetTime, Y = JudgementLine.
                          At CurrentTime = TargetTime - 1000, Y = JudgementLine - 1000*Speed.
                        */

                        // Let's use percentage height for responsiveness? No, pixels are easier for game logic.
                        // We can use style={{ top: '80%' ... }} logic.

                        // Let's try direct percentage based on time map?
                        // Spawn at T-2000. Hit at T.
                        // Current T goes from T-2000 to T.
                        // Progress = (Current - Spawn) / (Hit - Spawn)
                        // Y = Progress * JudgementY

                        const timeProgress = (gameState.currentTime - note.spawnTime) / (note.targetTime - note.spawnTime);
                        const topPercent = timeProgress * JUDGEMENT_LINE_Y;

                        // Note: If speed is constant, spawnTime is dynamically set based on that speed.
                        // note.spawnTime = note.targetTime - (Distance / Speed)

                        if (timeProgress < 0 || timeProgress > 1.2) return null; // Out of view

                        return (
                            <NoteComponent
                                key={note.id}
                                note={note}
                                y={topPercent}
                                colorName={LANE_CONFIGS.find(l => l.id === note.lane)?.color || 'red'}
                            />
                        );
                    })}
                </div>

                {/* Keyboard Layout at the bottom */}
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
