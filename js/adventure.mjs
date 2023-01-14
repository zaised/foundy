
// The Menace Under Otari Adventure
const MENACE_UNDER_OTARI = {
  slug: "menace-under-otari",
  title: "Menace Under Otari",
  importOptions: {
    enhancedMaps: {
      label: "Use Enhanced Maps",
      default: true,
      sceneIds: {
        original: ["GN8rnmtLqwFIqZ7F", "kiSlv7vcx4HrVCmd"],
        enhanced: ["JJJCFUCadDPRwnSX", "cgv9iVmx3dNIL3YA"]
      },
      handler: (adventure, option, enabled) => {
        return Scene.updateDocuments([
          ...option.sceneIds.original.map(_id => ({_id, navigation: !enabled})),
          ...option.sceneIds.enhanced.map(_id => ({_id, navigation: enabled}))
        ]);
      }
    },
    beginnerMonsters: {
      label: "Use Beginner Box Monsters",
      default: true,
    },
    activateScene: {
      label: "Activate Initial Scene",
      default: true,
      handler: (adventure, option, enabled) => {
        if ( !enabled ) return;
        return game.scenes.get(option.sceneId).activate();
      },
      sceneId: "U5t0Mq8glKBXO3qH"
    },
    displayJournal: {
      label: "Display Introduction Journal Entry",
      default: true,
      handler: (adventure, option, enabled) => {
        if ( !enabled ) return;
        const entry = game.journal.get(option.entryId);
        return entry.sheet.render(true);
      },
      entryId: "S1UnJk4t55aRFaCs"
    },
    populateHotbar: {
      label: "Assign Hotbar Macros",
      default: true,
      handler: (adventure, option, enabled) => {
        if ( enabled ) game.user.update({hotbar: option.hotbar})
      },
      hotbar: {1: 'x0YlgNBucXkYT6RG', 2: 'MppBkkOiWyW1z6fW'}
    },
    customizeJoin: {
      label: "Customize World Details",
      default: false,
      background: "modules/pf2e-beginner-box/assets/artwork-vignettes/view-of-otari.webp",
      handler: async (adventure, option, enabled) => {
        if ( !enabled ) return;
        const module = game.modules.get("pf2e-beginner-box");
        const worldData = {
          action: "editWorld",
          name: game.world.data.name,
          description: module.data.description,
          background: option.background
        }
        await fetchJsonWithTimeout(foundry.utils.getRoute("setup"), {
          method: "POST",
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(worldData)
        });
        game.world.data.update(worldData);
      }
    }
  }
};

// The Pirate King's Plunder Adventure
const PIRATE_KINGS_PLUNDER = {
  slug: "pirate-kings-plunder",
  title: "Pirate King's Plunder",
  importOptions: {
    displayJournal: {
      label: "Display Introduction Journal Entry",
      default: true,
      entryId: "MNx5B6xIGsHwGzqe",
      handler: (adventure, option, enabled) => {
        if ( !enabled ) return;
        const entry = game.journal.get(option.entryId);
        return entry.sheet.render(true);
      }
    }
  }
};

// Beginner's Box Module Credits
const CREDITS = {
  slug: "credits",
  title: "Beginner's Box Credits",
};

export default {
  moduleId: "pf2e-beginner-box",
  packName: "adventures",
  journalFlag: "isBB",
  cssClass: "pf2e-bb",
  adventures: [MENACE_UNDER_OTARI, PIRATE_KINGS_PLUNDER, CREDITS]
};
