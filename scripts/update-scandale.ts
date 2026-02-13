
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const updates = [
    { term: 'Salade César', img: '/images/cesar.png' },
    { term: 'Velouté', img: '/images/veloute.png' },
    { term: 'Tartare', img: '/images/tartare.png' },
    { term: 'Entrecôte', img: '/images/entrecote.png', modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' },
    { term: 'Risotto', img: '/images/risotto.png' },
    { term: 'Burger', img: '/images/burger.png' },
    { term: 'Tiramisu', img: '/images/tiramisu.png' },
    // Use proven Unsplash URLs for failures
    { term: 'Saumon Laqué', img: 'https://images.unsplash.com/photo-1549420037-f131a4731a54?q=80&w=800&auto=format&fit=crop' },
    { term: 'Fondant', img: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=800&auto=format&fit=crop' },
    { term: 'Limonade', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop' },
];

async function main() {
    console.log('Updating restaurant name to "ScanDalle"...');
    await prisma.restaurant.updateMany({
        where: { slug: 'le-jardin' },
        data: { name: 'ScanDalle' }
    });
    console.log('Renamed.');

    console.log('Updating images...');
    for (const u of updates) {
        await prisma.menuItem.updateMany({
            where: { name: { contains: u.term } },
            data: {
                image: u.img,
                modelUrl: (u as any).modelUrl || null
            }
        });
        console.log(`Updated ${u.term}`);
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
