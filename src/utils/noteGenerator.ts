import type { Note, LaneId, VisualType } from '../types';

interface KeyMap {
    lane: LaneId;
    visual: VisualType;
}

const KEY_MAPPINGS: Record<string, KeyMap> = {
    // Lane 1: Left Pinky (q, a, z)
    'q': { lane: 1, visual: 'upper' }, 'a': { lane: 1, visual: 'middle' }, 'z': { lane: 1, visual: 'lower' },

    // Lane 2: Left Ring (w, s, x)
    'w': { lane: 2, visual: 'upper' }, 's': { lane: 2, visual: 'middle' }, 'x': { lane: 2, visual: 'lower' },

    // Lane 3: Left Middle (e, d, c)
    'e': { lane: 3, visual: 'upper' }, 'd': { lane: 3, visual: 'middle' }, 'c': { lane: 3, visual: 'lower' },

    // Lane 4: Left Index (r,t / f,g / v,b)
    'r': { lane: 4, visual: 'upper' }, 't': { lane: 4, visual: 'upper' },
    'f': { lane: 4, visual: 'middle' }, 'g': { lane: 4, visual: 'middle' },
    'v': { lane: 4, visual: 'lower' }, 'b': { lane: 4, visual: 'lower' },

    // Lane 5: Right Index (y,u / h,j / n,m)
    'y': { lane: 5, visual: 'upper' }, 'u': { lane: 5, visual: 'upper' },
    'h': { lane: 5, visual: 'middle' }, 'j': { lane: 5, visual: 'middle' },
    'n': { lane: 5, visual: 'lower' }, 'm': { lane: 5, visual: 'lower' },

    // Lane 6: Right Middle (i, k, ,)
    'i': { lane: 6, visual: 'upper' }, 'k': { lane: 6, visual: 'middle' }, ',': { lane: 6, visual: 'lower' },

    // Lane 7: Right Ring (o, l, .)
    'o': { lane: 7, visual: 'upper' }, 'l': { lane: 7, visual: 'middle' }, '.': { lane: 7, visual: 'lower' },

    // Lane 8: Right Pinky (p, ;, /)
    'p': { lane: 8, visual: 'upper' }, ';': { lane: 8, visual: 'middle' }, '/': { lane: 8, visual: 'lower' },
    '-': { lane: 8, visual: 'upper' }, // General fallback for now
};

export const generateNotes = (text: string, bpm: number, startTime: number = 0, spawnPreTime: number = 2000): Note[] => {
    const msPerBeat = 60000 / bpm;
    const notes: Note[] = [];

    let currentIndex = 0;

    for (const char of text.toLowerCase()) {
        const map = KEY_MAPPINGS[char];
        if (map) {
            const targetTime = startTime + (currentIndex * msPerBeat);
            notes.push({
                id: Math.random().toString(36).substring(2, 9),
                char: char, // Keep original case? Lowercase for matching.
                lane: map.lane,
                spawnTime: targetTime - spawnPreTime,
                targetTime: targetTime,
                hit: false,
                visualType: map.visual
            });
            currentIndex++;
        }
    }

    return notes;
};
