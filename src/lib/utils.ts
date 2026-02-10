export function formatPrice(price: number, currency: string = '€'): string {
    return `${price.toFixed(2)} ${currency}`;
}

export function parseTags(tags: string | null): string[] {
    if (!tags) return [];
    try {
        return JSON.parse(tags);
    } catch {
        return [];
    }
}

export function getTagLabel(tag: string): string {
    const labels: Record<string, string> = {
        'best-seller': '🔥 Best seller',
        'new': '✨ Nouveau',
        'spicy': '🌶️ Épicé',
        'veggie': '🥬 Végétarien',
    };
    return labels[tag] || tag;
}

export function getTagColor(tag: string): string {
    const colors: Record<string, string> = {
        'best-seller': 'bg-amber-50 text-amber-700 border-amber-200',
        'new': 'bg-blue-50 text-blue-700 border-blue-200',
        'spicy': 'bg-red-50 text-red-700 border-red-200',
        'veggie': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return colors[tag] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        RECEIVED: 'Commande reçue',
        PREPARING: 'En préparation',
        READY: 'Prête',
        SERVED: 'Servie',
    };
    return labels[status] || status;
}

export function getStatusStep(status: string): number {
    const steps: Record<string, number> = {
        RECEIVED: 0,
        PREPARING: 1,
        READY: 2,
        SERVED: 3,
    };
    return steps[status] ?? 0;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
