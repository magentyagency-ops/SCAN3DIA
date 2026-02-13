'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { MenuData, MenuItem, Category, OptionGroup, CartItemOption } from '@/lib/types';
import { formatPrice, parseTags, getTagLabel, getTagColor, cn } from '@/lib/utils';
import ARExperience from '@/components/ARExperience';

export default function MenuPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const tableCode = params.tableCode as string;

    const { addItem, totalItems, subtotal } = useCart();

    const [data, setData] = useState<MenuData | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [showSheet, setShowSheet] = useState(false);
    const [addedId, setAddedId] = useState<string | null>(null);
    const [showDevMenu, setShowDevMenu] = useState(false);

    // Customization state
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
    const [exclusions, setExclusions] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [quantity, setQuantity] = useState(1);

    const tabsRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        fetch(`/api/restaurants/${slug}/menu`)
            .then(async res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.json();
            })
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d);
                if (d.categories?.[0]) setActiveCategory(d.categories[0].id);
                setLoading(false);

                // Apply theme
                if (d.restaurant) {
                    const root = document.documentElement;
                    if (d.restaurant.accentColor) root.style.setProperty('--color-accent', d.restaurant.accentColor);

                    if (d.restaurant.themeMode === 'DARK') {
                        root.style.setProperty('--color-background', '#1C1917');
                        root.style.setProperty('--color-surface', '#292524');
                        root.style.setProperty('--color-surface-hover', '#44403C');
                        root.style.setProperty('--color-border', '#44403C');
                        root.style.setProperty('--color-border-subtle', '#292524');
                        root.style.setProperty('--color-text-primary', '#F5F5F4');
                        root.style.setProperty('--color-text-secondary', '#A8A29E');
                        root.style.setProperty('--color-text-tertiary', '#78716C');
                    } else {
                        root.style.removeProperty('--color-background');
                        root.style.removeProperty('--color-surface');
                        root.style.removeProperty('--color-surface-hover');
                        root.style.removeProperty('--color-border');
                        root.style.removeProperty('--color-border-subtle');
                        root.style.removeProperty('--color-text-primary');
                        root.style.removeProperty('--color-text-secondary');
                        root.style.removeProperty('--color-text-tertiary');
                    }
                }
            })
            .catch(err => {
                console.error('Failed to load menu:', err);
                setLoading(false);
            });
    }, [slug]);

    const [showAR, setShowAR] = useState(false);
    const [activeModel, setActiveModel] = useState<{ url: string; iosUrl?: string; name: string; forcedMode?: 'ar' | '3d' } | null>(null);

    // AR Handling
    const startAR = (item: MenuItem, mode: 'ar' | '3d' = 'ar') => {
        if (!item.modelUrl) {
            // Use a sample model for demo if none exists
            // Fallback to Avocado if noodles.glb is not found (user didn't upload it yet)
            // Ideally we would check if file exists, but client-side we can't easily.
            // So we revert to Avocado for now to avoid black screen, until user uploads it.
            setActiveModel({
                url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',
                name: `${item.name} (Modèle provisoire : Avocat - En attente du fichier noodles.glb)`,
                forcedMode: mode
            });
        } else {
            setActiveModel({
                url: item.modelUrl,
                iosUrl: item.iosModelUrl || undefined,
                name: item.name,
                forcedMode: mode
            });
        }
        setShowAR(true);
    };

    const stopAR = () => {
        setShowAR(false);
        setActiveModel(null);
    };

    // Scroll to category
    const scrollToCategory = (catId: string) => {
        setActiveCategory(catId);
        sectionsRef.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Open item detail
    const openItem = (item: MenuItem) => {
        setSelectedItem(item);
        setShowSheet(true);
        setQuantity(1);
        setNotes('');
        setExclusions([]);
        // Set default options
        const defaults: Record<string, string | string[]> = {};
        item.optionGroups?.forEach(g => {
            if (g.type === 'radio') {
                const def = g.options.find(o => o.isDefault);
                if (def) defaults[g.id] = def.id;
                else if (g.options[0]) defaults[g.id] = g.options[0].id;
            } else {
                defaults[g.id] = [];
            }
        });
        setSelectedOptions(defaults);
    };

    // Calculate total for selected item
    const calculateItemTotal = () => {
        if (!selectedItem) return 0;
        let total = selectedItem.price;
        Object.entries(selectedOptions).forEach(([groupId, value]) => {
            const group = selectedItem.optionGroups?.find(g => g.id === groupId);
            if (!group) return;
            if (typeof value === 'string') {
                const opt = group.options.find(o => o.id === value);
                if (opt) total += opt.priceDelta;
            } else {
                value.forEach(v => {
                    const opt = group.options.find(o => o.id === v);
                    if (opt) total += opt.priceDelta;
                });
            }
        });
        return total * quantity;
    };

    // Add to cart
    const handleAddToCart = () => {
        if (!selectedItem || !data) return;
        const options: CartItemOption[] = [];
        Object.entries(selectedOptions).forEach(([groupId, value]) => {
            const group = selectedItem.optionGroups?.find(g => g.id === groupId);
            if (!group) return;
            const values = typeof value === 'string' ? [value] : value;
            values.forEach(v => {
                const opt = group.options.find(o => o.id === v);
                if (opt) {
                    options.push({
                        optionItemId: opt.id,
                        optionItemName: opt.name,
                        optionGroupName: group.name,
                        priceDelta: opt.priceDelta,
                    });
                }
            });
        });

        addItem({
            menuItemId: selectedItem.id,
            menuItemName: selectedItem.name,
            menuItemImage: selectedItem.image,
            basePrice: selectedItem.price,
            quantity,
            notes,
            selectedOptions: options,
            exclusions: exclusions,
            totalPrice: calculateItemTotal(),
        });

        setAddedId(selectedItem.id);
        setTimeout(() => setAddedId(null), 1500);
        setShowSheet(false);
        setSelectedItem(null);
    };

    // Filter items by search
    const filterItems = (items: MenuItem[]) => {
        if (!search) return items.filter(i => i.isAvailable);
        const q = search.toLowerCase();
        return items.filter(i =>
            i.isAvailable && (i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q))
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center animate-pulse-soft">
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 mx-auto mb-4" />
                    <p className="text-text-secondary text-sm">Chargement du menu...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-text-secondary">Restaurant non trouvé</p>
            </div>
        );
    }

    const { restaurant, categories } = data;
    const signatureItem = categories.flatMap(c => c.items).find(i => i.isSignature);

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <header className="glass sticky top-0 z-40 border-b border-border-subtle">
                <div className="max-w-lg mx-auto px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowDevMenu(!showDevMenu)}
                                    className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center
                                             hover:bg-surface-hover transition-all active:scale-95"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                </button>

                                {showDevMenu && (
                                    <>
                                        <div className="fixed inset-0 z-50 mr-4" onClick={() => setShowDevMenu(false)} />
                                        <div className="absolute top-12 left-0 w-48 bg-surface border border-border rounded-2xl shadow-xl z-[60] overflow-hidden animate-scale-in">
                                            <div className="p-2 border-b border-border bg-stone-50">
                                                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider px-3">Navigation Rapide</p>
                                            </div>
                                            <button
                                                onClick={() => router.push('/kitchen')}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                                            >
                                                👨‍🍳 Kitchen Screen
                                            </button>
                                            <button
                                                onClick={() => router.push('/admin')}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                                            >
                                                ⚙️ Back Office
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-text-primary tracking-tight">{restaurant.name}</h1>
                                <p className="text-xs text-text-tertiary mt-0.5">Table {tableCode}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/r/${slug}/t/${tableCode}/cart`)}
                            className="relative w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center
                         hover:bg-surface-hover transition-all active:scale-95"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            {totalItems > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center animate-scale-in">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-lg mx-auto px-5">
                {/* Search */}
                <div className="mt-5 mb-4 animate-fade-in-up">
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Rechercher un plat..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface border border-border text-sm
                         placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 
                         focus:border-accent/30 transition-all"
                        />
                    </div>
                </div>

                {/* Category tabs */}
                <div ref={tabsRef} className="flex gap-2 overflow-x-auto hide-scrollbar py-2 mb-6 animate-fade-in-up delay-100">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => scrollToCategory(cat.id)}
                            className={cn(
                                'px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                                activeCategory === cat.id
                                    ? 'bg-text-primary text-white shadow-sm'
                                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-hover'
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Signature hero card */}
                {signatureItem && !search && (
                    <div className="mb-8 animate-fade-in-up delay-150">
                        <button
                            onClick={() => openItem(signatureItem)}
                            className="w-full text-left group"
                        >
                            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-xs font-semibold text-amber-700 shadow-sm">
                                        ⭐ Plat Signature
                                    </span>
                                </div>
                                <div className="h-48 bg-gradient-to-br from-amber-100/50 to-orange-100/50 flex items-center justify-center overflow-hidden relative">
                                    {signatureItem.image ? (
                                        <img src={signatureItem.image} alt={signatureItem.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-6xl">🥩</span>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
                                                {signatureItem.name}
                                            </h3>
                                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{signatureItem.description}</p>
                                        </div>
                                        <span className="text-lg font-bold text-accent ml-3 shrink-0">
                                            {formatPrice(signatureItem.price, restaurant.currency)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex gap-1.5">
                                            {parseTags(signatureItem.tags).map(tag => (
                                                <span key={tag} className={`text-[11px] font-medium px-2 py-1 rounded-full border ${getTagColor(tag)}`}>
                                                    {getTagLabel(tag)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startAR(signatureItem, '3d');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white
                                                         text-[10px] font-bold hover:bg-white/20 transition-all active:scale-95"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                    <line x1="12" y1="22.08" x2="12" y2="12" />
                                                </svg>
                                                3D
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startAR(signatureItem, 'ar');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white
                                                         text-[10px] font-bold hover:bg-accent-hover transition-all active:scale-95 shadow-lg shadow-accent/20"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                En RA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Menu sections */}
                {categories.map(cat => {
                    const items = filterItems(cat.items);
                    if (items.length === 0) return null;
                    return (
                        <div
                            key={cat.id}
                            ref={el => { sectionsRef.current[cat.id] = el; }}
                            className="mb-8 scroll-mt-32"
                        >
                            <h2 className="text-lg font-bold text-text-primary mb-4 animate-fade-in-up">{cat.name}</h2>
                            <div className="space-y-3">
                                {items.filter(i => !(i.isSignature && !search)).map((item, idx) => (
                                    <button
                                        key={item.id}
                                        onClick={() => openItem(item)}
                                        className="w-full text-left stagger-item animate-fade-in-up"
                                    >
                                        <div className={cn(
                                            'flex gap-4 p-4 rounded-2xl bg-surface border border-border card-hover group',
                                            addedId === item.id && 'ring-2 ring-accent/30 bg-accent-light'
                                        )}>
                                            {/* Image placeholder */}
                                            {/* Image placeholder */}
                                            <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center shrink-0 overflow-hidden">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl">
                                                        {cat.slug === 'entrees' ? '🥗' : cat.slug === 'plats' ? '🍽️' : cat.slug === 'desserts' ? '🍰' : '🥤'}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors text-[15px] leading-tight">
                                                        {item.name}
                                                    </h3>
                                                    <span className="text-[15px] font-bold text-accent shrink-0">
                                                        {formatPrice(item.price, restaurant.currency)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">{item.description}</p>

                                                <div className="flex items-center justify-between mt-3 gap-2">
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {parseTags(item.tags).map(tag => (
                                                            <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getTagColor(tag)}`}>
                                                                {getTagLabel(tag)}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="flex gap-2 shrink-0 ml-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startAR(item, '3d');
                                                            }}
                                                            className="flex items-center justify-center w-8 h-8 rounded-xl bg-surface-hover/50 text-text-secondary
                                                                     hover:bg-surface-hover hover:text-text-primary transition-all active:scale-95 border border-border"
                                                            title="Voir en 3D"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                                <line x1="12" y1="22.08" x2="12" y2="12" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startAR(item, 'ar');
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white
                                                                     text-[10px] font-bold hover:bg-accent-hover transition-all active:scale-95 shadow-md shadow-accent/10"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                            RA
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {addedId === item.id && (
                                            <div className="text-center mt-1.5 animate-fade-in">
                                                <span className="text-xs font-medium text-accent">✓ Ajouté au panier</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom cart bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom animate-slide-up">
                    <div className="max-w-lg mx-auto px-5 pb-2">
                        <button
                            onClick={() => router.push(`/r/${slug}/t/${tableCode}/cart`)}
                            className="w-full flex items-center justify-between py-4 px-6 rounded-2xl bg-accent text-white
                         font-semibold shadow-xl shadow-accent/25 hover:bg-accent-hover transition-all
                         active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                                    {totalItems}
                                </span>
                                <span>Voir le panier</span>
                            </div>
                            <span>{formatPrice(subtotal, restaurant.currency)}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Sheet - Item Detail */}
            {showSheet && selectedItem && (
                <div className="fixed inset-0 z-50 bottom-sheet-overlay animate-fade-in" onClick={() => setShowSheet(false)}>
                    <div className="absolute bottom-0 left-0 right-0 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="max-w-lg mx-auto bg-surface rounded-t-3xl max-h-[90vh] overflow-y-auto">
                            {/* Item header */}
                            {/* Image container */}
                            <div className="relative">
                                <div className="h-56 bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center rounded-t-3xl relative overflow-hidden">
                                    {/* Decorative background circle */}
                                    <div className="absolute w-40 h-40 bg-accent/5 rounded-full blur-2xl" />

                                    {selectedItem.image ? (
                                        <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover relative z-10" />
                                    ) : (
                                        <span className="text-8xl relative z-10 animate-bounce-slow">
                                            {categories.find(c => c.id === selectedItem.categoryId)?.slug === 'entrees' ? '🥗' :
                                                categories.find(c => c.id === selectedItem.categoryId)?.slug === 'plats' ? '🍽️' :
                                                    categories.find(c => c.id === selectedItem.categoryId)?.slug === 'desserts' ? '🍰' : '🥤'}
                                        </span>
                                    )}
                                </div>

                                {/* AR Button - Positonned "En dessous de l'assiette" */}
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20">
                                    <button
                                        onClick={() => startAR(selectedItem)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white shadow-xl shadow-accent/30 
                                                     hover:bg-accent-hover transition-all active:scale-95 text-sm font-bold border-2 border-white"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                        </svg>
                                        Voir en 3D
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowSheet(false)}
                                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/10 backdrop-blur-md flex items-center justify-center
                                                 text-text-primary hover:bg-white/20 transition-all z-20"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 pt-10">
                                {/* Name and price */}
                                <div className="flex items-start justify-between mb-2">
                                    <h2 className="text-2xl font-bold text-text-primary">{selectedItem.name}</h2>
                                    <span className="text-2xl font-bold text-accent ml-3">{formatPrice(selectedItem.price, restaurant.currency)}</span>
                                </div>

                                {/* Badges only here */}
                                <div className="flex gap-2 mb-4">
                                    {parseTags(selectedItem.tags).map(tag => (
                                        <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getTagColor(tag)}`}>
                                            {getTagLabel(tag)}
                                        </span>
                                    ))}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-text-secondary leading-relaxed mb-4">{selectedItem.description}</p>

                                {/* Allergens */}
                                {selectedItem.allergens?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {selectedItem.allergens.map(a => (
                                            <span key={a.allergen.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-50 text-xs text-text-secondary border border-border-subtle">
                                                {a.allergen.icon} {a.allergen.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Option groups */}
                                {selectedItem.optionGroups?.map(group => (
                                    <div key={group.id} className="mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-text-primary">{group.name}</h3>
                                            {group.required && (
                                                <span className="text-[10px] font-medium text-accent bg-accent-light px-2 py-0.5 rounded-full">Requis</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {group.options.map(opt => {
                                                const isSelected = group.type === 'radio'
                                                    ? selectedOptions[group.id] === opt.id
                                                    : (selectedOptions[group.id] as string[] || []).includes(opt.id);

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            if (group.type === 'radio') {
                                                                setSelectedOptions(prev => ({ ...prev, [group.id]: opt.id }));
                                                            } else {
                                                                setSelectedOptions(prev => {
                                                                    const curr = (prev[group.id] as string[]) || [];
                                                                    return {
                                                                        ...prev,
                                                                        [group.id]: curr.includes(opt.id)
                                                                            ? curr.filter(id => id !== opt.id)
                                                                            : [...curr, opt.id],
                                                                    };
                                                                });
                                                            }
                                                        }}
                                                        className={cn(
                                                            'w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left',
                                                            isSelected
                                                                ? 'border-accent bg-accent-light'
                                                                : 'border-border bg-surface hover:bg-surface-hover'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                                                group.type === 'checkbox' ? 'rounded-md' : 'rounded-full',
                                                                isSelected ? 'border-accent bg-accent' : 'border-text-tertiary'
                                                            )}>
                                                                {isSelected && (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-text-primary">{opt.name}</span>
                                                        </div>
                                                        {opt.priceDelta > 0 && (
                                                            <span className="text-sm text-text-secondary">+{formatPrice(opt.priceDelta, restaurant.currency)}</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Notes */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-text-primary mb-3">Note spéciale</h3>
                                    <textarea
                                        placeholder="Ex: sans oignons, bien cuit..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-surface border border-border text-sm resize-none h-20
                               placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
                                    />
                                </div>

                                {/* Quantity + Add to Cart */}
                                <div className="safe-bottom">
                                    <div className="flex items-center justify-center gap-5 mb-5">
                                        <button
                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg
                                 hover:bg-surface-hover transition-all active:scale-95"
                                        >
                                            −
                                        </button>
                                        <span className="text-xl font-bold text-text-primary w-8 text-center">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(q => q + 1)}
                                            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg
                                 hover:bg-surface-hover transition-all active:scale-95"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleAddToCart}
                                        className="w-full py-4 rounded-2xl bg-accent text-white font-semibold text-base
                               shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all active:scale-[0.98]"
                                    >
                                        Ajouter — {formatPrice(calculateItemTotal(), restaurant.currency)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AR Experience */}
            {showAR && activeModel && (
                <ARExperience
                    modelUrl={activeModel.url}
                    iosModelUrl={activeModel.iosUrl}
                    itemName={activeModel.name}
                    onClose={stopAR}
                    forcedMode={activeModel.forcedMode}
                />
            )}
        </div>
    );
}
