import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    try {
        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            include: {
                categories: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        items: {
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                optionGroups: {
                                    orderBy: { sortOrder: 'asc' },
                                    include: {
                                        options: {
                                            orderBy: { sortOrder: 'asc' },
                                        },
                                    },
                                },
                                allergens: {
                                    include: {
                                        allergen: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        return NextResponse.json({
            restaurant: {
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                description: restaurant.description,
                address: restaurant.address,
                phone: restaurant.phone,
                logo: restaurant.logo,
                accentColor: restaurant.accentColor,
                themeMode: restaurant.themeMode,
                taxRate: restaurant.taxRate,
                currency: restaurant.currency,
                openingHours: restaurant.openingHours,
            },
            categories: restaurant.categories,
        });
    } catch (error) {
        console.error('Error fetching menu:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
