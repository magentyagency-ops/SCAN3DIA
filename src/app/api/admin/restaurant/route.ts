
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, slug, ...data } = body;

        // If specific ID not provided, try to find by slug or default
        const where = id ? { id } : { slug: slug || 'le-jardin' };

        const restaurant = await prisma.restaurant.update({
            where,
            data,
        });

        return NextResponse.json(restaurant);
    } catch (error) {
        console.error('Error updating restaurant settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
