import type { Note as NoteType } from '../types';

const TOTAL_LANES = 8;

interface NoteProps {
    note: NoteType;
    y: number;
    colorName: string;
    laneIndex: number; // 0-based index
}

const NOTE_COLORS: Record<string, string> = {
    red: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]',
    orange: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]',
    yellow: 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.8)]',
    green: 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]',
    cyan: 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]',
    blue: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]',
    indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]',
    fuchsia: 'bg-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.8)]',
};

export const Note = ({ note, y, colorName, laneIndex }: NoteProps) => {
    const colorClass = NOTE_COLORS[colorName] || NOTE_COLORS.red;
    // レーン中央のX位置（%）
    const leftPercent = ((laneIndex + 0.5) / TOTAL_LANES) * 100;

    return (
        <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${colorClass} w-[4.5rem] h-[4.5rem] flex items-center justify-center rounded-full text-white text-2xl font-bold pointer-events-none transform-gpu z-10`}
            style={{ top: `${y}%`, left: `${leftPercent}%` }}
        >
            {note.char.toUpperCase()}
        </div>
    );
};
