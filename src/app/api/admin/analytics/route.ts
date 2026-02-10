import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('restaurantSlug') || 'le-jardin';

    const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
        where: {
            restaurantId: restaurant.id,
            createdAt: { gte: today },
        },
        include: {
            items: {
                include: {
                    menuItem: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Revenue
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);

    // Order count
    const orderCount = orders.length;

    // Average basket
    const avgBasket = orderCount > 0 ? revenue / orderCount : 0;

    // Top dishes
    const dishCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of orders) {
        for (const item of order.items) {
            const key = item.menuItemId;
            if (!dishCounts[key]) {
                dishCounts[key] = { name: item.menuItem.name, count: 0, revenue: 0 };
            }
            dishCounts[key].count += item.quantity;
            dishCounts[key].revenue += item.unitPrice * item.quantity;
        }
    }
    const topDishes = Object.values(dishCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Peak hours
    const hourCounts: Record<number, number> = {};
    for (const order of orders) {
        const hour = new Date(order.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const peakHours = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourCounts[i] || 0,
    }));

    // All-time stats
    const allOrders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id },
        include: {
            items: { include: { menuItem: true } },
        },
    });

    const allRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    const allOrderCount = allOrders.length;
    const allAvgBasket = allOrderCount > 0 ? allRevenue / allOrderCount : 0;

    const allDishCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of allOrders) {
        for (const item of order.items) {
            const key = item.menuItemId;
            if (!allDishCounts[key]) {
                allDishCounts[key] = { name: item.menuItem.name, count: 0, revenue: 0 };
            }
            allDishCounts[key].count += item.quantity;
            allDishCounts[key].revenue += item.unitPrice * item.quantity;
        }
    }
    const allTopDishes = Object.values(allDishCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return NextResponse.json({
        today: {
            revenue: Math.round(revenue * 100) / 100,
            orderCount,
            avgBasket: Math.round(avgBasket * 100) / 100,
            topDishes,
            peakHours,
        },
        allTime: {
            revenue: Math.round(allRevenue * 100) / 100,
            orderCount: allOrderCount,
            avgBasket: Math.round(allAvgBasket * 100) / 100,
            topDishes: allTopDishes,
        },
    });
}
