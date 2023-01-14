import CONFIG from "./adventure.mjs";
import PF2EAdventureImporter from "./importer.mjs";
import {extractLocalization} from "./i18n.mjs";

/* -------------------------------------------- */
/*  Initialize Module API 		                */
/* -------------------------------------------- */

Hooks.once("init", () => {
  const module = game.modules.get(CONFIG.moduleId);
  module.api = {
    PF2EAdventureImporter,
    extractLocalization
  };

  // Register settings
  game.settings.register(CONFIG.moduleId, "startup", {
    name: "One-Time Startup Prompt",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Register sheets
  DocumentSheetConfig.registerSheet(Adventure, CONFIG.moduleId, PF2EAdventureImporter, {
    label: "Beginner Box Importer"
  });
});

/* -------------------------------------------- */
/*  Activate Module Features                    */
/* -------------------------------------------- */

Hooks.on("ready", (app, html, data) => {
  const module = game.modules.get(CONFIG.moduleId);
  const firstStartup = game.settings.get(CONFIG.moduleId, "startup") === false;
  if ( firstStartup ) {
    for ( const p of module.packs ) {
      const pack = game.packs.get(`${CONFIG.moduleId}.${p.name}`);
      pack.apps[0].render(true);
    }
    game.settings.set(CONFIG.moduleId, "startup", true);
  }
});

/* -------------------------------------------- */
/*  Journal Styling						        */
/* -------------------------------------------- */

Hooks.on("renderJournalSheet", (app, html, data) => {
  const journal = app.document;
  if ( journal.getFlag(CONFIG.moduleId, CONFIG.journalFlag) ) html[0].classList.add(CONFIG.cssClass);
});

Hooks.on("renderJournalPageSheet", (app, html, data) => {
  const journal = app.document.parent;
  if ( journal.getFlag(CONFIG.moduleId, CONFIG.journalFlag) ) html[0].classList.add(CONFIG.cssClass);
});
