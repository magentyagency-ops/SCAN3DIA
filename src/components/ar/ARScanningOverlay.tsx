'use client';

import { useEffect, useState } from 'react';

interface ARScanningOverlayProps {
    surfaceFound: boolean;
    trackingQuality: 'good' | 'weak' | 'lost';
    onPlace: () => void;
}

export default function ARScanningOverlay({ surfaceFound, trackingQuality, onPlace }: ARScanningOverlayProps) {
    const [dots, setDots] = useState('');

    useEffect(() => {
        if (surfaceFound) return;
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 400);
        return () => clearInterval(interval);
    }, [surfaceFound]);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
            {/* Top bar */}
            <div className="safe-top p-4 flex items-center justify-center">
                {trackingQuality === 'weak' && (
                    <div className="px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-xl border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-fade-in pointer-events-auto">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Tracking faible — Bougez lentement
                    </div>
                )}
            </div>

            {/* Center scanning indicator */}
            {!surfaceFound && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Animated scan ring */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-2 border-white/20 animate-pulse" />
                        <div className="absolute inset-2 rounded-full border border-dashed border-white/30 animate-spin" style={{ animationDuration: '4s' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-white/60 animate-ping" />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom status + action */}
            <div className="safe-bottom p-6 flex flex-col items-center gap-4">
                {surfaceFound ? (
                    <>
                        <div className="px-5 py-2.5 rounded-full bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-fade-in">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Surface détectée
                        </div>
                        <button
                            onClick={onPlace}
                            className="pointer-events-auto px-8 py-4 rounded-2xl bg-white text-black font-bold text-base 
                                     shadow-2xl hover:bg-gray-100 transition-all active:scale-[0.96] animate-slide-up"
                        >
                            <span className="flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                </svg>
                                Placer le plat
                            </span>
                        </button>
                    </>
                ) : (
                    <div className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white/70 text-sm font-medium animate-fade-in">
                        Cherche une surface{dots}
                    </div>
                )}
            </div>
        </div>
    );
}
