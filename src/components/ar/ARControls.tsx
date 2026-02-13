'use client';

import { useEffect, useState } from 'react';

interface ARControlsProps {
    onRecenter: () => void;
    onReplace: () => void;
    onClose: () => void;
    itemName: string;
}

export default function ARControls({ onRecenter, onReplace, onClose, itemName }: ARControlsProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const key = 'ar_gesture_tooltip_shown';
        if (!localStorage.getItem(key)) {
            setShowTooltip(true);
            localStorage.setItem(key, '1');
            const timer = setTimeout(() => setShowTooltip(false), 4000);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
            {/* Top header */}
            <div className="safe-top p-4 flex items-center justify-between pointer-events-auto">
                <div className="px-4 py-2 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 text-white text-sm font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    {itemName}
                </div>
                <button
                    onClick={onClose}
                    className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-all active:scale-90"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Gesture tooltip */}
            {showTooltip && (
                <div className="absolute inset-0 flex items-center justify-center animate-fade-in" style={{ animationDuration: '0.3s' }}>
                    <div className="bg-black/60 backdrop-blur-2xl rounded-3xl px-6 py-5 border border-white/10 max-w-[260px] text-center">
                        <div className="flex justify-center gap-6 mb-3">
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">👆</span>
                                </div>
                                <span className="text-white/50 text-[10px]">Déplacer</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">🤏</span>
                                </div>
                                <span className="text-white/50 text-[10px]">Redimensionner</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <span className="text-lg">✌️</span>
                                </div>
                                <span className="text-white/50 text-[10px]">Pivoter</span>
                            </div>
                        </div>
                        <p className="text-white/40 text-xs">Utilisez vos doigts pour ajuster</p>
                    </div>
                </div>
            )}

            {/* Bottom controls */}
            <div className="safe-bottom p-4 pointer-events-auto">
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={onRecenter}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 
                                 text-white text-sm font-medium hover:bg-black/50 transition-all active:scale-95"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                        </svg>
                        Recentrer
                    </button>
                    <button
                        onClick={onReplace}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 
                                 text-white text-sm font-medium hover:bg-black/50 transition-all active:scale-95"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Replacer
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 
                                 text-white/80 text-sm font-medium hover:bg-white/20 transition-all active:scale-95"
                    >
                        Quitter AR
                    </button>
                </div>
            </div>
        </div>
    );
}
