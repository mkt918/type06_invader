import { LANE_CONFIGS } from '../constants';

interface KeyboardLayoutProps {
    highlightKey?: string;
    activeLanes: Set<number>;
}

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
    red: 'bg-red-500 text-white border-red-400 ring-2 ring-red-400/60',
    orange: 'bg-orange-500 text-white border-orange-400 ring-2 ring-orange-400/60',
    yellow: 'bg-yellow-500 text-white border-yellow-400 ring-2 ring-yellow-400/60',
    green: 'bg-green-500 text-white border-green-400 ring-2 ring-green-400/60',
    cyan: 'bg-cyan-500 text-white border-cyan-400 ring-2 ring-cyan-400/60',
    blue: 'bg-blue-500 text-white border-blue-400 ring-2 ring-blue-400/60',
    indigo: 'bg-indigo-500 text-white border-indigo-400 ring-2 ring-indigo-400/60',
    fuchsia: 'bg-fuchsia-500 text-white border-fuchsia-400 ring-2 ring-fuchsia-400/60',
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500/50 text-white border-red-400 scale-95',
    orange: 'bg-orange-500/50 text-white border-orange-400 scale-95',
    yellow: 'bg-yellow-500/50 text-white border-yellow-400 scale-95',
    green: 'bg-green-500/50 text-white border-green-400 scale-95',
    cyan: 'bg-cyan-500/50 text-white border-cyan-400 scale-95',
    blue: 'bg-blue-500/50 text-white border-blue-400 scale-95',
    indigo: 'bg-indigo-500/50 text-white border-indigo-400 scale-95',
    fuchsia: 'bg-fuchsia-500/50 text-white border-fuchsia-400 scale-95',
};

export const KeyboardLayout = ({ highlightKey, activeLanes }: KeyboardLayoutProps) => {
    return (
        // レーンと同じ flex-1 で8等分
        <div className="w-full flex">
            {LANE_CONFIGS.map((config) => {
                const isLaneActive = activeLanes.has(config.id);
                const baseClass = COLOR_MAP[config.color];
                const activeClass = ACTIVE_COLOR_MAP[config.color];
                const highlightClass = HIGHLIGHT_COLOR_MAP[config.color];

                return (
                    <div key={config.id} className="flex-1 flex flex-col items-center gap-1 px-0.5">
                        {config.keys.map((key) => {
                            const isHighlighted = highlightKey === key;
                            const cls = isHighlighted
                                ? highlightClass
                                : isLaneActive
                                ? activeClass
                                : baseClass;

                            return (
                                <div
                                    key={key}
                                    className={`w-full aspect-square flex items-center justify-center rounded border text-xs font-bold uppercase transition-all duration-75 ${cls}`}
                                >
                                    {key}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
