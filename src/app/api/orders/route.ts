import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { restaurantSlug, tableCode, items, notes } = body;

        // Find restaurant
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug: restaurantSlug },
        });
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        // Find table
        const table = await prisma.restaurantTable.findUnique({
            where: {
                restaurantId_tableCode: {
                    restaurantId: restaurant.id,
                    tableCode,
                },
            },
        });
        if (!table) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 });
        }

        // Get next order number
        const lastOrder = await prisma.order.findFirst({
            where: { restaurantId: restaurant.id },
            orderBy: { orderNumber: 'desc' },
        });
        const orderNumber = (lastOrder?.orderNumber || 0) + 1;

        // Calculate total
        let total = 0;
        for (const item of items) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId },
            });
            if (!menuItem) continue;

            let itemTotal = menuItem.price;
            if (item.selectedOptions) {
                for (const optId of item.selectedOptions) {
                    const opt = await prisma.optionItem.findUnique({ where: { id: optId } });
                    if (opt) itemTotal += opt.priceDelta;
                }
            }
            total += itemTotal * (item.quantity || 1);
        }

        // Apply tax
        total = Math.round(total * (1 + restaurant.taxRate) * 100) / 100;

        // Create order
        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: 'RECEIVED',
                total,
                notes: notes || null,
                restaurantId: restaurant.id,
                tableId: table.id,
                items: {
                    create: items.map((item: any) => ({
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        notes: item.notes || null,
                        menuItemId: item.menuItemId,
                        options: {
                            create: (item.selectedOptions || []).map((optId: string) => ({
                                optionItemId: optId,
                            })),
                        },
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        menuItem: true,
                        options: {
                            include: {
                                optionItem: true,
                            },
                        },
                    },
                },
                table: true,
            },
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get('restaurantSlug');

    if (!restaurantSlug) {
        return NextResponse.json({ error: 'restaurantSlug required' }, { status: 400 });
    }

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug: restaurantSlug },
        });
        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        const orders = await prisma.order.findMany({
            where: { restaurantId: restaurant.id },
            orderBy: { createdAt: 'desc' },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            include: {
                                allergens: {
                                    include: { allergen: true },
                                },
                            },
                        },
                        options: {
                            include: {
                                optionItem: {
                                    include: {
                                        optionGroup: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
