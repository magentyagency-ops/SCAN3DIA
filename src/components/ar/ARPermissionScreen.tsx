'use client';

interface ARPermissionScreenProps {
    onRequestPermission: () => void;
    onContinueWithout: () => void;
    denied?: boolean;
}

export default function ARPermissionScreen({ onRequestPermission, onContinueWithout, denied }: ARPermissionScreenProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-8 animate-fade-in">
            {/* Icon */}
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                </svg>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-white mb-3 text-center">
                {denied ? 'Caméra non autorisée' : 'Accès à la caméra requis'}
            </h2>
            <p className="text-white/60 text-center text-sm max-w-[280px] leading-relaxed mb-10">
                {denied
                    ? 'Pour voir le plat en réalité augmentée sur votre table, vous devez autoriser l\'accès à la caméra dans les réglages de votre navigateur.'
                    : 'La caméra est utilisée pour afficher le plat en 3D directement sur votre table. Aucune photo n\'est prise ni enregistrée.'
                }
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <button
                    onClick={onRequestPermission}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-base 
                             shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-[0.97]"
                >
                    {denied ? 'Ouvrir les réglages' : 'Autoriser la caméra'}
                </button>
                <button
                    onClick={onContinueWithout}
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-medium text-sm 
                             hover:bg-white/10 transition-all active:scale-[0.97]"
                >
                    Continuer sans AR
                </button>
            </div>
        </div>
    );
}
