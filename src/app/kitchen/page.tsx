'use client';

import { useEffect, useState, useRef } from 'react';
import { Order } from '@/lib/types';
import { formatPrice, getStatusLabel, cn } from '@/lib/utils';

export default function KitchenScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [focusMode, setFocusMode] = useState(false);
    const prevCountRef = useRef(0);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders?restaurantSlug=le-jardin');
            if (res.ok) {
                const data = await res.json();
                // Play sound if new order
                if (data.length > prevCountRef.current && prevCountRef.current > 0) {
                    try { new Audio('/notification.mp3').play().catch(() => { }); } catch { }
                }
                prevCountRef.current = data.length;
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
        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchOrders();
        } catch (e) {
            console.error(e);
        }
    };

    const getNextStatus = (status: string) => {
        const flow: Record<string, string> = {
            RECEIVED: 'PREPARING',
            PREPARING: 'READY',
            READY: 'SERVED',
        };
        return flow[status];
    };

    const getStatusButtonLabel = (status: string) => {
        const labels: Record<string, string> = {
            RECEIVED: '▶ Accepter',
            PREPARING: '✓ Prêt',
            READY: '🍽️ Servi',
        };
        return labels[status] || '';
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            RECEIVED: 'bg-blue-500 hover:bg-blue-600',
            PREPARING: 'bg-amber-500 hover:bg-amber-600',
            READY: 'bg-emerald-500 hover:bg-emerald-600',
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
        <div className={cn('min-h-screen transition-colors duration-300', focusMode ? 'bg-black' : 'bg-stone-950')}>
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
                            <button
                                onClick={() => setFocusMode(!focusMode)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                                    focusMode ? 'bg-accent text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                )}
                            >
                                {focusMode ? '✦ Focus ON' : '○ Focus'}
                            </button>
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
                                {order.status !== 'SERVED' && (
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

                {/* Served orders */}
                {servedOrders.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
                            Commandes servies ({servedOrders.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {servedOrders.slice(0, 8).map(order => (
                                <div key={order.id} className="p-4 rounded-xl bg-stone-900/50 border border-stone-800 opacity-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-stone-400 kitchen-text">#{order.orderNumber}</span>
                                        <span className="text-xs text-stone-500">{order.table?.label}</span>
                                    </div>
                                    <p className="text-xs text-stone-600 mt-1">
                                        {order.items?.length} article{(order.items?.length || 0) > 1 ? 's' : ''} — {formatPrice(order.total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
