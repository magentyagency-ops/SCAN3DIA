'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { formatPrice } from '@/lib/utils';
import { useState } from 'react';

export default function CartPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const tableCode = params.tableCode as string;
    const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart();
    const [ordering, setOrdering] = useState(false);
    const [error, setError] = useState('');

    const taxRate = 0.1;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const handleOrder = async () => {
        if (items.length === 0) return;
        setOrdering(true);
        setError('');

        try {
            const orderItems = items.map(item => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice: item.basePrice,
                notes: [item.notes, item.exclusions.length > 0 ? `Sans: ${item.exclusions.join(', ')}` : ''].filter(Boolean).join(' | ') || null,
                selectedOptions: item.selectedOptions.map(o => o.optionItemId),
            }));

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantSlug: slug,
                    tableCode,
                    items: orderItems,
                }),
            });

            if (!res.ok) throw new Error('Erreur lors de la commande');

            const order = await res.json();
            clearCart();
            router.push(`/r/${slug}/t/${tableCode}/order/${order.id}`);
        } catch (e: any) {
            setError(e.message || 'Une erreur est survenue');
            setOrdering(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-36">
            {/* Header */}
            <header className="glass sticky top-0 z-40 border-b border-border-subtle">
                <div className="max-w-lg mx-auto px-5 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center
                         hover:bg-surface-hover transition-all active:scale-95"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">Mon panier</h1>
                            <p className="text-xs text-text-tertiary">{items.length} article{items.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5 mt-6">
                {items.length === 0 ? (
                    <div className="text-center py-20 animate-fade-in-up">
                        <div className="text-5xl mb-4">🛒</div>
                        <h2 className="text-lg font-semibold text-text-primary mb-2">Votre panier est vide</h2>
                        <p className="text-sm text-text-secondary mb-6">Ajoutez des plats depuis le menu</p>
                        <button
                            onClick={() => router.push(`/r/${slug}/t/${tableCode}`)}
                            className="px-6 py-3 rounded-2xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all"
                        >
                            Voir le menu
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 animate-fade-in-up">
                        {items.map((item, idx) => (
                            <div key={item.id} className="p-4 rounded-2xl bg-surface border border-border stagger-item animate-fade-in-up">
                                <div className="flex gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center shrink-0">
                                        <span className="text-2xl">🍽️</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-semibold text-sm text-text-primary">{item.menuItemName}</h3>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-text-tertiary hover:text-danger transition-colors ml-2"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Options */}
                                        {item.selectedOptions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {item.selectedOptions.map(o => (
                                                    <span key={o.optionItemId} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-50 text-text-secondary border border-border-subtle">
                                                        {o.optionItemName}{o.priceDelta > 0 && ` +${formatPrice(o.priceDelta)}`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && (
                                            <p className="text-[10px] text-text-tertiary mt-1 italic">📝 {item.notes}</p>
                                        )}

                                        {/* Quantity + Price */}
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm
                                     hover:bg-surface-hover transition-all active:scale-95"
                                                >
                                                    −
                                                </button>
                                                <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm
                                     hover:bg-surface-hover transition-all active:scale-95"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <span className="text-sm font-bold text-accent">{formatPrice(item.totalPrice)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {items.length > 0 && (
                    <div className="mt-8 animate-fade-in-up delay-200">
                        <div className="p-5 rounded-2xl bg-surface border border-border">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Sous-total</span>
                                    <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">TVA (10%)</span>
                                    <span className="font-medium text-text-primary">{formatPrice(tax)}</span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex justify-between">
                                    <span className="font-semibold text-text-primary">Total</span>
                                    <span className="text-xl font-bold text-accent">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 rounded-xl bg-danger-light text-danger text-sm text-center animate-fade-in">
                        {error}
                    </div>
                )}
            </div>

            {/* CTA */}
            {items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom animate-slide-up">
                    <div className="max-w-lg mx-auto px-5 pb-2">
                        <button
                            onClick={handleOrder}
                            disabled={ordering}
                            className="w-full py-4 rounded-2xl bg-accent text-white font-semibold text-base
                         shadow-xl shadow-accent/25 hover:bg-accent-hover transition-all
                         active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {ordering ? (
                                <span className="animate-pulse-soft">Envoi de la commande...</span>
                            ) : (
                                `Commander — ${formatPrice(total)}`
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
