import { LANE_CONFIGS } from '../constants';

interface KeyboardLayoutProps {
    highlightKey?: string;
    activeLanes: Set<number>;
}

const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500/20 text-red-100 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-100 border-orange-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-100 border-yellow-500/30',
    green: 'bg-green-500/20 text-green-100 border-green-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-100 border-cyan-500/30',
    blue: 'bg-blue-500/20 text-blue-100 border-blue-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-100 border-indigo-500/30',
    fuchsia: 'bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/30',
};

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500 text-white border-red-400 ring-4 ring-red-500/50',
    orange: 'bg-orange-500 text-white border-orange-400 ring-4 ring-orange-500/50',
    yellow: 'bg-yellow-500 text-white border-yellow-400 ring-4 ring-yellow-500/50',
    green: 'bg-green-500 text-white border-green-400 ring-4 ring-green-500/50',
    cyan: 'bg-cyan-500 text-white border-cyan-400 ring-4 ring-cyan-500/50',
    blue: 'bg-blue-500 text-white border-blue-400 ring-4 ring-blue-500/50',
    indigo: 'bg-indigo-500 text-white border-indigo-400 ring-4 ring-indigo-500/50',
    fuchsia: 'bg-fuchsia-500 text-white border-fuchsia-400 ring-4 ring-fuchsia-500/50',
};

export const KeyboardLayout = ({ highlightKey, activeLanes }: KeyboardLayoutProps) => {
    const getKeyConfig = (key: string) => {
        return LANE_CONFIGS.find(cfg => cfg.keys.includes(key));
    };

    return (
        <div className="w-full flex flex-col gap-1 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 mt-auto">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    className="flex justify-center gap-1"
                    style={{ paddingLeft: `${rowIndex * 1.5}rem` }}
                >
                    {row.map(key => {
                        const config = getKeyConfig(key);
                        const isHighlighted = highlightKey === key;
                        const isLaneActive = config && activeLanes.has(config.id);

                        const baseClass = config ? COLOR_MAP[config.color] : 'bg-slate-800 text-slate-400 border-slate-700';
                        const highlightClass = config ? HIGHLIGHT_COLOR_MAP[config.color] : baseClass;
                        const activeClass = isLaneActive ? 'opacity-100 scale-95 brightness-125' : 'opacity-70';

                        return (
                            <div
                                key={key}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-bold uppercase transition-all duration-75 ${isHighlighted ? highlightClass : baseClass} ${activeClass}`}
                            >
                                {key}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
