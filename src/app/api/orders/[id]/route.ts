import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const order = await prisma.order.findUnique({
            where: { id },
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

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
