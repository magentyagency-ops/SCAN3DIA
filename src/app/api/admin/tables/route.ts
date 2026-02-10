import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('restaurantSlug') || 'le-jardin';

    const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
    });
    if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const tables = await prisma.restaurantTable.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { createdAt: 'asc' },
        include: {
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    total: true,
                    createdAt: true,
                },
            },
        },
    });

    return NextResponse.json(tables);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurantSlug, tableCode, label } = body;

        const restaurant = await prisma.restaurant.findUnique({
            where: { slug: restaurantSlug || 'le-jardin' },
        });
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const table = await prisma.restaurantTable.create({
            data: {
                tableCode,
                label,
                restaurantId: restaurant.id,
            },
        });

        return NextResponse.json(table, { status: 201 });
    } catch (error) {
        console.error('Error creating table:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    try {
        await prisma.restaurantTable.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting table:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
