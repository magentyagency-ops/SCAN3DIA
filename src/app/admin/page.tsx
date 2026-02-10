'use client';

import { useEffect, useState } from 'react';
import { formatPrice, cn } from '@/lib/utils';
import Link from 'next/link';

interface Analytics {
    today: {
        revenue: number;
        orderCount: number;
        avgBasket: number;
        topDishes: { name: string; count: number; revenue: number }[];
        peakHours: { hour: number; count: number }[];
    };
    allTime: {
        revenue: number;
        orderCount: number;
        avgBasket: number;
        topDishes: { name: string; count: number; revenue: number }[];
    };
}

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'tables' | 'settings'>('dashboard');
    const [menuData, setMenuData] = useState<any>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [newTableCode, setNewTableCode] = useState('');
    const [newTableLabel, setNewTableLabel] = useState('');

    useEffect(() => {
        fetch('/api/admin/analytics?restaurantSlug=le-jardin').then(r => r.json()).then(setAnalytics);
        fetch('/api/admin/menu?restaurantSlug=le-jardin').then(r => r.json()).then(setMenuData);
        fetch('/api/admin/tables?restaurantSlug=le-jardin').then(r => r.json()).then(setTables);
    }, []);

    const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
        await fetch('/api/admin/menu', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: itemId, isAvailable: !isAvailable }),
        });
        const res = await fetch('/api/admin/menu?restaurantSlug=le-jardin');
        setMenuData(await res.json());
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Supprimer ce plat ?')) return;
        await fetch(`/api/admin/menu?id=${itemId}`, { method: 'DELETE' });
        const res = await fetch('/api/admin/menu?restaurantSlug=le-jardin');
        setMenuData(await res.json());
    };

    const addTable = async () => {
        if (!newTableCode || !newTableLabel) return;
        await fetch('/api/admin/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantSlug: 'le-jardin', tableCode: newTableCode, label: newTableLabel }),
        });
        setNewTableCode('');
        setNewTableLabel('');
        const res = await fetch('/api/admin/tables?restaurantSlug=le-jardin');
        setTables(await res.json());
    };

    const deleteTable = async (id: string) => {
        if (!confirm('Supprimer cette table ?')) return;
        await fetch(`/api/admin/tables?id=${id}`, { method: 'DELETE' });
        const res = await fetch('/api/admin/tables?restaurantSlug=le-jardin');
        setTables(await res.json());
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const maxPeakCount = Math.max(...(analytics?.today.peakHours.map(h => h.count) || [1]), 1);

    const tabs = [
        { id: 'dashboard' as const, label: '📊 Dashboard', },
        { id: 'menu' as const, label: '🍽️ Menu', },
        { id: 'tables' as const, label: '🪑 Tables', },
        { id: 'settings' as const, label: '⚙️ Réglages', },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="glass border-b border-border-subtle sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-text-primary">MenuFlow Admin</h1>
                                <p className="text-xs text-text-tertiary">Le Jardin</p>
                            </div>
                        </div>
                        <Link href="/" className="px-4 py-2 rounded-xl bg-surface border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-all">
                            ← Retour
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-6">
                {/* Tab navigation */}
                <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                                activeTab === tab.id
                                    ? 'bg-text-primary text-white'
                                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-hover'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && analytics && (
                    <div className="animate-fade-in-up">
                        {/* Stats grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="p-6 rounded-2xl bg-surface border border-border">
                                <p className="text-sm text-text-secondary mb-1">CA du jour</p>
                                <p className="text-3xl font-bold text-text-primary">{formatPrice(analytics.today.revenue)}</p>
                                <p className="text-xs text-text-tertiary mt-1">Total: {formatPrice(analytics.allTime.revenue)}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-surface border border-border">
                                <p className="text-sm text-text-secondary mb-1">Commandes</p>
                                <p className="text-3xl font-bold text-text-primary">{analytics.today.orderCount}</p>
                                <p className="text-xs text-text-tertiary mt-1">Total: {analytics.allTime.orderCount}</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-surface border border-border">
                                <p className="text-sm text-text-secondary mb-1">Panier moyen</p>
                                <p className="text-3xl font-bold text-text-primary">{formatPrice(analytics.today.avgBasket)}</p>
                                <p className="text-xs text-text-tertiary mt-1">Total: {formatPrice(analytics.allTime.avgBasket)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top dishes */}
                            <div className="p-6 rounded-2xl bg-surface border border-border">
                                <h3 className="text-sm font-semibold text-text-primary mb-4">🏆 Top 5 plats</h3>
                                {(analytics.allTime.topDishes.length > 0 ? analytics.allTime.topDishes : analytics.today.topDishes).map((dish, i) => (
                                    <div key={dish.name} className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                                                i === 0 ? 'bg-amber-100 text-amber-700' :
                                                    i === 1 ? 'bg-stone-100 text-stone-600' :
                                                        i === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-stone-50 text-stone-500'
                                            )}>
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-medium text-text-primary">{dish.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-text-primary">{dish.count}×</span>
                                            <span className="text-xs text-text-tertiary ml-2">{formatPrice(dish.revenue)}</span>
                                        </div>
                                    </div>
                                ))}
                                {analytics.allTime.topDishes.length === 0 && analytics.today.topDishes.length === 0 && (
                                    <p className="text-sm text-text-tertiary py-4 text-center">Aucune donnée</p>
                                )}
                            </div>

                            {/* Peak hours */}
                            <div className="p-6 rounded-2xl bg-surface border border-border">
                                <h3 className="text-sm font-semibold text-text-primary mb-4">📈 Heures de pic</h3>
                                <div className="flex items-end gap-1 h-40">
                                    {analytics.today.peakHours.filter(h => h.hour >= 10 && h.hour <= 23).map(h => (
                                        <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full">
                                            <div
                                                className={cn(
                                                    'w-full rounded-t-lg transition-all',
                                                    h.count > 0 ? 'bg-accent/70' : 'bg-stone-100'
                                                )}
                                                style={{ height: `${Math.max((h.count / maxPeakCount) * 100, 4)}%` }}
                                            />
                                            <span className="text-[9px] text-text-tertiary mt-1">{h.hour}h</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MENU TAB */}
                {activeTab === 'menu' && menuData && (
                    <div className="animate-fade-in-up">
                        {menuData.categories?.map((cat: any) => (
                            <div key={cat.id} className="mb-8">
                                <h3 className="text-lg font-bold text-text-primary mb-4">{cat.name}</h3>
                                <div className="space-y-2">
                                    {cat.items?.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border hover:bg-surface-hover transition-all">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={cn(
                                                    'w-3 h-3 rounded-full shrink-0',
                                                    item.isAvailable ? 'bg-success' : 'bg-danger'
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-sm text-text-primary truncate">{item.name}</h4>
                                                        {item.isSignature && <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">⭐ Signature</span>}
                                                    </div>
                                                    <p className="text-xs text-text-secondary truncate mt-0.5">{item.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="font-bold text-accent">{formatPrice(item.price)}</span>
                                                <button
                                                    onClick={() => toggleAvailability(item.id, item.isAvailable)}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                                        item.isAvailable
                                                            ? 'bg-success-light text-success border border-emerald-200'
                                                            : 'bg-danger-light text-danger border border-red-200'
                                                    )}
                                                >
                                                    {item.isAvailable ? 'En stock' : 'Rupture'}
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    className="text-text-tertiary hover:text-danger transition-colors p-1"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TABLES TAB */}
                {activeTab === 'tables' && (
                    <div className="animate-fade-in-up">
                        {/* Add table form */}
                        <div className="p-6 rounded-2xl bg-surface border border-border mb-6">
                            <h3 className="text-sm font-semibold text-text-primary mb-4">➕ Ajouter une table</h3>
                            <div className="flex gap-3">
                                <input
                                    placeholder="Code (ex: T4)"
                                    value={newTableCode}
                                    onChange={e => setNewTableCode(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                                />
                                <input
                                    placeholder="Label (ex: Table 4)"
                                    value={newTableLabel}
                                    onChange={e => setNewTableLabel(e.target.value)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                                />
                                <button
                                    onClick={addTable}
                                    className="px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all active:scale-95"
                                >
                                    Ajouter
                                </button>
                            </div>
                        </div>

                        {/* Tables list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tables.map(table => {
                                const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/le-jardin/t/${table.tableCode}`;
                                return (
                                    <div key={table.id} className="p-5 rounded-2xl bg-surface border border-border">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-text-primary">{table.label}</h3>
                                                <p className="text-xs text-text-tertiary">Code: {table.tableCode}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteTable(table.id)}
                                                className="text-text-tertiary hover:text-danger transition-colors p-1"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg>
                                            </button>
                                        </div>
                                        <div className="p-3 rounded-xl bg-background border border-border-subtle mb-3">
                                            <p className="text-xs text-text-secondary break-all font-mono">{qrUrl}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(qrUrl)}
                                            className="w-full py-2.5 rounded-xl bg-accent-light text-accent text-sm font-medium hover:bg-accent/10 transition-all"
                                        >
                                            📋 Copier le lien
                                        </button>
                                        {/* Recent orders count */}
                                        {table.orders?.length > 0 && (
                                            <p className="text-[10px] text-text-tertiary mt-3 text-center">
                                                {table.orders.length} commande{table.orders.length > 1 ? 's' : ''} récente{table.orders.length > 1 ? 's' : ''}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && menuData && (
                    <div className="max-w-xl animate-fade-in-up">
                        <div className="p-6 rounded-2xl bg-surface border border-border">
                            <h3 className="text-lg font-bold text-text-primary mb-6">Restaurant</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">Nom</label>
                                    <input
                                        value={menuData.name || ''}
                                        readOnly
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">Adresse</label>
                                    <input
                                        value={menuData.address || ''}
                                        readOnly
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-text-secondary mb-1.5 block">Horaires</label>
                                    <input
                                        value={menuData.openingHours || ''}
                                        readOnly
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-text-secondary mb-1.5 block">Taxes</label>
                                        <input
                                            value={`${(menuData.taxRate * 100).toFixed(0)}%`}
                                            readOnly
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-text-secondary mb-1.5 block">Couleur accent</label>
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-background border border-border">
                                            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: menuData.accentColor }} />
                                            <span className="text-sm">{menuData.accentColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
