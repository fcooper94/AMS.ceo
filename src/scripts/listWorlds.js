require('dotenv').config();
const { World } = require('../models');

async function listWorlds() {
  try {
    const worlds = await World.findAll({
      order: [['createdAt', 'DESC']]
    });

    console.log('\n=== WORLDS ===');
    if (worlds.length === 0) {
      console.log('No worlds found in database.');
    } else {
      console.log(`Found ${worlds.length} world(s):\n`);
      worlds.forEach((world, index) => {
        console.log(`${index + 1}. ${world.name}`);
        console.log(`   ID: ${world.id}`);
        console.log(`   Status: ${world.status}`);
        console.log(`   Era: ${world.era}`);
        console.log(`   Max Players: ${world.maxPlayers}`);
        console.log(`   Created: ${world.createdAt}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error listing worlds:', error);
    process.exit(1);
  }
}

listWorlds();
