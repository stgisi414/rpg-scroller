/**
 * WorldFactions.js — Political World Data Layer
 * 
 * Defines the 6 Known World kingdoms, their ruling factions, leaders, court members,
 * inter-faction relationships, and lore. Also provides lookup functions for zone → kingdom mapping.
 * 
 * Frontier kingdoms beyond the Known World are generated dynamically by Gemini
 * and stored in saveData.discoveredKingdoms.
 */

// ============================================================
// KINGDOMS — The Known World
// ============================================================
WORLD_KINGDOMS = {
    duskveil: {
        id: 'duskveil',
        name: 'Kingdom of Duskveil',
        zoneRange: [-48, -25],
        capital: -36,
        biomes: ['Deadwoods', 'Dungeon'],
        rulingFaction: 'shadow_covenant',
        exportGoods: ['herbs'],
        importGoods: ['wheat', 'whiskey'],
        lore: 'A cursed realm shrouded in perpetual twilight, where the dead do not rest and the living rule through fear. The Shadow Covenant seized power centuries ago through necromancy and assassination, building their empire on the bones of the old nobility.'
    },
    embercrown: {
        id: 'embercrown',
        name: 'Embercrown Dominion',
        zoneRange: [-24, -9],
        capital: -16,
        biomes: ['Hell', 'Cave'],
        rulingFaction: 'infernal_pact',
        exportGoods: ['iron_ore'],
        importGoods: ['spices', 'silk'],
        lore: 'A volcanic wasteland where rivers of magma carve through obsidian caverns. The Infernal Pact — an alliance of demon-worshipping warlords — rules through sheer infernal power. Those who resist are cast into the Ember Pits.'
    },
    willowbrook: {
        id: 'willowbrook',
        name: 'Kingdom of Willowbrook',
        zoneRange: [-8, 16],
        capital: 0,
        biomes: ['Forest', 'Plains'],
        rulingFaction: 'crown_of_willowbrook',
        exportGoods: ['wheat', 'herbs'],
        importGoods: ['iron_ore', 'silk'],
        lore: 'The ancient seat of the Elden Kings, where the Elden Soul was first discovered in the roots of the Great Willow. For twelve generations the Crown has kept the peace, though shadows grow long at the borders and the High Mages of Ashenmoor covet the Elden power.'
    },
    ashenmoor: {
        id: 'ashenmoor',
        name: 'Ashenmoor Dominion',
        zoneRange: [17, 48],
        capital: 32,
        biomes: ['Cave', 'Desert'],
        rulingFaction: 'high_mage_council',
        exportGoods: ['silk'],
        importGoods: ['wheat', 'whiskey'],
        lore: 'Once ruled by a line of warrior-kings, Ashenmoor fell to the High Mage Council in a bloodless coup. The archmages claim to rule for the people\'s enlightenment, but their obsession with forbidden magic grows darker with each passing year. The desert hides ancient ruins brimming with arcane secrets.'
    },
    frosthold: {
        id: 'frosthold',
        name: 'Jarldom of Frosthold',
        zoneRange: [49, 68],
        capital: 56,
        biomes: ['Winter'],
        rulingFaction: 'frost_jarls',
        exportGoods: ['iron_ore', 'whiskey'],
        importGoods: ['salt', 'spices'],
        lore: 'A harsh frozen realm where only the strongest survive. The Frost Jarls rule through ancient tradition and martial prowess, their great mead halls carved from glacial ice. They respect strength above all else and have little patience for southern politics or mage-craft.'
    },
    tidereach: {
        id: 'tidereach',
        name: 'Republic of Tidereach',
        zoneRange: [69, 88],
        capital: 80,
        biomes: ['Coastal', 'Plains'],
        rulingFaction: 'merchant_league',
        exportGoods: ['salt', 'spices'],
        importGoods: ['iron_ore', 'whiskey'],
        lore: 'The wealthiest nation in the Known World, governed not by a king but by the Merchant League — a council of the richest trading families. Their fleets control the coastal trade routes, and their coin buys influence in every kingdom. In Tidereach, gold is the only true crown.'
    },
    heaven: {
        id: 'heaven',
        name: 'The Celestial Heavens',
        zoneRange: [777, 777],
        capital: 777,
        biomes: ['Heaven'],
        rulingFaction: 'order_of_seraphim',
        exportGoods: ['celestial_ambrosia'],
        importGoods: ['herbs'],
        lore: 'A realm of absolute light, floating islands, and pearlescent clouds. The Order of the Seraphim maintains the celestial balance, guiding righteous souls and guarding the gates of eternal peace.'
    },
    hell: {
        id: 'hell',
        name: 'The Infernal Abyss',
        zoneRange: [-666, -666],
        capital: -666,
        biomes: ['Hell'],
        rulingFaction: 'legion_of_damnation',
        exportGoods: ['abyssal_brimstone'],
        importGoods: ['whiskey'],
        lore: 'A subterranean pit of fire, brimstone, and obsidian spikes. The Legion of Damnation rules here, punishing wicked souls and plotting to overthrow the mortal kingdoms.'
    }
};

// ============================================================
// FACTIONS — Political Organizations
// ============================================================
window.WORLD_FACTIONS = {
    crown_of_willowbrook: {
        id: 'crown_of_willowbrook',
        name: 'The Crown of Willowbrook',
        type: 'royalty',
        alignment: 'Good',
        kingdom: 'willowbrook',
        leader: {
            name: 'King Aldric III',
            title: 'High King',
            gender: 'male',
            spriteKey: 'human_king',
            persona: 'The wise and just High King of Willowbrook, burdened by the growing darkness at his borders. He seeks champions to defend the realm and uphold the ancient laws of the Elden Kings.'
        },
        court: [
            { name: 'Princess Seraphina', title: 'Crown Princess', role: 'heir', gender: 'female', spriteKey: 'custom_townsfolk', persona: 'The beautiful and sharp-witted heir to the Willowbrook throne. Behind her courtly grace lies a fierce political mind and a secret passion for swordplay.' },
            { name: 'Lord Commander Gareth', title: 'Knight Commander', role: 'military', gender: 'male', spriteKey: 'knight', persona: 'A grizzled veteran who commands the King\'s armies. Fiercely loyal to the Crown and suspicious of all outsiders, especially mages.' },
            { name: 'Archmaester Rowan', title: 'Royal Advisor', role: 'advisor', gender: 'male', spriteKey: 'wizard', persona: 'The King\'s most trusted advisor, a scholar of ancient lore. He walks the thin line between the Crown and the Mage Council, trusted by neither completely.' }
        ],
        relations: {
            high_mage_council: -30,
            shadow_covenant: -80,
            merchant_league: 50,
            frost_jarls: 10,
            infernal_pact: -90,
            free_blades: 20
        },
        lore: 'The Willowbrook Crown has ruled for twelve generations, their authority rooted in the discovery of the Elden Soul. They champion justice and order, though critics whisper that their righteousness blinds them to the changing world.',
        colors: { primary: '#4A90D9', secondary: '#FFD700' }
    },

    high_mage_council: {
        id: 'high_mage_council',
        name: 'The High Mage Council',
        type: 'mage_order',
        alignment: 'Neutral',
        kingdom: 'ashenmoor',
        leader: {
            name: 'Archmage Vespera',
            title: 'Grand Magister',
            gender: 'female',
            spriteKey: 'wizard',
            persona: 'The enigmatic Grand Magister of the High Mage Council. She overthrew the Ashenmoor nobility with a single spell and now rules through arcane supremacy. Brilliant, calculating, and utterly convinced that mage-rule is humanity\'s best hope.'
        },
        court: [
            { name: 'Enchantress Lyra', title: 'Keeper of Secrets', role: 'intelligence', gender: 'female', spriteKey: 'wizard', persona: 'The Council\'s spymaster, who weaves illusion magic to gather intelligence from every corner of the Known World. She knows things about you that you\'ve forgotten yourself.' },
            { name: 'Battlemage Theron', title: 'War Caster', role: 'military', gender: 'male', spriteKey: 'wizard', persona: 'A devastating combat mage who commands the Council\'s arcane army. He believes magic should be used as a weapon, not hoarded in libraries.' },
            { name: 'Sage Maren', title: 'Lorekeeper', role: 'advisor', gender: 'female', spriteKey: 'custom_townsfolk', persona: 'The eldest member of the Council, keeper of the great library of Ashenmoor. She remembers the old kings and sometimes wonders if the coup was truly justified.' }
        ],
        relations: {
            crown_of_willowbrook: -30,
            shadow_covenant: -20,
            merchant_league: 40,
            frost_jarls: -10,
            infernal_pact: -40,
            free_blades: 10
        },
        lore: 'The High Mage Council seized power from the Ashenmoor nobility in a single night of arcane fire. They claim to rule for enlightenment and progress, but their experiments grow ever more dangerous, and the desert hides the scars of their failed rituals.',
        colors: { primary: '#9B59B6', secondary: '#E8D5F5' }
    },

    frost_jarls: {
        id: 'frost_jarls',
        name: 'The Frost Jarls',
        type: 'royalty',
        alignment: 'Neutral',
        kingdom: 'frosthold',
        leader: {
            name: 'Jarl Sigrid Ironblood',
            title: 'High Jarl',
            gender: 'female',
            spriteKey: 'samurai',
            persona: 'The fearsome High Jarl of Frosthold, who won her throne by defeating every challenger in single combat. She rules with iron will and ancient tradition, despising magic and political games in equal measure.'
        },
        court: [
            { name: 'Skald Bjorn', title: 'Lorekeeper of the Frost', role: 'advisor', gender: 'male', spriteKey: 'custom_townsfolk', persona: 'The ancient bard who keeps the oral histories of every Jarl who ever lived. His songs can inspire warriors to feats of impossible bravery or reduce hardened fighters to tears.' },
            { name: 'Shieldmaiden Astrid', title: 'War Chief', role: 'military', gender: 'female', spriteKey: 'knight', persona: 'The fiercest warrior in Frosthold after the High Jarl herself. She leads the Frost Guard — elite warriors who patrol the frozen borders and repel all invaders.' }
        ],
        relations: {
            crown_of_willowbrook: 10,
            high_mage_council: -10,
            merchant_league: 30,
            shadow_covenant: -60,
            infernal_pact: -70,
            free_blades: 40
        },
        lore: 'The Frost Jarls have ruled the frozen north since before recorded history. Their great mead halls echo with songs of glory, and their warriors fear nothing — not cold, not death, not the dark magic of the south.',
        colors: { primary: '#5DADE2', secondary: '#AED6F1' }
    },

    merchant_league: {
        id: 'merchant_league',
        name: 'The Merchant League',
        type: 'guild',
        alignment: 'Neutral',
        kingdom: 'tidereach',
        leader: {
            name: 'Guildmaster Cassius Vane',
            title: 'Grand Merchant',
            gender: 'male',
            spriteKey: 'ranger',
            persona: 'The wealthiest man in the Known World and master of the Merchant League. He built his empire from nothing and now controls trade routes spanning every kingdom. Charming, ruthless, and utterly pragmatic — his only loyalty is to profit.'
        },
        court: [
            { name: 'Harbormaster Thea', title: 'Mistress of Trade', role: 'logistics', gender: 'female', spriteKey: 'custom_townsfolk', persona: 'The brilliant administrator who manages all of Tidereach\'s ports and trade routes. She can calculate tariffs faster than most people can count to ten.' },
            { name: 'Captain Roderick Drake', title: 'Fleet Admiral', role: 'military', gender: 'male', spriteKey: 'knight', persona: 'The seasoned naval commander who protects the Merchant League\'s trade fleets. Half pirate, half admiral, wholly dangerous.' }
        ],
        relations: {
            crown_of_willowbrook: 50,
            high_mage_council: 40,
            frost_jarls: 30,
            shadow_covenant: -10,
            infernal_pact: -30,
            free_blades: 60
        },
        lore: 'In Tidereach, the Merchant League IS the government. Their fleets control the seas, their coin flows through every kingdom, and their trade agreements are more binding than any treaty. They care little for alignment — only for gold.',
        colors: { primary: '#F39C12', secondary: '#FDEBD0' }
    },

    shadow_covenant: {
        id: 'shadow_covenant',
        name: 'The Shadow Covenant',
        type: 'cult',
        alignment: 'Evil',
        kingdom: 'duskveil',
        leader: {
            name: 'The Veiled One',
            title: 'Shadowlord',
            gender: 'unknown',
            spriteKey: 'wizard',
            persona: 'No one has seen the face of the Shadowlord and lived to describe it. The Veiled One rules Duskveil from the obsidian throne, commanding legions of undead and a network of assassins that reaches into every kingdom. Their voice is a whisper that carries the weight of death.'
        },
        court: [
            { name: 'Whisper', title: 'Master of Assassins', role: 'intelligence', gender: 'male', spriteKey: 'custom_townsfolk', persona: 'The Shadow Covenant\'s deadliest agent. No one knows his true name, face, or how many kings he has killed. He speaks only in riddles and moves like smoke.' },
            { name: 'Gravecaller Morrigan', title: 'Archnecromancer', role: 'military', gender: 'female', spriteKey: 'wizard', persona: 'A powerful necromancer who commands the Covenant\'s undead armies. She believes death is not an ending but a promotion, and she\'s eager to promote everyone she meets.' }
        ],
        relations: {
            crown_of_willowbrook: -80,
            high_mage_council: -20,
            frost_jarls: -60,
            merchant_league: -10,
            infernal_pact: 40,
            free_blades: -30
        },
        lore: 'The Shadow Covenant rose from the ashes of a destroyed kingdom, its survivors turning to necromancy and shadow magic to reclaim power. They rule Duskveil through terror and undeath, and their assassins are feared across the Known World.',
        colors: { primary: '#2C3E50', secondary: '#7F8C8D' }
    },

    infernal_pact: {
        id: 'infernal_pact',
        name: 'The Infernal Pact',
        type: 'cult',
        alignment: 'Evil',
        kingdom: 'embercrown',
        leader: {
            name: 'Archdevil Malachar',
            title: 'Pact Lord',
            gender: 'male',
            spriteKey: 'knight',
            persona: 'A warlord who sold his soul for infernal power and now rules Embercrown as a living conduit of hellfire. His body burns with demonic flame, and his word is law in the volcanic wastes. He seeks to expand the Pact\'s dominion into the mortal kingdoms.'
        },
        court: [
            { name: 'Succubus Velaris', title: 'The Temptress', role: 'intelligence', gender: 'female', spriteKey: 'custom_townsfolk', persona: 'A silver-tongued manipulator who corrupts the courts of other kingdoms from within. Her beauty is a weapon, and her whispers have toppled more than one noble house.' },
            { name: 'Hellknight Drazak', title: 'Infernal Champion', role: 'military', gender: 'male', spriteKey: 'knight', persona: 'A demonic knight encased in burning armor who commands the Pact\'s infernal legions. He lives only for battle and considers mercy the greatest sin.' }
        ],
        relations: {
            crown_of_willowbrook: -90,
            high_mage_council: -40,
            frost_jarls: -70,
            merchant_league: -30,
            shadow_covenant: 40,
            free_blades: -50
        },
        lore: 'The Infernal Pact was forged in hellfire — an alliance of demon-worshipping warlords who opened a permanent rift to the infernal plane. Embercrown\'s volcanic landscape is both natural and supernatural, shaped by the demonic energies that seep through the rift.',
        colors: { primary: '#E74C3C', secondary: '#FADBD8' }
    },

    free_blades: {
        id: 'free_blades',
        name: 'The Free Blades',
        type: 'guild',
        alignment: 'Neutral',
        kingdom: null, // No homeland — operate across all kingdoms
        leader: {
            name: 'Commander Sylas Reed',
            title: 'Blade Commander',
            gender: 'male',
            spriteKey: 'ranger',
            persona: 'The charismatic leader of the Free Blades mercenary company. He fights for coin, not causes, and has served — and betrayed — nearly every faction in the Known World at least once. Somehow, they all keep hiring him back.'
        },
        court: [
            { name: 'Iron Marta', title: 'Quartermaster', role: 'logistics', gender: 'female', spriteKey: 'knight', persona: 'The Free Blades\' gruff quartermaster who manages contracts, supplies, and payroll. Cross her on payment and you\'ll find your bed full of scorpions.' }
        ],
        relations: {
            crown_of_willowbrook: 20,
            high_mage_council: 10,
            frost_jarls: 40,
            merchant_league: 60,
            shadow_covenant: -30,
            infernal_pact: -50
        },
        lore: 'The Free Blades are the largest mercenary company in the Known World, with chapters in every kingdom. They fight for whoever pays the most, maintain strict neutrality in political conflicts, and never break a contract — unless someone offers double.',
        colors: { primary: '#27AE60', secondary: '#D5F5E3' }
    },
    order_of_seraphim: {
        id: 'order_of_seraphim',
        name: 'The Order of the Seraphim',
        type: 'royalty',
        alignment: 'Good',
        kingdom: 'heaven',
        leader: {
            name: 'Gabriel',
            title: 'Archangel',
            gender: 'male',
            spriteKey: 'heavenly_archangel',
            persona: 'An elegant, brilliant seraph of light who speaks with immense warmth, divine authority, and eternal grace. Guided by the Elden Willow, they protect all righteous souls.'
        },
        court: [
            { name: 'Archangel Michael', title: 'Commander of Host', role: 'military', gender: 'male', spriteKey: 'heavenly_archangel', persona: 'The supreme military leader of the heavenly host. He commands the archangels and valkyries in battle, standing as a bulwark against the darkness with absolute conviction.' },
            { name: 'Seraphina', title: 'Keeper of Light', role: 'advisor', gender: 'female', spriteKey: 'heavenly_seraph', persona: 'A radiant six-winged seraph who maintains the celestial archive and guides mortal souls on their spiritual journeys.' },
            { name: 'Valkyrie Lyra', title: 'Guardian of Souls', role: 'guardian', gender: 'female', spriteKey: 'heavenly_valkyrie', persona: 'A legendary armored valkyrie who guides the spirits of fallen heroes to the eternal halls.' },
            { name: 'Cherub Pippin', title: 'Divine Messenger', role: 'messenger', gender: 'male', spriteKey: 'heavenly_cherub', persona: 'A small, cheerful golden cherub who delivers divine decrees and scrolls throughout the celestial kingdom.' }
        ],
        relations: {
            crown_of_willowbrook: 60,
            legion_of_damnation: -100,
            shadow_covenant: -80,
            high_mage_council: 20
        },
        lore: 'The angelic protectors of light and balance, guiding souls and defending the cosmos from hellfire incursions.',
        colors: { primary: '#F1C40F', secondary: '#FDFEFE' }
    },
    legion_of_damnation: {
        id: 'legion_of_damnation',
        name: 'The Legion of Damnation',
        type: 'royalty',
        alignment: 'Evil',
        kingdom: 'hell',
        leader: {
            name: 'Astaroth',
            title: 'Infernal Lord',
            gender: 'male',
            spriteKey: 'the_devil',
            persona: 'A towering arch-demon of fire and obsidian who speaks with dark majesty, cold intellect, and burning hatred for the light. They enforce the punishments of Hell.'
        },
        court: [
            { name: 'Baal', title: 'Grand Executioner', role: 'military', gender: 'male', spriteKey: 'old_demon', persona: 'A gargantuan demon of brute force and iron chains. He executes the sentences of the damned and enjoys crushing enemies of the abyss.' },
            { name: 'Lilith', title: 'Seductress of Souls', role: 'advisor', gender: 'female', spriteKey: 'female_damned', persona: 'A cunning succubus who whispers corrupting thoughts into the hearts of mortal rulers to bring down empires.' },
            { name: 'Belial', title: 'Master of Deceit', role: 'heir', gender: 'male', spriteKey: 'twisted_damned', persona: 'A twisted and shadowy demon lord who orchestrates the dark covenants and demonic pacts across the mortal world.' },
            { name: 'Moloch', title: 'Bringer of Ruin', role: 'guardian', gender: 'male', spriteKey: 'burning_damned', persona: 'A flaming demon of absolute destruction, cloaked in hellfire and magma.' }
        ],
        relations: {
            order_of_seraphim: -100,
            infernal_pact: 80,
            crown_of_willowbrook: -90,
            shadow_covenant: 40
        },
        lore: 'Demon-lords and executioners who harvest dark energy and enforce the eternal punishments of the underworld.',
        colors: { primary: '#C0392B', secondary: '#1A0B0B' }
    }
};

// ============================================================
// LOOKUP FUNCTIONS
// ============================================================

/**
 * Returns the kingdom object for a given zone index, or null if the zone is in the Frontier.
 */
window.getKingdomForZone = function(zoneIndex) {
    // Check known world kingdoms
    for (const key in WORLD_KINGDOMS) {
        const k = WORLD_KINGDOMS[key];
        if (zoneIndex >= k.zoneRange[0] && zoneIndex <= k.zoneRange[1]) {
            return k;
        }
    }
    // Check discovered frontier kingdoms
    if (saveData && saveData.discoveredKingdoms) {
        for (const key in saveData.discoveredKingdoms) {
            const fk = saveData.discoveredKingdoms[key];
            if (zoneIndex >= fk.zoneRange[0] && zoneIndex <= fk.zoneRange[1]) {
                return fk;
            }
        }
    }
    return null; // Frontier — unclaimed
};

/**
 * Returns the ruling faction object for a given zone index, or null if Frontier.
 */
window.getFactionForZone = function(zoneIndex) {
    const kingdom = window.getKingdomForZone(zoneIndex);
    if (!kingdom) return null;
    return window.WORLD_FACTIONS[kingdom.rulingFaction] || null;
};

/**
 * Returns the player's reputation with a given faction (-100 to 100).
 */
window.getFactionReputation = function(factionId) {
    if (!saveData || !saveData.factionReputation) return 0;
    return saveData.factionReputation[factionId] || 0;
};

/**
 * Changes the player's reputation with a faction, clamped to [-100, 100].
 * Optionally propagates a reduced effect to allied/rival factions.
 */
window.changeFactionReputation = function(factionId, amount, propagate = true) {
    if (!saveData) return;
    if (!saveData.factionReputation) saveData.factionReputation = {};
    
    const current = saveData.factionReputation[factionId] || 0;
    saveData.factionReputation[factionId] = Math.max(-100, Math.min(100, current + amount));
    
    // Propagate reduced reputation changes to allies/enemies
    if (propagate && window.WORLD_FACTIONS[factionId]) {
        const faction = window.WORLD_FACTIONS[factionId];
        if (faction.relations) {
            for (const otherFactionId in faction.relations) {
                const relationScore = faction.relations[otherFactionId];
                // Allied factions (relation > 30) get 25% of the rep change
                // Rival factions (relation < -30) get -25% of the rep change
                if (relationScore > 30) {
                    const propagatedAmount = Math.round(amount * 0.25);
                    if (propagatedAmount !== 0) {
                        window.changeFactionReputation(otherFactionId, propagatedAmount, false);
                    }
                } else if (relationScore < -30) {
                    const propagatedAmount = Math.round(amount * -0.25);
                    if (propagatedAmount !== 0) {
                        window.changeFactionReputation(otherFactionId, propagatedAmount, false);
                    }
                }
            }
        }
    }
};

/**
 * Returns the reputation tier name for a given reputation value.
 */
window.getReputationTier = function(reputation) {
    if (reputation <= -50) return 'Nemesis';
    if (reputation <= -20) return 'Hostile';
    if (reputation < 0) return 'Distrusted';
    if (reputation < 20) return 'Unknown';
    if (reputation < 50) return 'Respected';
    if (reputation < 75) return 'Honored';
    if (reputation < 100) return 'Champion';
    return 'Legend';
};

/**
 * Returns whether the given zone is a capital city.
 */
window.isCapitalCity = function(zoneIndex) {
    const kingdom = window.getKingdomForZone(zoneIndex);
    return kingdom ? kingdom.capital === zoneIndex : false;
};

/**
 * Returns all known town zones (multiples of 4) within a kingdom.
 */
window.getKingdomTowns = function(kingdomId) {
    const kingdom = WORLD_KINGDOMS[kingdomId];
    if (!kingdom) return [];
    const towns = [];
    for (let z = kingdom.zoneRange[0]; z <= kingdom.zoneRange[1]; z++) {
        if (z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) {
            towns.push(z);
        }
    }
    return towns;
};

/**
 * Checks if King's Guard should attack the player in the current zone.
 * Returns { shouldAttack: bool, reason: string }
 */
window.checkGuardHostility = function(zoneIndex, playerAlignment) {
    const faction = window.getFactionForZone(zoneIndex);
    if (!faction) return { shouldAttack: false, reason: null };
    
    const playerRep = window.getFactionReputation(faction.id);
    
    // Nemesis reputation — all kingdoms attack
    if (playerRep <= -50) {
        return { shouldAttack: true, reason: `You are a sworn enemy of ${faction.name}!` };
    }
    
    // Good kingdom — attack evil players
    if (faction.alignment === 'Good' && playerAlignment <= -20) {
        return { shouldAttack: true, reason: `Your dark deeds have not gone unnoticed by the ${faction.name}!` };
    }
    
    // Evil kingdom — attack heroic players
    if (faction.alignment === 'Evil' && playerAlignment >= 20) {
        return { shouldAttack: true, reason: `Your righteousness is an affront to the ${faction.name}!` };
    }
    
    return { shouldAttack: false, reason: null };
};

// ============================================================
// TRADE GOODS — Placeholder for International Trade System
// ============================================================

// TODO: International Trade System
// Each kingdom will have exportGoods[] and importGoods[] with base prices.
// Buy goods at export price in Kingdom A, sell at import price in Kingdom B.
// Price influenced by distance, faction relations, and supply/demand.
// Frontier kingdoms will have exotic goods with higher profit margins.
// Merchant League faction quests will tie into trade routes.
window.TRADE_GOODS = {
    wheat: { id: 'wheat', name: 'Elden Wheat', desc: 'Bountiful golden grain harvested from Willowbrook fields.', basePrice: 15 },
    iron_ore: { id: 'iron_ore', name: 'Iron Ore', desc: 'Raw iron mined from Embercrown and Frosthold peaks.', basePrice: 30 },
    herbs: { id: 'herbs', name: 'Rare Herbs', desc: 'Medicinal plants gathered from ancient forests.', basePrice: 40 },
    silk: { id: 'silk', name: 'Fine Silk', desc: 'Delicate woven fabrics from Ashenmoor spinners.', basePrice: 60 },
    whiskey: { id: 'whiskey', name: 'Dwarven Whiskey', desc: 'Fiery dwarven brew matured in oak barrels.', basePrice: 50 },
    salt: { id: 'salt', name: 'Sea Salt', desc: 'Crystalline sea salt dried in Tidereach pans.', basePrice: 10 },
    spices: { id: 'spices', name: 'Exotic Spices', desc: 'Rare flavoring elements from distant southern islands.', basePrice: 80 },
    celestial_ambrosia: { id: 'celestial_ambrosia', name: 'Celestial Ambrosia', desc: 'Glistening nectar of the angels, highly sought after by mortals.', basePrice: 200 },
    abyssal_brimstone: { id: 'abyssal_brimstone', name: 'Abyssal Brimstone', desc: 'Smoldering sulfuric crystal from the deep pits of Hell.', basePrice: 180 }
};

/**
 * Dynamically registers a generated frontier kingdom's faction into the global system.
 */
window.registerFrontierKingdomFaction = function(kingdom) {
    if (!window.WORLD_FACTIONS) window.WORLD_FACTIONS = {};
    if (!saveData) saveData = {};
    if (!saveData.factionReputation) saveData.factionReputation = {};

    // Heal/initialize export/import goods for frontier kingdoms dynamically if missing
    if (!kingdom.exportGoods || kingdom.exportGoods.length === 0) {
        const firstBiome = (kingdom.biomes && kingdom.biomes[0]) || 'Forest';
        if (firstBiome === 'Hell') {
            kingdom.exportGoods = ['abyssal_brimstone'];
        } else if (firstBiome === 'Desert') {
            kingdom.exportGoods = ['spices'];
        } else if (firstBiome === 'Coastal') {
            kingdom.exportGoods = ['salt'];
        } else if (firstBiome === 'Winter') {
            kingdom.exportGoods = ['iron_ore'];
        } else if (firstBiome === 'Dungeon' || firstBiome === 'Deadwoods' || firstBiome === 'Cave') {
            kingdom.exportGoods = ['herbs'];
        } else {
            kingdom.exportGoods = ['wheat'];
        }
    }
    if (!kingdom.importGoods || kingdom.importGoods.length === 0) {
        if (kingdom.exportGoods.includes('wheat')) {
            kingdom.importGoods = ['iron_ore', 'spices'];
        } else {
            kingdom.importGoods = ['wheat', 'silk'];
        }
    }

    const fid = kingdom.rulingFaction;
    if (!window.WORLD_FACTIONS[fid]) {
        // Build relations map
        const relations = {};
        if (kingdom.allies) {
            kingdom.allies.forEach(alliedFid => {
                relations[alliedFid] = 50;
            });
        }
        if (kingdom.rivals) {
            kingdom.rivals.forEach(rivalFid => {
                relations[rivalFid] = -50;
            });
        }

        window.WORLD_FACTIONS[fid] = {
            id: fid,
            name: kingdom.factionName,
            color: kingdom.factionColor || '#888888',
            alignment: 'Neutral', // default
            desc: `Ruling order of the newly discovered kingdom of ${kingdom.name}.`,
            leader: {
                title: kingdom.leaderTitle,
                name: kingdom.leaderName,
                persona: kingdom.leaderPersona
            },
            relations: relations
        };
    }

    if (saveData.factionReputation[fid] === undefined) {
        saveData.factionReputation[fid] = 0; // start neutral
    }
};

window.getThemeTownNamesForKingdom = function(kingdom) {
    if (!kingdom) return ["Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"];
    
    const nameLower = (kingdom.name || "").toLowerCase();
    const factLower = (kingdom.factionName || "").toLowerCase();
    const biomes = kingdom.biomes || [];
    
    // 1. Desert / Sultanate / Emirate theme
    if (nameLower.includes("sultanate") || nameLower.includes("emirate") || nameLower.includes("desert") || factLower.includes("crescent") || factLower.includes("sultan") || biomes.includes("Desert")) {
        return [
            "Al-Khalil", "Qasira", "Medina-Abar", "Al-Harnara", 
            "Khor-Dunes", "Suf-Oasis", "Bay-Al-Salam", "Shadzar"
        ];
    }
    
    // 2. Sylvan / Elven theme
    if (nameLower.includes("sylvan") || nameLower.includes("elven") || nameLower.includes("reach") || nameLower.includes("wood") || factLower.includes("wardens") || factLower.includes("sylvan") || biomes.includes("Deadwoods")) {
        return [
            "Tanglebrier", "Verdantspire", "Oakhollow", "Wilderbloom", 
            "Greenwynn", "Elvenglen", "Leafshade", "Briarwind"
        ];
    }
    
    // 3. Dwarven / Cave / Mountain theme
    if (nameLower.includes("dwarf") || nameLower.includes("dwarven") || nameLower.includes("underrealm") || biomes.includes("Cave")) {
        return [
            "Ironpeak", "Stonevault", "Mithrilforge", "Deepdelve", 
            "Gravelhold", "Boulderreach", "Ironforge", "Grimstone"
        ];
    }
    
    // 4. Default fantasy frontier
    return [
        "Vaelgard Outpost", "Stonehaven", "Ironwood", "Wolfsrun", 
        "Stormwatch", "Mistveil", "Gripwood", "Frostpoint"
    ];
};

/**
 * Returns a beautiful, deterministic, kingdom-specific town name for a given zone index.
 */
window.getTownNameForZone = function(zoneIdx) {
    const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIdx) : null;
    if (!kingdom) return `Frontier Town (Zone ${zoneIdx})`;
    
    // Capital check
    if (zoneIdx === kingdom.capital) {
        return `${kingdom.name} Capital`;
    }
    
    // If the kingdom has saved townNames, use it!
    if (kingdom.townNames && kingdom.townNames[zoneIdx]) {
        return kingdom.townNames[zoneIdx];
    }
    
    const knownKingdoms = ['willowbrook', 'embercrown', 'duskveil', 'ashenmoor', 'frosthold', 'tidereach'];
    if (!knownKingdoms.includes(kingdom.id)) {
        const names = window.getThemeTownNamesForKingdom(kingdom);
        const seed = Math.floor(Math.abs(zoneIdx) / 4);
        return names[seed % names.length];
    }
    
    // Deterministic town names per kingdom
    const townNamesByKingdom = {
        duskveil: [
            "Gloomwallow", "Shadowfen", "Dreadspire", "Mournstead", 
            "Grimwood", "Specter's Hollow", "Nightrun", "Darkwater"
        ],
        embercrown: [
            "Cinderforge", "Obsidian Hearth", "Lavabreak", "Magma Sands", 
            "Ashen Peak", "Emberhold", "Sulfur Springs", "Firecrest"
        ],
        willowbrook: [
            "Greenfield", "Riverbend", "Oakridge", "Briarvale", 
            "Sunnymead", "Stonehaven", "Berryfield", "Millwood"
        ],
        ashenmoor: [
            "Sunspire", "Dunesedge", "Sandstone", "Dusty Oasis", 
            "Mirage Valley", "Redstone", "Scorched Ridge", "Drygulch"
        ],
        frosthold: [
            "Snowdrift", "Glacier's Edge", "Frostvale", "Winterguard", 
            "Icepoint", "Coldhaven", "Stormpeak", "Ironpine"
        ],
        tidereach: [
            "Port Harbor", "Saltbreeze", "Bayview", "Sandy Shores", 
            "Galecrest", "Tidepool", "Seawind", "Anchorhold"
        ]
    };
    
    const names = townNamesByKingdom[kingdom.id] || ["Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"];
    const seed = Math.floor(Math.abs(zoneIdx) / 4);
    return names[seed % names.length];
};

/**
 * Calculates the dynamic purchase/sale price of a trade good at the current zone.
 */
window.getTradePrice = function(itemId, isBuying, currentZone) {
    const good = window.TRADE_GOODS[itemId];
    if (!good) return 0;
    
    const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZone) : null;
    
    // Determine export/import status
    const isExport = currentKingdom && currentKingdom.exportGoods && currentKingdom.exportGoods.includes(itemId);
    const isImport = currentKingdom && currentKingdom.importGoods && currentKingdom.importGoods.includes(itemId);
    
    let price = good.basePrice;
    
    if (isBuying) {
        if (isExport) {
            price = Math.max(1, Math.round(good.basePrice * 0.7)); // Cheap to buy local exports
        } else if (isImport) {
            price = Math.round(good.basePrice * 1.5); // Expensive to buy imports
        } else {
            price = good.basePrice; // Neutral
        }
        
        // Faction reputation modifier
        const factionId = currentKingdom ? currentKingdom.rulingFaction : null;
        if (factionId && window.getFactionReputation) {
            const rep = window.getFactionReputation(factionId);
            if (rep >= 100) price = Math.max(1, Math.round(price * 0.75));      // 25% discount
            else if (rep >= 50) price = Math.max(1, Math.round(price * 0.85));  // 15% discount
            else if (rep <= -20) price = Math.round(price * 1.25);              // 25% markup
        }
    } else {
        // Selling
        if (isImport) {
            // Find exporting kingdom to calculate distance
            let exportingKingdom = null;
            if (WORLD_KINGDOMS) {
                for (const kId in WORLD_KINGDOMS) {
                    const k = WORLD_KINGDOMS[kId];
                    if (k.exportGoods && k.exportGoods.includes(itemId)) {
                        exportingKingdom = k;
                        break;
                    }
                }
            }
            
            // Calculate distance bonus
            let distance = 0;
            if (currentKingdom && exportingKingdom) {
                distance = Math.abs(currentKingdom.capital - exportingKingdom.capital);
            } else {
                // If it's a frontier kingdom, measure distance to center of Known World (0)
                distance = Math.abs(currentZone);
            }
            
            const distanceBonus = Math.round(distance * 1.5);
            price = Math.round(good.basePrice * 1.2) + distanceBonus;
        } else if (isExport) {
            price = Math.max(1, Math.round(good.basePrice * 0.5)); // Low selling price for locally flooded goods
        } else {
            price = Math.max(1, Math.round(good.basePrice * 0.9)); // Neutral selling price
        }
        
        // Faction reputation modifier
        const factionId = currentKingdom ? currentKingdom.rulingFaction : null;
        if (factionId && window.getFactionReputation) {
            const rep = window.getFactionReputation(factionId);
            if (rep >= 100) price = Math.round(price * 1.25);      // 25% extra profit
            else if (rep >= 50) price = Math.round(price * 1.15);  // 15% extra profit
            else if (rep <= -20) price = Math.max(1, Math.round(price * 0.75)); // 25% penalty
        }
    }
    
    return price;
};

window.getKingdomEmblemSrc = function(kingdomId) {
    if (!kingdomId) return null;
    // Support passing either a string or a kingdom object
    const id = (typeof kingdomId === 'object') ? kingdomId.id : kingdomId;
    if (!id) return null;

    const knownKingdoms = ['willowbrook', 'embercrown', 'duskveil', 'ashenmoor', 'frosthold', 'tidereach', 'heaven', 'hell'];
    if (knownKingdoms.includes(id)) {
        return `src/assets/emblems/emblem_${id}.png`;
    }
    // If it's a dynamic frontier kingdom, find its index in discoveredKingdoms
    if (saveData && saveData.discoveredKingdoms) {
        const kingdom = saveData.discoveredKingdoms[id];
        if (kingdom) {
            const isElven = kingdom.biomes && (
                kingdom.biomes.includes('Deadwoods') || 
                (kingdom.name && kingdom.name.toLowerCase().includes('elven')) || 
                (kingdom.factionName && kingdom.factionName.toLowerCase().includes('elven')) ||
                (kingdom.factionName && kingdom.factionName.toLowerCase().includes('sylvan'))
            );
            if (isElven) {
                const keys = Object.keys(saveData.discoveredKingdoms);
                const idx = keys.indexOf(id);
                return idx % 2 === 0 ? `src/assets/emblems/emblem_sylvan.png` : `src/assets/emblems/emblem_sylvan_night.png`;
            }

            const isDwarven = kingdom.biomes && (
                kingdom.biomes.includes('Cave') || 
                (kingdom.name && kingdom.name.toLowerCase().includes('dwarf')) || 
                (kingdom.name && kingdom.name.toLowerCase().includes('dwarven')) || 
                (kingdom.name && kingdom.name.toLowerCase().includes('underrealm')) || 
                (kingdom.name && kingdom.name.toLowerCase().includes('stronghold')) || 
                (kingdom.factionName && kingdom.factionName.toLowerCase().includes('dwarf')) ||
                (kingdom.factionName && kingdom.factionName.toLowerCase().includes('dwarven'))
            );
            if (isDwarven) {
                return `src/assets/emblems/emblem_dwarf.png`;
            }
        }
        const keys = Object.keys(saveData.discoveredKingdoms);
        const idx = keys.indexOf(id);
        if (idx > -1) {
            const num = (idx % 4) + 1;
            return `src/assets/emblems/emblem_unknown_${num}.png`;
        }
    }
    return 'src/assets/emblems/emblem_unknown_2.png';
};


console.log('[WorldFactions] Political data layer loaded — 6 kingdoms, 7 factions');
