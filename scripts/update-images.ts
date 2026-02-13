
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const images: Record<string, string> = {
    // Entrées
    'Salade César': 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=2670&auto=format&fit=crop',
    'Velouté de Champignons': 'https://images.unsplash.com/photo-1620917670397-a361bc72e95a?q=80&w=2670&auto=format&fit=crop',
    'Entrecôte Grillée': 'https://images.unsplash.com/photo-1624795392257-25e25287f329?q=80&w=2670&auto=format&fit=crop',
    'Risotto aux Cèpes': 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=2670&auto=format&fit=crop',
    'Saumon Laqué Miso': 'https://images.unsplash.com/photo-1549420037-f131a4731a54?q=80&w=2670&auto=format&fit=crop',
    'Burger Le Jardin': 'https://images.unsplash.com/photo-1547592166-23acbe3a624b?q=80&w=2670&auto=format&fit=crop',
    'Tiramisu Classique': 'https://images.unsplash.com/photo-1571875257727-256c39da42af?q=80&w=2670&auto=format&fit=crop',
    'Limonade Artisanale': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=2670&auto=format&fit=crop',
};

async function main() {
    console.log('Update ALL item images with real URLs...');

    for (const [name, url] of Object.entries(images)) {
        await prisma.menuItem.updateMany({
            where: { name: { contains: name } },
            data: { image: url },
        });
        console.log(`Updated ${name}`);
    }

    console.log('Done!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
