'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AREngine, ARState, checkARCapability } from '@/lib/ar-engine';
import ARPermissionScreen from '@/components/ar/ARPermissionScreen';
import ARScanningOverlay from '@/components/ar/ARScanningOverlay';
import ARControls from '@/components/ar/ARControls';

interface ARExperienceProps {
    modelUrl: string;
    iosModelUrl?: string;
    itemName: string;
    onClose: () => void;
    forcedMode?: 'ar' | '3d';
}

export default function ARExperience({ modelUrl, iosModelUrl, itemName, onClose, forcedMode }: ARExperienceProps) {
    const [arState, setArState] = useState<ARState>('CHECKING');
    const [trackingQuality, setTrackingQuality] = useState<'good' | 'weak' | 'lost'>('good');
    const [loadProgress, setLoadProgress] = useState(0);
    const [cameraDenied, setCameraDenied] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<AREngine | null>(null);

    // Initialize
    useEffect(() => {
        let cancelled = false;

        async function init() {
            const caps = await checkARCapability();

            if (cancelled) return;

            if (forcedMode === 'ar') {
                if (caps.webxr) {
                    setArState('PERMISSION');
                } else {
                    // Even if WebXR not supported, we go to fallback which handles AR via model-viewer
                    setArState('FALLBACK');
                }
            } else if (forcedMode === '3d') {
                setArState('FALLBACK');
            } else {
                // Auto mode (default)
                if (caps.webxr) {
                    setArState('PERMISSION');
                } else if (caps.quickLook || caps.sceneViewer) {
                    setArState('FALLBACK');
                } else {
                    setArState('FALLBACK');
                }
            }
        }

        init();
        return () => { cancelled = true; };
    }, [forcedMode]);

    // Create engine when permission is requested
    const handleRequestPermission = useCallback(async () => {
        if (!containerRef.current) return;

        const engine = new AREngine(containerRef.current, modelUrl, {
            onStateChange: (state) => setArState(state),
            onTrackingStatus: (quality) => setTrackingQuality(quality),
            onError: (msg) => {
                if (msg === 'camera_denied') {
                    setCameraDenied(true);
                    setArState('PERMISSION');
                }
            },
            onProgress: (pct) => setLoadProgress(pct),
        });

        engineRef.current = engine;
        const success = await engine.requestSession();
        if (!success && !cameraDenied) {
            setArState('FALLBACK');
        }
    }, [modelUrl, cameraDenied]);

    // Touch handlers for manipulation
    useEffect(() => {
        const container = containerRef.current;
        if (!container || arState !== 'PLACED') return;

        const engine = engineRef.current;
        if (!engine) return;

        const onStart = (e: TouchEvent) => engine.handleTouchStart(e);
        const onMove = (e: TouchEvent) => engine.handleTouchMove(e);
        const onEnd = (e: TouchEvent) => engine.handleTouchEnd(e);

        container.addEventListener('touchstart', onStart, { passive: false });
        container.addEventListener('touchmove', onMove, { passive: false });
        container.addEventListener('touchend', onEnd);

        return () => {
            container.removeEventListener('touchstart', onStart);
            container.removeEventListener('touchmove', onMove);
            container.removeEventListener('touchend', onEnd);
        };
    }, [arState]);

    // Cleanup
    useEffect(() => {
        return () => {
            engineRef.current?.stop();
        };
    }, []);

    const handleClose = useCallback(async () => {
        await engineRef.current?.stop();
        onClose();
    }, [onClose]);

    const handlePlace = useCallback(() => {
        engineRef.current?.placeObject();
    }, []);

    const handleRecenter = useCallback(() => {
        engineRef.current?.recenter();
    }, []);

    const handleReplace = useCallback(() => {
        engineRef.current?.resetPlacement();
    }, []);

    const handleContinueWithout = useCallback(() => {
        setArState('FALLBACK');
    }, []);

    // ---- RENDER ----

    // CHECKING state - loading splash
    if (arState === 'CHECKING') {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <p className="text-white/50 text-sm">Vérification des capacités AR…</p>
                </div>
            </div>
        );
    }

    // PERMISSION state
    if (arState === 'PERMISSION') {
        return (
            <ARPermissionScreen
                onRequestPermission={handleRequestPermission}
                onContinueWithout={handleContinueWithout}
                denied={cameraDenied}
            />
        );
    }

    // FALLBACK state - model-viewer with native AR
    if (arState === 'FALLBACK') {
        return <ModelViewerFallback modelUrl={modelUrl} iosModelUrl={iosModelUrl} itemName={itemName} onClose={handleClose} forcedMode={forcedMode} />;
    }

    // WebXR states (SCANNING, READY, PLACED)
    return (
        <div ref={containerRef} className="fixed inset-0 z-[100] bg-black">
            {/* Loading progress */}
            {loadProgress < 100 && (
                <div className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center gap-4">
                    <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
                            style={{ width: `${loadProgress}%` }}
                        />
                    </div>
                    <p className="text-white/40 text-xs">Chargement du modèle 3D… {loadProgress}%</p>
                </div>
            )}

            {/* Scanning / Ready overlay */}
            {(arState === 'SCANNING' || arState === 'READY') && (
                <ARScanningOverlay
                    surfaceFound={arState === 'READY'}
                    trackingQuality={trackingQuality}
                    onPlace={handlePlace}
                />
            )}

            {/* Placed controls */}
            {arState === 'PLACED' && (
                <ARControls
                    onRecenter={handleRecenter}
                    onReplace={handleReplace}
                    onClose={handleClose}
                    itemName={itemName}
                />
            )}

            {/* Close button during scanning */}
            {(arState === 'SCANNING' || arState === 'READY') && (
                <div className="absolute top-4 right-4 z-20 safe-top">
                    <button
                        onClick={handleClose}
                        className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-all active:scale-90"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

// ---- Fallback: model-viewer (iOS / non-WebXR) ----

function ModelViewerFallback({ modelUrl, iosModelUrl, itemName, onClose, forcedMode }: {
    modelUrl: string; iosModelUrl?: string; itemName: string; onClose: () => void; forcedMode?: 'ar' | '3d';
}) {
    const viewerContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load model-viewer script
        if (!document.getElementById('model-viewer-script')) {
            const script = document.createElement('script');
            script.id = 'model-viewer-script';
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
            document.head.appendChild(script);
        }

        // Create model-viewer element imperatively (avoids TS JSX type issues)
        const container = viewerContainerRef.current;
        if (!container) return;

        const mv = document.createElement('model-viewer') as any;
        mv.setAttribute('src', modelUrl);
        if (iosModelUrl) mv.setAttribute('ios-src', iosModelUrl);
        mv.setAttribute('alt', itemName);
        mv.setAttribute('ar', '');
        if (forcedMode === 'ar') {
            mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
            mv.setAttribute('activate', 'ar');
        } else {
            mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
        }
        mv.setAttribute('camera-controls', '');
        mv.setAttribute('touch-action', 'pan-y');
        mv.setAttribute('autoplay', '');
        mv.setAttribute('shadow-intensity', '1.2');
        mv.setAttribute('environment-image', 'neutral');
        mv.setAttribute('exposure', '1');
        mv.style.width = '100%';
        mv.style.height = '100%';
        mv.style.setProperty('--poster-color', 'transparent');

        // AR button
        const arBtn = document.createElement('button');
        arBtn.slot = 'ar-button';
        arBtn.style.cssText = 'position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);padding:1rem 2rem;border-radius:1rem;background:linear-gradient(90deg,#22c55e,#059669);color:white;font-weight:bold;font-size:1rem;border:none;box-shadow:0 25px 50px -12px rgba(16,185,129,0.3);display:flex;align-items:center;gap:0.5rem;cursor:pointer;';
        arBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> Voir dans mon assiette`;
        mv.appendChild(arBtn);

        container.appendChild(mv);

        return () => {
            container.removeChild(mv);
        };
    }, [modelUrl, iosModelUrl, itemName]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
            {/* Header */}
            <div className="safe-top p-4 flex items-center justify-between bg-black/50 backdrop-blur-md text-white absolute top-0 left-0 right-0 z-10">
                <h3 className="font-bold text-sm">{itemName}</h3>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Model viewer container */}
            <div ref={viewerContainerRef} className="w-full h-full" />
        </div>
    );
}
