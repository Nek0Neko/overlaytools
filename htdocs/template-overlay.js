import {
    calcPoints,
    getAdvancePoints,
    appendToTeamResults,
    resultsToTeamResults,
    setRankParameterToTeamResults,
} from "./overlay-common.js";
import { ApexWebAPI } from "./apex-webapi.js";

function convertToCamelCase(s) {
    return s.replace(/-([a-z])/g, x => x[1].toUpperCase());
}

const defined_item_ids = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "fraggrenade", "thermitgrenade", "arcstar"];

export class TemplateOverlay {
    /** @type {string} Class name added/removed by hide()/show() / hide()/show()添加/移除的类名 */
    static HIDE_CLASS = "hide";
    /** @type {string} Class name added/removed by addForceHide()/removeForceHide() / addForceHide()/removeForceHide()添加/移除的类名 */
    static FORCEHIDE_CLASS = "forcehide";

    /** @type {string} ID of base node / 基础节点的ID */
    id;
    /** @type {HTMLElement} Root node / 根节点 */
    root;
    /** @type {Array} Custom tag list / 自定义标签列表 */
    tags;
    params;

    /** Search index / 搜索索引 */
    teams;
    teamplayers;
    players;
    cameraplayers;

    /**
     * Constructor / 构造函数
     */
    constructor(param = {}) {
        this.id = this.constructor.name.toLowerCase();
        this.root = null;
        this.tags = [];
        this.types = 'types' in param ? param.types : [];
        this.params = {};
        this.teams = {};
        this.teamplayers = {};
        this.players = {};
        this.cameraplayers = {};
    }

    clear() {
        // Remove HTML nodes / 删除HTML节点
        for (const nodes of [this.root.shadowRoot.querySelectorAll('.teams'), this.root.shadowRoot.querySelectorAll('.players'), this.root.shadowRoot.querySelectorAll('.cameraplayers')]) {
            for (const node of nodes) {
                while (node.firstChild) { node.firstChild.remove(); }
            }
        }

        // Clear index / 清除索引
        for (const target of [this.teams, this.teamplayers, this.players, this.cameraplayers]) {
            for (var key in target) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
            }
        }
    }

    clearTeamPlayers() {
        // Remove HTML nodes / 删除HTML节点
        for (const nodes of [this.root.shadowRoot.querySelectorAll('.teamplayers')]) {
            for (const node of nodes) {
                while (node.firstChild) { node.firstChild.remove(); }
            }
        }

        // Clear index / 清除索引
        for (const target of [this.teamplayers]) {
            for (var key in target) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
            }
        }
    }

    clearCameraPlayers() {
        // Remove HTML nodes / 删除HTML节点
        for (const nodes of [this.root.shadowRoot.querySelectorAll('.cameraplayers')]) {
            for (const node of nodes) {
                while (node.firstChild) { node.firstChild.remove(); }
            }
        }

        // Clear index / 清除索引
        for (const target of [this.cameraplayers]) {
            for (var key in target) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
            }
        }
    }

    async fetchURL(url, options = {}) {
        const { timeout = 10000, retries = 2 } = options;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.warn(`fetchURL: HTTP ${response.status} for ${url}`);
                    return null;
                }
                return await response.text();
            } catch (e) {
                if (e.name === 'AbortError') {
                    console.warn(`fetchURL: Timeout after ${timeout}ms for ${url} (attempt ${attempt + 1}/${retries + 1})`);
                } else {
                    console.warn(`fetchURL: Error fetching ${url} (attempt ${attempt + 1}/${retries + 1}):`, e.message);
                }
                if (attempt === retries) return null;
                // Wait before retry with exponential backoff
                await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 5000)));
            }
        }
        return null;
    }

    async buildCSS() {
        // Common to all / 全局通用
        const date = Date.now();
        const basesheet = new CSSStyleSheet();
        basesheet.replaceSync('.hide, .forcehide { position: absolute; left: -3840px; top: 2160px; }');

        // Individual / 个别
        let css = await this.fetchURL(`custom-overlays/${this.id}.css?${date}`);
        if (!css) css = await this.fetchURL(`overlays/${this.id}.css?${date}`);
        if (!css) css = '';

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        let appendcss = await this.fetchURL(`custom-overlays/${this.id}-append.css?${date}`);
        if (!appendcss) return [basesheet, sheet];

        const appendsheet = new CSSStyleSheet();
        appendsheet.replaceSync(appendcss);

        return [basesheet, sheet, appendsheet];
    }

    async buildBase(sheets) {
        const date = Date.now();
        let html = await this.fetchURL(`custom-overlays/${this.id}.html?${date}`);
        if (!html) html = await this.fetchURL(`overlays/${this.id}.html?${date}`);
        if (!html) html = '';

        // HTML -> template
        const id = `overlay-${this.id}`;
        let template = document.getElementById(id);
        if (!template) {
            template = document.createElement('template');
            template.id = id;
            template.innerHTML = html;
            document.body.appendChild(template);
        }

        if (customElements.get(id) === undefined) {
            customElements.define(template.id, class extends HTMLElement {
                constructor() {
                    super();
                    const node = this.attachShadow({mode: 'open'});
                    node.appendChild(template.content.cloneNode(true));
                    node.adoptedStyleSheets = sheets;
                }
            });
        }

        this.tags.push(id);

        // Add to root / 添加到根节点
        const root = document.createElement(id);
        document.getElementById('overlays').appendChild(root);
        this.root = root;
        return template;
    }

    async buildParts(name, classnames) {
        const date = Date.now();
        let html = await this.fetchURL(`custom-overlays/${this.id}-${name}.html?${date}`);
        if (!html) html = await this.fetchURL(`overlays/${this.id}-${name}.html?${date}`);
        if (!html) html = '';

        let template = document.getElementById('overlay-parts');
        if (!template) {
            template = document.createElement('template');
            template.id = 'overlay-parts';
            document.body.appendChild(template);
        }

        const classname = `${this.id}-${name}`;
        if (!template.content.querySelector(`.${classname}`)) {
            const div = document.createElement('div');
            div.classList.add(classname);
            if (classnames.length > 0) div.classList.add(...classnames);
            div.innerHTML = html;
            template.content.appendChild(div);
        }
        this.tags.push(`${this.id}-${name}`);

        return template.content.querySelector(`.${classname}`);
    }

    buildParams() {
        for (const id of this.tags) {
            // Enumerate classes / 枚举类
            const params = [];
            if (id == `overlay-${this.id}`) {
                for (const n of document.getElementById(id).content.querySelectorAll('*')) {
                    for (const c of n.classList) {
                        if (params.indexOf(c) < 0) params.push(c);
                    }
                }
            } else {
                const template = document.getElementById(`overlay-parts`);
                for (const n of template.content.querySelectorAll(`.${id}, .${id} *`)) {
                    for (const c of n.classList) {
                        if (params.indexOf(c) < 0) params.push(c);
                    }
                }
            }
            this.params[id] = params;
        }
    }

    getChildClass(node) {
        const childclass = [];
        if ('childClass' in node.dataset) {
            const words = node.dataset.childClass.split(/[ \r\t\n]/);
            for (const word of words) {
                if (word != '') childclass.push(word);
            }
        }
        return childclass;
    }

    async build() {
        const sheets = await this.buildCSS();
        const base = await this.buildBase(sheets);

        // If team list is needed / 如果需要团队列表
        if (base && base.content.querySelector('.teams')) {
            const teams = await this.buildParts('teams', this.getChildClass(base.content.querySelector('.teams')));

            // If teamplayers class exists within team / 如果团队中存在teamplayers类
            if (teams && teams.querySelector('.teamplayers')) {
                await this.buildParts('teamplayers', this.getChildClass(teams.querySelector('.teamplayers')));
            }
        }

        // If player list is needed / 如果需要玩家列表
        if (base && base.content.querySelector('.players')) {
            await this.buildParts('players', this.getChildClass(base.content.querySelector('.players')));
        }

        // If camera player list is needed / 如果需要摄像机玩家列表
        if (base && base.content.querySelector('.cameraplayers')) {
            await this.buildParts('cameraplayers', this.getChildClass(base.content.querySelector('.cameraplayers')));
        }

        // Create parameter list / 创建参数列表
        this.buildParams();

        return true;
    }

    addTeam(teamid, teams) {
        if (teamid in this.teams) return [this.teams[teamid], false]; // Already exists / 已存在
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-teams`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-teams`);
        clone.classList.add('team');
        teams.appendChild(clone);
        this.teams[teamid] = clone;
        return [clone, true];
    }

    addTeamPlayer(teamid, playerid, teamplayers) {
        if (teamid in this.teamplayers && playerid in this.teamplayers[teamid]) return [this.teamplayers[teamid][playerid], false]; // Already exists / 已存在
        if (!(teamid in this.teamplayers)) this.teamplayers[teamid] = {};
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-teamplayers`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-teamplayers`);
        clone.classList.add('teamplayer');
        teamplayers.appendChild(clone);
        this.teamplayers[teamid][playerid] = clone;
        return [clone, true];
    }

    addPlayer(playerid, players) {
        if (playerid in this.players) return [this.players[playerid], false]; // Already exists / 已存在
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-players`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-players`);
        clone.classList.add('player');
        players.appendChild(clone);
        this.players[playerid] = clone;
        return [clone, true];
    }

    addCameraPlayer(playerid, cameraplayers) {
        if (playerid in this.cameraplayers) return [this.cameraplayers[playerid], false]; // Already exists / 已存在
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-cameraplayers`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-cameraplayers`);
        clone.classList.add('cameraplayer');
        cameraplayers.appendChild(clone);
        this.cameraplayers[playerid] = clone;
        return [clone, true];
    }

    setDatasetAndInnerText(target, paramname, paramvalue, dataset) {
        if (dataset || target.classList.contains('dataset')) {
            target.dataset[convertToCamelCase(paramname)] = paramvalue;
            if (target.classList.contains('innertext')) {
                target.innerText = paramvalue;
            }
        } else {
            target.innerText = paramvalue;
        }
    }

    setParam(paramname, paramvalue, dataset = false) {
        const tag = `overlay-${this.id}`;
        if (this.tags.indexOf(tag) < 0) return; // Not supported / 不支持
        if (this.params[tag].indexOf(paramname) < 0) return; // No input destination / 无输入目标

        for (const target of this.root.shadowRoot.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setTeamParam(teamid, paramname, paramvalue, dataset = false) {
        const tag_teams = `${this.id}-teams`;
        if (this.tags.indexOf(tag_teams) < 0) return; // Not supported / 不支持
        if (this.params[tag_teams].indexOf(paramname) < 0) return; // No input destination / 无输入目标

        const teams = this.root.shadowRoot.querySelector(`.teams`);
        if (!teams) return;

        const [team, first] = this.addTeam(teamid, teams);
        if (!team) return;

        if (first && paramname != 'team-id') {
            this.setTeamParam(teamid, 'team-id', parseInt(teamid, 10) + 1);
        }

        if (team.classList.contains(paramname)) {
            this.setDatasetAndInnerText(team, paramname, paramvalue, dataset);
        }

        for (const target of team.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setTeamPlayerParam(teamid, playerid, paramname, paramvalue, dataset = false) {
        const tag_teams = `${this.id}-teams`;
        const tag_teamplayers = `${this.id}-teamplayers`;
        if (this.tags.indexOf(tag_teams) < 0) return; // Not supported / 不支持
        if (this.tags.indexOf(tag_teamplayers) < 0) return; // Not supported / 不支持
        if (this.params[tag_teamplayers].indexOf(paramname) < 0) return; // No input destination / 无输入目标

        const teams = this.root.shadowRoot.querySelector(`.teams`);
        if (!teams) return;

        const [team, team_first] = this.addTeam(teamid, teams);
        if (!team) return;

        if (team_first && paramname != 'team-id') {
            this.setTeamParam(teamid, 'team-id', parseInt(teamid, 10) + 1);
        }

        const teamplayers = team.querySelector('.teamplayers');
        if (!teamplayers) return;

        const [player, first] = this.addTeamPlayer(teamid, playerid, teamplayers);
        if (!player) return;

        if (first && paramname != 'teamplayer-id') {
            this.setTeamPlayerParam(teamid, playerid, 'teamplayer-id', playerid);
        }

        if (player.classList.contains(paramname)) {
            this.setDatasetAndInnerText(player, paramname, paramvalue, dataset);
        }

        for (const target of player.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setPlayerParam(playerid, paramname, paramvalue, dataset = false) {
        const tag_players = `${this.id}-players`;
        if (this.tags.indexOf(tag_players) < 0) return; // Not supported / 不支持
        if (this.params[tag_players].indexOf(paramname) < 0) return; // No input destination / 无输入目标

        const players = this.root.shadowRoot.querySelector(`.players`);
        if (!players) return;

        const [player, first] = this.addPlayer(playerid, players);
        if (!player) return;

        if (first && paramname != 'player-id') {
            this.setPlayerParam(playerid, 'player-id', playerid);
        }

        if (player.classList.contains(paramname)) {
            this.setDatasetAndInnerText(player, paramname, paramvalue, dataset);
        }

        for (const target of player.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setCameraPlayerParam(playerid, paramname, paramvalue, dataset = false) {
        const tag_cameraplayers = `${this.id}-cameraplayers`;
        if (this.tags.indexOf(tag_cameraplayers) < 0) return; // Not supported / 不支持
        if (this.params[tag_cameraplayers].indexOf(paramname) < 0) return; // No input destination / 无输入目标

        const cameraplayers = this.root.shadowRoot.querySelector(`.cameraplayers`);
        if (!cameraplayers) return;

        const [cameraplayer, first] = this.addCameraPlayer(playerid, cameraplayers);
        if (!cameraplayer) return;

        if (first && paramname != 'cameraplayer-id') {
            this.setCameraPlayerParam(playerid, 'cameraplayer-id', playerid);
        }

        if (cameraplayer.classList.contains(paramname)) {
            this.setDatasetAndInnerText(cameraplayer, paramname, paramvalue, dataset);
        }

        for (const target of cameraplayer.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    addTeamClass(teamid, classname) {
        if (teamid in this.teams) {
            this.teams[teamid].classList.add(classname);
        }
    }

    removeTeamClass(teamid, classname) {
        if (teamid in this.teams) {
            this.teams[teamid].classList.remove(classname);
        }
    }

    addHide() {
        if (this.root == null) return false;
        if (this.root.classList.contains(TemplateOverlay.HIDE_CLASS)) return false;
        this.root.classList.add(TemplateOverlay.HIDE_CLASS);
        return true;
    }

    removeHide() {
        if (this.root == null) return false;
        if (!this.root.classList.contains(TemplateOverlay.HIDE_CLASS)) return false;
        this.root.classList.remove(TemplateOverlay.HIDE_CLASS);
        return true;
    }

    addForceHide() {
        if (this.root == null) return false;
        this.root.classList.add(TemplateOverlay.FORCEHIDE_CLASS);
    }

    removeForceHide() {
        if (this.root == null) return;
        this.root.classList.remove(TemplateOverlay.FORCEHIDE_CLASS);
    }

    addType(type) {
        if (this.types.indexOf(type) < 0) {
            this.types.push(type);
        }
    }

    /**
     * Check if has specified type / 检查是否具有指定类型
     * @param {string} type 
     * @returns {boolean}
     */
    hasType(type) {
        return this.types.indexOf(type) >= 0;
    }
}


export class TemplateOverlayHandler extends EventTarget {
    #initparams;
    /** @type {ApexWebAPI} */
    #webapi;
    /** @type {import("./overlay-common.js").teamresults} Team data for calculation / 计算用团队数据 */
    #game; // WebAPI game object (do not modify) / WebAPI游戏对象(不修改)
    #game_state;
    #results; // Results from WebAPI (do not modify, only add) / 从WebAPI获取的结果(不修改,仅添加)
    #results_count;
    /** @type {boolean} Whether to include current match data in ranking/point calculation / 是否将当前比赛数据包含在排名/积分计算中 */
    #calc_resultsonly;
    /** @type {boolean} getAll in progress / getAll进行中 */
    #getallprocessing;
    #overlays;
    #saved_teamresults;
    /* Tournament info / 锦标赛信息 */
    #tournament_id;
    #tournament_name;
    #tournament_params;
    #team_params;
    #player_params;
    #player_index;
    #player_index_singleresult;
    #player_index_totalresult;
    /* Camera info / 摄像机信息 */
    #camera_teamid;
    #camera_playerhash;
    /** @type {number} Count reconnection attempts / 计数重连尝试 */
    #retry;
    /** @type {boolean} Reconnection in progress / 重连进行中 */
    #reconnecting;
    #recognition;
    #teambanner_recognition_delay;
    #teambanner_queue;
    #liveapi_connection_count;
    #winner_determine;

    /**
     * Constructor / 构造函数
     * @param {string} url WebSocket URL to connect / 要连接的WebSocket URL
     */
    constructor(params = {}) {
        super();
        this.#initparams = params;
        this.#liveapi_connection_count = -1;
        this.#calc_resultsonly = true;
        this.#tournament_params = {};
        this.#tournament_id = "invalid";
        this.#tournament_name = "";
        this.#game_state = "";
        this.#team_params = {};
        this.#player_params = {};
        this.#player_index = {};
        this.#player_index_singleresult = {};
        this.#player_index_totalresult = {};
        this.#camera_teamid = -1;
        this.#camera_playerhash = '';
        this.#game = null;
        this.#results = [];
        this.#results_count = -1;
        this.#saved_teamresults = {};
        this.#winner_determine = false;
        this.#recognition = {
            map: 0,
            banner: 1
        };
        this.#teambanner_recognition_delay = 500;
        this.#teambanner_queue = [];
        this.#getallprocessing = false;
        this.#retry = 0;
        this.#reconnecting = false;

        this.#overlays = params.overlays;
        this.#buildOverlays().then(_ => {
            if ('url' in this.#initparams) {
                this.#setupApexWebAPI(this.#initparams.url);
            } else {
                this.#setupApexWebAPI("ws://127.0.0.1:20081/");
            }
        });

        this.#setDefaultValue();
    }

    #buildOverlays() {
        return new Promise((resolve, reject) => {
            const jobs = [];
            for (const overlay of Object.values(this.#overlays)) {
                jobs.push(overlay.build());
            }
            Promise.all(jobs).then(resolve, reject);
        });
    }

    #setDefaultValue() {
        for (const item of defined_item_ids) {
            this.#updatedCameraPlayerItem(item, 0);
        }
    }

    /**
     * Setup WebAPI related parts / 设置WebAPI相关部分
     * @param {string} url WebSocket URL to connect / 要连接的WebSocket URL
     */
    #setupApexWebAPI(url) {
        this.#webapi = new ApexWebAPI(url);
        this.dispatchEvent(new CustomEvent("webapi", { detail: { api: this.#webapi } }));

        this.#webapi.addEventListener("open", (ev) => {
            this.#updatedWebAPIConnectionStatus('open');
            this.#updatedGame(ev.detail.game);
            this.#getallprocessing = true;
            this.#retry = 0;
            this.#webapi.getCurrentTournament();
            this.#webapi.getPlayers();
            this.#webapi.getAll().then(() => {
                this.#getallprocessing = false;
                this.#reCalc();
                this.#showHideFromCurrentStatus();
            }, () => {
                this.#getallprocessing = false;
                this.#reCalc();
                this.#showHideFromCurrentStatus();
            });
        });

        this.#webapi.addEventListener("close", (ev) => {
            this.#updatedWebAPIConnectionStatus('close');
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("error", (ev) => {
            this.#updatedWebAPIConnectionStatus('error');
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("getcurrenttournament", (ev) => {
            if (this.#tournament_id != ev.detail.id) {
                this.#updatedTournamentId(ev.detail.id);
            }
            if (this.#tournament_name != ev.detail.name) {
                this.#updatedTournamentName(ev.detail.name);
            }
        });

        // Tournament change/creation / 锦标赛变更/新建
        this.#webapi.addEventListener("settournamentname", (ev) => {
            if (this.#tournament_id != ev.detail.id) {
                this.#updatedTournamentId(ev.detail.id);
            }
            if (this.#tournament_name != ev.detail.name) {
                this.#updatedTournamentName(ev.detail.name);
            }
        });

        this.#webapi.addEventListener('renametournamentname', (ev) => {
            if (ev.detail.result) {
                if (this.#tournament_name != ev.detail.name) {
                    this.#updatedTournamentName(ev.detail.name);
                }
            }
        });

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            for (const overlay of Object.values(this.#overlays)) {
                overlay.clear();
            }
            this.#updatedGame(ev.detail.game);
            if (!this.#getallprocessing) this.#reCalc();
            this.#updatedSingleResult();
            this.#updatedTotalResultPlayers();
            this.#updatedParticipatedTeamsInformation();
            this.#winner_determine = false;
        });

        this.#webapi.addEventListener("gamestatechange", (ev) => {
            if (this.#game_state != ev.detail.game.state) {
                this.#updatedGameState(ev.detail.game.state);
            }
        });


        // Save results / 保存结果
        this.#webapi.addEventListener("saveresult", (ev) => {
            if (this.#calc_resultsonly != false) {
                this.#updatedCalcResultsOnly(true);
            }
            if (ev.detail.gameid == this.#results.length) {
                // Add to existing results / 添加到现有结果
                this.#results.push(ev.detail.result);
                if (!this.#getallprocessing) this.#reCalc();
                this.#updatedSingleResult();
                this.#updatedTotalResultPlayers();
                this.#updatedParticipatedTeamsInformation();
            } else {
                // Re-fetch if insufficient / 如果不足则重新获取
                this.#webapi.getTournamentResults();
            }

            if (this.#results_count != this.#results.length) {
                this.#updatedResultsCount(this.#results.length);
            }
        });

        this.#webapi.addEventListener("gettournamentresults", (ev) => {
            this.#results = ev.detail.results;
            if (!this.#getallprocessing) this.#reCalc();
            this.#updatedSingleResult();
            this.#updatedTotalResultPlayers();
            this.#updatedParticipatedTeamsInformation();
            if (this.#results_count != this.#results.length) {
                this.#updatedResultsCount(this.#results.length);
            }
        });

        this.#webapi.addEventListener('settournamentresult', (ev) => {
            if (ev.detail.setresult) {
                this.#webapi.getTournamentResults();
            }
        });

        // Winner determined / 确定获胜者
        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            this.#updatedWinnerDetermine(ev.detail.team.id);
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#game == null) return;
            const init = this.#getallprocessing;
            const placement = ev.detail.team.placement;
            const teamid = ev.detail.team.id;
            this.#updatedSquadEliminate(placement, teamid, init);
            this.#updatedAliveTeamsCount();
            this.#updatedAlivePlayersCount();
        });

        this.#webapi.addEventListener("teamname", (ev) => {
            const teamid = ev.detail.team.id;
            const name = this.#getTeamName(teamid);
            this.#updatedTeamName(teamid, name);
        });

        this.#webapi.addEventListener("getteamparams", (ev) => {
            this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
        });

        this.#webapi.addEventListener("setteamparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
            }
        });

        // Player name related / 玩家名称相关
        this.#webapi.addEventListener("playername", (ev) => {
            this.#updatedPlayerName(ev.detail.player.hash, ev.detail.player.name);
            this.#updatedPlayerSingleResultName(ev.detail.player.hash, this.#getPlayerName(ev.detail.player.hash, ev.detail.player.name));
            this.#updatedPlayerTotalResultName(ev.detail.player.hash, this.#getPlayerName(ev.detail.player.hash, ev.detail.player.name));
        });

        this.#webapi.addEventListener("getplayerparams", (ev) => {
            this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
        });

        this.#webapi.addEventListener("setplayerparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
            }
        });

        this.#webapi.addEventListener("getplayers", (ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#updatedPlayerParams(hash, params);
            }
        });

        this.#webapi.addEventListener("teamplacement", (ev) => {
            if (this.#game == null) return;
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("teamrespawn", (ev) => {
            this.#updatedTeamRespawn(ev.detail.team.id, ev.detail.player, ev.detail.targets);
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#game == null) return;
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("playerconnected", (ev) => {
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("playerdisconnected", (ev) => {
            if (!ev.detail.player.canreconnect) {
                this.#updatedPlayerState(ev.detail.player.hash, ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED);
            }
        });

        // Kill count change / 击杀数变更
        this.#webapi.addEventListener("playerstats", (ev) => {
            this.#updatedTeamKills(ev.detail.team.id, ev.detail.team.kills);
            this.#updatedPlayerKills(ev.detail.player.hash, ev.detail.player.kills);
            if (!this.#getallprocessing) this.#reCalc();
        });

        // Player status change / 玩家状态变更
        this.#webapi.addEventListener("playerhash", (ev) => {
            const teamid = ev.detail.team.id;
            const playerhash = ev.detail.player.hash;
            this.#player_index[playerhash] = ev.detail.player;
            this.#updatedPlayerId(playerhash);
            this.#updatedTeamExists(teamid);
            this.#updatedPlayerState(playerhash, ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE);
        });

        this.#webapi.addEventListener("playercharacter", (ev) => {
            this.#updatedPlayerLegend(ev.detail.player.hash, ev.detail.player.character);

        });

        this.#webapi.addEventListener("statealive", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statedown", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statekilled", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statecollected", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        const checkObserverHash = (ev) => {
            if ('observerhash' in this.#initparams) {
                // If observer hash is fixed / 如果观察者哈希固定指定
                const hash = this.#initparams.observerhash;
                if (hash == ev.detail.observer.hash) {
                    return true;
                }
            } else {
                // If observer hash is from WebAPI event / 如果观察者哈希来自WebAPI事件
                if (ev.detail.own) return true;
            }
            return false;
        }

        this.#webapi.addEventListener("observerswitch", (ev) => {
            // Check if observer switch event matches assigned camera hash / 检查观察者切换事件是否匹配分配的摄像机哈希
            if (!checkObserverHash(ev)) return;

            const teamid = ev.detail.team.id;
            const playerhash = ev.detail.player.hash;
            if (this.#camera_teamid != teamid || this.#camera_playerhash != playerhash) {
                this.#updatedCamera(teamid, playerhash);
            }
        });

        this.#webapi.addEventListener("playeritem", (ev) => {
            const playerhash = ev.detail.player.hash;
            const itemid = ev.detail.item;
            const count = this.#player_index[playerhash].items[itemid];
            this.#updatedPlayerItem(playerhash, itemid, count);
        });

        // Team banner display state / 团队横幅显示状态
        this.#webapi.addEventListener("teambannerstate", (ev) => {
            const state = ev.detail.state;
            this.#teambanner_queue.splice(0);
            this.#teambanner_queue.push(ev);
            setTimeout(() => {
                if (this.#teambanner_queue.length > 0) {
                    const front = this.#teambanner_queue.at(0);
                    if (ev === front) {
                        this.#teambanner_queue.shift();
                        this.#recognition.banner = state;
                        this.#showHideFromCurrentStatus();
                    }
                }
            }, this.#teambanner_recognition_delay);
        });

        // Map display state / 地图显示状态
        this.#webapi.addEventListener("mapstate", (ev) => {
            const state = ev.detail.state;
            this.#recognition.map = state;
            this.#showHideFromCurrentStatus();
        });

        // Match info / 比赛信息
        this.#webapi.addEventListener("matchsetup", (ev) => {
            this.#updatedMapName('map' in ev.detail.game ? ev.detail.game.map : '');
        });

        // LiveAPI connection status / LiveAPI连接状态
        this.#webapi.addEventListener("liveapisocketstats", (ev) => {
            if (this.#liveapi_connection_count != ev.detail.conn) {
                this.#updatedLiveAPIConnectionCount(ev.detail.conn);
            }
        });

        // Overlay display state / 叠加层显示状态
        this.#webapi.addEventListener("gettournamentparams", (ev) => {
            this.#updatedTournamentParams(ev.detail.params);
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("settournamentparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedTournamentParams(ev.detail.params);
                if (!this.#getallprocessing) this.#reCalc();
            }
        });

        // MatchResult show/hide command / MatchResult显示/隐藏命令
        this.#webapi.addEventListener("broadcastobject", (ev) => {
            if (ev.detail.data) {
                const data = ev.detail.data;
                if ("type" in data) {
                    switch (data.type) {
                        case "testgamestate": {
                            const state = data.state;
                            this.#updatedGameState(state);
                            break;
                        }
                        case "testteambanner": {
                            this.#recognition.banner = this.#recognition.banner ? false : true;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testmapleaderboard": {
                            this.#recognition.map = this.#recognition.map ? false : true;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testcamera": {
                            const teamid = data.teamid;
                            this.#updatedCamera(teamid, this.#camera_playerhash);
                            break;
                        }
                        case "testplayerbanner": {
                            const name = data.name;
                            this.#updatedCameraPlayerName(name);
                            break;
                        }
                        case "testteamkills": {
                            const kills = data.kills;
                            this.#updatedCameraTeamKills(kills);
                            break;
                        }
                        case "testowneditems": {
                            for (const [item, count] of Object.entries(data)) {
                                if (defined_item_ids.indexOf(item) >= 0) {
                                    this.#updatedCameraPlayerItem(item, count);
                                }
                            }
                            break;
                        }
                        case "testgamecount": {
                            const count = data.count;
                            this.#results_count = count;
                            this.#calc_resultsonly = true;
                            this.#updatedGameCount(count);
                            break;
                        }
                        case "testsquadeliminated": {
                            const placement = data.placement;
                            const teamid = data.teamid;
                            this.#updatedSquadEliminate(placement, teamid, false);
                            break;
                        }
                        case "testteamrespawned": {
                            for (const overlay of Object.values(this.#overlays)) {
                                if ('setTeamRespawn' in overlay && typeof (overlay.setTeamRespawn) == 'function') {
                                    const teamid = data.teamid;
                                    const teamname = this.#getTeamName(teamid);
                                    overlay.setTeamRespawn(teamid, teamname, data.respawn_player, data.respawned_players);
                                }
                            }
                            break;
                        }
                        case "testwinnerdetermine": {
                            const teamid = data.teamid;
                            this.#updatedWinnerDetermine(teamid);
                            break;
                        }
                        case "testwinnerdeterminereset": {
                            this.#winner_determine = false;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testreload": {
                            location.reload();
                            break;
                        };
                    }
                }
            }
        });
    }

    /**
     * Reconnection handling when disconnected or failed with error / 断开连接或出错时的重连处理
     */
    #tryReconnect() {
        /** @type {number[]} Reconnection attempt intervals (ms) / 重连尝试间隔(ms) */
        const intervals = [1000, 2000, 4000, 8000];
        let interval = intervals[intervals.length - 1];
        if (this.#retry < intervals.length) interval = intervals[this.#retry];
        if (!this.#reconnecting) {
            this.#reconnecting = true;
            setTimeout(() => {
                this.#webapi.forceReconnect();
                this.#reconnecting = false;
            }, interval);
            this.#retry++;
        }
    }

    /**
     * Show/hide based on game progress / 根据游戏进度显示/隐藏
     */
    #showHideFromCurrentStatus() {
        const game = this.#game_state;
        const map = this.#recognition.map;
        const banner = this.#recognition.banner;
        const winner_determine = this.#winner_determine;

        for (const overlay of Object.values(this.#overlays)) {
            const view_map = overlay.hasType("view-map");
            const view_live = overlay.hasType("view-live");
            const view_camera = overlay.hasType("view-camera");
            if (!view_map && !view_live && !view_camera) continue;
            let flag = false;
            switch(game) {
                case "WaitingForPlayers":
                case "PreGamePreview":
                case "PickLoadout":
                case "Prematch":
                    // prematch
                    if (view_live) {
                        flag = true;
                    }
                    break;
                case "Playing":
                    // When map is displayed / 显示地图时
                    if (banner > 0) {
                        if (view_camera && !winner_determine) flag = true;
                        if (view_live) flag = true;
                    } else {
                        if (view_live) flag = true;
                        if (map > 0) {
                            if (view_map && !winner_determine) flag = true;
                        }
                    }
                    break;
                case "Resolution":
                case "Postmatch":
                default:
                    // postmatch
                    break;
            }
            if (!flag) {
                overlay.addHide();
            } else {
                overlay.removeHide();
            }
        }
    }

    /**
     * Get parameters for all teams (1~30) / 获取所有团队的参数(1~30)
     */
    #getAllTeamParams() {
        for (let i = 0; i < 30; ++i) {
            this.#webapi.getTeamParams(i);
        }
    }

    /**
     * Handling when team parameters are updated / 团队参数更新时的处理
     * @param {number} teamid Team ID (0~) / 团队ID(0~)
     * @param {object} params Team parameters / 团队参数
     */
    #updatedTeamParams(teamid, params) {
        this.#team_params[teamid] = params;
        if (!('name' in params)) return;
        if (params.name == '') return;
        this.#updatedTeamName(teamid, params.name);
    }

    /**
     * Handling when team name is updated / 团队名称更新时的处理
     * @param {number} teamid Team ID (0~) / 团队ID(0~)
     * @param {string} name Team name / 团队名称
     */
    #updatedTeamName(teamid, name) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-name', name);
        }
        if (teamid == this.#camera_teamid) {
            this.#updatedCameraTeamName(name);
        }
    }

    #updatedTeamKills(teamid, kills) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-kills', kills);
        }
        if (teamid == this.#camera_teamid) {
            this.#updatedCameraTeamKills(kills);
        }
    }

    /**
     * Called when team rank changes / 团队排名变化时调用
     * @param {string} teamid Team ID (0~) / 团队ID(0~)
     * @param {number} rank Current rank (0~) / 当前排名(0~)
     */
    #updatedTeamTotalRank(teamid, rank) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-rank', rank + 1);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamRank(rank + 1);
        }
    }

    #updatedTeamTotalRankCompleted(changeinfo) {
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamTotalRank' in overlay && typeof(overlay.sortTeamTotalRank) == 'function') {
                overlay.sortTeamTotalRank(changeinfo);
            }
        }
    }

    #updatedTeamTotalResultDamage(teamid, dealt, taken) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-damagedealt', dealt);
            overlay.setTeamParam(teamid, 'team-total-damagetaken', taken);
        }
    }

    #updatedMapName(map) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('map-name', map);
        }
    }

    #updatedLiveAPIConnectionCount(conn) {
        this.#liveapi_connection_count = conn;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('liveapi-connection-count', conn);
        }
    }

    #updatedWebAPIConnectionStatus(status) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('webapi-connection-status', status);
        }
    }
    /**
     * Called when team total kill points change / 团队总击杀积分变化时调用
     * @param {string} teamid Team ID (0~) / 团队ID(0~)
     * @param {number} points Current total kill points / 当前总击杀积分
     */
    #updatedTeamTotalKillPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-kill-points', points);
        }
    }

    /**
     * Called when team total placement points change / 团队总排名积分变化时调用
     * @param {string} teamid Team ID (0~) / 团队ID(0~)
     * @param {number} points Current total placement points / 当前总排名积分
     */
    #updatedTeamTotalPlacementPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-placement-points', points);
        }
    }

    /**
     * Called when team total points change / 团队总积分变化时调用
     * @param {string} teamid Team ID (0~) / 团队ID(0~)
     * @param {number} points Current total points / 当前总积分
     */
    #updatedTeamTotalPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-points', points);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamTotalPoints(points);
        }
    }

    #updatedTeamMatchpointsState(teamid, state) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-matchpoints', state ? 1 : 0);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamMatchpointsState(state);
        }
    }

    #updatedTeamWinnerState(teamid, state) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-winner', state ? 1 : 0);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamWinnerState(state);
        }
    }

    #updatedSingleResultMapName(map) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('single-last-map-name', map);
        }
    }

    #updatedTeamSingleResultRank(teamid, rank) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-rank', rank);
        }
    }

    #updatedTeamSingleResultPlacement(teamid, placement) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-placement', placement);
        }
    }

    #updatedTeamSingleResultKillPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-kill-points', points);
        }
    }

    #updatedTeamSingleResultPlacementPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-placement-points', points);
        }
    }

    #updatedTeamSingleResultPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-points', points);
        }
    }
    
    #updatedTeamSingleResultDamage(teamid, dealt, taken) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-damagedealt', dealt);
            overlay.setTeamParam(teamid, 'team-single-last-damagetaken', taken);
        }
    }

    /**
     * Handling when player parameters are updated / 玩家参数更新时的处理
     * @param {string} hash Player ID / 玩家ID
     * @param {object} params Player parameters / 玩家参数
     */
    #updatedPlayerParams(hash, params) {
        if (hash == '') return;
        this.#player_params[hash] = params;
        if (!('name' in params)) return;
        this.#updatedPlayerName(hash, params.name);
        this.#updatedPlayerSingleResultName(hash, params.name);
        this.#updatedPlayerTotalResultName(hash, params.name);
    }

    #updatedTournamentParams(params) {
        this.#tournament_params = params;
        this.#setForceHideFromParams(params);
    }

    #updatedTournamentId(id) {
        this.#tournament_id = id;

        this.#getAllTeamParams();
        this.#webapi.getTournamentResults();
        this.#webapi.getTournamentParams();

        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('tournament-id', id);
        }
    }

    #updatedResultsCount(count) {
        this.#results_count = count;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam("results-count", count);
        }

        this.#updatedGameCount();
    }

    #updatedGameCount() {
        for (const overlay of Object.values(this.#overlays)) {
            const count = this.#results_count + (this.#calc_resultsonly ? 0 : 1);
            overlay.setParam("game-count", count);
        }
    }

    #updatedPlayerParam(hash, param, value) {
        if (hash in this.#player_index) {
            // Process player existing in current game / 处理当前游戏中存在的玩家
            const player = this.#player_index[hash];
            for (const overlay of Object.values(this.#overlays)) {
                if (!overlay.hasType("players-singleresult") && !overlay.hasType("players-totalresult")) {
                    overlay.setPlayerParam(hash, `player-${param}`, value);
                    overlay.setTeamPlayerParam(player.teamid, hash, `teamplayer-${param}`, value);
                }
            }
            if (this.#camera_teamid == player.teamid) {
                this.#updatedCameraPlayersParam(hash, param, value);
            }
            if (this.#camera_teamid == player.teamid && this.#camera_playerhash == hash) {
                this.#updatedCameraPlayerParam(param, value);
            }
        }
    }

    #updatedCameraPlayerParam(param, value) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam(`camera-player-${param}`, value);
        }
    }

    #updatedCameraPlayersParam(playerhash, param, value) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setCameraPlayerParam(playerhash, `cameraplayer-${param}`, value);
        }
    }

    #updatedPlayerId(hash) {
        this.#updatedPlayerParam(hash, 'id', hash);
    }

    #updatedPlayerName(hash, name) {
        name = this.#getPlayerName(hash);
        this.#updatedPlayerParam(hash, 'name', name);
    }

    #updatedPlayerKills(hash, kills) {
        this.#updatedPlayerParam(hash, 'kills', kills);
    }

    #updatedPlayerItem(hash, itemid, count) {
        this.#updatedPlayerParam(hash, `item-${itemid}`, count);
    }

    #updatedPlayerSingleResultParam(playerid, param, value) {
        if (playerid in this.#player_index_singleresult) {
            const teamid = this.#player_index_singleresult[playerid].teamid;
            for (const overlay of Object.values(this.#overlays)) {
                if (overlay.hasType("players-singleresult") && !overlay.hasType("players-totalresult")) {
                    overlay.setPlayerParam(playerid, `player-${param}`, value);
                    overlay.setTeamPlayerParam(teamid, playerid, `teamplayer-${param}`, value);
                }
            }
        }
    }

    #updatedPlayerTotalResultParam(playerid, param, value) {
        if (playerid in this.#player_index_totalresult) {
            const teamid = this.#player_index_totalresult[playerid].teamid;
            for (const overlay of Object.values(this.#overlays)) {
                if (overlay.hasType("players-totalresult") && !overlay.hasType("players-singleresult")) {
                    overlay.setPlayerParam(playerid, `player-${param}`, value);
                    overlay.setTeamPlayerParam(teamid, playerid, `teamplayer-${param}`, value);
                }
            }
        }
    }

    #updatedPlayerSingleResultId(playerid) {
        this.#updatedPlayerSingleResultParam(playerid, 'id', playerid);
    }

    #updatedPlayerSingleResultName(playerid, name) {
        this.#updatedPlayerSingleResultParam(playerid, 'name', name);
    }

    #updatedPlayerSingleResultLegend(playerid, legend) {
        this.#updatedPlayerSingleResultParam(playerid, 'legend', legend);
    }

    #updatedPlayerSingleResultKills(playerid, kills) {
        this.#updatedPlayerSingleResultParam(playerid, 'kills', kills);
    }

    #updatedPlayerSingleResultDamage(playerid, dealt, taken) {
        this.#updatedPlayerSingleResultParam(playerid, 'damagedealt', dealt);
        this.#updatedPlayerSingleResultParam(playerid, 'damagetaken', taken);
    }

    #updatedPlayerTotalResultId(playerid) {
        this.#updatedPlayerTotalResultParam(playerid, 'id', playerid);
    }

    #updatedPlayerTotalResultName(playerid, name) {
        this.#updatedPlayerTotalResultParam(playerid, 'name', name);
    }

    #updatedPlayerTotalResultLegend(playerid, legend) {
        this.#updatedPlayerTotalResultParam(playerid, 'legend', legend);
    }

    #updatedPlayerTotalResultKills(playerid, kills) {
        this.#updatedPlayerTotalResultParam(playerid, 'kills', kills);
    }

    #updatedPlayerTotalResultDamage(playerid, dealt, taken) {
        this.#updatedPlayerTotalResultParam(playerid, 'damagedealt', dealt);
        this.#updatedPlayerTotalResultParam(playerid, 'damagetaken', taken);
    }

    #updatedWinnerDetermine(teamid) {
        this.#winner_determine = true;
        for (const overlay of Object.values(this.#overlays)) {
            // Display ChampionBanner / 显示冠军横幅
            if ('setWinnerDetermine' in overlay && typeof(overlay.setWinnerDetermine) == 'function') {
                const teamname = this.#getTeamName(teamid);
                overlay.setWinnerDetermine(teamid, teamname);
            }
        }
        this.#showHideFromCurrentStatus();
    }

    #updatedTeamExists(teamid) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.addTeamClass(teamid, 'team-exists'); // Add class to existing team / 给存在的团队添加类
        }
    }

    #updatedSquadEliminate(placement, teamid, init) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-eliminated', 1)
            overlay.addTeamClass(teamid, 'team-squad-eliminate'); // Add class to eliminated team / 给被淘汰的团队添加类
            if ('setSquadEliminate' in overlay && typeof(overlay.setSquadEliminate) == 'function') {
                const teamname = this.#getTeamName(teamid);
                overlay.setSquadEliminate(placement, teamid, teamname, init);
            }
        }
    }

    #updatedAliveTeamsCount() {
        let aliveTeams = 0;
        if (this.#game && 'teams' in this.#game) {
            for (const team of this.#game.teams) {
                if (!team.eliminated) aliveTeams++;
            }
        }
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('alive-teams', aliveTeams);
        }
    }

    #updatedAlivePlayersCount() {
        let alivePlayers = 0;
        if (this.#game && 'teams' in this.#game) {
            for (const team of this.#game.teams) {
                if (!team.eliminated) {
                    for (const player of team.players) {
                        if (player.state === ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE || player.state === ApexWebAPI.WEBAPI_PLAYER_STATE_DOWN) {
                            alivePlayers++;
                        }
                    }
                }
            }
        }
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('alive-players', alivePlayers);
        }
    }

    #updatedTeamRespawn(teamid, player, targets) {
        for (const overlay of Object.values(this.#overlays)) {
            if ('setTeamRespawn' in overlay && typeof (overlay.setTeamRespawn) == 'function') {
                const teamname = this.#getTeamName(teamid);
                const respawn_playername = this.#getPlayerName(player.hash);
                const respawned_playernames = targets.map(x => this.#getPlayerName(x.hash));
                overlay.setTeamRespawn(teamid, teamname, respawn_playername, respawned_playernames);
            }
        }
    }

    #updatedPlayerLegend(hash, legend) {
        this.#updatedPlayerParam(hash, 'legend', legend);
    }

    #updatedPlayerState(hash, state) {
        // Call specific method / 调用特定方法
        if (hash in this.#player_index) {
            const player = this.#player_index[hash];
            for (const overlay of Object.values(this.#overlays)) {
                if ('setTeamPlayerState' in overlay && typeof(overlay.setTeamPlayerState) == 'function') {
                    overlay.setTeamPlayerState(player.teamid, hash, state);
                }
            }
        }
        this.#updatedPlayerParam(hash, 'state', state);

        this.#updatedAlivePlayersCount();
        if (state == ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE) {
            this.#updatedAliveTeamsCount();
        }
    }

    #updatedTournamentName(name) {
        this.#tournament_name = name;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('tournament-name', name);
        }
    }

    #updatedGame(game) {
        this.#game = game;
        this.#player_index = {}; // Delete index linked to game / 删除与游戏关联的索引
        this.#saved_teamresults = {}; // Initialize point info / 初始化积分信息
        if ('state' in game && this.#game_state != game.state) {
            this.#updatedGameState(game.state);
        }
    }

    #updatedGameState(state) {
        this.#game_state = state;
        this.#showHideFromCurrentStatus();

        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('game-state', state);
        }

        // Check calculation method change / 检查计算方法变更
        let calc_resultsonly = this.#calc_resultsonly;
        switch(state) {
            case "WaitingForPlayers":
            case "PreGamePreview":
            case "PickLoadout":
            case "Prematch":
            case "Playing":
                calc_resultsonly = false;
                break;
        }
        if (this.#calc_resultsonly != calc_resultsonly) {
            this.#updatedCalcResultsOnly();
        }
    }

    #updatedCalcResultsOnly(resultsonly) {
        this.#calc_resultsonly = resultsonly;
        this.#reCalc();
        this.#updatedGameCount();
    }

    /**
     * Called when camera switches / 切换摄像机时调用
     * @param {number} teamid Team ID (0~) / 团队ID(0~)
     * @param {number} playerhash Player ID (hash) / 玩家ID(哈希)
     */
    #updatedCamera(teamid, playerhash) {
        if (this.#camera_teamid != teamid) {
            this.#camera_teamid = teamid;
            this.#updatedCameraTeamId(teamid);
            this.#clearCameraPlayers();
        }

        if (this.#camera_playerhash != playerhash) {
            this.#camera_playerhash = playerhash;
            this.#updatedCameraPlayerId(playerhash);
        }

        this.#updatedCameraTeamName(this.#getTeamName(teamid));
        this.#updatedCameraPlayerName(this.#getPlayerName(playerhash));

        // If team data exists / 如果团队数据存在
        if (this.#game && 'teams' in this.#game) {
            if (0 <= teamid && teamid < this.#game.teams.length) {
                const team = this.#game.teams[teamid];
                // Update team kills / 更新团队击杀数
                if ('kills' in team) {
                    this.#updatedCameraTeamKills(team.kills);
                }
                // Process player data / 处理玩家数据
                if ('players' in team) {
                    for (const player of team.players) {
                        this.#updatedCameraPlayersId(player.hash);
                        this.#updatedCameraPlayersActive(player.hash, player.hash == playerhash ? 1 : 0);
                        this.#updatedCameraPlayersName(player.hash, this.#getPlayerName(player.hash));
                        if ('kills' in player) {
                            this.#updatedCameraPlayersKills(player.hash, player.kills);
                            if (player.hash == playerhash) {
                                this.#updatedCameraPlayerKills(player.kills);
                            }
                        }
                        if (('items' in player)) {
                            for (const [itemid, count] of Object.entries(player.items)) {
                                this.#updatedCameraPlayersItem(player.hash, itemid, count);
                                if (player.hash == playerhash) {
                                    this.#updatedCameraPlayerItem(itemid, count);
                                }
                            }
                        }
                    }
                }
            }
        }

        // If point data exists / 如果积分数据存在
        if (this.#camera_teamid in this.#saved_teamresults) {
            const team = this.#saved_teamresults[teamid];
            if ('rank' in team) {
                this.#updatedCameraTeamRank(team.rank + 1);
            }
            if ('points' in team) {
                this.#updatedCameraTeamTotalPoints(team.points.reduce((a, c) => a + c, 0));
            }
            if ('matchpoints' in team) {
                this.#updatedCameraTeamMatchpointsState(team.matchpoints);
            }
            if ('winner' in team) {
                this.#updatedCameraTeamWinnerState(team.winner);
            }
        }
    }

    /* Camera related / 摄像机相关 */
    #updatedCameraTeamId(teamid) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-id', parseInt(teamid, 10) + 1);
        }
    }

    #updatedCameraTeamName(name) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-name', name);
        }
    }

    #updatedCameraTeamRank(rank) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-rank', rank);
        }
    }

    #updatedCameraTeamKills(kills) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-kills', kills);
        }
    }

    #updatedCameraTeamTotalPoints(points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-total-points', points);
        }
    }

    #updatedCameraTeamMatchpointsState(state) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-matchpoints', state ? 1 : 0);
        }
    }

    #updatedCameraTeamWinnerState(state) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-winner', state ? 1 : 0);
        }
    }

    #updatedCameraPlayerId(hash) {
        this.#updatedCameraPlayerParam('id', hash);
    }

    #updatedCameraPlayerName(name) {
        this.#updatedCameraPlayerParam('name', name);
    }

    #updatedCameraPlayerKills(kills) {
        this.#updatedCameraPlayerParam('kills', kills);
    }

    #updatedCameraPlayerItem(itemid, count) {
        this.#updatedCameraPlayerParam(`item-${itemid}`, count);
    }

    /* cameraplayers related / cameraplayers相关 */
    #clearCameraPlayers() {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.clearCameraPlayers();
        }
    }

    #updatedCameraPlayersId(hash) {
        this.#updatedCameraPlayersParam(hash, 'id', hash);
    }

    #updatedCameraPlayersActive(hash, active) {
        this.#updatedCameraPlayersParam(hash, 'active', active);
    }

    #updatedCameraPlayersName(hash, name) {
        this.#updatedCameraPlayersParam(hash, 'name', name);
    }

    #updatedCameraPlayersKills(hash, kills) {
        this.#updatedCameraPlayersParam(hash, 'kills', kills);
    }

    #updatedCameraPlayersItem(hash, itemid, count) {
        this.#updatedCameraPlayersParam(hash, `item-${itemid}`, count);
    }

    /**
     * Calculate points from current rank and kills / 根据当前排名和击杀数计算积分
     */
    #calcPoints() {
        // Store result data / 存储结果数据
        const teamresults = resultsToTeamResults(this.#results);
        if (!this.#calc_resultsonly) {
            let added = false;
            // Add points for current match / 添加当前比赛的积分
            for (let teamid = 0; teamid < this.#game.teams.length; ++teamid) {
                const src = this.#game.teams[teamid];
                if (src.players.length > 0) {
                    appendToTeamResults(teamresults, this.#results.length, teamid, src.name, src.kills, src.placement);
                    const dst = teamresults[teamid];
                    dst.eliminated = src.eliminated;
                    for (const player of src.players) {
                        dst.status.push(player.state);
                    }
                    added = true;
                }
            }

            if (added) {
                // Add data for other non-participating teams (placement is 0xff) / 添加其他未参与团队的数据(排名为0xff)
                for (const team of Object.values(teamresults)) {
                    while (team.kills.length < this.#results.length + 1) { team.kills.push(0) }
                    while (team.placements.length < this.#results.length + 1) { team.placements.push(0xff) }
                }
            }
        }

        // Get match point threshold / 获取赛点阈值
        const matchpoints = ('calcmethod' in this.#tournament_params && 'matchpoints' in this.#tournament_params.calcmethod && this.#tournament_params.calcmethod.matchpoints > 0) ? this.#tournament_params.calcmethod.matchpoints : 0;

        // Calculate and add points / 计算并添加积分
        for (const [teamidstr, team] of Object.entries(teamresults)) {
            const teamid = parseInt(teamidstr, 10);
            const advancepoint = getAdvancePoints(teamid, this.#tournament_params);
            for (let gameid = 0; gameid < team.kills.length && gameid < team.placements.length; ++gameid) {
                const points = calcPoints(gameid, team.placements[gameid], team.kills[gameid], this.#tournament_params);
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
                team.cumulative_points.push(advancepoint + team.points.reduce((p, c) => p + c, 0));

                // Check match point reached / 检查是否达到赛点
                let check_gameid = this.#calc_resultsonly ? gameid : gameid - 1;
                if (matchpoints > 0 && gameid > 0 && team.cumulative_points[check_gameid] >= matchpoints) {
                    team.matchpoints = true;
                }
            }
            team.total_points = advancepoint + team.points.reduce((a, c) => a + c, 0);
        }

        // Determine match point winner / 确定赛点获胜者
        if (matchpoints > 0) {
            for (const i of [...Array(this.#results.length).keys()]) {
                if (i == 0) continue;
                for (const team of Object.values(teamresults)) {
                    const prev_points = team.cumulative_points[i - 1];
                    const placement = team.placements[i];
                    if (prev_points >= matchpoints && placement == 1) {
                        team.winner = true;
                        break;
                    }
                }
                // Winner already determined / 获胜者已确定
                if (Object.values(teamresults).some(x => x.winner)) break;
            }
        }

        // Calculate rank / 计算排名
        setRankParameterToTeamResults(teamresults);

        return teamresults;
    }

    /**
     * Process from calculation to display / 从计算到显示的处理
     */
    #reCalc() {
        const teamresults = this.#calcPoints();
        const changeinfo = [];
        for (const [teamidstr, teamresult] of Object.entries(teamresults)) {
            const teamid = parseInt(teamidstr, 10);
            // Check rank/points/match point changes / 检查排名/积分/赛点变动
            let rank_flag = true;
            let points_flag = true;
            let matchpoints_flag = true;
            let winner_flag = true;
            if (teamid in this.#saved_teamresults) {
                const prev_teamresult = this.#saved_teamresults[teamid];
                if (teamresult.rank == prev_teamresult.rank) {
                    rank_flag = false;
                }
                if (teamresult.total_points == prev_teamresult.total_points) {
                    points_flag = false;
                }
                if (teamresult.matchpoints == prev_teamresult.matchpoints) {
                    matchpoints_flag = false;
                }
                if (teamresult.winner == prev_teamresult.winner) {
                    winner_flag = false;
                }
            }
            if (rank_flag) {
                this.#updatedTeamTotalRank(teamid, teamresult.rank);
                changeinfo.push({ id: teamid, changed: true });
            }
            if (points_flag) {
                this.#updatedTeamTotalKillPoints(teamid, teamresult.kill_points.reduce((a, c) => a + c, 0));
                this.#updatedTeamTotalPlacementPoints(teamid, teamresult.placement_points.reduce((a, c) => a + c, 0));
                this.#updatedTeamTotalPoints(teamid, teamresult.total_points);
            }
            if (matchpoints_flag) {
                this.#updatedTeamMatchpointsState(teamid, teamresult.matchpoints);
            }
            if (winner_flag) {
                this.#updatedTeamWinnerState(teamid, teamresult.winner);
            }
        }
        if (changeinfo.length > 0) {
            this.#updatedTeamTotalRankCompleted(changeinfo);
        }
        this.#saved_teamresults = teamresults;
    }

    /**
     * Process latest result / 处理最新结果
     */
    #updatedSingleResult() {
        // Delete player index / 删除玩家索引
        this.#player_index_singleresult = {};

        // Clear teams element if has specific method / 如果具有特定方法则清除teams元素
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamSingleResultPlacement' in overlay && typeof(overlay.sortTeamSingleResultPlacement) == 'function') {
                overlay.clear();
            }
        }

        for (const overlay of Object.values(this.#overlays)) {
            if (overlay.hasType("players-singleresult")) {
                overlay.clearTeamPlayers();
            }
        }

        if (this.#results.length == 0) return;
        const gameid = this.#results.length - 1;
        const result = this.#results[gameid];
        const teamresults = resultsToTeamResults([result]);
        this.#updatedSingleResultMapName('map' in result ? result.map : '');
        if ('teams' in result) {
            for (const [teamidstr, team] of Object.entries(result.teams)) {
                const teamid = parseInt(teamidstr, 10);
                const points = calcPoints(gameid, team.placement, team.kills, this.#tournament_params);
                this.#updatedTeamName(teamid, this.#getTeamName(teamid));
                this.#updatedTeamSingleResultPlacement(teamid, team.placement);
                this.#updatedTeamSingleResultKillPoints(teamid, points.kills);
                this.#updatedTeamSingleResultPlacementPoints(teamid, points.placement);
                this.#updatedTeamSingleResultPoints(teamid, points.total);
                let damage_dealt = 0;
                let damage_taken = 0;
                for (const player of team.players) {
                    const hash = player.id;
                    player.teamid = teamid;
                    this.#player_index_singleresult[hash] = player;
                    this.#updatedPlayerSingleResultId(hash);
                    this.#updatedPlayerSingleResultName(hash, this.#getPlayerName(hash, player.name));
                    this.#updatedPlayerSingleResultLegend(hash, player.character);
                    this.#updatedPlayerSingleResultKills(hash, player.kills);
                    this.#updatedPlayerSingleResultDamage(hash, player.damage_dealt, player.damage_taken);
                    damage_dealt += player.damage_dealt;
                    damage_taken += player.damage_taken;
                }
                    this.#updatedTeamSingleResultDamage(teamid, damage_dealt, damage_taken);

                    // Store in teamresult / 存储到teamresult
                    const teamresult = teamresults[teamidstr];
                if (teamresult) {
                    teamresult.points.push(points.total);
                    teamresult.kill_points.push(points.kills);
                    teamresult.placement_points.push(points.placement);
                    teamresult.other_points.push(points.other);
                    teamresult.cumulative_points.push(teamresult.points.reduce((p, c) => p + c, 0));
                }
            }
        }

        // Calculate rank / 计算排名
        setRankParameterToTeamResults(teamresults);
        for (const [teamidstr, team] of Object.entries(teamresults)) {
            const teamid = parseInt(teamidstr, 10);
            this.#updatedTeamSingleResultRank(teamid, team.rank + 1);
        }

        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamSingleResultPlacement' in overlay && typeof(overlay.sortTeamSingleResultPlacement) == 'function') {
                overlay.sortTeamSingleResultPlacement();
            }
        }
    }

    /**
     * Process player parameters for combined result / 处理合计结果的玩家参数
     */
    #updatedTotalResultPlayers() {
        // Delete player index / 删除玩家索引
        this.#player_index_totalresult = {};

        // Clear teams element if has specific method / 如果具有特定方法则清除teams元素
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamTotalResultPlacement' in overlay && typeof(overlay.sortTeamTotalResultPlacement) == 'function') {
                overlay.clear();
            }
        }

        for (const overlay of Object.values(this.#overlays)) {
            if (overlay.hasType("players-totalresult")) {
                overlay.clearTeamPlayers();
            }
        }

        if (this.#results.length == 0) return;
        const gameid = this.#results.length - 1;
        const result = this.#results[gameid];

        const mode = (a) => {
            const i = new Map();
            let cm = 0;
            let o;
            a.forEach(v => {
                let c = -~i.get(v);
                c ? c++ : c = 1;
                i.set(v, c);
                c >= cm && (o = v, cm = c);
            });
            return o;
        };

        for (const [gameidstr, result] of Object.entries(this.#results)) {
            if ('teams' in result) {
                for (const [teamidstr, team] of Object.entries(result.teams)) {
                    const gameid = parseInt(gameidstr, 10);
                    const teamid = parseInt(teamidstr, 10);
                    for (const player of team.players) {
                        const hash = player.id;
                        player.teamid = teamid;
                        if (!(hash in this.#player_index_totalresult)) {
                            // Initialize / 初始化
                            this.#player_index_totalresult[hash] = {
                                id: hash,
                                name: [],
                                teamid: teamid,
                                teamids: [],
                                character: [],
                                kills: [],
                                damage_dealt: [],
                                damage_taken: [],
                            };
                        }
                        const totalplayer = this.#player_index_totalresult[hash];
                        totalplayer.name.push(player.name);
                        totalplayer.teamids.push(teamid);
                        totalplayer.teamid = mode(totalplayer.teamids);
                        totalplayer.character.push(player.character);
                        totalplayer.kills.push(player.kills);
                        totalplayer.damage_dealt.push(player.damage_dealt);
                        totalplayer.damage_taken.push(player.damage_taken);
                    }
                }
            }
        }

        const teamdamages = {};
        for (const [hash, player] of Object.entries(this.#player_index_totalresult)) {
            const damage_dealt = player.damage_dealt.reduce((a, c) => a + c, 0);
            const damage_taken = player.damage_taken.reduce((a, c) => a + c, 0);
            this.#updatedPlayerTotalResultId(hash);
            this.#updatedPlayerTotalResultName(hash, mode(player.name));
            this.#updatedPlayerTotalResultLegend(hash, mode(player.character));
            this.#updatedPlayerTotalResultKills(hash, player.kills.reduce((a, c) => a + c, 0));
            this.#updatedPlayerTotalResultDamage(hash, damage_dealt, damage_taken);
            if (!(player.teamid in teamdamages)) teamdamages[player.teamid] = { dealt: 0, taken: 0 };
            const teamdamage = teamdamages[player.teamid];
            teamdamage.dealt += damage_dealt;
            teamdamage.taken += damage_taken;
        }

        for (const [teamidstr, damage] of Object.entries(teamdamages)) {
            const teamid = parseInt(teamidstr, 10);
            this.#updatedTeamTotalResultDamage(teamid, damage.dealt, damage.taken);
        }


        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamTotalResultPlacement' in overlay && typeof(overlay.sortTeamTotalResultPlacement) == 'function') {
                overlay.sortTeamTotalResultPlacement();
            }
        }
    }

    #updatedParticipatedTeamsInformation() {
        for (const teamidstr of Object.keys(this.#saved_teamresults)) {
            const teamid = parseInt(teamidstr, 10);
            const name = this.#getTeamName(teamid);
            this.#updatedTeamName(teamid, name);
        }
    }

    /**
     * Get name from saved team params or current playing team info / 从保存的团队参数或当前游戏团队信息获取名称
     * @param {string|number} teamid Team ID (0~) / 团队ID(0~)
     * @returns {string} Team name / 团队名称
     */
    #getTeamName(teamid) {
        teamid = parseInt(teamid, 10);
        if (teamid in this.#team_params) {
            const params = this.#team_params[teamid];
            if ('name' in params) {
                return params.name;
            }
        }
        if (teamid < this.#game.teams.length) {
            const team = this.#game.teams[teamid];
            if ('name' in team) {
                // remove @number
                return team.name.replace(/@[0-9]+$/, '');
            }
        }
        // Get team name from result / 从结果获取团队名称
        for (let i = this.#results.length - 1; i >= 0; i--) {
            const result = this.#results[i];
            if ('teams' in result && teamid in result.teams) {
                const team = result.teams[teamid];
                if ('name' in team) {
                    return team.name;
                }
            }
        }
        return "Team " + teamid;
    }

    /**
     * Get player info from saved player params / 从保存的玩家参数获取玩家信息
     * @param {string} playerhash Player ID (hash) / 玩家ID(哈希)
     * @param {string} fallback Fallback name if not exists / 不存在时的备用名称
     * @returns {string} Player name / 玩家名称
     */
    #getPlayerName(hash, fallback = '') {
        if (hash == '') return fallback;

        // Saved parameters / 保存的参数
        if (hash in this.#player_params) {
            const params = this.#player_params[hash];
            if ('name' in params) return params.name;
        }

        // In-game name / 游戏内名称
        if (hash in this.#player_index) {
            const player = this.#player_index[hash];
            if ('name' in player) return player.name;
        }

        return fallback;
    }

    #setForceHideFromParams(params) {
        const forcehide = 'forcehide' in params ? params.forcehide : {};
        for (const [key, overlay] of Object.entries(this.#overlays)) {
            const defaulthide = overlay.hasType("defaulthide");
            let hide = defaulthide;
            if (key in forcehide) {
                hide = forcehide[key];
            }
            if (hide) overlay.addForceHide();
            else overlay.removeForceHide();
        }
    }
}
