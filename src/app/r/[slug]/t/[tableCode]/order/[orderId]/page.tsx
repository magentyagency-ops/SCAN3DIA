'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Order, OrderStatus } from '@/lib/types';
import { formatPrice, getStatusLabel, getStatusStep, cn } from '@/lib/utils';

const steps = [
    { status: 'RECEIVED', label: 'Reçue', icon: '📋' },
    { status: 'PREPARING', label: 'En préparation', icon: '👨‍🍳' },
    { status: 'READY', label: 'Prête', icon: '✅' },
    { status: 'SERVED', label: 'Servie', icon: '🍽️' },
];

export default function OrderTrackingPage() {
    const params = useParams();
    const slug = params.slug as string;
    const tableCode = params.tableCode as string;
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        // Poll for updates every 3 seconds
        const interval = setInterval(fetchOrder, 3000);
        return () => clearInterval(interval);
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center animate-pulse-soft">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 mx-auto mb-4" />
                    <p className="text-text-secondary text-sm">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-text-secondary">Commande non trouvée</p>
            </div>
        );
    }

    const currentStep = getStatusStep(order.status);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="glass border-b border-border-subtle">
                <div className="max-w-lg mx-auto px-5 py-5">
                    <div className="text-center animate-fade-in-up">
                        <div className="text-4xl mb-3">
                            {currentStep === 0 ? '📋' : currentStep === 1 ? '👨‍🍳' : currentStep === 2 ? '✅' : '🍽️'}
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            {getStatusLabel(order.status)}
                        </h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Commande #{order.orderNumber} — {order.table?.label || `Table ${tableCode}`}
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5 py-8">
                {/* Timeline */}
                <div className="mb-10 animate-fade-in-up delay-100">
                    <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute top-5 left-8 right-8 h-0.5 bg-border" />
                        <div
                            className="absolute top-5 left-8 h-0.5 bg-accent transition-all duration-700 ease-out"
                            style={{ width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 64px)` }}
                        />

                        {steps.map((step, idx) => (
                            <div key={step.status} className="relative z-10 flex flex-col items-center">
                                <div className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500',
                                    idx <= currentStep
                                        ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                        : 'bg-surface border-2 border-border text-text-tertiary'
                                )}>
                                    {idx < currentStep ? '✓' : step.icon}
                                </div>
                                <span className={cn(
                                    'text-[11px] mt-2 font-medium text-center',
                                    idx <= currentStep ? 'text-accent' : 'text-text-tertiary'
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order details */}
                <div className="animate-fade-in-up delay-200">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Votre commande</h2>
                    <div className="space-y-3">
                        {order.items?.map(item => (
                            <div key={item.id} className="p-4 rounded-2xl bg-surface border border-border">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-accent bg-accent-light w-6 h-6 rounded-full flex items-center justify-center">
                                                {item.quantity}
                                            </span>
                                            <h3 className="font-semibold text-sm text-text-primary">{item.menuItem?.name}</h3>
                                        </div>
                                        {item.options?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2 ml-8">
                                                {item.options.map((o: any, i: number) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-50 text-text-secondary border border-border-subtle">
                                                        {o.optionItem?.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && (
                                            <p className="text-[10px] text-text-tertiary mt-1 ml-8 italic">📝 {item.notes}</p>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-text-primary">
                                        {formatPrice(item.unitPrice * item.quantity)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="mt-6 p-5 rounded-2xl bg-surface border border-border">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-text-primary">Total</span>
                            <span className="text-xl font-bold text-accent">{formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Live indicator */}
                <div className="mt-8 text-center animate-fade-in delay-300">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success-light border border-emerald-200">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
                        <span className="text-xs font-medium text-emerald-700">Mise à jour en temps réel</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
