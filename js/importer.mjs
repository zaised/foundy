import CONFIGURATION from "./adventure.mjs";

/**
 * @typedef {Object} LocalizationData
 * @property {Set<string>} html       HTML files which provide Journal Entry page translations
 * @property {object} i18n            An object of localization keys and translation strings
 */

/**
 * A subclass of the core AdventureImporter which performs some special functions for Pathfinder premium content.
 */
export default class PF2EAdventureImporter extends AdventureImporter {
  constructor(adventure, options) {
    super(adventure, options);
    this.config = CONFIGURATION.adventures.find(a => adventure.name === a.title);
    this.options.classes.push(CONFIGURATION.cssClass);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options={}) {
    return foundry.utils.mergeObject(await super.getData(), {
      importOptions: this.config.importOptions || {}
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderInner(data) {
    const html = await super._renderInner(data);
    if ( !this.config.importOptions ) return html;

    // Format options HTML
    let options = `<section class="import-form"><h2>Importer Options</h2>`;
    for ( const [name, option] of Object.entries(this.config.importOptions) ) {
      options += `<div class="form-group">
        <label class="checkbox">
            <input type="checkbox" name="${name}" title="${option.label}" ${option.default ? "checked" : ""}/>
            ${option.label}
        </label>
    </div>`;
    }
    options += `</section>`;

    // Insert options and return
    html.find(".adventure-contents").append(options);
    return html;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareImportData(formData) {
    this.submitOptions = formData;
    const {toCreate, toUpdate, documentCount} = await super._prepareImportData(formData);

    // Prepare localization data
    const localization = await this.#prepareLocalizationData();

    // Merge Compendium Actor data
    if ( "Actor" in toCreate ) await this.#mergeCompendiumActors(toCreate.Actor, formData);
    if ( "Actor" in toUpdate ) await this.#mergeCompendiumActors(toUpdate.Actor, formData);

    // Merge Journal HTML data
    if ( "JournalEntry" in toCreate ) await this.#mergeJournalHTML(toCreate.JournalEntry, localization);
    if ( "JournalEntry" in toUpdate ) await this.#mergeJournalHTML(toUpdate.JournalEntry, localization);

    // Apply localized translations
    await this.#applyTranslations(toCreate, localization);
    await this.#applyTranslations(toUpdate, localization);
    return {toCreate, toUpdate, documentCount};
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _importContent(toCreate, toUpdate, documentCount) {
    const importResult = await super._importContent(toCreate, toUpdate, documentCount);
    for ( let [name, option] of Object.entries(this.config.importOptions || {}) ) {
      if ( !option.handler ) continue;
      await option.handler(this.document, option, this.submitOptions[name]);
    }
    return importResult;
  }

  /* -------------------------------------------- */
  /*  Pre-Import Customizations                   */
  /* -------------------------------------------- */

  /**
   * Get available localization data which can be used during the import process
   * @returns {Promise<LocalizationData>}
   */
  async #prepareLocalizationData() {
    const path = `modules/${CONFIGURATION.moduleId}/lang/${game.i18n.lang}/${this.config.slug}`;
    if ( game.i18n.lang === "en" ) return {path, i18n: {}, html: new Set()};
    const json = `${path}/${this.config.slug}.json`;
    try {
      const files = (await FilePicker.browse("data", path)).files;
      const i18n = files.includes(json) ? await fetch(json).then(r => r.json()) : {};
      const html = new Set(files.filter(f => f.endsWith(".html")));
      return {path, i18n, html};
    } catch(err) {
      return {path, i18n: {}, html: new Set()};
    }
  }

  /* -------------------------------------------- */

  /**
   * Merge Actor data with authoritative source data from system compendium packs
   * @param {Actor[]} actors        Actor documents intended to be imported
   * @param {object} importOptions  Form submission import options
   * @returns {Promise<void>}
   */
  async #mergeCompendiumActors(actors, importOptions) {
    const beginnerMonsters = importOptions.beginnerMonsters;
    for ( const actor of actors ) {
      let source;
      let pack;

      // Retrieve a source document
      switch ( actor.type ) {
        case "character":
          const iconicPackId = beginnerMonsters ? "pf2e.paizo-pregens" : "pf2e.iconics";
          pack = game.packs.get(iconicPackId);
          source = await pack.getDocument(actor._id);
          break;
        case "hazard":
        case "npc":
          const npcPackId = beginnerMonsters ? "pf2e.menace-under-otari-bestiary" : "pf2e.pathfinder-bestiary";
          pack = game.packs.get(npcPackId);
          source = await pack.getDocument(actor._id);
          break;
        case "loot":
          continue;
      }

      // Merge that source document
      if ( source ) {
        const sourceData = source.toObject();
        foundry.utils.mergeObject(actor, {
          system: sourceData.system,
          items: sourceData.items,
          effects: sourceData.effects,
          "flags.core.sourceId": source.uuid
        });
      }
      else console.warn(`[${CONFIGURATION.moduleId}] Compendium source data for "${actor.name}" [${actor._id}] `
        + `not found in pack ${pack?.collection}`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Merge JournalEntry data with localized source HTML.
   * @param {JournalEntry[]} entries                JournalEntry documents intended to be imported
   * @param {LocalizationData} localization         Localization configuration data
   * @returns {Promise<void>}
   */
  async #mergeJournalHTML(entries, localization) {
    for ( const entry of entries ) {
      for ( const page of entry.pages ) {
        const htmlFile = `${localization.path}/${page._id}-${page.name.slugify({strict: true})}.html`;
        if ( localization.html.has(htmlFile) ) {
          const content = await fetch(htmlFile).then(r => r.text()).catch(err => null);
          if ( content ) foundry.utils.mergeObject(page, {"text.content": content});
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply localization translations to documents prior to import.
   * @param {Object<string,Document[]>} group       A group of documents to be created or updated
   * @param {LocalizationData} localization         Localization configuration data
   * @returns {Promise<void>}
   */
  async #applyTranslations(group, localization) {
    for ( const [documentName, documents] of Object.entries(group) ) {
      const translations = localization.i18n[documentName] || [];
      for ( const document of documents ) {
        const translation = translations.find(d => d._id === document._id);
        if ( translation ) foundry.utils.mergeObject(document, translation);
      }
    }
  }
}
