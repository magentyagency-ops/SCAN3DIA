
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const restaurantCount = await prisma.restaurant.count();
        console.log(`Restaurants found: ${restaurantCount}`);

        if (restaurantCount > 0) {
            const restaurants = await prisma.restaurant.findMany({
                select: { name: true, slug: true }
            });
            console.log('Restaurant list:', JSON.stringify(restaurants, null, 2));
        } else {
            console.log('NO RESTAURANTS FOUND IN DATABASE.');
        }
    } catch (error) {
        console.error('DATABASE ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
