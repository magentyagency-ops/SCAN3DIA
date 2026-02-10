import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['RECEIVED', 'PREPARING', 'READY', 'SERVED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const order = await prisma.order.update({
            where: { id },
            data: { status },
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

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
