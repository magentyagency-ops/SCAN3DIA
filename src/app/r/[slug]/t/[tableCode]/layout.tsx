'use client';

import { CartProvider } from '@/lib/cart-store';
import { ReactNode } from 'react';

export default function RestaurantLayout({ children }: { children: ReactNode }) {
    return <CartProvider>{children}</CartProvider>;
}
