import { TemplateOverlay, TemplateOverlayHandler } from "./template-overlay.js";
import { sortTeamsByRank } from "./overlay-common.js";

class SingleResult extends TemplateOverlay {
    constructor() {
        super({types: ["players-singleresult"]});
    }

    sortTeamSingleResultPlacement() {
        const root = this.root.shadowRoot.querySelector('.teams');
        sortTeamsByRank(this.teams, '.team-single-last-placement', root);
    }
}

export function initOverlay(params = {}) {
    params.overlays = {
        "singleresult": new SingleResult()
    }
    const overlay = new TemplateOverlayHandler(params);
}
