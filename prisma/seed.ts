import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Clean existing data
    await prisma.orderItemOption.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.menuItemAllergen.deleteMany();
    await prisma.optionItem.deleteMany();
    await prisma.optionGroup.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.allergen.deleteMany();
    await prisma.category.deleteMany();
    await prisma.restaurantTable.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();

    // Create admin and kitchen users
    const admin = await prisma.user.create({
        data: {
            email: 'admin@menuflow.io',
            password: 'admin123',
            name: 'Admin',
            role: 'ADMIN',
        },
    });

    const kitchen = await prisma.user.create({
        data: {
            email: 'kitchen@menuflow.io',
            password: 'kitchen123',
            name: 'Chef Michel',
            role: 'CUISINE',
        },
    });

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
        data: {
            name: 'Le Jardin',
            slug: 'le-jardin',
            description: 'Cuisine française contemporaine dans un cadre élégant',
            address: '12 Rue de la Paix, 75002 Paris',
            phone: '+33 1 42 86 87 88',
            accentColor: '#E85D04',
            taxRate: 0.1,
            currency: '€',
            openingHours: 'Lun-Sam: 12h-14h30, 19h-23h',
        },
    });

    // Create allergens
    const allergenData = [
        { name: 'Gluten', icon: '🌾' },
        { name: 'Lait', icon: '🥛' },
        { name: 'Œufs', icon: '🥚' },
        { name: 'Poisson', icon: '🐟' },
        { name: 'Fruits à coque', icon: '🥜' },
        { name: 'Soja', icon: '🫘' },
        { name: 'Céleri', icon: '🥬' },
        { name: 'Crustacés', icon: '🦐' },
    ];

    const allergens: Record<string, string> = {};
    for (const a of allergenData) {
        const created = await prisma.allergen.create({
            data: { ...a, restaurantId: restaurant.id },
        });
        allergens[a.name] = created.id;
    }

    // Create categories
    const categories = await Promise.all([
        prisma.category.create({
            data: { name: 'Entrées', slug: 'entrees', sortOrder: 0, restaurantId: restaurant.id },
        }),
        prisma.category.create({
            data: { name: 'Plats', slug: 'plats', sortOrder: 1, restaurantId: restaurant.id },
        }),
        prisma.category.create({
            data: { name: 'Desserts', slug: 'desserts', sortOrder: 2, restaurantId: restaurant.id },
        }),
        prisma.category.create({
            data: { name: 'Boissons', slug: 'boissons', sortOrder: 3, restaurantId: restaurant.id },
        }),
    ]);

    const [entrees, plats, desserts, boissons] = categories;

    // Create menu items
    // --- ENTRÉES ---
    const saladeCesar = await prisma.menuItem.create({
        data: {
            name: 'Salade César',
            description: 'Romaine croquante, parmesan AOP, croûtons maison, sauce César onctueuse',
            price: 14.5,
            image: '/images/salade-cesar.jpg',
            tags: '["best-seller"]',
            isSignature: false,
            categoryId: entrees.id,
            sortOrder: 0,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: saladeCesar.id, allergenId: allergens['Gluten'] },
            { menuItemId: saladeCesar.id, allergenId: allergens['Lait'] },
            { menuItemId: saladeCesar.id, allergenId: allergens['Œufs'] },
        ],
    });

    const veloute = await prisma.menuItem.create({
        data: {
            name: 'Velouté de Champignons',
            description: 'Champignons de Paris et shiitakés, crème légère, huile de truffe',
            price: 12.0,
            image: '/images/veloute.jpg',
            tags: '["veggie"]',
            categoryId: entrees.id,
            sortOrder: 1,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: veloute.id, allergenId: allergens['Lait'] },
            { menuItemId: veloute.id, allergenId: allergens['Céleri'] },
        ],
    });

    const tartare = await prisma.menuItem.create({
        data: {
            name: 'Tartare de Saumon',
            description: 'Saumon frais Label Rouge, avocat, agrumes, sésame noir',
            price: 16.0,
            image: '/images/tartare.jpg',
            tags: '["new"]',
            categoryId: entrees.id,
            sortOrder: 2,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: tartare.id, allergenId: allergens['Poisson'] },
            { menuItemId: tartare.id, allergenId: allergens['Soja'] },
        ],
    });

    // --- PLATS ---
    const entrecote = await prisma.menuItem.create({
        data: {
            name: 'Entrecôte Grillée',
            description: 'Bœuf Black Angus 300g, beurre maître d\'hôtel, frites maison croustillantes',
            price: 32.0,
            image: '/images/entrecote.jpg',
            tags: '["best-seller","spicy"]',
            isSignature: true,
            categoryId: plats.id,
            sortOrder: 0,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: entrecote.id, allergenId: allergens['Lait'] },
        ],
    });

    // Option group: cooking
    const cookingGroup = await prisma.optionGroup.create({
        data: {
            name: 'Cuisson',
            type: 'radio',
            required: true,
            menuItemId: entrecote.id,
            sortOrder: 0,
        },
    });
    await prisma.optionItem.createMany({
        data: [
            { name: 'Bleu', priceDelta: 0, optionGroupId: cookingGroup.id, sortOrder: 0 },
            { name: 'Saignant', priceDelta: 0, isDefault: true, optionGroupId: cookingGroup.id, sortOrder: 1 },
            { name: 'À point', priceDelta: 0, optionGroupId: cookingGroup.id, sortOrder: 2 },
            { name: 'Bien cuit', priceDelta: 0, optionGroupId: cookingGroup.id, sortOrder: 3 },
        ],
    });

    // Option group: side
    const sideGroup = await prisma.optionGroup.create({
        data: {
            name: 'Accompagnement',
            type: 'radio',
            required: true,
            menuItemId: entrecote.id,
            sortOrder: 1,
        },
    });
    await prisma.optionItem.createMany({
        data: [
            { name: 'Frites maison', priceDelta: 0, isDefault: true, optionGroupId: sideGroup.id, sortOrder: 0 },
            { name: 'Salade verte', priceDelta: 0, optionGroupId: sideGroup.id, sortOrder: 1 },
            { name: 'Légumes grillés', priceDelta: 2.0, optionGroupId: sideGroup.id, sortOrder: 2 },
            { name: 'Purée truffée', priceDelta: 4.0, optionGroupId: sideGroup.id, sortOrder: 3 },
        ],
    });

    // Option group: extras
    const extrasGroup = await prisma.optionGroup.create({
        data: {
            name: 'Suppléments',
            type: 'checkbox',
            required: false,
            menuItemId: entrecote.id,
            sortOrder: 2,
        },
    });
    await prisma.optionItem.createMany({
        data: [
            { name: 'Sauce béarnaise', priceDelta: 2.5, optionGroupId: extrasGroup.id, sortOrder: 0 },
            { name: 'Sauce poivre', priceDelta: 2.5, optionGroupId: extrasGroup.id, sortOrder: 1 },
            { name: 'Foie gras poêlé', priceDelta: 8.0, optionGroupId: extrasGroup.id, sortOrder: 2 },
            { name: 'Œuf au plat', priceDelta: 2.0, optionGroupId: extrasGroup.id, sortOrder: 3 },
        ],
    });

    const risotto = await prisma.menuItem.create({
        data: {
            name: 'Risotto aux Cèpes',
            description: 'Riz carnaroli crémeux, cèpes de saison, parmesan 24 mois, persil frisé',
            price: 24.0,
            image: '/images/risotto.jpg',
            tags: '["veggie"]',
            categoryId: plats.id,
            sortOrder: 1,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: risotto.id, allergenId: allergens['Lait'] },
        ],
    });

    const saumon = await prisma.menuItem.create({
        data: {
            name: 'Saumon Laqué Miso',
            description: 'Pavé de saumon glacé au miso blanc, riz basmati, légumes croquants au wok',
            price: 28.0,
            image: '/images/saumon.jpg',
            tags: '["new","best-seller"]',
            categoryId: plats.id,
            sortOrder: 2,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: saumon.id, allergenId: allergens['Poisson'] },
            { menuItemId: saumon.id, allergenId: allergens['Soja'] },
        ],
    });

    const burger = await prisma.menuItem.create({
        data: {
            name: 'Burger Le Jardin',
            description: 'Bœuf Aubrac, cheddar affiné, bacon fumé, sauce maison, brioche toastée',
            price: 22.0,
            image: '/images/burger.jpg',
            tags: '["best-seller"]',
            categoryId: plats.id,
            sortOrder: 3,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: burger.id, allergenId: allergens['Gluten'] },
            { menuItemId: burger.id, allergenId: allergens['Lait'] },
            { menuItemId: burger.id, allergenId: allergens['Œufs'] },
        ],
    });

    // Burger options
    const burgerExtras = await prisma.optionGroup.create({
        data: {
            name: 'Suppléments',
            type: 'checkbox',
            required: false,
            menuItemId: burger.id,
            sortOrder: 0,
        },
    });
    await prisma.optionItem.createMany({
        data: [
            { name: 'Double steak', priceDelta: 5.0, optionGroupId: burgerExtras.id, sortOrder: 0 },
            { name: 'Bacon supplémentaire', priceDelta: 2.0, optionGroupId: burgerExtras.id, sortOrder: 1 },
            { name: 'Avocat', priceDelta: 3.0, optionGroupId: burgerExtras.id, sortOrder: 2 },
        ],
    });

    // --- DESSERTS ---
    const tiramisu = await prisma.menuItem.create({
        data: {
            name: 'Tiramisu Classique',
            description: 'Mascarpone onctueux, biscuits imbibés de café, cacao amer',
            price: 11.0,
            image: '/images/tiramisu.jpg',
            tags: '["best-seller"]',
            categoryId: desserts.id,
            sortOrder: 0,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: tiramisu.id, allergenId: allergens['Gluten'] },
            { menuItemId: tiramisu.id, allergenId: allergens['Lait'] },
            { menuItemId: tiramisu.id, allergenId: allergens['Œufs'] },
        ],
    });

    const fondant = await prisma.menuItem.create({
        data: {
            name: 'Fondant au Chocolat',
            description: 'Chocolat noir 70% Valrhona, cœur coulant, glace vanille de Madagascar',
            price: 13.0,
            image: '/images/fondant.jpg',
            tags: '["spicy"]',
            isSignature: false,
            categoryId: desserts.id,
            sortOrder: 1,
        },
    });
    await prisma.menuItemAllergen.createMany({
        data: [
            { menuItemId: fondant.id, allergenId: allergens['Gluten'] },
            { menuItemId: fondant.id, allergenId: allergens['Lait'] },
            { menuItemId: fondant.id, allergenId: allergens['Œufs'] },
        ],
    });

    // --- BOISSONS ---
    const limonade = await prisma.menuItem.create({
        data: {
            name: 'Limonade Artisanale',
            description: 'Citron pressé, menthe fraîche, sucre de canne, eau pétillante',
            price: 6.5,
            image: '/images/limonade.jpg',
            tags: '["veggie"]',
            categoryId: boissons.id,
            sortOrder: 0,
        },
    });

    // Create tables
    await prisma.restaurantTable.createMany({
        data: [
            { tableCode: 'T1', label: 'Table 1', restaurantId: restaurant.id },
            { tableCode: 'T2', label: 'Table 2', restaurantId: restaurant.id },
            { tableCode: 'T3', label: 'Table 3', restaurantId: restaurant.id },
        ],
    });

    console.log('✅ Seed data created successfully!');
    console.log(`   Restaurant: ${restaurant.name} (/${restaurant.slug})`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Menu items: 10`);
    console.log(`   Tables: 3`);
    console.log(`   Users: admin (admin@menuflow.io) + kitchen (kitchen@menuflow.io)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
