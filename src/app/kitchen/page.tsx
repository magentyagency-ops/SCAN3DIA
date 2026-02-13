'use client';

import { useEffect, useState, useRef } from 'react';
import { Order } from '@/lib/types';
import { formatPrice, getStatusLabel, cn } from '@/lib/utils';
import { Toaster, toast } from 'sonner';

export default function KitchenScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Use regs to track state inside setInterval closure
    const ordersRef = useRef<Order[]>([]);
    const initRef = useRef(false);

    const playNotification = () => {
        if (!soundEnabled) return;
        try {
            // Web Audio API for reliable sound without external file
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // "iOS-like" Tri-tone ish (High C -> High E -> High G rapid broken chord)
            // Actually simple pleasant "Ding" is safer
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1); // Chirp down

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);

            // Try playing file too as backup if exists/valid
            // const audio = new Audio('/notification.mp3');
            // audio.play().catch(() => {});
        } catch (e) {
            console.error(e);
        }
    };

    const showNewOrderNotification = (order: Order) => {
        toast.custom((t) => (
            <div className="w-full max-w-sm bg-white/90 backdrop-blur-md text-black p-4 rounded-2xl shadow-2xl border border-white/20 flex items-start gap-4 animate-in slide-in-from-top-5 duration-300 pointer-events-auto ring-1 ring-black/5">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-xl">🍽️</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] leading-tight text-gray-900">Nouvelle commande #{order.orderNumber}</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5 leading-snug font-medium">
                        {order.table?.label} — {order.items.length} article{order.items.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => toast.dismiss(t)}
                    className="text-gray-400 hover:text-gray-600 transition-colors -mt-1 -mr-1 p-1"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>
        ), { duration: 5000, position: 'top-center' });
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders?restaurantSlug=le-jardin');
            if (res.ok) {
                const data = await res.json();

                // Diffing to find NEW orders
                // We compare incoming data with what we have in Ref
                if (initRef.current) {
                    const newOrders = data.filter((d: Order) =>
                        !ordersRef.current.find(o => o.id === d.id) && d.status !== 'SERVED'
                    );

                    if (newOrders.length > 0) {
                        playNotification();
                        newOrders.forEach((o: Order) => showNewOrderNotification(o));
                    }
                } else {
                    initRef.current = true;
                }

                ordersRef.current = data;
                setOrders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 3000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (orderId: string, newStatus: string) => {
        // Optimistic update
        const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o);
        setOrders(updated);
        ordersRef.current = updated;

        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (e) {
            console.error(e);
            fetchOrders();
        }
    };

    const getNextStatus = (status: string) => {
        const flow: Record<string, string> = {
            RECEIVED: 'PREPARING',
            PREPARING: 'READY',
        };
        return flow[status];
    };

    const getStatusButtonLabel = (status: string) => {
        const labels: Record<string, string> = {
            RECEIVED: '▶ Accepter',
            PREPARING: '✓ Prête',
        };
        return labels[status] || '';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            RECEIVED: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20',
            PREPARING: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20',
            READY: 'bg-stone-500',
            SERVED: 'bg-stone-400',
        };
        return colors[status] || 'bg-stone-400';
    };

    const getStatusBg = (status: string) => {
        const colors: Record<string, string> = {
            RECEIVED: 'border-blue-200 bg-blue-50',
            PREPARING: 'border-amber-200 bg-amber-50',
            READY: 'border-emerald-200 bg-emerald-50',
            SERVED: 'border-stone-200 bg-stone-50 opacity-60',
        };
        return colors[status] || '';
    };

    const activeOrders = orders.filter(o => o.status !== 'SERVED');
    const servedOrders = orders.filter(o => o.status === 'SERVED');

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center animate-pulse-soft">
                    <p className="text-stone-400 text-lg">Chargement des commandes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 transition-colors duration-300">
            <Toaster position="top-center" />
            {/* Header */}
            <header className="border-b border-stone-800 bg-stone-900/80 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                                <span className="text-white text-lg">👨‍🍳</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white kitchen-text">Kitchen Screen</h1>
                                <p className="text-xs text-stone-400">Le Jardin — {activeOrders.length} commande{activeOrders.length > 1 ? 's' : ''} active{activeOrders.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!soundEnabled && (
                                <button
                                    onClick={() => {
                                        setSoundEnabled(true);
                                        new Audio('/notification.mp3').play().catch(() => { });
                                        toast.success('Sons activés !');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 animate-pulse shadow-lg shadow-emerald-900/20"
                                >
                                    🔔 Activer le son
                                </button>
                            )}
                            <a href="/" className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-all">
                                ← Retour
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                {activeOrders.length === 0 ? (
                    <div className="text-center py-20 animate-fade-in-up">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Aucune commande en cours</h2>
                        <p className="text-stone-400">Les nouvelles commandes apparaîtront ici</p>
                        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-stone-800 border border-stone-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                            <span className="text-xs text-stone-400">En écoute...</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeOrders.map((order, idx) => (
                            <div
                                key={order.id}
                                className={cn(
                                    'rounded-2xl border-2 overflow-hidden animate-fade-in-up stagger-item transition-all',
                                    getStatusBg(order.status),
                                    order.status === 'RECEIVED' && 'ring-2 ring-blue-300 ring-offset-2 ring-offset-stone-950'
                                )}
                            >
                                {/* Order header */}
                                <div className="p-5 pb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-black kitchen-text text-stone-800">#{order.orderNumber}</span>
                                            <span className={cn(
                                                'px-3 py-1 rounded-full text-xs font-bold text-white',
                                                getStatusColor(order.status)
                                            )}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-stone-700">{order.table?.label}</p>
                                            <p className="text-[10px] text-stone-500">
                                                {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="px-5 pb-3">
                                    <div className="space-y-2.5">
                                        {order.items?.map(item => (
                                            <div key={item.id} className="flex items-start gap-2">
                                                <span className="text-lg font-black text-stone-700 kitchen-text w-8 shrink-0">
                                                    {item.quantity}×
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-stone-800 text-[15px] leading-tight">{item.menuItem?.name}</p>
                                                    {item.options?.length > 0 && (
                                                        <p className="text-xs text-stone-500 mt-0.5">
                                                            {item.options.map((o: any) => o.optionItem?.name).join(', ')}
                                                        </p>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-xs font-semibold text-red-600 mt-0.5 bg-red-50 px-2 py-0.5 rounded inline-block">
                                                            ⚠️ {item.notes}
                                                        </p>
                                                    )}
                                                    {/* Allergens */}
                                                    {item.menuItem?.allergens?.length > 0 && (
                                                        <div className="flex gap-1 mt-1">
                                                            {item.menuItem.allergens.map((a: any) => (
                                                                <span key={a.allergen?.id || a.allergenId} className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                                                                    {a.allergen?.icon} {a.allergen?.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Status button */}
                                {getNextStatus(order.status) && (
                                    <div className="p-4 pt-2">
                                        <button
                                            onClick={() => {
                                                const next = getNextStatus(order.status);
                                                if (next) updateStatus(order.id, next);
                                            }}
                                            className={cn(
                                                'w-full py-4 rounded-xl text-white font-bold text-lg transition-all active:scale-[0.98]',
                                                getStatusColor(order.status),
                                                'shadow-lg'
                                            )}
                                        >
                                            {getStatusButtonLabel(order.status)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
