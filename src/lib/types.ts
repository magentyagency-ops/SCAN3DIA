// ---- API Response Types ----

export interface Restaurant {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    logo: string | null;
    accentColor: string;
    secondaryColor?: string;
    themeMode?: 'LIGHT' | 'DARK';
    font?: string;
    taxRate: number;
    currency: string;
    openingHours: string | null;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    items: MenuItem[];
}

export interface MenuItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    mediaType: string;
    mediaUrl: string | null;
    modelUrl: string | null;
    iosModelUrl: string | null;
    isAvailable: boolean;
    isSignature: boolean;
    tags: string | null;
    sortOrder: number;
    categoryId: string;
    optionGroups: OptionGroup[];
    allergens: AllergenInfo[];
}

export interface OptionGroup {
    id: string;
    name: string;
    type: 'radio' | 'checkbox';
    required: boolean;
    sortOrder: number;
    options: OptionItem[];
}

export interface OptionItem {
    id: string;
    name: string;
    priceDelta: number;
    isDefault: boolean;
    sortOrder: number;
}

export interface AllergenInfo {
    allergen: {
        id: string;
        name: string;
        icon: string | null;
    };
}

export interface MenuData {
    restaurant: Restaurant;
    categories: Category[];
}

// ---- Cart Types ----

export interface CartItemOption {
    optionItemId: string;
    optionItemName: string;
    optionGroupName: string;
    priceDelta: number;
}

export interface CartItem {
    id: string; // unique cart item id
    menuItemId: string;
    menuItemName: string;
    menuItemImage: string | null;
    basePrice: number;
    quantity: number;
    notes: string;
    selectedOptions: CartItemOption[];
    exclusions: string[];
    totalPrice: number; // basePrice + optionDeltas * quantity
}

export interface Cart {
    items: CartItem[];
    restaurantSlug: string;
    tableCode: string;
}

// ---- Order Types ----

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'SERVED';

export interface Order {
    id: string;
    orderNumber: number;
    status: OrderStatus;
    total: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    table: {
        label: string;
        tableCode: string;
    };
    items: OrderItemDetail[];
}

export interface OrderItemDetail {
    id: string;
    quantity: number;
    unitPrice: number;
    notes: string | null;
    menuItem: {
        id: string;
        name: string;
        image: string | null;
        allergens: AllergenInfo[];
    };
    options: {
        optionItem: {
            id: string;
            name: string;
            priceDelta: number;
            optionGroup: {
                name: string;
            };
        };
    }[];
}
