import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed cosmetics
  console.log('Creating cosmetics...');
  const cosmetics = [
    // Avatar frames
    { name: 'Bronze Frame', type: 'avatar_frame', unlockLevel: 1, assetUrl: '/cosmetics/frames/bronze.png' },
    { name: 'Silver Frame', type: 'avatar_frame', unlockLevel: 5, assetUrl: '/cosmetics/frames/silver.png' },
    { name: 'Gold Frame', type: 'avatar_frame', unlockLevel: 10, assetUrl: '/cosmetics/frames/gold.png' },
    { name: 'Diamond Frame', type: 'avatar_frame', unlockLevel: 25, assetUrl: '/cosmetics/frames/diamond.png' },
    
    // Brush styles
    { name: 'Chalk Brush', type: 'brush', unlockLevel: 3, assetUrl: '/cosmetics/brushes/chalk.png' },
    { name: 'Marker Brush', type: 'brush', unlockLevel: 7, assetUrl: '/cosmetics/brushes/marker.png' },
    { name: 'Watercolor Brush', type: 'brush', unlockLevel: 15, assetUrl: '/cosmetics/brushes/watercolor.png' },
    
    // Canvas themes
    { name: 'Blackboard Theme', type: 'canvas_theme', unlockLevel: 2, assetUrl: '/cosmetics/themes/blackboard.png' },
    { name: 'Paper Theme', type: 'canvas_theme', unlockLevel: 8, assetUrl: '/cosmetics/themes/paper.png' },
    { name: 'Whiteboard Theme', type: 'canvas_theme', unlockLevel: 12, assetUrl: '/cosmetics/themes/whiteboard.png' },
  ];

  for (const cosmetic of cosmetics) {
    const existing = await prisma.cosmetic.findFirst({
      where: { name: cosmetic.name },
    });

    if (!existing) {
      await prisma.cosmetic.create({
        data: cosmetic,
      });
    }
  }

  console.log(`✅ Created ${cosmetics.length} cosmetics`);

  // Seed default word packs
  console.log('Creating default word packs...');

  const wordPacks = [
    {
      name: 'General',
      description: 'Common everyday words for all ages',
      category: 'General',
      language: 'en',
      difficulty: 'mixed',
      isPublic: true,
      isCurated: true,
      words: {
        easy: ['cat', 'dog', 'sun', 'moon', 'tree', 'car', 'house', 'book', 'ball', 'star', 'fish', 'bird', 'flower', 'apple', 'chair', 'table', 'door', 'window', 'shoe', 'hat', 'cup', 'pen', 'key', 'clock', 'phone'],
        medium: ['guitar', 'bicycle', 'rainbow', 'mountain', 'ocean', 'castle', 'dragon', 'robot', 'pizza', 'camera', 'laptop', 'rocket', 'umbrella', 'butterfly', 'elephant', 'giraffe', 'penguin', 'volcano', 'treasure', 'pirate'],
        hard: ['telescope', 'microscope', 'parachute', 'submarine', 'helicopter', 'astronaut', 'dinosaur', 'pyramid', 'lighthouse', 'windmill', 'saxophone', 'trampoline', 'chandelier', 'escalator', 'aquarium'],
      },
    },
    {
      name: 'Animals',
      description: 'All kinds of animals from around the world',
      category: 'Animals',
      language: 'en',
      difficulty: 'mixed',
      isPublic: true,
      isCurated: true,
      words: {
        easy: ['cat', 'dog', 'fish', 'bird', 'cow', 'pig', 'duck', 'frog', 'bee', 'ant', 'bear', 'lion', 'tiger', 'wolf', 'fox', 'deer', 'mouse', 'rat', 'bat', 'owl', 'swan', 'crow', 'seal', 'crab', 'snail'],
        medium: ['elephant', 'giraffe', 'zebra', 'monkey', 'gorilla', 'panda', 'koala', 'kangaroo', 'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'jellyfish', 'butterfly', 'dragonfly', 'ladybug', 'spider', 'scorpion', 'lizard'],
        hard: ['rhinoceros', 'hippopotamus', 'chimpanzee', 'orangutan', 'chameleon', 'salamander', 'platypus', 'armadillo', 'porcupine', 'hedgehog', 'meerkat', 'lemur', 'sloth', 'anteater', 'flamingo'],
      },
    },
    {
      name: 'Food',
      description: 'Delicious foods and drinks',
      category: 'Food',
      language: 'en',
      difficulty: 'mixed',
      isPublic: true,
      isCurated: true,
      words: {
        easy: ['apple', 'banana', 'orange', 'grape', 'bread', 'milk', 'egg', 'cheese', 'rice', 'pasta', 'pizza', 'cake', 'cookie', 'candy', 'ice cream', 'water', 'juice', 'tea', 'coffee', 'soup', 'salad', 'sandwich', 'burger', 'fries', 'chicken'],
        medium: ['spaghetti', 'lasagna', 'burrito', 'taco', 'sushi', 'ramen', 'curry', 'steak', 'salmon', 'shrimp', 'lobster', 'oyster', 'avocado', 'broccoli', 'cauliflower', 'asparagus', 'mushroom', 'pumpkin', 'watermelon', 'pineapple'],
        hard: ['croissant', 'baguette', 'cappuccino', 'espresso', 'macchiato', 'tiramisu', 'bruschetta', 'quesadilla', 'enchilada', 'guacamole', 'hummus', 'falafel', 'couscous', 'quinoa', 'artichoke'],
      },
    },
    {
      name: 'Objects',
      description: 'Common household and everyday objects',
      category: 'Objects',
      language: 'en',
      difficulty: 'mixed',
      isPublic: true,
      isCurated: true,
      words: {
        easy: ['chair', 'table', 'bed', 'door', 'window', 'lamp', 'clock', 'phone', 'book', 'pen', 'pencil', 'paper', 'cup', 'plate', 'spoon', 'fork', 'knife', 'bottle', 'box', 'bag', 'key', 'lock', 'mirror', 'brush', 'towel'],
        medium: ['computer', 'keyboard', 'mouse', 'monitor', 'printer', 'camera', 'television', 'remote', 'speaker', 'headphones', 'microphone', 'guitar', 'piano', 'drum', 'trumpet', 'violin', 'umbrella', 'backpack', 'suitcase', 'wallet'],
        hard: ['chandelier', 'microscope', 'telescope', 'binoculars', 'thermometer', 'barometer', 'metronome', 'kaleidoscope', 'periscope', 'stethoscope', 'saxophone', 'accordion', 'harmonica', 'tambourine', 'xylophone'],
      },
    },
    {
      name: 'Actions',
      description: 'Verbs and activities',
      category: 'Actions',
      language: 'en',
      difficulty: 'mixed',
      isPublic: true,
      isCurated: true,
      words: {
        easy: ['run', 'walk', 'jump', 'sit', 'stand', 'sleep', 'eat', 'drink', 'read', 'write', 'draw', 'paint', 'sing', 'dance', 'play', 'swim', 'fly', 'drive', 'ride', 'climb', 'throw', 'catch', 'kick', 'push', 'pull'],
        medium: ['juggle', 'balance', 'stretch', 'exercise', 'meditate', 'celebrate', 'whisper', 'shout', 'laugh', 'cry', 'smile', 'frown', 'wave', 'point', 'clap', 'snap', 'stomp', 'march', 'skip', 'hop'],
        hard: ['somersault', 'cartwheel', 'handstand', 'backflip', 'pirouette', 'moonwalk', 'breakdance', 'tightrope', 'parachute', 'skateboard', 'snowboard', 'surfboard', 'kayak', 'parasail', 'bungee jump'],
      },
    },
  ];

  for (const pack of wordPacks) {
    let createdPack = await prisma.wordPack.findFirst({
      where: { name: pack.name },
    });

    if (!createdPack) {
      createdPack = await prisma.wordPack.create({
        data: {
          name: pack.name,
          description: pack.description,
          category: pack.category,
          language: pack.language,
          difficulty: pack.difficulty,
          isPublic: pack.isPublic,
          isCurated: pack.isCurated,
        },
      });
    }

    // Add words
    const allWords = [
      ...pack.words.easy.map((word) => ({ word, difficulty: 'easy' })),
      ...pack.words.medium.map((word) => ({ word, difficulty: 'medium' })),
      ...pack.words.hard.map((word) => ({ word, difficulty: 'hard' })),
    ];

    for (const wordData of allWords) {
      const existing = await prisma.word.findFirst({
        where: {
          packId: createdPack.id,
          word: wordData.word,
        },
      });

      if (!existing) {
        await prisma.word.create({
          data: {
            packId: createdPack.id,
            word: wordData.word,
            difficulty: wordData.difficulty,
          },
        });
      }
    }

    console.log(`✅ Created word pack: ${pack.name} with ${allWords.length} words`);
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
