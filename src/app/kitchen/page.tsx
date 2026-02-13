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
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

        try {
            await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            // No need to fetch immediately if optimistic worked, but good for sync
            // fetOrders(); // Let periodic fetch handle sync or fetch quietly
        } catch (e) {
            console.error(e);
            // Revert if failed (would need ref to prev state, but simple re-fetch works)
            fetchOrders();
        }
    };

    const getNextStatus = (status: string) => {
        const flow: Record<string, string> = {
            RECEIVED: 'PREPARING',
            PREPARING: 'READY',
            // READY status has no next action for Kitchen
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

    const playNotification = () => {
        try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('Audio play failed', e));
        } catch (e) {
            console.error(e);
        }
    };

    // Update fetchOrders to use playsNotification
    // ... inside fetchOrders ...
    // if (data.length > prevCountRef.current && prevCountRef.current > 0) playNotification();

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            RECEIVED: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20',
            PREPARING: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20', // Green for "Ready" action
            READY: 'bg-stone-500', // No action
            SERVED: 'bg-stone-400',
        };
        return colors[status] || 'bg-stone-400';
    };

    // ... inside render ...
    // ...
    {/* Status button */ }
    {
        getNextStatus(order.status) && (
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
        )
    }
                            </div >
                        ))
}
                    </div >
                )}

{/* Served orders */ }
{
    servedOrders.length > 0 && (
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
    )
}
            </div >
        </div >
    );
}
