import * as ApexWebAPI from "./apex-webapi.js";
import {
    calcPoints,
    OverlayBase,
    appendToTeamResults,
    htmlToElement,
    resultsToTeamResults,
    setRankParameterToTeamResults,
    getAdvancePoints,
} from "./overlay-common.js";

class WebAPIConfigBase {
    /** @type {Object.<string, HTMLElement>} Store related nodes / 存储相关节点 */
    nodes;
    /** @type {string} Prefix when calling getElementById / 调用getElementById时的前缀 */
    prefix;

    /**
     * Constructor / 构造函数
     * @param {string} prefix Prefix when calling getElementById / 调用getElementById时的前缀
     */
    constructor(prefix) {
        this.nodes = {};
        this.prefix = prefix;
    }

    /**
     * Get HTML node and store in nodes / 获取HTML节点并存储到nodes
     * @param {string} name String included in node ID to retrieve / 要获取的节点ID中包含的字符串
     * @returns {HTMLElement|null} Retrieved node, null if failed / 获取的节点,失败时为null
     */
    getNode(name) {
        const node = document.getElementById(this.prefix + name);
        if (node) {
            this.nodes[name] = node;
            return node;
        }
        return null;
    }
}

class WebAPIConnectionStatus extends WebAPIConfigBase {
    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('connection-status-webapi-');
        this.getNode('state');
    }
    /**
     * Set WebAPI connection status / 设置WebAPI连接状态
     * @param {string} state Connection status / 连接状态
     */
    setStatus(state) {
        this.nodes.state.innerText = state;
    }
}

class LiveAPIConnectionStatus extends WebAPIConfigBase {
    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('connection-status-liveapi-');
        this.getNode('connection');
        this.getNode('recv');
        this.getNode('send');
    }
    /**
     * Set LiveAPI connection status / 设置LiveAPI连接状态
     * @param {number} conn Number of connections / 连接数
     * @param {number} recv Number of received packets / 接收数据包数
     * @param {number} send Number of sent packets / 发送数据包数
     */
    setStatus(conn, recv, send) {
        this.nodes.connection.innerText = conn;
        this.nodes.recv.innerText = recv;
        this.nodes.send.innerText = send;
    }
}

class LiveAPIConfig extends WebAPIConfigBase {
    #config;
    #callback;
    #url;
    /**
     * Constructor / 构造函数
     */
    constructor(url) {
        super('liveapi-config-');
        this.getNode('connections');
        this.getNode('submit');
        this.getNode('current');

        this.#config = {};
        this.#callback = null;
        this.#url = url;

        this.nodes.submit.addEventListener('click', (ev) => {
            if (!('settings' in this.#config)) this.#config.settings = {};
            const settings = this.#config.settings;
            settings.cl_liveapi_use_v2 = true;
            settings.cl_liveapi_use_websocket = true;
            settings.cl_liveapi_allow_requests = true;
            settings.cl_liveapi_ws_retry_count = 50;
            settings.cl_liveapi_ws_retry_time = 5;
            settings.cl_liveapi_ws_timeout = 3600;
            settings.cl_liveapi_ws_keepalive = 10;
            settings.cl_liveapi_use_protobuf = true;
            settings.cl_liveapi_pretty_print_log = false;
            if (!('servers' in this.#config)) this.#config.servers = [];
            const servers = this.#config.servers;
            if (servers.indexOf(url) < 0) servers.push(url);
            if (typeof(this.#callback) == "function") {
                this.#callback(this.#config);
            }
        });
    }

    /**
     * Set config / 设置配置
     * @param {object} config Config object / 配置对象
     */
    setConfig(config) {
        this.#config = config;

        // Clear currently displayed connections / 清除当前显示的连接
        while (this.nodes.connections.children.length > 0) {
            this.nodes.connections.removeChild(this.nodes.connections.lastChild);
        }

        // Add connections from config / 添加配置中的连接
        if ('servers' in this.#config) {
            for (const server of this.#config.servers) {
                const div = document.createElement('div');
                div.classList.add("lc_connection");
                div.innerText = server;
                if (server == this.#url) {
                    div.classList.add("lc_connection_added");
                }
                this.nodes.connections.appendChild(div);
            }
        }

        this.nodes.current.innerText = JSON.stringify(this.#config, null, "  ");
    }

    setCallback(func) {
        if (typeof(func) == "function" && func.length == 1) {
            this.#callback = func;
        }
    }

    
    /**
     * Set LiveAPI connection status / 设置LiveAPI连接状态
     * @param {number} conn Number of connections / 连接数
     * @param {number} recv Number of received packets / 接收数据包数
     * @param {number} send Number of sent packets / 发送数据包数
     */
    setStatus(conn, recv, send) {
        this.nodes.connection.innerText = conn;
        this.nodes.recv.innerText = recv;
        this.nodes.send.innerText = send;
    }
}

class LanguageSelect extends WebAPIConfigBase {
    /** @type {HTMLElement[]} */
    #languages;
    /** Constructor / 构造函数 */
    constructor() {
        super('language-select-');

        // Get language nodes / 获取语言节点
        this.#languages = [];
        for (const node of document.querySelectorAll('#lang-select > span')) {
            this.#languages.push(node);
        }

        for (const node of this.#languages) {
            const lang = node.innerText;
            node.addEventListener('click', (ev) => {
                this.#setLanguage(lang);
            });
        }

        // Set by saved language selection / 根据保存的语言选择设置
        const savedlang = window.localStorage.getItem("lang");
        for (const node of this.#languages) {
            if (node.innerText == savedlang) {
                this.#setLanguage(savedlang);
                return;
            }
        }

        // Initial selection by browser language setting / 根据浏览器语言设置初始选择
        const browserlang = window.navigator.languages[0];
        for (const node of this.#languages) {
            if (node.innerText == browserlang) {
                this.#setLanguage(browserlang);
                return;
            }
        }

        this.#setLanguage('en');
    }

    /**
     * Set display language / 设置显示语言
     * @param {string} lang Language (en/ja) / 语言(en/ja)
     */
    #setLanguage(lang) {
        const display_none = [];
        const display_blank = [];
        for (const node of this.#languages) {
            if (lang == node.innerText) {
                display_blank.push("." + node.innerText);
                node.classList.add("lang_selected");
                window.localStorage.setItem("lang", lang);
            } else {
                display_none.push("." + node.innerText);
                node.classList.remove("lang_selected");
            }
        }
        // Apply to CSS / 应用到CSS
        for (const sheet of document.styleSheets) {
            for (const rule of sheet.cssRules) {
                if (display_none.indexOf(rule.selectorText) >= 0) {
                    rule.style.display = "none";
                }
                if (display_blank.indexOf(rule.selectorText) >= 0) {
                    rule.style.display = "";
                }
            }
        }
    }
}

class TournamentCalculationMethod extends WebAPIConfigBase {
    /** @type {Object.<string, HTMLElement>[]} Hold input elements / 保存输入元素 */
    #forms;
    /**
     * Callback when player name setting button is pressed / 按下玩家名称设置按钮时的回调
     * @callback dumpedCalcMethodCallabck
     * @param {object} calcmethod Calculation method object / 计算方法对象
     */

    /**
     * Callback function / 回调函数
     * @param {dumpedCalcMethodCallabck} func Callback function / 回调函数
     */
    #callback;
    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('tournament-calc-');
        this.getNode('list');
        this.getNode('count');
        this.getNode('send');
        this.getNode('advancepoints');
        this.getNode('matchpoints');
        this.#forms = [];
        this.#appendTableRow();
        this.#callback = undefined;

        // Events / 事件
        this.nodes.count.addEventListener('change', (ev) => {
            this.#changeTableSize(this.#getMatchCount());
        });

        this.nodes.send.addEventListener('click', (ev) => {
            this.#dumpCalcMethod();
        });
    }

    /**
     * Add element to end of table (initial state) / 向表格末尾添加元素(初始状态)
     */
    #appendTableRow() {
        const form = {};
        const index = this.nodes.list.children.length + 1;
        const tr = document.createElement('tr');
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.children[0].innerText = index;

        // Settings / 设置
        const td = tr.children[1];

        {
            // KILLCAP
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // Settings / 设置
            checkbox.type = "checkbox";
            input.type = "number";
            input.min = 0;
            input.max = 60;

            // Text settings / 文本设置
            label_text.innerHTML =
                '<span class="en">kill points cap:</span>' +
                '<span class="zh">击杀积分上限:</span>';
            input.value = 9;

            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.killcap = checkbox;
            form.killcap_value = input;
        }

        {
            // KILLAMP
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // Settings / 设置
            checkbox.type = "checkbox";
            input.type = "number";
            input.min = 2;
            input.max = 4;

            // Text settings / 文本设置
            label_text.innerHTML = 
                '<span class="en">kill points amp:</span>' +
                '<span class="zh">击杀积分倍率:</span>';
            input.value = 2;
            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.killamp = checkbox;
            form.killamp_value = input;
        }

        {
            // POINTS TABLE
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // Settings / 设置
            checkbox.type = "checkbox";
            input.type = "text";
            input.placeholder = "comma spalated points [ex. 12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1]";

            // Text settings / 文本设置
            label_text.innerHTML = 
                '<span class="en">custom placement points table:</span>' +
                '<span class="zh">自定义排名积分:</span>';

            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.customtable = checkbox;
            form.customtable_value = input;
        }

        this.nodes.list.appendChild(tr);
        this.#forms.push(form);
    }

    /**
     * Remove last element from table / 从表格删除最后一个元素
     */
    #popTableRow() {
        this.#forms.pop();
        this.nodes.list.removeChild(this.nodes.list.lastChild);
    }

    /**
     * Change number of table rows / 改变表格行数
     * @param {number} count Number of columns / 列数
     */
    #changeTableSize(count) {
        while (true) {
            const children_count = this.nodes.list.children.length;
            if (count == children_count) break;
            if (count > children_count) {
                this.#appendTableRow();
            } else {
                this.#popTableRow();
            }
        }
    }

    /**
     * Get match count from select element / 从select元素获取比赛数
     * @returns {number} Match count (1~16) / 比赛数(1~16)
     */
    #getMatchCount() {
        const value = parseInt(this.nodes.count.value, 10);
        if (value < 1) return 1;
        if (value > 16) return 16;
        return value;
    }

    /**
     * Convert current settings/selection to Object and call callback / 将当前设置/选择转换为对象并调用回调
     */
    #dumpCalcMethod() {
        const dumpobject = {};

        // Advance points / 先行积分
        {
            const text = this.nodes.advancepoints.value;
            const values = text.split(/,/).map((x) => {
                const v = parseInt(x.trim(), 10);
                if (Number.isNaN(v)) return 0;
                return v;
            }).slice(0, 30);
            dumpobject.advancepoints = values;
        }

        // Match points / 赛点
        {
            const text = this.nodes.matchpoints.value;
            let value = parseInt(text, 10);
            if (Number.isNaN(value)) value = 0;
            if (value < 0) value = 0;
            dumpobject.matchpoints = value;
        }

        for (let gameid = 0; gameid < this.#forms.length; ++gameid) {
            const form = this.#forms[gameid];
            const data = {};
            let dump_needed = false;

            if (form.killcap.checked) {
                dump_needed = true;
                const killcap = parseInt(form.killcap_value.value, 10);
                data.killcap = killcap < 0 ? 0 : killcap;
            }

            if (form.killamp.checked) {
                dump_needed = true;
                let killamp = parseInt(form.killamp_value.value, 10);
                if (killamp < 2) killamp = 2;
                if (killamp > 4) killamp = 4;
                data.killamp = killamp;
            }

            if (form.customtable.checked) {
                dump_needed = true;
                const text = form.customtable_value.value;
                const values = text.split(/,/).map((x) => {
                    const v = parseInt(x.trim(), 10);
                    if (Number.isNaN(v)) return 0;
                    return v;
                }).slice(0, 30);
                data.customtable = values;
            }

            if (dump_needed) {
                dumpobject[gameid] = data;
            }
        }
        if (typeof(this.#callback) == "function") {
            this.#callback(dumpobject);
        }
    }

    /**
     * Reflect current settings from parameters in tournament params to display / 将锦标赛参数中的参数反映到当前设置显示
     * @param {object} params 
     */
    importCalcMethod(params) {
        if (!params) return;

        if ('advancepoints' in params) {
            if (params.advancepoints instanceof Array) {
                this.nodes.advancepoints.value = params.advancepoints.join();
            }
        }

        if ('matchpoints' in params) {
            let value = parseInt(params.matchpoints, 10);
            if (Number.isNaN(value)) value = 0;
            if (value < 0) value = 0;
            this.nodes.matchpoints.value = value;
        } else {
            this.nodes.matchpoints.value = 0; // Default value / 默认值
        }

        for (const [k, v] of Object.entries(params)) {
            const gameid = parseInt(k, 10);
            if (Number.isNaN(gameid)) continue;
            if (gameid < 0) continue;
            if (15 < gameid) continue;
            if (gameid >= this.#getMatchCount()) {
                this.nodes.count.value = gameid + 1;
                this.#changeTableSize(gameid + 1);
            }
            const form = this.#forms[gameid];
            if ('killcap' in v) {
                form.killcap.checked = true;
                form.killcap_value.value = v.killcap;
            }
            if ('killamp' in v) {
                form.killamp.checked = true;
                form.killamp_value.value = v.killamp;
            }
            if ('customtable' in v) {
                form.customtable.checked = true;
                form.customtable_value.value = v.customtable.join();
            }
        }
    }

    /**
     * Define callback function / 定义回调函数
     * @param {dumpedCalcMethodCallabck} func Function called when dumping object containing calculation method / 导出包含计算方法的对象时调用的函数
     */
    setDumpedCalcMethodCallback(func) {
        if (typeof func == "function") {
            this.#callback = func;
        }
    }

    /**
     * Clear selection status / 清除选择状态
     */
    clear() {
        this.nodes.advancepoints.value = "";
        this.#changeTableSize(0);
        this.#changeTableSize(1);
        this.nodes.count.value = 1;
    }
}

class ObserverConfig {
    #callback;
    #observers;
    #current;
    #base;

    constructor() {
        this.#observers = {};
        this.#current = "";
        this.#base = document.getElementById('observer-set-list');
    }

    #generateObserverNode(id) {
        const node = {
            base: document.createElement('tr'),
            id: document.createElement('td'),
            name: document.createElement('td')
        }

        /* append */
        node.base.appendChild(node.id);
        node.base.appendChild(node.name);

        /* draw */
        node.id.innerText = id;
        
        /* set current */
        if (this.#current != "" && id == this.#current) {
            node.base.classList.add('observer-set-selected');
        }

        /* set callback */
        node.base.addEventListener('click', () => {
            if (this.#current == id) return;
            if (typeof(this.#callback) != 'function') return;
            this.#callback(id);
        });

        return node;
    }

    drawObserverName(id, name) {
        if (id == '') return;
        if (!(id in this.#observers)) {
            this.#observers[id] = {};
        }
        const observer = this.#observers[id];
        if (!('name' in observer)) {
            observer.name = name;
        }

        if (!('node' in observer)) {
            observer.node = this.#generateObserverNode(id);
            this.#base.appendChild(observer.node.base);
        }

        observer.node.name.innerText = name;
    }

    setCurrentObserver(id) {
        this.#current = id;
        if (id == '') return;
        document.getElementById('current_observer_id').innerText = id;
        if (!(id in this.#observers)) return;
        const observer = this.#observers[id];
        if (!('node' in observer)) return;
        for (const node of document.querySelectorAll('tr.observer-set-selected')) {
            node.classList.remove('observer-set-selected');
        }
        observer.node.base.classList.add('observer-set-selected');
    }
    
    setClickCallback(func) {
        this.#callback = func;
    }
}

class PlayerName extends WebAPIConfigBase {
    /** @type {Object.<string, HTMLElement>} Hold table column corresponding to hash / 保存与hash对应的表格列 */
    #players;
    /** @type {setPlayerNameCallback} */
    #callback;

    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('player-name-');
        this.getNode('list');
        this.#players = {};
        this.#callback = undefined;
    }

    /**
     * Create new HTMLElement / 创建新的HTMLElement
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     */
    #createTableRow(hash) {
        const tr = document.createElement('tr');
        this.#players[hash] = tr;
        this.nodes.list.appendChild(tr);
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        // PlayerID格納
        tr.children[0].innerText = hash;

        // For updating player name / 用于更新玩家名称
        const input = document.createElement('input');
        const button = document.createElement('button')
        tr.children[3].appendChild(input);

        // Button settings / 按钮设置
        tr.children[3].appendChild(button);
        button.innerText = 'set';
        button.addEventListener('click', () => {
            const name = input.value.trim();
            const prev_name = this.#getName(hash);
            if (name != prev_name) {
                if (this.#callback) {
                    this.#callback(hash, name);
                }
            }
        });
    }

    /**
     * Callback when player name setting button is pressed / 按下玩家名称设置按钮时的回调
     * @callback setPlayerNameCallback
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     * @param {string} name Player name to set / 要设置的玩家名称
     */

    /**
     * Callback function / 回调函数
     * @param {setPlayerNameCallback} func Callback function / 回调函数
     */
    setCallback(func) {
        if (typeof func == 'function') {
            this.#callback = func;
        }
    }

    /**
     * Get currently displayed banner player name / 获取当前显示的横幅玩家名称
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     * @returns {string} Player name / 玩家名称
     */
    #getName(hash) {
        if (hash in this.#players) {
            const tr = this.#players[hash];
            return tr.children[1].innerText;
        }
        return '';
    }

    /**
     * Set banner player name / 设置横幅玩家名称
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     * @param {string} name Player name / 玩家名称
     */
    setName(hash, name) {
        if (!(hash in this.#players)) {
            this.#createTableRow(hash);
        }
        if (hash in this.#players) {
            const tr = this.#players[hash];
            tr.children[1].innerText = name;
        }
    }

    /**
     * Set in-game name list / 设置游戏内名称列表
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     * @param {string[]} names Array of in-game player names / 游戏内玩家名称数组
     */
    setInGameNames(hash, names) {
        if (!(hash in this.#players)) {
            this.#createTableRow(hash);
        }
        if (hash in this.#players) {
            const tr = this.#players[hash];
            tr.children[2].innerText = names.join();
        }
    }
}

class PlayerNameLobbyView extends WebAPIConfigBase {
    #teams = [];
    #players = new Map();
    #callback = undefined;
    constructor() {
        super('player-lobbyview-');
        this.getNode('container');

        // Team initialization / 团队初始化
        for (let i = 0; i < 30; ++i) {
            const div = document.createElement('div');
            div.innerHTML = `
            <div class="player-lobbyview-team-info"><div class="team-id">${i + 1}</div><div class="team-name"></div></div>
            <div class="player-lobbyview-team-players"></div>
            `;
            div.classList.add('player-lobbyview-team');
            div.classList.add('hide');
            div.dataset.teamid = i + 1;
            this.nodes.container.appendChild(div);
            this.#teams.push(div);
        }
    }

    setCallback(func) {
        if (typeof func == 'function') {
            this.#callback = func;
        }
    }

    #createPlayerDiv(hash) {
        const div = document.createElement('div');
        div.classList.add('player-lobbyview-player');
        div.dataset.hash = hash;
        div.innerHTML = `
            <div class="player-name-container">
                <span class="player-name"></span>
                <span class="player-ingame-name"></span>
            </div>
            <div class="player-actions">
                <input type="text" class="player-name-input">
                <button class="player-set-name">
                    <span class="en">set</span>
                    <span class="jp">設定</span>
                </button>
            </div>
        `;
        this.#players.set(hash, div);
        const button = div.querySelector('.player-set-name');
        button.addEventListener('click', () => {
            const input = div.querySelector('.player-name-input');
            const name = input.value.trim();
            const prev_name = div.querySelector('.player-name').innerText;
            if (name != prev_name) {
                if (this.#callback) {
                    this.#callback(hash, name);
                }
            }
        });
    }

    start() {
        for (const team of this.#teams) {
            team.classList.remove('exists');
        }
        for (const player of this.#players.values()) {
            player.classList.remove('exists');
        }
    }

    end() {
        for (const team of this.#teams) {
            if (team.classList.contains('exists')) {
                team.classList.remove('hide');
            } else {
                team.classList.add('hide');
            }
        }
        for (const player of this.#players.values()) {
            if (player.classList.contains('exists')) {
                player.classList.remove('hide');
            } else {
                player.classList.add('hide');
            }
        }
    }

    setTeamName(teamid, teamname) {
        if (teamid < 0 || teamid >= this.#teams.length) return;
        const team = this.#teams[teamid];
        if (team) {
            const div = team.querySelector('.team-name');
            if (div) {
                div.innerText = teamname;
            }
        }
        team.classList.add('exists');
    }

    setPlayerIngameName(hash, teamid, name, ingamename) {
        if (!this.#players.has(hash)) {
            this.#createPlayerDiv(hash);
        }
        if (this.#players.has(hash)) {
            const div = this.#players.get(hash);
            div.querySelector('.player-name').innerText = name;
            div.querySelector('.player-ingame-name').innerText = ingamename;
            div.classList.add('exists');

            // Insert into team frame / 插入到团队框架
            const team = this.#teams[teamid];
            if (team && !team.contains(div)) {
                const container = team.querySelector('.player-lobbyview-team-players');
                if (container) {
                    container.appendChild(div);
                }
            }
        }
    }

    setPlayerName(hash, name) {
        if (!this.#players.has(hash)) return;
        const div = this.#players.get(hash);
        div.querySelector('.player-name').innerText = name;
    }
}

class TeamName extends WebAPIConfigBase {
    /** @type {setPlayerNameCallback} */
    #callback;

    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('team-name-');
        this.getNode('num');
        this.getNode('text');
        this.getNode('output');

        // Text settings / 文本设置
        this.#setLineNumber();

        this.nodes.text.addEventListener('change', (ev) => {
            this.#updateOutput(ev.target.value);
        });
    }

    /**
     * Set line numbers / 设置行号
     */
    #setLineNumber() {
        let dst = '';
        for(let i = 0; i < 30; ++i) {
            if (dst != '') dst += '\r\n';
            dst += (i + 1);
        }
        this.nodes.num.innerText = dst;
    }

    /**
     * Update text area / 更新文本区域
     * @param {*} text String to set in text area / 要设置到文本区域的字符串
     */
    updateText(text) {
        const prev_text = this.nodes.text.value;
        if (text != prev_text) {
            this.nodes.text.value = text;
            this.#updateOutput(text);
        }
    }

    /**
     * Create team name array from text area / 从文本区域创建团队名称数组
     * @returns {string[]} Array containing team names / 包含团队名称的数组
     */
    getLines() {
        const text = this.nodes.text.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30);
    }

    /**
     * Add "TeamXX: " to each line and set to output TextArea / 每行添加"TeamXX: "并设置到输出TextArea
     * @param {string} text Original text / 原始文本
     */
    #updateOutput(src) {
        let dst = '';
        const lines = src.split(/\r\n|\n/);
        for (let i = 0; i < 30 && i < lines.length; ++i) {
            const line = lines[i].trim();
            if (dst != '') dst += '\r\n';
            dst += (line == '' ? '' : 'Team' + (i + 1) + ': ' + line);
        }
        this.nodes.output.innerText = dst;
    }
}

class InGameSettings extends WebAPIConfigBase {
    #base = document.getElementById('ingamesettings');
    #lobby = {};
    #customsettings = {};
    #presets = {};
    #callback = undefined;
    /**
     * Constructor / 构造函数
     */
    constructor() {
        super('ingamesettings-');
        this.getNode('num');
        this.getNode('teamnames');
        this.getNode('spawnpoints');
        this.getNode('teamsettings');
        this.getNode('currentplaylistname');
        this.getNode('currentadminchat');
        this.getNode('currentteamrename');
        this.getNode('currentselfassign');
        this.getNode('currentaimassist');
        this.getNode('currentanonmode');
        this.getNode('token');
        this.getNode('presets');

        // Text settings / 文本设置
        this.#setLineNumber();

        // Check when text changes / 文本变更时检查
        this.nodes.teamnames.addEventListener('change', (ev) => {
            this.#checkTeamSettings();
        });
        this.nodes.spawnpoints.addEventListener('change', (ev) => {
            this.#checkTeamSettings();
        });

        // Check when value changes / 值变更时检查
        this.#base.querySelector('#ingamesettings-customsettings-playlistname').addEventListener('change', (ev) => {
            this.#checkCustomSettings();
        });
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-adminchat]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-teamrename]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-selfassign]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-aimassist]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-anonmode]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }

        // Save preset / 保存预设
        this.#base.querySelector('#ingamesettings-preset-save').addEventListener('click', (ev) => {
            const name = this.#base.querySelector('#ingamesettings-preset-name').value.trim();
            if (name == '') return;
            this.#savePreset(name);
        });
    }

    setUpdatePresetsCallback(func) {
        if (typeof func == 'function') {
            this.#callback = func;
        }
    }

    /**
     * Set line numbers / 设置行号
     */
    #setLineNumber() {
        let dst = '';
        for(let i = 0; i < 30; ++i) {
            if (dst != '') dst += '\r\n';
            dst += (i + 1);
        }
        this.nodes.num.innerText = dst;
    }

    #getPlaylistName() {
        return this.#base.querySelector('#ingamesettings-customsettings-playlistname').value;
    }

    #getAdminChat() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-adminchat"]:checked').value === '1';
    }

    #getTeamRename() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-teamrename"]:checked').value === '1';
    }

    #getSelfAssign() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-selfassign"]:checked').value === '1';
    }

    #getAimAssist() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-aimassist"]:checked').value === '1';
    }

    #getAnonMode() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-anonmode"]:checked').value === '1';
    }

    /**
     * Create team name array from text area / 从文本区域创建团队名称数组
     * @returns {string[]} Array containing team names / 包含团队名称的数组
     */
    getTeamNames() {
        const text = this.nodes.teamnames.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30);
    }

    /**
     * Create spawn point array from text area / 从文本区域创建出生点数组
     * @returns {number[]} Array containing spawn points / 包含出生点的数组
     */
    getSpawnPoints() {
        const text = this.nodes.spawnpoints.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30).map(x => {
            let n = parseInt(x, 10);
            if (Number.isNaN(n)) n = 0;
            if (n < 0) n = 0;
            if (30 < n) n = 0;
            return n;
        });
    }

    getCustomSettings() {
        return {
            playlistname: this.#getPlaylistName(),
            adminchat: this.#getAdminChat(),
            teamrename: this.#getTeamRename(),
            selfassign: this.#getSelfAssign(),
            aimassist: this.#getAimAssist(),
            anonmode: this.#getAnonMode()
        };
    }

    /**
     * Update in-game info team table / 更新游戏内信息团队表格
     */
    #updateInGameTeamSettings() {
        while (this.nodes.teamsettings.firstChild) {
            this.nodes.teamsettings.removeChild(this.nodes.teamsettings.firstChild);
        }
        if ('token' in this.#lobby) {
            this.nodes.token.textContent = this.#lobby.token;
            if (this.#lobby.token.indexOf('c') == 0) {
                this.nodes.token.dataset.status = 'common';
            } else {
                this.nodes.token.dataset.status = 'special';
            }
        } else {
            this.nodes.token.textContent = 'xxxxxxxx';
            this.nodes.token.dataset.status = 'none';
        }
        if ('teams' in this.#lobby) {
            for (let i = 0; i < 30; ++i) {
                if (i in this.#lobby.teams) {
                    const t = this.#lobby.teams[i];
                    const tr = document.createElement('tr');
                    tr.dataset.teamid = i;
                    tr.dataset.name = t.name;
                    tr.dataset.spawnpoint = t.spawnpoint;
                    tr.appendChild(document.createElement('td')).textContent = (i + 1);
                    tr.appendChild(document.createElement('td')).textContent = t.name;
                    tr.appendChild(document.createElement('td')).textContent = t.spawnpoint;
                    this.nodes.teamsettings.appendChild(tr);
                } else {
                    break;
                }
            }
        }
    }

    #checkTeamSettings() {
        const teamnames = this.getTeamNames();
        const spawnpoints = this.getSpawnPoints();
        for (const node of this.nodes.teamsettings.children) {
            const teamid = parseInt(node.dataset.teamid, 10);
            if (Number.isNaN(teamid)) continue;
            if (teamid < 0 || 29 < teamid) continue;
            let teamname = '';
            let spawnpoint = 0;
            if (teamid < teamnames.length) {
                teamname = teamnames[teamid];
            }
            if (teamid < spawnpoints.length) {
                spawnpoint = spawnpoints[teamid];
            }
            if (node.dataset.name == teamname) {
                node.children[1].dataset.correct = 'true';
            } else {
                node.children[1].dataset.correct = 'false';
            }
            if (node.dataset.spawnpoint == String(spawnpoint)) {
                node.children[2].dataset.correct = 'true';
            } else {
                node.children[2].dataset.correct = 'false';
            }
        }
    }

    #updatedCustomSettings() {
        if ('playlistname' in this.#customsettings) {
            this.nodes.currentplaylistname.textContent = this.#customsettings.playlistname;
        } else {
            this.nodes.currentplaylistname.textContent = '';
        }
        if ('adminchat' in this.#customsettings) {
            this.nodes.currentadminchat.textContent = String(this.#customsettings.adminchat);
        } else {
            this.nodes.currentadminchat.textContent = '';
        }
        if ('teamrename' in this.#customsettings) {
            this.nodes.currentteamrename.textContent = String(this.#customsettings.teamrename);
        } else {
            this.nodes.currentteamrename.textContent = '';
        }
        if ('selfassign' in this.#customsettings) {
            this.nodes.currentselfassign.textContent = String(this.#customsettings.selfassign);
        } else {
            this.nodes.currentselfassign.textContent = '';
        }
        if ('aimassist' in this.#customsettings) {
            this.nodes.currentaimassist.textContent = String(this.#customsettings.aimassist);
        } else {
            this.nodes.currentaimassist.textContent = '';
        }
        if ('anonmode' in this.#customsettings) {
            this.nodes.currentanonmode.textContent = String(this.#customsettings.anonmode);
        } else {
            this.nodes.currentanonmode.textContent = '';
        }
    }

    #checkCustomSettings() {
        console.log(this.#customsettings);
        let playlistname = '';
        let adminchat = false;
        let teamrename = false;
        let selfassign = false;
        let aimassist = false;
        let anonmode = false;
        if ('playlistname' in this.#customsettings) {
            playlistname = this.#customsettings.playlistname;
        }
        if ('adminchat' in this.#customsettings) {
            adminchat = this.#customsettings.adminchat;
        }
        if ('teamrename' in this.#customsettings) {
            teamrename = this.#customsettings.teamrename;
        }
        if ('selfassign' in this.#customsettings) {
            selfassign = this.#customsettings.selfassign;
        }
        if ('aimassist' in this.#customsettings) {
            aimassist = this.#customsettings.aimassist;
        }
        if ('anonmode' in this.#customsettings) {
            anonmode = this.#customsettings.anonmode;
        }
        if (this.#getPlaylistName() == playlistname) {
            this.nodes.currentplaylistname.dataset.correct = 'true';
        } else {
            this.nodes.currentplaylistname.dataset.correct = 'false';
        }
        if (this.#getAdminChat() == adminchat) {
            this.nodes.currentadminchat.dataset.correct = 'true';
        } else {
            this.nodes.currentadminchat.dataset.correct = 'false';
        }
        if (this.#getTeamRename() == teamrename) {
            this.nodes.currentteamrename.dataset.correct = 'true';
        } else {
            this.nodes.currentteamrename.dataset.correct = 'false';
        }
        if (this.#getSelfAssign() == selfassign) {
            this.nodes.currentselfassign.dataset.correct = 'true';
        } else {
            this.nodes.currentselfassign.dataset.correct = 'false';
        }
        if (this.#getAimAssist() == aimassist) {
            this.nodes.currentaimassist.dataset.correct = 'true';
        } else {
            this.nodes.currentaimassist.dataset.correct = 'false';
        }
        if (this.#getAnonMode() == anonmode) {
            this.nodes.currentanonmode.dataset.correct = 'true';
        } else {
            this.nodes.currentanonmode.dataset.correct = 'false';
        }
    }

    #savePreset(key) {
        if (key == '') return;
        const preset = {};
        preset.teamnames = this.getTeamNames();
        preset.spawnpoints = this.getSpawnPoints();
        preset.customsettings = {
            playlistname: this.#getPlaylistName(),
            adminchat: this.#getAdminChat(),
            teamrename: this.#getTeamRename(),
            selfassign: this.#getSelfAssign(),
            aimassist: this.#getAimAssist(),
            anonmode: this.#getAnonMode()
        };
        this.#presets[key] = preset;
        if (typeof this.#callback == 'function') {
            this.#callback(this.#presets);
        }
    }

    #loadPreset(key) {
        if (key in this.#presets) {
            this.#base.querySelector('#ingamesettings-preset-name').value = key;

            // load
            const preset = this.#presets[key];
            if ('teamnames' in preset) {
                if (preset.teamnames instanceof Array) {
                    this.nodes.teamnames.value = preset.teamnames.join('\r\n');
                }
            }
            if ('spawnpoints' in preset) {
                if (preset.spawnpoints instanceof Array) {
                    this.nodes.spawnpoints.value = preset.spawnpoints.join('\r\n');
                }
            }
            if ('customsettings' in preset) {
                const settings = preset.customsettings;
                if ('playlistname' in settings) {
                    this.#base.querySelector('#ingamesettings-customsettings-playlistname').value = settings.playlistname;
                }
                if ('adminchat' in settings) {
                    const value = settings.adminchat ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-adminchat]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('teamrename' in settings) {
                    const value = settings.teamrename ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-teamrename]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('selfassign' in settings) {
                    const value = settings.selfassign ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-selfassign]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('aimassist' in settings) {
                    const value = settings.aimassist ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-aimassist]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('anonmode' in settings) {
                    const value = settings.anonmode ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-anonmode]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
            }

            // check
            this.#checkTeamSettings();
            this.#checkCustomSettings();
        }
    }

    #deletePreset(key) {
        if (key in this.#presets) {
            delete this.#presets[key];
            if (typeof this.#callback == 'function') {
                this.#callback(this.#presets);
            }
        }
    }

    #updatedPresets() {
        while (this.nodes.presets.firstChild) {
            this.nodes.presets.removeChild(this.nodes.presets.firstChild);
        }
        const keys = Object.keys(this.#presets).sort((a, b) => a.localeCompare(b));
        for (const key of keys) {
            const preset = this.#presets[key];
            const playlistname = ('customsettings' in preset && 'playlistname' in preset.customsettings) ? preset.customsettings.playlistname : '';
            const tr = document.createElement('tr');
            tr.appendChild(document.createElement('td')).textContent = key;
            tr.appendChild(document.createElement('td')).textContent = playlistname;
            const action = tr.appendChild(document.createElement('td'));
            action.appendChild(document.createElement('button')).textContent = 'load';
            action.appendChild(document.createElement('button')).textContent = 'delete';
            action.children[0].addEventListener('click', () => {
                this.#loadPreset(key);
            });
            action.children[1].addEventListener('click', () => {
                this.#deletePreset(key);
            });
            this.nodes.presets.appendChild(tr);
        }
    }

    setTournamentParams(params) {
        this.#presets = {};
        if (params && 'presets' in params) {
            this.#presets = params.presets;
        }
        this.#updatedPresets();
    }

    setLobby(lobby) {
        this.#lobby = lobby;
        this.#updateInGameTeamSettings();
        this.#checkTeamSettings();
    }

    setCustomSettings(settings) {
        this.#customsettings = settings;
        this.#updatedCustomSettings();
        this.#checkCustomSettings();
    }
}

class LegendBan {
    #api;
    #tbody;
    constructor() {
        this.#api = null;
        this.#tbody = document.getElementById('legendban-list');
    }

    setWebAPI(api) {
        this.#api = api;

        document.getElementById('legendban-get').addEventListener('click', () => {
            api.sendGetLegendBanStatus();
        });

        document.getElementById('legendban-set').addEventListener('click', () => {
            const legendrefs = this.#getLegendRefs();
            console.log(legendrefs);
            api.sendSetLegendBan(legendrefs);
        });

        document.getElementById('legendban-banall').addEventListener('click', () => {
            this.#setAll(true);
        });

        document.getElementById('legendban-unbanall').addEventListener('click', () => {
            this.#setAll(false);
        });

        api.addEventListener('legendbanenumstart', ev => {
            console.log('legendbanenumstart');
            this.#clear();
        });

        api.addEventListener('legendbanstatus', ev => {
            const data = ev.detail;
            this.#add(data.name, data.legendref, data.banned);
        });

        api.addEventListener('legendbanenumend', ev => {
            console.log('legendbanenumend');
        });
    }

    #getLegendRefs() {
        const refs = [];
        for (const tr of this.#tbody.children) {
            if (tr.dataset.banned == 'true') {
                refs.push(tr.dataset.legendref);
            }
        }
        return refs.join(',');
    }

    #add(name, legendref, banned) {
        const tr = document.createElement('tr');
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.dataset.legendref = legendref;
        tr.dataset.banned = banned;
        tr.children[0].textContent = name;
        tr.children[1].textContent = banned;
        this.#tbody.appendChild(tr);

        tr.addEventListener('click', () => {
            if (tr.dataset.banned == 'true') {
                tr.dataset.banned = 'false';
                tr.children[1].textContent = 'false';
            } else {
                tr.dataset.banned = 'true';
                tr.children[1].textContent = 'true';
            }
        });
    }

    #setAll(banned) {
        for (const tr of this.#tbody.children) {
            tr.dataset.banned = banned;
            tr.children[1].textContent = banned;
        }
    }

    #clear() {
        while (this.#tbody.firstChild) {
            this.#tbody.removeChild(this.#tbody.firstChild);
        }
    }
}

class RealtimeView {
    #_game;
    #basenode;
    #gameinfonode;
    #nodes;
    #gameinfonodes;
    #callback;
    #playersnamenode;

    constructor() {
        this.#basenode = document.getElementById('realtime-teams');
        this.#nodes = [];
        this.#callback = null;
        this.#playersnamenode = {};

        // Create storage for game info / 创建游戏信息存储
        this.#gameinfonode = document.getElementById('realtime-gameinfo');
        this.#gameinfonodes = {
            datacenter: document.createElement('div'),
            aimassiston: document.createElement('div'),
            serverid: document.createElement('div'),
            anonymousmode: document.createElement('div'),
            state: document.createElement('div'),
            start: document.createElement('div'),
            end: document.createElement('div'),
            map: document.createElement('div'),
            playlistname: document.createElement('div'),
            playlistdesc: document.createElement('div'),
        };
        this.#gameinfonode.appendChild(this.#gameinfonodes.datacenter);
        this.#gameinfonode.appendChild(this.#gameinfonodes.aimassiston);
        this.#gameinfonode.appendChild(this.#gameinfonodes.anonymousmode);
        this.#gameinfonode.appendChild(this.#gameinfonodes.serverid);
        this.#gameinfonode.appendChild(this.#gameinfonodes.state);
        this.#gameinfonode.appendChild(this.#gameinfonodes.start);
        this.#gameinfonode.appendChild(this.#gameinfonodes.end);
        this.#gameinfonode.appendChild(this.#gameinfonodes.map);
        this.#gameinfonode.appendChild(this.#gameinfonodes.playlistname);
        this.#gameinfonode.appendChild(this.#gameinfonodes.playlistdesc);

    }

    #precheckTeamID(teamid) {
        if (teamid < this.#basenode.children.length) return;
        for (let i = this.#basenode.children.length; i <= teamid; ++i) {
            this.#appendTeamNode(i);
        }
    }

    #precheckPlayerID(teamid, playerid) {
        if (playerid < this.#nodes[teamid].players.length) return;
        for (let i = this.#nodes[teamid].players.length; i <= playerid; ++i) {
            this.#appendPlayerNode(teamid, i);
        }
    }

    #drawBarHP(canvas, hp, hpmax) {
        const height = 8;
        canvas.width = hpmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, hpmax + 2, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(1, 1, hp, height - 2);
    }
    
    #drawBarShield(canvas, shield, shieldmax, gold = false) {
        const height = 8;
        canvas.width = shieldmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, shieldmax + 2, height);

        if (shieldmax == 125) {
            ctx.fillStyle = "#FF0000";
        } else if (shieldmax == 100) {
            if (gold) {
                ctx.fillStyle = "#E6B422";
            } else {
                ctx.fillStyle = "#A260BF";
            }
        } else if (shieldmax == 75) {
            ctx.fillStyle = "#7FCCE3";
        } else {
            ctx.fillStyle = "#FFFFFF";
        }
        ctx.fillRect(1, 1, shield, height - 2);
    }

    #generateTeamNode(teamid) {
        const teamnode = {};
        teamnode.base = document.createElement('div');
        teamnode.banner = document.createElement('div');
        teamnode.number = document.createElement('div');
        teamnode.name = document.createElement('div');
        teamnode.kills = document.createElement('div');
        teamnode.kills_header = document.createElement('div');
        teamnode.kills_value = document.createElement('div');
        teamnode.placement = document.createElement('div');
        teamnode.placement_header = document.createElement('div');
        teamnode.placement_value = document.createElement('div');
        teamnode.players = [];

        /* append */
        teamnode.banner.appendChild(teamnode.number);
        teamnode.banner.appendChild(teamnode.name);
        teamnode.banner.appendChild(teamnode.kills);
        teamnode.banner.appendChild(teamnode.placement);
        teamnode.kills.appendChild(teamnode.kills_header);
        teamnode.kills.appendChild(teamnode.kills_value);
        teamnode.placement.appendChild(teamnode.placement_header);
        teamnode.placement.appendChild(teamnode.placement_value);
        teamnode.base.appendChild(teamnode.banner);

        /* set class */
        teamnode.base.classList.add('realtime-team-base');
        teamnode.banner.classList.add('realtime-team-banner');
        teamnode.number.classList.add('realtime-team-number');
        teamnode.name.classList.add('realtime-team-name');
        teamnode.kills.classList.add('realtime-team-kills');
        teamnode.kills_header.classList.add('realtime-team-kills-header');
        teamnode.kills_value.classList.add('realtime-team-kills-value');
        teamnode.placement.classList.add('realtime-team-placement');
        teamnode.placement_header.classList.add('realtime-team-placement-header');
        teamnode.placement_value.classList.add('realtime-team-placement-value');

        /* set initial text */
        teamnode.number.innerText = (teamid + 1);
        teamnode.kills_header.innerText = 'kills';
        teamnode.kills_value.innerText = '0';
        teamnode.placement_header.innerText = 'place';
        teamnode.placement_value.innerText = '0';

        return teamnode;
    }

    #generatePlayerNode(teamid, playerid) {
        const playernode = {};
        playernode.base = document.createElement('div');
        playernode.left = document.createElement('div');
        playernode.right = document.createElement('div');
        playernode.name = document.createElement('div');
        playernode.character = document.createElement('div');
        playernode.weapon = document.createElement('div');
        playernode.hpshield = document.createElement('div');
        playernode.hp = document.createElement('div');
        playernode.hpbar = document.createElement('canvas');
        playernode.shield = document.createElement('div');
        playernode.shieldbar = document.createElement('canvas');
        playernode.kills = document.createElement('div');
        playernode.assists = document.createElement('div');
        playernode.damage_dealt = document.createElement('div');
        playernode.damage_taken = document.createElement('div');

        /* append */
        playernode.base.appendChild(playernode.left);
        playernode.base.appendChild(playernode.right);
        playernode.left.appendChild(playernode.name);
        playernode.left.appendChild(playernode.hpshield);
        playernode.left.appendChild(playernode.character);
        playernode.left.appendChild(playernode.weapon);
        playernode.hpshield.appendChild(playernode.hp);
        playernode.hpshield.appendChild(playernode.hpbar);
        playernode.hpshield.appendChild(playernode.shield);
        playernode.hpshield.appendChild(playernode.shieldbar);
        playernode.right.appendChild(playernode.kills);
        playernode.right.appendChild(playernode.assists);
        playernode.right.appendChild(playernode.damage_dealt);
        playernode.right.appendChild(playernode.damage_taken);
        
        /* set class */
        playernode.base.classList.add('realtime-player-base');
        playernode.base.classList.add('realtime-player-state-alive'); // Default is alive / 默认为存活
        playernode.left.classList.add('realtime-player-left');
        playernode.right.classList.add('realtime-player-right');
        playernode.name.classList.add('realtime-player-name');
        playernode.character.classList.add('realtime-player-character');
        playernode.weapon.classList.add('realtime-player-weapon');
        playernode.hpshield.classList.add('realtime-player-hpshield');
        playernode.hp.classList.add('realtime-player-hp');
        playernode.hpbar.classList.add('realtime-player-hpbar');
        playernode.shield.classList.add('realtime-player-shield');
        playernode.shieldbar.classList.add('realtime-player-shieldbar');
        playernode.kills.classList.add('realtime-player-kills');
        playernode.assists.classList.add('realtime-player-assists');
        playernode.damage_dealt.classList.add('realtime-player-damage-dealt');
        playernode.damage_taken.classList.add('realtime-player-damage-taken');

        /* set initial text */
        playernode.hp.innerText = 'HP:';
        playernode.shield.innerText = '🛡:';
        playernode.character.innerText = '';
        playernode.weapon.innerText = '';
        playernode.kills.innerText = 'kills:0';
        playernode.assists.innerText = 'assists:0';
        playernode.damage_dealt.innerText = 'dealt:0';
        playernode.damage_taken.innerText = 'taken:0';

        /* set canvas size */
        playernode.hpbar.width = 1;
        playernode.hpbar.height = 1;
        playernode.shieldbar.width = 1;
        playernode.shieldbar.height = 1;

        /* set click callback */
        playernode.base.addEventListener('click', (ev) => {
            if (playernode.base.classList.contains('realtime-player-state-alive')) {
                if (typeof(this.#callback) == "function") {
                    this.#callback(teamid, playerid);
                }
            }
        });

        /* set animation clear */
        playernode.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == 'realtime-player-changed-damage-dealt-animation') {
                playernode.base.classList.remove('realtime-player-changed-damage-dealt');
            }
        });

        return playernode;
    }

    #appendTeamNode(teamid) {
        const teamnode = this.#generateTeamNode(teamid);
        this.#nodes.push(teamnode);
        this.#basenode.appendChild(teamnode.base);
    }

    #appendPlayerNode(teamid, playerid) {
        const playernode = this.#generatePlayerNode(teamid, playerid);
        this.#nodes[teamid].players.push(playernode);
        this.#nodes[teamid].base.appendChild(playernode.base);
    }

    #getDateString(timestamp) {
        if (timestamp == 0) return 'none';
        return (new Date(timestamp)).toLocaleString();
    }

    drawGameInfo() {
        if (this.#_game == null) return;
        this.#gameinfonodes.datacenter.innerText = 'datacenter:' + this.#_game.datacenter;
        this.#gameinfonodes.aimassiston.innerText = 'aimassiston:' + this.#_game.aimassiston;
        this.#gameinfonodes.anonymousmode.innerText = 'anonymousmode:' + this.#_game.anonymousmode;
        this.#gameinfonodes.serverid.innerText = 'serverid:' + this.#_game.serverid;
        this.#gameinfonodes.state.innerText = 'state:' + this.#_game.state;
        this.#gameinfonodes.start.innerText = 'start:' + this.#getDateString(this.#_game.start);
        this.#gameinfonodes.end.innerText = 'end:' + this.#getDateString(this.#_game.end);
        this.#gameinfonodes.map.innerText = 'map:' + this.#_game.map;
        // this.#gameinfonodes.playlistname.innerText = 'playlistname:' + this.#_game.playlistname;
        // this.#gameinfonodes.playlistdesc.innerText = 'playlistdesc:' + this.#_game.playlistdesc;
    }

    drawTeamName(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            let name = '';
            if ('params' in team && 'name' in team.params) {
                name = team.params.name;
            } else if ('name' in team) {
                name = team.name;
            }
            if (name != '') {
                this.#nodes[teamid].name.innerText = name;
                return true;
            }
        }
        return false;
    }

    drawTeamKills(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('kills' in team) {
                this.#nodes[teamid].kills_value.innerText = team.kills;
                return true;
            }
        }
        return false;
    }

    drawTeamPlacement(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('placement' in team) {
                this.#nodes[teamid].placement_value.innerText = team.placement;
                return true;
            }
        }
        return false;
    }
    
    drawTeamEliminated(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('eliminated' in team) {
                if (team.eliminated) {
                    this.#nodes[teamid].base.classList.add('realtime-team-eliminated');
                } else {
                    this.#nodes[teamid].base.classList.remove('realtime-team-eliminated');
                }
                return true;
            }
        }
        return false;
    }

    drawTeam(teamid) {
        if (drawTeamName(teamid) &&
        drawTeamKills(teamid) &&
        drawTeamPlacement(teamid)) {
            return true;
        }
        return false;
    }

    static PLAYERNODE_NAME = 0x00;
    static PLAYERNODE_CHARACTER = 0x01;
    static PLAYERNODE_HP = 0x02;
    static PLAYERNODE_SHIELD = 0x03;
    static PLAYERNODE_KILLS = 0x04;
    static PLAYERNODE_ASSISTS = 0x05;
    static PLAYERNODE_DAMAGE_DEALT = 0x06;
    static PLAYERNODE_DAMAGE_TAKEN = 0x07;
    static PLAYERNODE_STATE = 0x08;
    static PLAYERNODE_SELECTED = 0x09;
    static PLAYERNODE_WEAPON = 0x0a;

    drawPlayerNode(teamid, playerid, nodetype = RealtimeView.PLAYERNODE_NAME) {
        this.#precheckTeamID(teamid);
        this.#precheckPlayerID(teamid, playerid);
        if (teamid >= this.#_game.teams.length) return false;
        if (playerid >= this.#_game.teams[teamid].length) return false;
        const player = this.#_game.teams[teamid].players[playerid];
        switch(nodetype) {
            case RealtimeView.PLAYERNODE_NAME: {
                const node = this.#nodes[teamid].players[playerid].name;
                this.#playersnamenode[player.hash] = node;
                if ('params' in player && 'name' in player.params) {
                    node.innerText = player.params.name;
                    return true;
                } else if ('name' in player) {
                    node.innerText = player.name;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_CHARACTER: {
                const node = this.#nodes[teamid].players[playerid].character;
                if ('character' in player) {
                    node.innerText = player.character;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_HP: {
                const node = this.#nodes[teamid].players[playerid].hpbar;
                if ('hp' in player && 'hp_max' in player) {
                    // node.innerText = 'HP:' + player.hp + '/' + player.hp_max;
                    this.#drawBarHP(node, player.hp, player.hp_max);
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_SHIELD: {
                const node = this.#nodes[teamid].players[playerid].shieldbar;
                if ('shield' in player && 'shield_max' in player) {
                    let gold = false;
                    if ('items' in player && 'bodyshield' in player.items && player.items.bodyshield == 4) gold = true;
                    this.#drawBarShield(node, player.shield, player.shield_max, gold);
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_KILLS: {
                const node = this.#nodes[teamid].players[playerid].kills;
                if ('kills' in player) {
                    node.innerText = 'kills:' + player.kills;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_ASSISTS: {
                const node = this.#nodes[teamid].players[playerid].assists;
                if ('assists' in player) {
                    node.innerText = 'assists:' + player.assists;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_DAMAGE_DEALT: {
                const node = this.#nodes[teamid].players[playerid].damage_dealt;
                if ('damage_dealt' in player) {
                    if (player.damage_dealt > 0 && node.innerText != ('dealt:' + player.damage_dealt)) {
                        // Add animation to change background color / 添加改变背景色的动画
                        this.#nodes[teamid].players[playerid].base.classList.remove('realtime-player-changed-damage-dealt');
                        this.#nodes[teamid].players[playerid].base.offsetWidth;
                        this.#nodes[teamid].players[playerid].base.classList.add('realtime-player-changed-damage-dealt');
                    }
                    node.innerText = 'dealt:' + player.damage_dealt;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_DAMAGE_TAKEN: {
                const node = this.#nodes[teamid].players[playerid].damage_taken;
                if ('damage_taken' in player) {
                    node.innerText = 'taken:' + player.damage_taken;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_STATE: {
                const node = this.#nodes[teamid].players[playerid].base;
                if ('state' in player) {
                    if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_DOWN) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.add('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    } else if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.add('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    } else if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_COLLECTED) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.add('realtime-player-state-collected');
                    } else {
                        node.classList.add('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    }
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_SELECTED: {
                const node = this.#nodes[teamid].players[playerid].base;
                for (const t of document.querySelectorAll('.realtime-player-selected')) {
                    t.classList.remove('realtime-player-selected');
                }
                node.classList.add('realtime-player-selected');
                break;
            }
            case RealtimeView.PLAYERNODE_WEAPON: {
                const node = this.#nodes[teamid].players[playerid].weapon;
                if ('weapon' in player) {
                    node.innerText = player.weapon;
                    return true;
                }
                break;
            }
        }
        return false;
    }

    redrawPlayerName(hash, params) {
        if (hash in this.#playersnamenode) {
            const namenode = this.#playersnamenode[hash];
            if ('name' in params && params.name != '') {
                namenode.innerText = params.name;
            }
        }
    }

    drawPlayer(teamid, playerid) {
        let result = true;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_NAME)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_CHARACTER)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_HP)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_SHIELD)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_KILLS)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_ASSISTS)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_DAMAGE_DEALT)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_DAMAGE_TAKEN)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_STATE)) result = false;
        return result;
    }

    setGame(game) {
        this.#_game = game;
        this.drawGameInfo();
    }

    clear() {
        this.#basenode.innerHTML = '';
        this.#nodes.splice(0);
        for (const key in this.#playersnamenode) {
            delete this.#playersnamenode[key];
        }
    }

    setPlayerClickCallback(func) {
        this.#callback = func;
    }
}

class ResultView {
    #_game;
    #_results;
    #tournamentparams;
    #info;
    #all;
    #left;
    #right;
    #single;
    #nodes;
    #infonodes;
    #teams; // For saving params / 用于保存params
    #players; // For saving params / 用于保存params
    #current;
    #callback;
    #unknownidcallback;
    static points_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

    constructor() {
        this.#info = document.getElementById('result-game-info');
        this.#all = document.getElementById('result-all-base');
        this.#left = document.getElementById('result-all-left');
        this.#right = document.getElementById('result-all-right');
        this.#single = document.getElementById('result-single');
        this.#tournamentparams = {};
        this.#nodes = [];
        this.#infonodes = [];
        this.#_game = null;
        this.#_results = null;
        this.#teams = {};
        this.#players = {};
        this.#current = "all";
        this.#callback = null;
        this.#unknownidcallback = null;
        this.clear();
    }
    
    #generateGameInfoNode(gameid) {
        const node = {
            base: document.createElement('div'),
            gamenumber: document.createElement('div'),
            datacenter: document.createElement('div'),
            serverid: document.createElement('div'),
            playlistname: document.createElement('div'),
            playlistdesc: document.createElement('div'),
            map: document.createElement('div'),
            start: document.createElement('div'),
            end: document.createElement('div'),
            anonymousmode: document.createElement('div'),
            aimassiston: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.gamenumber);
        node.base.appendChild(node.datacenter);
        node.base.appendChild(node.serverid);
        // node.base.appendChild(node.playlistname);
        // node.base.appendChild(node.playlistdesc);
        node.base.appendChild(node.map);
        node.base.appendChild(node.start);
        node.base.appendChild(node.end);
        node.base.appendChild(node.anonymousmode);
        node.base.appendChild(node.aimassiston);

        /* class */
        node.gamenumber.classList.add('result-game-info-number');

        /* callback */
        node.base.addEventListener('click', () => {
            if (typeof(this.#callback) == 'function') {
                this.#callback(gameid);
            }
        });

        return node;
    }

    #generateTeamNodeForAll() {
        const node = {
            base: document.createElement('div'),
            banner: document.createElement('div'),
            rank: document.createElement('div'),
            name: document.createElement('div'),
            placement: document.createElement('div'),
            placement_label: document.createElement('div'),
            placement_value: document.createElement('div'),
            kills: document.createElement('div'),
            kills_label: document.createElement('div'),
            kills_value: document.createElement('div'),
            points: document.createElement('div'),
            points_label: document.createElement('div'),
            points_value: document.createElement('div'),
        }

        /* append */
        node.base.appendChild(node.banner);
        node.banner.appendChild(node.rank);
        node.banner.appendChild(node.name);
        node.banner.appendChild(node.placement);
        node.banner.appendChild(node.kills);
        node.banner.appendChild(node.points);
        node.placement.appendChild(node.placement_label);
        node.placement.appendChild(node.placement_value);
        node.kills.appendChild(node.kills_label);
        node.kills.appendChild(node.kills_value);
        node.points.appendChild(node.points_label);
        node.points.appendChild(node.points_value);

        /* set class */
        node.base.classList.add('result-all-team-base');
        node.banner.classList.add('result-all-team-banner');
        node.rank.classList.add('result-all-team-rank');
        node.name.classList.add('result-all-team-name');
        node.placement.classList.add('result-all-team-placement');
        node.placement_label.classList.add('result-all-team-placement-label');
        node.kills.classList.add('result-all-team-kills');
        node.kills_label.classList.add('result-all-team-kills-label');
        node.points.classList.add('result-all-team-points');
        node.points_label.classList.add('result-all-team-kills-label');
        return node;
    }

    #drawTeamForAll(rank, total, team, placement = null) {
        // Fill if elements are insufficient / 如果元素不足则填充
        if (rank >= this.#nodes.length) {
            for (let i = this.#nodes.length; i <= rank; ++i) {
                const node = this.#generateTeamNodeForAll();
                this.#nodes.push(node);
                if (i < (total / 2)) {
                    this.#left.appendChild(node.base);
                } else {
                    this.#right.appendChild(node.base);
                }
            }
        }

        // Text settings / 文本设置
        const node = this.#nodes[rank];
        const kills = team.kills.reduce((a, c) => a + c, 0);
        const kill_points = team.kill_points.reduce((a, c) => a + c, 0);
        const placement_points = team.placement_points.reduce((a, c) => a + c, 0);
        node.rank.innerText = team.rank + 1;
        node.name.innerText = this.#getTeamName(team.id, team.name);
        node.placement_label.innerText = 'PP';
        node.placement_value.innerText = placement_points;
        if (placement != null) {
            node.placement_value.innerHTML += '<span>(' + placement + ')</span>';
        }
        node.kills_label.innerText = 'KP';
        node.kills_value.innerText = kill_points;
        if (kills != kill_points) {
            node.kills_value.innerHTML += '<span>(' + kills + ')</span>';
        }
        node.points_value.innerText = team.total_points;
        node.points_label.innerText = 'TOTAL';

        node.base.dataset.winner = team.winner;

        // Register for update / 注册以便更新
        this.#saveTeamNode(team.id, node.name);
    }

    #generateTeamNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            banner: document.createElement('div'),
            name: document.createElement('div'),
            placement: document.createElement('div'),
            placement_label: document.createElement('div'),
            placement_value: document.createElement('div'),
            kills: document.createElement('div'),
            kills_label: document.createElement('div'),
            kills_value: document.createElement('div'),
            points: document.createElement('div'),
            points_label: document.createElement('div'),
            points_value: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.banner);
        node.banner.appendChild(node.name);
        node.banner.appendChild(node.placement);
        node.banner.appendChild(node.kills);
        node.banner.appendChild(node.points);
        node.placement.appendChild(node.placement_label);
        node.placement.appendChild(node.placement_value);
        node.kills.appendChild(node.kills_label);
        node.kills.appendChild(node.kills_value);
        node.points.appendChild(node.points_label);
        node.points.appendChild(node.points_value);

        /* set class */
        node.base.classList.add('result-single-team-base');
        node.banner.classList.add('result-single-team-banner');
        node.name.classList.add('result-single-team-name');
        node.placement.classList.add('result-single-team-placement');
        node.placement_label.classList.add('result-single-team-placement-label');
        node.placement_value.classList.add('result-single-team-placement-value');
        node.kills.classList.add('result-single-team-kills');
        node.kills_label.classList.add('result-single-team-kills-label');
        node.kills_value.classList.add('result-single-team-kills-value');
        node.points.classList.add('result-single-team-points');
        node.points_label.classList.add('result-single-team-points-label');
        node.points_value.classList.add('result-single-team-points-value');

        /* set text */
        node.placement_label.innerText = 'place';
        node.kills_label.innerText = 'kills';
        node.points_label.innerText = 'points';
        return node;
    }

    #generatePlayerLabelNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            name: document.createElement('div'),
            character: document.createElement('div'),
            kills: document.createElement('div'),
            assists: document.createElement('div'),
            damage: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.name);
        node.base.appendChild(node.character);
        node.base.appendChild(node.kills);
        node.base.appendChild(node.assists);
        node.base.appendChild(node.damage);

        /* set class */
        node.base.classList.add('result-single-player-label-base');
        node.name.classList.add('result-single-player-label-name');
        node.character.classList.add('result-single-player-label-character');
        node.kills.classList.add('result-single-player-label-kills');
        node.assists.classList.add('result-single-player-label-assists');
        node.damage.classList.add('result-single-player-label-damage');

        /* set text */
        node.name.innerText = 'name';
        node.character.innerText = 'CH';
        node.kills.innerText = 'K';
        node.assists.innerText = 'A';
        node.damage.innerText = 'DMG';

        return node;
    }

    #generatePlayerNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            name: document.createElement('div'),
            character: document.createElement('div'),
            kills: document.createElement('div'),
            assists: document.createElement('div'),
            damage: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.name);
        node.base.appendChild(node.character);
        node.base.appendChild(node.kills);
        node.base.appendChild(node.assists);
        node.base.appendChild(node.damage);

        /* set class */
        node.base.classList.add('result-single-player-base');
        node.name.classList.add('result-single-player-name');
        node.character.classList.add('result-single-player-character');
        node.kills.classList.add('result-single-player-kills');
        node.assists.classList.add('result-single-player-assists');
        node.damage.classList.add('result-single-player-damage');

        return node;
    }

    #drawResult(gameid) {
        if (gameid >= this.#_results.length) return;
        const result = this.#_results[gameid];

        for (const [teamidstr, data] of Object.entries(result.teams)) {
            const teamid = parseInt(teamidstr, 10);
            const teamnode = this.#generateTeamNodeForSingle();
            
            // Text settings / 文本设置
            teamnode.name.innerText = this.#getTeamName(teamid, data.name);
            teamnode.placement_value.innerText = data.placement;
            teamnode.kills_value.innerText = data.kills;
            teamnode.points_value.innerText = data.kills + (data.placement - 1 < 15 ? ResultView.points_table[data.placement - 1] : 0);

            // Label / 标签
            const playerlabelnode = this.#generatePlayerLabelNodeForSingle();
            teamnode.base.appendChild(playerlabelnode.base);

            for (const player of data.players) {
                const playernode = this.#generatePlayerNodeForSingle();
                teamnode.base.appendChild(playernode.base);

                // Text settings / 文本设置
                playernode.name.innerText = this.#getPlayerName(player.id, player.name);
                playernode.character.innerText = player.character;
                playernode.kills.innerText = player.kills;
                playernode.assists.innerText = player.assists;
                playernode.damage.innerText = player.damage_dealt;

                // Register for update / 注册以便更新
                this.#savePlayerNode(player.id, playernode.name);
            }
            // Register for update / 注册以便更新
            this.#saveTeamNode(teamid, teamnode.name);

            this.#single.appendChild(teamnode.base);
        }
    }

    #drawGameInfo() {
        // Adjust number of infonodes / 调整infonodes数量
        if (this.#infonodes.length > this.#_results.length) {
            // Delete / 删除
            for (let i = this.#infonodes.length; i <= this.#_results.length; --i) {
                this.#infonodes.pop(); // Remove last element / 删除最后一个元素
                this.#info.removeChild(this.#info.lastChild()); // Remove last element / 删除最后一个元素
            }
        } else if (this.#infonodes.length < this.#_results.length) {
            // Add / 添加
            for (let i = this.#infonodes.length; i < this.#_results.length; ++i) {
                const node = this.#generateGameInfoNode(i);
                this.#infonodes.push(node);
                this.#info.appendChild(node.base);
            }
        }
        
        // Text settings / 文本设置
        for (let i = 0; i < this.#_results.length; ++i) {
            const result = this.#_results[i];
            const node = this.#infonodes[i];
            node.gamenumber.innerHTML = '<span class="en">Game</span><span class="zh">比赛</span> ' + (i + 1);
            node.datacenter.innerText = 'datacenter: ' + result.datacenter;
            node.serverid.innerText = 'serverid: '+ result.serverid;
            node.playlistname.innerText = 'playlistname: ' + result.playlistname;
            node.playlistdesc.innerText = 'playlistdesc: ' + result.playlistdesc;
            node.map.innerText = 'map: ' + result.map;
            node.start.innerText = 'start: ' + (new Date(result.start)).toLocaleString();
            node.end.innerText = 'end: ' + (new Date(result.end)).toLocaleString();
            node.anonymousmode.innerText = 'anonymousmode: ' + (result.anonymousmode ? 'true' : 'false');
            node.aimassiston.innerText = 'aimassiston: ' + (result.aimassiston ? 'true' : 'false');
        }
    }

    #drawResults(target) {
        // For calculation / 用于计算
        let data;

        // Add points from past games / 添加过去比赛的积分
        if (target == 'all') {
            data = resultsToTeamResults(this.#_results);
        } else if (typeof target == 'number') {
            if (target < this.#_results.length) {
                const results = [this.#_results[target]];
                data = resultsToTeamResults(results);
            } else {
                return;
            }
        } else {
            return;
        }

        // Get match point threshold / 获取赛点阈值
        const matchpoints = ('calcmethod' in this.#tournamentparams && 'matchpoints' in this.#tournamentparams.calcmethod && this.#tournamentparams.calcmethod.matchpoints > 0) ? this.#tournamentparams.calcmethod.matchpoints : 0;

        // Calculate and add points / 计算并添加积分
        for (const [teamidstr, team] of Object.entries(data)) {
            const teamid = parseInt(teamidstr, 10);
            const advancepoint = getAdvancePoints(teamid, this.#tournamentparams);
            for (let gameid = 0; gameid < team.kills.length; ++gameid) {
                let points;
                if (target == 'all') {
                    points = calcPoints(gameid, team.placements[gameid], team.kills[gameid], this.#tournamentparams);
                } else {
                    points = calcPoints(target, team.placements[gameid], team.kills[gameid], this.#tournamentparams);
                }
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
                team.cumulative_points.push(advancepoint + team.points.reduce((p, c) => p + c, 0));
            }

            if (target == 'all') {
                team.total_points = advancepoint + team.points.reduce((a, c) => a + c, 0);
                // Check match point reached / 检查是否达到赛点
                if (matchpoints > 0 && team.total_points >= matchpoints) {
                    team.matchpoints = true;
                }
            } else {
                team.total_points = team.points.reduce((a, c) => a + c, 0);
            }
        }

        // Determine match point winner / 确定赛点获胜者
        if (target == 'all' && matchpoints > 0) {
            for (const i of [...Array(this.#_results.length).keys()]) {
                if (i == 0) continue;
                for (const team of Object.values(data)) {
                    const prev_points = team.cumulative_points[i - 1];
                    const placement = team.placements[i];
                    if (prev_points >= matchpoints && placement == 1) {
                        team.winner = true;
                        break;
                    }
                }
                // Winner already determined / 获胜者已确定
                if (Object.values(data).some(x => x.winner)) break;
            }
        }

        // results -> table
        const p = setRankParameterToTeamResults(data);

        // Display / 显示
        for (let i = 0; i < p.length; ++i) {
            const teamid = p[i];
            const team = data[teamid];
            
            // Draw / 绘制
            if (target == 'all') {
                this.#drawTeamForAll(i, p.length, team);
            } else {
                this.#drawTeamForAll(i, p.length, team, this.#_results[target].teams[p[i]].placement);
            }
        }
    }

    #selectCurrentGame(gameid) {
        if (gameid < this.#infonodes.length) {
            const node = this.#infonodes[gameid];
            node.base.classList.add('result-game-info-selected');
        }
    }

    #clearCurrentGame() {
        for(const node of document.querySelectorAll('.result-game-info-selected')) {
            node.classList.remove('result-game-info-selected');
        }
    }

    #getTeamName(id, fallback) {
        if (typeof(id) == 'number') id = id.toString();
        if (!(id in this.#teams)) return fallback;
        const team = this.#teams[id];
        if (!('params' in team)) return fallback;
        if (!('name' in team.params)) return fallback;
        return team.params.name;
    }

    #getPlayerName(id, fallback) {
        if (id in this.#players) {
            const player = this.#players[id];
            if ('params' in player && 'name' in player.params && player.params.name != '') {
                return player.params.name;
            }
        } else {
            if (typeof(this.#unknownidcallback) == 'function') {
                this.#unknownidcallback(id);
            }
        }
        return fallback;
    }

    #savePlayerNode(id, node) {
        if (!(id in this.#players)) {
            this.#players[id] = {
                nodes: [],
            };
        }
        const player = this.#players[id];
        player.nodes.push(node);
    }

    savePlayerParams(id, params) {
        if (!(id in this.#players)) {
            this.#players[id] = {
                nodes: [],
            };
        }
        const player = this.#players[id];
        player.params = params;
        for (const node of player.nodes) {
            if ('name' in player.params) {
                node.innerText = player.params.name;
            }
        }
    }

    #saveTeamNode(id, node) {
        if (typeof(id) == 'number') id = id.toString();
        if (!(id in this.#teams)) {
            this.#teams[id] = {
                nodes: [],
            };
        }
        const team = this.#teams[id];
        if (team.nodes.indexOf(node) != -1) return;
        team.nodes.push(node);
    }

    /**
     * Save team params for display and update elements as needed / 保存团队params用于显示,并根据需要更新元素
     * @param {number|string} id Team ID (0~) / 团队ID(0~)
     * @param {object} params Team params / 团队params
     */
    saveTeamParams(id, params) {
        if (!(id in this.#teams)) {
            this.#teams[id] = {
                nodes: [],
            };
        }
        const team = this.#teams[id];
        team.params = params;
        if ('name' in team.params) {
            for (const node of team.nodes) {
                    node.innerText = team.params.name;
            }
        }
    }

    clear() {
        this.#info.innerHTML = '';
        this.#left.innerHTML = '';
        this.#right.innerHTML = '';
        this.#single.innerHTML = '';
        this.#nodes.splice(0);
        this.#infonodes.splice(0);
        for (const [playerid, data] of Object.entries(this.#players)) {
            data.nodes.splice(0);
        }
        for (const [teamid, data] of Object.entries(this.#teams)) {
            data.nodes.splice(0);
        }
    }

    #hideSingleGameResult() {
        this.#single.classList.add('hide');
    }

    showSingleGameResult(gameid) {
        this.#current = gameid;

        // Display content / 显示内容
        this.clear();
        if (this.#_results != null) {
            this.#drawGameInfo();
            this.#clearCurrentGame();
            this.#selectCurrentGame(gameid);
            this.#drawResults(gameid);
            this.#drawResult(gameid);
        }

        // Toggle display / 切换显示
        this.#all.classList.remove('hide');
        this.#single.classList.remove('hide');
    }

    /**
     * Show result section / 显示结果部分
     */
    showBothResultView() {
        this.#all.classList.remove('hide');
        this.#single.classList.remove('hide');
    }

    /**
     * Hide result section / 隐藏结果部分
     */
    hideBothResultView() {
        this.#all.classList.add('hide');
        this.#single.classList.add('hide');
    }

    showAllResults() {
        this.#current = 'all';

        // Display content / 显示内容
        this.clear();
        if (this.#_results != null) {
            this.#drawGameInfo();
            this.#clearCurrentGame();
            this.#drawResults('all');
        }

        // Toggle display / 切换显示
        this.#all.classList.remove('hide');
        this.#hideSingleGameResult();
    }

    /**
     * Set results to display / 设置要显示的结果
     * @param {object[]} results Results to display / 要显示的结果
     */
    setResults(results) {
        this.#_results = results;
        if (this.#current == 'all') {
            this.showAllResults();
        } else {
            this.showSingleGameResult(this.#current);
        }
    }

    /**
     * Recalculate / 重新计算
     */
    recalcAll() {
        this.#drawResults('all');
        if (this.#_results instanceof Array) {
            for (let i = 0; i < this.#_results; ++i) {
                this.#drawResults(i);
            }
        }
    }

    /**
     * Set game object for result display / 设置用于结果显示的游戏对象
     * @param {object} game WebAPI game object / WebAPI游戏对象
     */
    setGame(game) {
        console.log(game);
        this.#_game = game;
    }

    /**
     * Set tournament params for point calculation / 设置用于积分计算的锦标赛params
     * @param {object} params Tournament params / 锦标赛params
     */
    setTournamentParams(params) {
        this.#tournamentparams = params;
        this.recalcAll();
    }

    /**
     * Set callback function called when game ID is selected / 设置选择游戏ID时调用的回调函数
     * @param {function} func Callback function / 回调函数
     */
    setGameClickCallback(func) {
        this.#callback = func;
    }

    /**
     * Set callback function called when unknown player ID (hash) exists / 设置存在未知玩家ID(哈希)时调用的回调函数
     * @param {function} func Callback function / 回调函数
     */
    setUnknownPlayerHashCallback(func) {
        this.#unknownidcallback = func;
    }
}

class ResultFixView extends WebAPIConfigBase {
    #gameid;
    #result;
    #fixedresult;
    #dragging_teamid;
    #callback;
    #statscodes;
    constructor() {
        super("result-fix-");
        this.getNode("buttons");
        this.getNode("placement-update-button");
        this.getNode("kills-update-button");
        this.getNode("from-stats-submit-button");
        this.getNode("placement");
        this.getNode("placementnodes");
        this.getNode("kills");
        this.getNode("killsnodes");
        this.getNode("from-stats-code");
        this.getNode("from-stats-code-lists");
        this.getNode("from-stats-code-diff-lists");
        this.#dragging_teamid = 0;
        this.#callback = null;
        this.#statscodes = {};
        this.#fixedresult = null;

        this.nodes["placement-update-button"].addEventListener("click", (ev) => {
            this.#updatePlacement();
        });
        this.nodes["kills-update-button"].addEventListener("click", (ev) => {
            this.#updateKills();
        });
        this.nodes["from-stats-submit-button"].addEventListener("click", (ev) => {
            // Send correction / 发送修正
            if (this.#fixedresult != null && typeof(this.#callback) == 'function') {
                this.#callback(this.#gameid, this.#fixedresult);
            }
        });
    }

    hideAll() {
        this.hideFixPlacementView();
        this.hideFixKillsView();
    }

    /**
     * Hold copy of result / 保存结果副本
     * @param {number} gameid Game ID (0~) / 游戏ID(0~)
     * @param {object} result Result / 结果
     */
    setResult(gameid, result) {
        this.#gameid = gameid;
        this.#result = JSON.parse(JSON.stringify(result));

        this.checkResultFromStats();
    }
    /**
     * Hold copy of result / 保存结果副本
     * @param {string} statscode Stats code / 统计代码
     * @param {object} json Retrieved json / 获取的json
     */
    setStatsJson(statscode, json) {
        /* TODO: Format only usable items from matches content / TODO: 仅从matches内容格式化可用项 */
        const matches = [];
        if ('matches' in json) {
            for (const m of json.matches) {
                let uncomplete = false;
                const result = {teams:{}};
                const ts = result.teams;
                if ('aim_assist_allowed' in m) {
                    result.aimassiston = m.aim_assist_allowed;
                }
                if ('map_name' in m) {
                    result.map = m.map_name;
                }
                if ('match_start' in m) {
                    result.start = m.match_start * 1000;
                    result.end = m.match_start * 1000;
                }
                if ('mid' in m) {
                    result.matchid = m.mid;
                }
                for (const p of m.player_results) {
                    if ('survivalTime' in p) {
                        const survival_time = p.survivalTime * 1000;
                        const temp_end = result.start + survival_time;
                        if (result.end < temp_end) result.end = temp_end;
                    }
    
                    if ('teamNum' in p) {
                        // Team parameter settings / 团队参数设置
                        const teamid = p.teamNum - 2;
                        if (!(teamid in ts)) ts[teamid] = {id: teamid, players:[]};
                        const team = ts[teamid];
                        if ('teamPlacement' in p) {
                            team.placement = p.teamPlacement;
                            if (p.teamPlacement <= 0) {
                                uncomplete = true;
                                break;
                            }
                        }
                        if ('teamName' in p) {
                            team.name = p.teamName;
                        }
                        if ('kills' in p) {
                            if (!('kills' in team)) team.kills = 0;
                            team.kills += p.kills;
                        }
    
                        // Individual parameter settings / 个人参数设置
                        const player = {};
                        team.players.push(player);
                        if ('nidHash' in p) {
                            player.id = p.nidHash.substring(0, 32);
                        }
                        if ('kills' in p) {
                            player.kills = p.kills;
                        }
                        if ('assists' in p) {
                            player.assists = p.assists;
                        }
                        if ('knockdowns' in p) {
                            player.knockdowns = p.knockdowns;
                        }
                        if ('respawnsGiven' in p) {
                            player.respawns_given = p.respawnsGiven;
                        }
                        if ('revivesGiven' in p) {
                            player.revives_given = p.revivesGiven;
                        }
                        if ('damageDealt' in p) {
                            player.damage_dealt = p.damageDealt;
                        }
                        if ('playerName' in p) {
                            player.name = p.playerName;
                        }
                        if ('characterName' in p) {
                            player.character = p.characterName;
                        }
                        if ('shots' in p) {
                            player.shots = p.shots;
                        }
                        if ('hits' in p) {
                            player.hits = p.hits;
                        }
                        if ('headshots' in p) {
                            player.headshots = p.headshots;
                        }
                        if ('survivalTime' in p) {
                            player.survival_time = p.survivalTime;
                        }
                        if ('hardware' in p) {
                            player.hardware = p.hardware;
                        }
                    }
                }
                if (!uncomplete) {
                    // Check if there is a team in 1st place / 检查是否有第1名的团队
                    let has_1st = false;
                    for (const [key, team] of Object.entries(result.teams)) {
                        if (team.placement == 1) {
                            has_1st = true;
                            break;
                        }
                    }
                    if (has_1st) {
                        matches.push(result);
                    }
                }
            }
        }
        this.#statscodes[statscode] = { update: Date.now(), matches: matches };
        this.checkResultFromStats();
    }

    /**
     * Check need for result correction from currently saved stats / 从当前保存的统计数据检查是否需要修正结果
     */
    checkResultFromStats() {
        // Display held stats summary / 显示保存的统计摘要
        this.nodes["from-stats-code-lists"].innerText = "";
        for (const key of Object.keys(this.#statscodes)) {
            const data = this.#statscodes[key];
            const date = (new Date(data.update)).toLocaleString();
            const div = document.createElement('div');
            div.innerText = `${key}[${date}](${data.matches.length}matches)`;
            for (const m of data.matches.sort((a, b) => a.start - b.start)) {
                // Create json link / 创建json链接
                const a = document.createElement('a');
                a.textContent = (new Date(m.start)).toLocaleString();
                const type = 'application/json';
                a.href = window.URL.createObjectURL(new Blob([JSON.stringify(m)], { type: type }), { type: type });
                a.download = `${m.start}.json`;
                div.appendChild(a);
            }
            this.nodes["from-stats-code-lists"].appendChild(div);
        }

        // Check if already applied / 检查是否已应用
        let fixed = false;
        if (typeof(this.#gameid) == "number" && typeof(this.#result) == "object") {
            if ('matchid' in this.#result) {
                // Already applied / 已应用
                fixed = true;
            } else {
                // Not applied / 未应用
                fixed = false;
            }
        }

        // Check if there is applicable data / 检查是否有可应用的数据
        const diff = [];
        this.#fixedresult = null;
        for (const key of Object.keys(this.#statscodes)) {
            for (const m of this.#statscodes[key].matches) {
                const s = this.#result;
                if (s.start <= m.end && m.start <= s.end && m.map == s.map) {
                    if (this.#comparePlayers(s, m)) {
                        this.#fixedresult = JSON.parse(JSON.stringify(s));
                        this.#fixedresult.matchid = m.matchid;
                        this.#fixedresult.statscode = key;
                        for(const [k, t] of Object.entries(m.teams)) {
                            const st = this.#fixedresult.teams[k];
                            if (st.kills != t.kills) {
                                diff.push(`team${k} kills not match ${st.kills}=>${t.kills}`);
                                st.kills = t.kills;
                            }
                            if (st.placement != t.placement) {
                                diff.push(`team${k} placement not match ${st.placement}=>${t.placement}`);
                                st.placement = t.placement;
                            }
                            for (const p of t.players) {
                                const sp = st.players.find((t) => p.id == t.id);
                                if (sp) {
                                    if (sp.assists != p.assists) {
                                        diff.push(`player [${p.name}] assists not match ${sp.assists}=>${p.assists}`);
                                        sp.assists = p.assists;
                                    }
                                    sp.assists = p.assists;
                                    sp.character = p.character;
                                    if (sp.damage_dealt != p.damage_dealt) {
                                        diff.push(`player [${p.name}] damage_dealt not match ${sp.damage_dealt}=>${p.damage_dealt}`);
                                        sp.damage_dealt = p.damage_dealt;
                                    }
                                    sp.hardware = p.hardware;
                                    sp.headshots = p.headshots;
                                    sp.hits = p.hits;
                                    if (sp.kills != p.kills) {
                                        diff.push(`player [${p.name}] kills not match ${sp.kills}=>${p.kills}`);
                                        sp.kills = p.kills;
                                    }
                                    sp.knockdowns = p.knockdowns;
                                    sp.respawns_given = p.respawns_given;
                                    sp.revives_given = p.revives_given;
                                    sp.shots = p.shots;
                                    sp.survival_time = p.survival_time;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Display already applied message / 显示已应用消息
        if (fixed) {
            document.getElementById('rffs-already-fixed').classList.remove('hide');
        } else {
            document.getElementById('rffs-already-fixed').classList.add('hide');
        }

        // Display no applicable data message / 显示无可应用数据消息
        if (this.#fixedresult == null) {
            document.getElementById('rffs-data-not-found').classList.remove('hide');
        } else {
            document.getElementById('rffs-data-not-found').classList.add('hide');
        }

        // Display differences / 显示差异
        this.nodes["from-stats-code-diff-lists"].innerHTML = "";
        if (this.#fixedresult) {
            for (const txt of diff) {
                const div = document.createElement('div');
                div.innerText = txt;
                this.nodes["from-stats-code-diff-lists"].appendChild(div);
            }
            if (diff.length == 0) {
                this.nodes["from-stats-code-diff-lists"].innerText = "data is correct.";
            }
        }

        // If exists, display differences to be corrected (show correction button) / 如果存在,显示要修正的差异(显示修正按钮)
        if (this.#fixedresult && (!fixed || diff.length > 0)) {
            document.getElementById('result-fix-from-stats-submit-area').classList.remove('hide');
        } else {
            document.getElementById('result-fix-from-stats-submit-area').classList.add('hide');
        }
    }

    /**
     * Check if two results have no player differences (ID only) / 检查两个结果的玩家是否无差异(仅ID)
     * @param {object} a Result to compare / 要比较的result
     * @param {object} b Result to compare / 要比较的result
     * @returns {boolean} True if no differences / 无差异时返回true
     */
    #comparePlayers(a, b) {
        for (const [a_k, a_t] of Object.entries(a.teams)) {
            if (!(a_k in b.teams)) return false;
            const b_t = b.teams[a_k];
            for (const a_p of a_t.players) {
                if (!b_t.players.find((t) => a_p.id == t.id)) return false;
            }
        }
        for (const [b_k, b_t] of Object.entries(b.teams)) {
            if (!(b_k in a.teams)) return false;
            const a_t = a.teams[b_k];
            for (const b_p of b_t.players) {
                if (!a_t.players.find((t) => b_p.id == t.id)) return false;
            }
        }
        return true;
    }

    /**
     * Draw placement correction screen / 绘制排名修正画面
     */
    drawPlacement() {
        // Remove all elements / 删除所有元素
        const nodes = this.nodes.placementnodes;
        while (nodes.children.length > 0) {
            nodes.removeChild(nodes.firstChild);
        }
        // Extract team IDs / 提取团队ID
        const p = Object.keys(this.#result.teams);
        p.sort((a, b) => {
            const pa = this.#result.teams[a].placement;
            const pb = this.#result.teams[b].placement;
            if (pa < pb) return -1;
            if (pa > pb) return  1;
            return 0;
        });

        // Display / 显示
        for (let i = 0; i < p.length; ++i) {
            const teamid = parseInt(p[i], 10);
            const team = this.#result.teams[teamid];
            const div = htmlToElement(
                `<div class="rf-placement-node" draggable="true">
                    <div class="rf-placement">
                        <div class="rf-placement-label">
                            <span class="en">rank</span>
                            <span class="zh">排名</span>
                        </div>
                        <div class="rf-placement-value">
                            ${i + 1}
                        </div>
                    </div>
                    <div class="rf-prev-placement">
                        <div class="rf-prev-placement-label">
                            <span class="en">before</span>
                            <span class="zh">修正前排名</span>
                        </div>
                        <div class="rf-prev-placement-value">
                            ${team.placement}
                        </div>
                    </div>
                    <div class="rf-teamid">
                        <div class="rf-teamid-label">
                            <span class="en">team no.</span>
                            <span class="zh">队伍编号</span>
                        </div>
                        <div class="rf-teamid-value">
                            ${teamid + 1}
                        </div>
                    </div>
                    <div class="rf-teamname">
                        <div class="rf-teamname-label">
                            <span class="en">team name</span>
                            <span class="zh">队伍名称</span>
                        </div>
                        <div class="rf-teamname-value">
                            ${team.name}
                        </div>
                    </div>
                </div>`
            );
            const getTeamIdFromNode = (node) => {
                return parseInt(node.children[2].children[1].innerText, 10) - 1;
            };
            const getNodeFromTeamId = (id) => {
                for (const node of nodes.children) {
                    const nid = getTeamIdFromNode(node);
                    if (id == nid) return node;
                }
                return null;
            };
            nodes.appendChild(div);
            {
                const n = nodes.lastChild;
                n.addEventListener('dragstart', (ev) => {
                    ev.dataTransfer.effectAllowed = "move";
                    this.#dragging_teamid = teamid;
                    n.classList.add('dragging');
                });
                n.addEventListener('dragenter', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                    if (teamid != this.#dragging_teamid) {
                        // Swap / 交换
                        const node = getNodeFromTeamId(this.#dragging_teamid);
                        const children = [].slice.call(nodes.children);
                        const dragging_index = children.indexOf(node);
                        const target_index = children.indexOf(n);
                        if (target_index < dragging_index) {
                            nodes.insertBefore(node, n);
                        } else {
                            nodes.insertBefore(node, nodes.children[target_index + 1]);
                        }

                        // Finalize placement after swap / 交换后确定排名
                        for (let i = 0; i < nodes.children.length; ++i) {
                            const node = nodes.children[i];
                            node.children[0].children[1].innerText = i + 1;
                            const curr = node.children[0].children[1].innerText;
                            const prev = node.children[1].children[1].innerText;
                            if (curr == prev) {
                                node.children[0].children[1].classList.remove('rf-changed');
                            } else {
                                node.children[0].children[1].classList.add('rf-changed');
                            }
                        }
                    }
                });
                n.addEventListener('dragleave', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('dragend', (ev) => {
                    ev.preventDefault();
                    n.classList.remove('dragging');
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('drop', (ev) => {
                    ev.preventDefault();
                    n.classList.remove('dragging');
                    ev.dataTransfer.dropEffect = "move";
                });
            }
        }
    }

    /**
     * Display kill count correction screen / 显示击杀数修正画面
     */
    drawKills() {
        // Remove all elements / 删除所有元素
        const nodes = this.nodes.killsnodes;
        while (nodes.children.length > 0) {
            nodes.removeChild(nodes.firstChild);
        }

        for (const [teamid, team] of Object.entries(this.#result.teams)) {
            const div = htmlToElement(
                `<div class="rf-kills-node">
                    <div class="rf-kills-teamheader">
                        <div class="rf-kills-teamid" data-teamid="${teamid}">
                            ${parseInt(teamid, 10) + 1}
                        </div>
                        <div class="rf-kills-teamname">
                            ${team.name}
                        </div>
                        <div class="rf-kills-teamkills" data-prev="${team.kills}">
                            ${team.kills}
                        </div>
                    </div>
                    <div class="rf-kills-players">
                    </div>
                </div>`
            );
            nodes.appendChild(div);
            const tn = nodes.lastChild;
            const checkTeamKills = (node) => {
                let teamkills = 0;
                for (const pn of node.children[1].children) {
                    let kills = parseInt(pn.children[1].innerText, 10);
                    teamkills += kills;
                }
                node.children[0].children[2].innerText = teamkills;
                if (node.children[0].children[2].dataset.prev == teamkills.toString()) {
                    node.children[0].children[2].classList.remove('rf-changed');
                } else {
                    node.children[0].children[2].classList.add('rf-changed');
                }
            };

            for (const player of team.players) {
                const div = htmlToElement(
                    `<div class="rf-kills-player-node" data-id="${player.id}">
                        <div class="rf-kills-player-name">
                            ${player.name}
                        </div>
                        <div class="rf-kills-player-kills" data-prev="${player.kills}">
                            ${player.kills}
                        </div>
                        <div class="rf-kills-player-buttons">
                            <button>+</button><button>-</button>
                        </div>
                    </div>`
                );
                tn.children[1].appendChild(div);
                const pn = tn.children[1].lastChild;
                // Increase/decrease operation / 增加/减少操作
                pn.children[2].children[0].addEventListener('click', (ev) => {
                    // +
                    let kills = parseInt(pn.children[1].innerText, 10);
                    kills++;
                    pn.children[1].innerText = kills;
                    if (pn.children[1].dataset.prev == pn.children[1].innerText.trim()) {
                        pn.children[1].classList.remove('rf-changed');
                    } else {
                        pn.children[1].classList.add('rf-changed');
                    }
                    checkTeamKills(tn);
                });
                pn.children[2].children[1].addEventListener('click', (ev) => {
                    // -
                    let kills = parseInt(pn.children[1].innerText, 10);
                    if (kills > 0) kills--;
                    pn.children[1].innerText = kills;
                    if (pn.children[1].dataset.prev == pn.children[1].innerText.trim()) {
                        pn.children[1].classList.remove('rf-changed');
                    } else {
                        pn.children[1].classList.add('rf-changed');
                    }
                    checkTeamKills(tn);
                });
            }
        }
    }

    #updatePlacement() {
        const nodes = this.nodes.placementnodes;

        // Extract corrections / 提取修正点
        const updates = [];
        for (const node of nodes.children) {
            const curr_rank = parseInt(node.children[0].children[1].innerText, 10);
            const prev_rank = parseInt(node.children[1].children[1].innerText, 10);
            const teamid = parseInt(node.children[2].children[1].innerText, 10) - 1;
            if (curr_rank != prev_rank) {
                updates.push({ id: teamid, placement: curr_rank });
            }
        }

        if (updates.length == 0) return;

        // Copy / 复制
        const result = JSON.parse(JSON.stringify(this.#result));

        // Correction / 修正
        for (const update of updates) {
            result.teams[update.id].placement = update.placement;
        }

        // Send correction / 发送修正
        if (typeof(this.#callback) == 'function') {
            this.#callback(this.#gameid, result);
        }
    }

    #updateKills() {
        const nodes = this.nodes.killsnodes;
        // Extract corrections / 提取修正点
        const updates = {};
        for (const node of nodes.children) {
            const curr_team_kills = parseInt(node.children[0].children[2].innerText, 10);
            const prev_team_kills = parseInt(node.children[0].children[2].dataset.prev, 10);
            const teamid = node.children[0].children[0].dataset.teamid;
            if (curr_team_kills != prev_team_kills) {
                const playerupdate = {};
                for (const pn of node.children[1].children) {
                    const curr_kills = parseInt(pn.children[1].innerText.trim(), 10);
                    const prev_kills = parseInt(pn.children[1].dataset.prev, 10);
                    if (curr_kills != prev_kills) {
                        const playerhash = pn.dataset.id;
                        playerupdate[playerhash] = curr_kills;
                    }
                }
                updates[teamid] = { kills: curr_team_kills, players: playerupdate };
            }
        }
        if (Object.keys(updates).length == 0) return;

        // Copy / 复制
        const result = JSON.parse(JSON.stringify(this.#result));

        // Correction / 修正
        for (const [teamid, data] of Object.entries(updates)) {
            const team = result.teams[teamid];
            team.kills = data.kills;
            for (const player of team.players) {
                if (player.id in data.players) {
                    player.kills = data.players[player.id];
                }
            }
        }

        // Send correction / 发送修正
        if (typeof(this.#callback) == 'function') {
            this.#callback(this.#gameid, result);
        }
    }

    showSwitchViewButton() {
        this.nodes.buttons.classList.remove("hide");
    }
    hideSwitchViewButton() {
        this.nodes.buttons.classList.add("hide");
    }

    showFixPlacementView() {
        this.nodes.placement.classList.remove("hide");
    }
    hideFixPlacementView() {
        this.nodes.placement.classList.add("hide");
    }

    showFixKillsView() {
        this.nodes.kills.classList.remove("hide");
    }
    hideFixKillsView() {
        this.nodes.kills.classList.add("hide");
    }

    showFixFromStatsCodeView() {
        this.nodes["from-stats-code"].classList.remove("hide");
    }
    hideFixFromStatsCodeView() {
        this.nodes["from-stats-code"].classList.add("hide");
    }

    /**
     * Set callback function called when result correction is requested / 设置请求结果修正时调用的回调函数
     * @param {function} func Callback function / 回调函数
     */
    setCallback(func) {
        if (typeof(func) == 'function' && func.length == 2) {
            this.#callback = func;
        }
    }
}

export class WebAPIConfig {
    #webapi;
    #_game;
    #_results;
    #liveapiconfig;
    #webapiconnectionstatus;
    #liveapiconnectionstatus;
    #languageselect;
    #tournament_id;
    #tournament_name;
    #tournament_ids;
    #tournament_params;
    #tournamentcalculationmethod;
    /** @type {Object.<string, object>} Storage for player params / 玩家params存储 */
    #playerparams;
    /** @type {Object.<string, object>} Storage for team params / 团队params存储 */
    #teamparams;
    #realtimeview;
    #observerconfig;
    #playername;
    #playernamelobbyview;
    #teamname;
    #ingamesettings;
    #legendban;
    #resultview;
    #resultfixview;
    #tryconnecting;
    #lobby;
    #getallplayers;

    constructor(url, liveapi_url) {
        this.#tournament_id = "";
        this.#tournament_name = "noname";
        this.#tournament_ids = {};
        this.#tournament_params = {};
        this.#playerparams = {};
        this.#teamparams = {};
        this.#lobby = {};
        this._results = null;
        this.#realtimeview = new RealtimeView();
        this.#observerconfig = new ObserverConfig();
        this.#resultview = new ResultView();
        this.#resultfixview = new ResultFixView();
        this.#tournamentcalculationmethod = new TournamentCalculationMethod();
        this.#liveapiconfig = new LiveAPIConfig(liveapi_url);
        this.#webapiconnectionstatus = new WebAPIConnectionStatus();
        this.#liveapiconnectionstatus = new LiveAPIConnectionStatus();
        this.#languageselect = new LanguageSelect();
        this.#playername = new PlayerName();
        this.#playernamelobbyview = new PlayerNameLobbyView();
        this.#teamname = new TeamName();
        this.#ingamesettings = new InGameSettings();
        this.#legendban = new LegendBan();
        this.#tryconnecting = false;
        this.#getallplayers = false;

        this.#setupWebAPI(url);
        this.#setupButton();
        this.#setupCallback();
        this.#setupMenuSelect();
    }

    #setupWebAPI(url) {
        this.#webapi = new ApexWebAPI.ApexWebAPI(url);

        this.#legendban.setWebAPI(this.#webapi);

        // Connection related / 连接相关
        this.#webapi.addEventListener('open', (ev) => {
            this.#_game = ev.detail.game;
            this.#realtimeview.setGame(ev.detail.game);
            this.#resultview.setGame(ev.detail.game);
            this.#webapiconnectionstatus.setStatus('open');

            /* Initial info retrieval / 初次信息获取 */
            this.#webapi.getPlayers();
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
            this.#webapi.getAll();
            this.#webapi.getObserver();
            this.#webapi.getObservers();
            this.#webapi.sendGetLobbyPlayers();
            this.#webapi.sendGetSettings();
            this.#webapi.getTournamentResults();
            this.#webapi.getTournamentParams();
            this.#webapi.getLiveAPIConfig();
            this.#webapi.getVersion();
            this.#getTeamNames();
        });

        this.#webapi.addEventListener('close', (ev) => {
            this.#webapiconnectionstatus.setStatus('close');
            this.#tryReconnect();
        });

        this.#webapi.addEventListener('error', (ev) => {
            this.#webapiconnectionstatus.setStatus('error');
            this.#tryReconnect();
        });

        /* Settings change event / 设置变更事件 */
        this.#webapi.addEventListener('getcurrenttournament', (ev) => {
            if (ev.detail.id != '' && this.#tournament_id != ev.detail.id) {
                // If current tournament ID changed / 如果当前锦标赛ID改变
                this.#getTeamNames();
            }
            this.#tournament_id = ev.detail.id;
            this.#tournament_name = ev.detail.name;
            if (ev.detail.id == '') {
                this.#setCurrentTournament('none', 'noname');
            } else {
                this.#setCurrentTournament(ev.detail.id, ev.detail.name);
            }
            this.#updateResultMenuFromResultsCount(ev.detail.count);
        });

        this.#webapi.addEventListener('gettournamentids', (ev) => {
            this.#procTournamentIDs(event.detail.ids);
        });

        this.#webapi.addEventListener('settournamentname', (ev) => {
            this.#tournamentcalculationmethod.clear();
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
            this.#webapi.getTournamentResults();
            this.#webapi.getTournamentParams();
        });

        this.#webapi.addEventListener('renametournamentname', (ev) => {
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
        });

        this.#webapi.addEventListener('getplayers', (ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#playerparams[hash] = params;
                this.#realtimeview.redrawPlayerName(hash, params); // Redraw RealtimeView / 重绘RealtimeView
                this.#resultview.savePlayerParams(hash, params); // Also save for ResultView / 也为ResultView保存
                if ('name' in params) {
                    this.#playername.setName(hash, params.name);
                    this.#playernamelobbyview.setPlayerName(hash, params.name);
                }
                if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
            }
            this.#getallplayers = true;
        });

        this.#webapi.addEventListener('lobbyenumstart', (ev) => {
            this.#lobby = {};
            this.#playernamelobbyview.start();
        });

        this.#webapi.addEventListener('lobbytoken', (ev) => {
            this.#lobby.token = ev.detail.token;
        });

        this.#webapi.addEventListener('lobbyplayer', (ev) => {
            // store lobby data
            if (!('players' in this.#lobby)) this.#lobby.players = {};
            this.#lobby.players[ev.detail.hash] = ev.detail;

            this.#procPlayerInGameName(ev.detail.hash, ev.detail.name);
            if (ev.detail.observer) {
                this.#observerconfig.drawObserverName(ev.detail.hash, ev.detail.name);
            }
        });

        this.#webapi.addEventListener('lobbyplayer', ev => {
            if (ev.detail.unassigned) return;
            if (ev.detail.observer) return;
            const hash = ev.detail.hash;
            const ingamename = ev.detail.name;
            const teamid = ev.detail.teamid;
            let name = '';
            if (hash in this.#playerparams && 'name' in this.#playerparams[hash]) {
                name = this.#playerparams[hash].name;
            }
            this.#playernamelobbyview.setPlayerIngameName(hash, teamid, name, ingamename);
        });

        this.#webapi.addEventListener('lobbyteam', (ev) => {
            // store lobby data
            if (!('teams' in this.#lobby)) this.#lobby.teams = {};
            if (ev.detail.unassigned) {
                this.#lobby.teams['unassigned'] = ev.detail;
            } else if (ev.detail.observer) {
                this.#lobby.teams['observer'] = ev.detail;
            } else {
                this.#lobby.teams[ev.detail.teamid] = ev.detail;
            }
        });

        this.#webapi.addEventListener('lobbyteam', ev => {
            if (ev.detail.unassigned) return;
            if (ev.detail.observer) return;
            const teamid = ev.detail.teamid;
            const name = ev.detail.name;
            this.#playernamelobbyview.setTeamName(teamid, name);
        });

        this.#webapi.addEventListener('lobbyenumend', (ev) => {
            this.#ingamesettings.setLobby(this.#lobby);
            this.#playernamelobbyview.end();
        });

        /* For observer / 用于观察者 */
        this.#webapi.addEventListener('getobserver', (ev) => {
            this.#observerconfig.setCurrentObserver(ev.detail.hash); 
        });
        this.#webapi.addEventListener('getobservers', (ev) => {
            for (const observer of ev.detail.observers) {
                this.#observerconfig.drawObserverName(observer.hash, observer.name);
            }
        })

        /* For realtime view association / 用于实时视图关联 */
        this.#webapi.addEventListener('matchsetup', (ev) => {
            this.#realtimeview.drawGameInfo();
        })
        this.#webapi.addEventListener('gamestatechange', (ev) => {
            this.#realtimeview.drawGameInfo();
        })
        this.#webapi.addEventListener('clearlivedata', (ev) => {
            this.#_game = ev.detail.game;
            this.#realtimeview.setGame(ev.detail.game);
            this.#realtimeview.clear();
        });
        this.#webapi.addEventListener('teamname', (ev) => {
            this.#realtimeview.drawTeamName(ev.detail.team.id);
        });
        this.#webapi.addEventListener('playerstats', (ev) => {
            this.#realtimeview.drawTeamKills(ev.detail.team.id);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_KILLS);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_ASSISTS);
        });
        this.#webapi.addEventListener('squadeliminate', (ev) => {
            this.#realtimeview.drawTeamPlacement(ev.detail.team.id);
            this.#realtimeview.drawTeamEliminated(ev.detail.team.id);
        });
        this.#webapi.addEventListener('teamplacement', (ev) => {
            this.#realtimeview.drawTeamPlacement(ev.detail.team.id);
            this.#realtimeview.drawTeamEliminated(ev.detail.team.id);
        });
        this.#webapi.addEventListener('setteamparams', (ev) => {
            if (ev.detail.result) {
                const teamid = ev.detail.teamid;
                const params = ev.detail.params;
                this.#teamparams[teamid] = params;
                this.#resultview.saveTeamParams(teamid, params);
                if (teamid >= this.#_game.teams.length) return;
                if (!('name' in this.#_game.teams[teamid])) return;
                this.#realtimeview.drawTeamName(teamid);
            }
        });
        this.#webapi.addEventListener('getteamparams', (ev) => {
            const teamid = ev.detail.teamid;
            const params = ev.detail.params;
            this.#teamparams[teamid] = params;
            this.#resultview.saveTeamParams(teamid, params);
            if (teamid >= this.#_game.teams.length) return;
            if (!('name' in this.#_game.teams[teamid])) return;
            this.#realtimeview.drawTeamName(teamid);
        });
        this.#webapi.addEventListener('playername', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_NAME);
            this.#procPlayerInGameName(ev.detail.player.hash, ev.detail.player.name);
        });
        this.#webapi.addEventListener('playercharacter', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_CHARACTER);
        });
        this.#webapi.addEventListener('playerhp', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_HP);
        });
        this.#webapi.addEventListener('playershield', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_SHIELD);
        });
        this.#webapi.addEventListener('playerdamage', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_DAMAGE_DEALT);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_DAMAGE_TAKEN);
        });
        this.#webapi.addEventListener('playerweapon', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_WEAPON);
        });
        this.#webapi.addEventListener('statealive', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statedown', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statekilled', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statecollected', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('observerswitch', (ev) => {
            if (ev.detail.own) {
                this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_SELECTED);
            }
        });
        this.#webapi.addEventListener('playeritem', (ev) => {
        });

        /* For result / 用于结果 */
        this.#webapi.addEventListener('gettournamentresults', (ev) => {
            this.#_results = ev.detail.results;
            this.#procCurrentHash(location.hash);
            this.#resultview.setResults(ev.detail.results);
            this.#procPlayerInGameNameFromResults(ev.detail.results);
        });
        this.#webapi.addEventListener('settournamentresult', (ev) => {
            if (ev.detail.setresult) {
                this.#webapi.getTournamentResults();
            }
        });
        this.#webapi.addEventListener('saveresult', (ev) => {
            this.#webapi.getTournamentResults();
            this.#updateResultMenuFromResultsCount(ev.detail.gameid + 1);
        });

        this.#webapi.addEventListener('getplayerparams', (ev) => {
            const hash = ev.detail.hash;
            const params = ev.detail.params;
            this.#resultview.savePlayerParams(hash, params);
            this.#realtimeview.redrawPlayerName(hash, params); // Redraw RealtimeView / 重绘RealtimeView
            if ('name' in params) {
                this.#playername.setName(hash, params.name);
                this.#playernamelobbyview.setPlayerName(hash, params.name);
            }
            if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
        });

        this.#webapi.addEventListener('setplayerparams', (ev) => {
            if (ev.detail.result) {
                const hash = ev.detail.hash;
                const params = ev.detail.params;
                this.#resultview.savePlayerParams(hash, params);
                this.#realtimeview.redrawPlayerName(hash, params); // Redraw RealtimeView / 重绘RealtimeView
                if ('name' in params) {
                    this.#playername.setName(hash, params.name);
                    this.#playernamelobbyview.setPlayerName(hash, params.name);
                }
                if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
            }
        });

        /* For Overlay / 用于叠加层 */
        this.#webapi.addEventListener('gettournamentparams', (ev) => {
            this.#tournament_params = ev.detail.params;
            this.#setOverlayStatusFromParams(ev.detail.params);
            this.#resultview.setTournamentParams(ev.detail.params);
            this.#ingamesettings.setTournamentParams(ev.detail.params);
            this.#tournamentcalculationmethod.importCalcMethod(ev.detail.params['calcmethod']);
        });

        this.#webapi.addEventListener('settournamentparams', (ev) => {
            if (ev.detail.result) {
                this.#tournament_params = ev.detail.params;
                this.#setOverlayStatusFromParams(ev.detail.params);
                this.#resultview.setTournamentParams(ev.detail.params);
                this.#ingamesettings.setTournamentParams(ev.detail.params);
                this.#tournamentcalculationmethod.importCalcMethod(ev.detail.params['calcmethod']);
            }
        });

        /** Display LiveAPI connection status / 显示LiveAPI连接状态 */
        this.#webapi.addEventListener('liveapisocketstats', (ev) => {
            this.#liveapiconnectionstatus.setStatus(ev.detail.conn, ev.detail.recv, ev.detail.send);
        });

        /** LiveAPI settings related / LiveAPI设置相关 */
        this.#webapi.addEventListener('getliveapiconfig', (ev) => {
            this.#liveapiconfig.setConfig(ev.detail.config);
        });

        this.#webapi.addEventListener('setliveapiconfig', (ev) => {
            if (ev.detail.result) {
                this.#liveapiconfig.setConfig(ev.detail.config);
            }
        });

        /* Results from Post-API / 从Post-API获取的结果 */
        this.#webapi.addEventListener('getstatsfromcode', (ev) => {
            if (ev.detail.statuscode == 200) {
                this.#resultfixview.setStatsJson(ev.detail.statscode, ev.detail.stats);
            }
        });

        /* Get match settings / 获取比赛设置 */
        this.#webapi.addEventListener('custommatchsettings', (ev) => {
            document.getElementById('test-getsettings-playlist').innerText = ev.detail.playlistname;
            document.getElementById('test-getsettings-aimassist').innerText = ev.detail.aimassist;
            document.getElementById('test-getsettings-anonmode').innerText = ev.detail.anonmode;
        });

        this.#webapi.addEventListener('custommatchsettings', (ev) => {
            this.#ingamesettings.setCustomSettings(ev.detail);
        });

        this.#webapi.addEventListener('getversion', ev => {
            document.getElementById('exeversion').textContent = ev.detail.version;
        });
    }

    #tryReconnect() {
        if (!this.#tryconnecting) {
            this.#tryconnecting = true;
            setTimeout(() => {
                this.#webapi.forceReconnect();
                this.#tryconnecting = false;
            }, 10000);
        }
    }

    #setupButton() {

        document.getElementById('connectbtn').addEventListener('click', (ev) => {
            this.#webapiconnectionstatus.setStatus('connecting...');
            this.#webapi.forceReconnect();
        });

        document.getElementById('tournament-set-button').addEventListener('click', (ev) => {
            const text = document.getElementById('tournament-set-text').value;
            if (text != '') {
                this.#webapi.setTournamentName(text);
            }
        });

        document.getElementById('tournament-rename-button').addEventListener('click', (ev) => {
            const text = document.getElementById('tournament-rename-text').value;
            if (text != '' || this.#tournament_id != '') {
                this.#webapi.renameTournamentName(this.#tournament_id, text);
            }
        });

        document.getElementById('observer-set-getfromlobby').addEventListener('click', (ev) => {
            this.#webapi.sendGetLobbyPlayers();
        });

        document.getElementById('player-name-getfromresults').addEventListener('click', (ev) => {
            this.#webapi.getTournamentResults();
        });

        document.getElementById('player-name-getfromlivedata').addEventListener('click', (ev) => {

        });

        document.getElementById('player-name-getfromlobby').addEventListener('click', (ev) => {
            this.#webapi.sendGetLobbyPlayers();
        });

        document.getElementById('player-lobbyview-getfromlobby').addEventListener('click', (ev) => {
            this.#webapi.sendGetLobbyPlayers();
        });

        document.getElementById('team-name-button').addEventListener('click', (ev) => {
            this.#setTeamNames().then((arr) => {
                this.#updateTeamNameTextArea();
            });
        });

        document.getElementById('ingamesettings-getfromlobby').addEventListener('click', ev => {
            this.#webapi.sendGetLobbyPlayers();
            this.#webapi.sendGetSettings();
        });

        document.getElementById('team-ingamename-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames();
        });

        document.getElementById('announce-button').addEventListener('click', (ev) => {
            const text = document.getElementById('announce-text').value;
            if (text != "") {
            this.#webapi.sendChat(text).then(() => {}, () => {});
            }
        });

        document.getElementById('manualpostmatch-send').addEventListener('click', (ev) => {
            this.#webapi.manualPostMatch();
        });

        document.getElementById('ingamesettings-teamnames-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames(true);
        });

        document.getElementById('ingamesettings-spawnpoints-button').addEventListener('click', (ev) => {
            this.#setInGameSpawnPoints();
        });

        document.getElementById('ingamesettings-customsettings-button').addEventListener('click', (ev) => {
            this.#setInGameSettings();
        });

        document.getElementById('ingamesettings-all-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames(true);
            this.#setInGameSpawnPoints();
            this.#setInGameSettings();
        });

        document.getElementById('result-view-button').addEventListener('click', (ev) => {
            this.#resultview.showBothResultView();
            this.#resultfixview.hideAll();
            this.#resultfixview.showFixFromStatsCodeView();
        });

        document.getElementById('result-fix-placement-button').addEventListener('click', (ev) => {
            this.#resultview.hideBothResultView();
            this.#resultfixview.drawPlacement();
            this.#resultfixview.hideFixKillsView();
            this.#resultfixview.showFixPlacementView();
            this.#resultfixview.hideFixFromStatsCodeView();
        });

        document.getElementById('result-fix-kills-button').addEventListener('click', (ev) => {
            this.#resultview.hideBothResultView();
            this.#resultfixview.drawKills();
            this.#resultfixview.hideFixPlacementView();
            this.#resultfixview.showFixKillsView();
            this.#resultfixview.hideFixFromStatsCodeView();
        });

        // checkbox
        for (const id of ["leaderboard", "mapleaderboard", "teambanner", "playerbanner", "teamkills", "owneditems", "gameinfo", "championbanner", "squadeliminated", "teamrespawned", "tdmscoreboard"]) {
            document.getElementById('overlay-hide-' + id).addEventListener('change', (ev) => {
                this.#updateOverlayStatus(id);
                this.#webapi.setTournamentParams(this.#tournament_params);
            });
        }

        document.getElementById('overlay-hide-teamplayerinfo').addEventListener('change', (ev) => {
            const teamplayeroverlays = ["teambanner", "playerbanner", "teamkills", "owneditems"];
            for (const id of teamplayeroverlays) {
                document.getElementById('overlay-hide-' + id).checked = ev.target.checked;
                this.#updateOverlayStatus(id);
            }
            this.#webapi.setTournamentParams(this.#tournament_params);
        });

        // Test
        document.getElementById('test-change-gamestate').addEventListener('click', (ev) => {
            const state_table = ["WaitingForPlayers", "PreGamePreview", "PickLoadout", "Prematch", "Playing", "Resolution", "Postmatch"];
            const current_state = document.getElementById('test-gamestate-current').innerText;
            const current_index = state_table.indexOf(current_state);
            const next_index = ((current_index + 1) % state_table.length);
            const next_state = state_table[next_index];
            document.getElementById('test-gamestate-current').innerText = next_state;
            this.#webapi.broadcastObject({
                type: "testgamestate",
                state: next_state
            });
        });
        document.getElementById('test-show-teambanner').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "testteambanner"
            });
        });
        document.getElementById('test-show-mapleaderboard').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "testmapleaderboard"
            });
        });
        document.getElementById('test-show-camera-down').addEventListener('click', (ev) => {
            const teamid = (parseInt(document.getElementById("test-teambanner-teamid").value, 10) - 1 - 1 + 30) % 30;
            document.getElementById("test-teambanner-teamid").value = teamid + 1;
            this.#webapi.broadcastObject({
                type: "testcamera",
                teamid: teamid
            });
        });
        document.getElementById('test-show-camera-up').addEventListener('click', (ev) => {
            const teamid = (parseInt(document.getElementById("test-teambanner-teamid").value, 10) - 1 + 1) % 30;
            document.getElementById("test-teambanner-teamid").value = teamid + 1;
            this.#webapi.broadcastObject({
                type: "testcamera",
                teamid: teamid
            });
        });
        document.getElementById('test-show-playerbanner').addEventListener('click', (ev) => {
            const name = document.getElementById("test-playerbanner-name").value;
            if (name != "") {
                this.#webapi.broadcastObject({
                    type: "testplayerbanner",
                    name: name
                });
            }
        });
        document.getElementById('test-show-teamkills-up').addEventListener('click', (ev) => {
            const kills = parseInt(document.getElementById("test-teamkills-kills").value, 10) + 1;
            document.getElementById("test-teamkills-kills").value = kills;
            if (kills >= 0) {
                this.#webapi.broadcastObject({
                    type: "testteamkills",
                    kills: kills
                });
            }
        });
        document.getElementById('test-show-teamkills-down').addEventListener('click', (ev) => {
            const kills = parseInt(document.getElementById("test-teamkills-kills").value, 10);
            const downed_kills = kills <= 0 ? 0 : kills - 1;
            document.getElementById("test-teamkills-kills").value = downed_kills;
            this.#webapi.broadcastObject({
                type: "testteamkills",
                kills: downed_kills
            });
        });
        document.getElementById('test-show-owneditems').addEventListener('click', (ev) => {
            const items = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "fraggrenade", "thermitgrenade", "arcstar"];
            const data = {type: "testowneditems"};
            for (const item of items) {
                const v = parseInt(document.getElementById("test-owneditems-" + item).value, 10);
                switch(item) {
                    case "backpack":
                    case "knockdownshield":
                        if (v < 0) return;
                        if (v > 4) return;
                        break;
                    default:
                        if (v < 0) return;
                        break;
                }
                data[item] = v;
            }
            this.#webapi.broadcastObject(data);
        });
        document.getElementById('test-show-gamecount-up').addEventListener('click', (ev) => {
            const count = parseInt(document.getElementById("test-gamecount").value, 10);
            const nextcount = count + 1;
            document.getElementById("test-gamecount").value = nextcount;
            this.#webapi.broadcastObject({
                type: "testgamecount",
                count: nextcount
            });
        });
        document.getElementById('test-show-gamecount-down').addEventListener('click', (ev) => {
            const count = parseInt(document.getElementById("test-gamecount").value, 10);
            const nextcount = count <= 1 ? 1 : count - 1;
            document.getElementById("test-gamecount").value = nextcount;
            this.#webapi.broadcastObject({
                type: "testgamecount",
                count: nextcount
            });
        });
        document.getElementById('test-show-squadeliminated').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-squadeliminated-teamid").value, 10);
            const placement = parseInt(document.getElementById("test-squadeliminated-placement").value, 10);
            if (teamid >= 1) {
                this.#webapi.broadcastObject({
                    type: "testsquadeliminated",
                    placement: placement,
                    teamid: teamid - 1
                });
            }
        });
        document.getElementById('test-show-teamrespawned').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-teamrespawned-teamid").value, 10);
            const respawn_player = document.getElementById("test-teamrespawned-respawn-player").value;
            const respawned_players = document.getElementById("test-teamrespawned-respawned-players").value.split(',').map(x => x.trim());
            if (teamid >= 1) {
                this.#webapi.broadcastObject({
                    type: "testteamrespawned",
                    teamid: teamid - 1,
                    respawn_player: respawn_player,
                    respawned_players: respawned_players
                });
            }
        });
        document.getElementById('test-show-winnerdetermine').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-winnerdetermine-teamid").value, 10);
            if (teamid >= 1) {
                this.#webapi.broadcastObject({
                    type: "testwinnerdetermine",
                    teamid: teamid - 1
                });
            }
        });
        document.getElementById('test-show-winnerdetermine-reset').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "testwinnerdeterminereset"
            });
        });
        document.getElementById('test-reload').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "testreload"
            });
        });

        document.getElementById('test-setteamname').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-setteamname-teamid").value, 10);
            const teamname = document.getElementById("test-setteamname-teamname").value;
            if (teamname && teamname != "") {
                this.#webapi.sendSetTeamName(teamid, teamname);
            }
        });

        document.getElementById('test-setspawnpoint').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-setspawnpoint-teamid").value, 10);
            const spawnpoint = parseInt(document.getElementById("test-setspawnpoint-spawnpoint").value, 10);
            this.#webapi.sendSetSpawnPoint(teamid, spawnpoint);
        });

        document.getElementById('test-pausetoggle').addEventListener('click', (ev) => {
            const pretimer = parseFloat(document.getElementById("test-pausetoggle-pretimer").value);
            if (0.0 < pretimer && pretimer < 10.0) {
                this.#webapi.pauseToggle(pretimer);
            }
        });

        document.getElementById('test-setsettings-we').addEventListener('click', (ev) => {
            const set_settings = (ev) => {
                const d = ev.detail;
                this.#webapi.sendSetSettings('des_hu_pm', d.adminchat, d.teamrename, d.selfassign, true, true).then(() => {
                    this.#webapi.sendGetSettings();
                });
            };
            this.#webapi.addEventListener('custommatchsettings', set_settings, { once: true });
            this.#webapi.sendGetSettings().catch(() => {
                this.#webapi.removeEventListener('custommatchsettings', set_settings, { once: true });
            });
        });

        document.getElementById('test-setsettings-sp').addEventListener('click', (ev) => {
            const set_settings = (ev) => {
                const d = ev.detail;
                this.#webapi.sendSetSettings('tropic_mu2_pm', d.adminchat, d.teamrename, d.selfassign, true, true).then(() => {
                    this.#webapi.sendGetSettings();
                });
            };
            this.#webapi.addEventListener('custommatchsettings', set_settings, { once: true });
            this.#webapi.sendGetSettings().catch(() => {
                this.#webapi.removeEventListener('custommatchsettings', set_settings, { once: true });
            });
        });

        document.getElementById('test-getsettings').addEventListener('click', (ev) => {
            this.#webapi.sendGetSettings();
        });

        document.getElementById('test-setendringexclusion').addEventListener('click', ev => {
            const sectionstr = document.getElementById('test-setendringexclusion-select').value;
            const section = parseInt(sectionstr, 10);
            this.#webapi.sendSetEndRingExclusion(section);
        });

        document.getElementById('result-fix-from-stats-code-button').addEventListener('click', (ev) => {
            const code = document.getElementById("result-fix-from-stats-code-input").value;
            if (code.match(/^[0-9a-f]+-[0-9a-f]+$/)) {
                this.#webapi.getStatsFromCode(code);
            }
        });
    }

    #setupCallback() {
        this.#observerconfig.setClickCallback((id) => {
            this.#webapi.setObserver(id).then((ev) => {
                this.#observerconfig.setCurrentObserver(ev.detail.hash).then(() => {}, () => {});
            }, () => {});
        });

        this.#realtimeview.setPlayerClickCallback((teamid, playerid) => {
            if (teamid >= this.#_game.teams.length) return;
            const team = this.#_game.teams[teamid];
            if (playerid >= team.players.length) return;
            const player = team.players[playerid];
            if (!('hash' in player)) return;
            if (!('state' in player)) return;
            if (player.hash == '') return;
            if (player.state != ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE) return;
            this.#webapi.changeCameraByHash(player.hash);
        });

        this.#resultview.setGameClickCallback((gameid) => {
            location.assign('#result-' + gameid);
        });
        
        this.#resultview.setUnknownPlayerHashCallback((playerhash) => {
            this.#webapi.getPlayerParams(playerhash);
        });

        this.#resultfixview.setCallback((gameid, result) => {
            this.#webapi.setTournamentResult(gameid, result);
        });

        this.#playername.setCallback((hash, name) => {
            const params = this.#playerparams[hash];
            params.name = name;
            this.#webapi.setPlayerParams(hash, params);
        });

        this.#playernamelobbyview.setCallback((hash, name) => {
            const params = this.#playerparams[hash];
            params.name = name;
            this.#webapi.setPlayerParams(hash, params);
        });

        this.#tournamentcalculationmethod.setDumpedCalcMethodCallback((calcmethod) => {
            this.#tournament_params['calcmethod'] = calcmethod;
            this.#webapi.setTournamentParams(this.#tournament_params);
        });

        this.#liveapiconfig.setCallback((config) => {
            this.#webapi.setLiveAPIConfig(config);
        });

        this.#ingamesettings.setUpdatePresetsCallback((presets) => {
            this.#tournament_params['presets'] = presets;
            this.#webapi.setTournamentParams(this.#tournament_params);
        });
    }

    #setupMenuSelect() {
        window.addEventListener("hashchange", (ev) => {
            this.#procCurrentHash(location.hash);
        });
    }

    #getFragment(s) {
        const first = s.indexOf('#');
        return first >= 0 ? s.substring(first + 1) : '';
    }
    #getMainMenu(s) {
        const first = s.indexOf('-');
        return first >= 0 ? s.substring(0, first) : s;
    }
    #getSubMenu(s) {
        const first = s.indexOf('-');
        return first >= 0 ? s.substring(first + 1) : '';
    }

    /**
     * Show/hide page from URL hash / 从URL哈希显示/隐藏页面
     * @param {string} hash URL hash / URL哈希
     */
    #procCurrentHash(hash) {
        const fragment = this.#getFragment(hash);
        const mainmenu = this.#getMainMenu(fragment);
        const submenu = this.#getSubMenu(fragment);
        if (this.#tournament_id == '' && ["realtime", "tournament-rename", "tournament-params", "tournament-calc", "team-name", "team-params", "overlay"].indexOf(fragment) >= 0) {
            window.location.assign("#tournament-set");
            return;
        }

        if (mainmenu == 'result') {
            for (const c of document.getElementById('main').children) {
                if (c.id == 'result') {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
            this.#showResult(submenu);
        } else {
            for (const c of document.getElementById('main').children) {
                if (c.id == fragment) {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
        }

        /* Selection display / 选择显示 */
        for (const node of document.querySelectorAll('.sidebar-selected')) {
            node.classList.remove('sidebar-selected');
        }
        for (const node of document.querySelectorAll('a[href="#' + fragment + '"]')) {
            node.classList.add('sidebar-selected');
        }

        /* Data retrieval from page navigation / 页面导航引起的数据获取 */
        if (fragment == 'observer-set') {
            this.#webapi.getObserver();
            this.#webapi.getObservers();
        }
    }

    /**
     * Display tournament list / 显示锦标赛列表
     * @param {Object.<string, string>[]} ids Array of tournament IDs and names / 锦标赛ID和名称的数组
     */
    #procTournamentIDs(ids) {
        const tbody = document.getElementById('tournamentids');
        for (const [id, name] of Object.entries(ids)) {
            if (id in this.#tournament_ids) {
                const c = this.#tournament_ids[id];
                c.name = name;
                c.node.children[0].innerText = name;
            } else {
                this.#tournament_ids[id] = {
                    id: id,
                    name: name,
                    node: document.createElement('tr')
                };
                const c = this.#tournament_ids[id];
                c.node.appendChild(document.createElement('td'));
                c.node.appendChild(document.createElement('td'));
                c.node.children[0].innerText = name;
                c.node.children[1].innerText = id;
                tbody.appendChild(c.node);
                c.node.addEventListener('click', (ev) => {
                    this.#webapi.setTournamentName(c.node.children[0].innerText);
                });
                if (id == this.#tournament_id) {
                    c.node.classList.add('tournament-set-selected');
                }
            }
        }

        // Sort by name / 按名称排序
        const children = [...tbody.children].sort((a, b) => {
            const a_name = a.children[0].innerText;
            const b_name = b.children[0].innerText;
            if (a_name < b_name) return -1;
            if (a_name > b_name) return 1;
            return 0;
        });
        for (const node of children) {
            tbody.appendChild(node);
        }
    }

    /**
     * Set in-game team names from text area content / 从文本区域内容设置游戏内团队名称
     * @returns {Promise} Returns result of settings / 返回设置结果
     */
    #setInGameTeamNames(ingamesettings = false) {
        const lines = ingamesettings ? this.#ingamesettings.getTeamNames() : this.#teamname.getLines();
        let timerid = null;

        const enumend = (ev) => {
            if (timerid != null) clearTimeout(timerid);

            if (!('token' in this.#lobby) || this.#lobby.token == '' || this.#lobby.token.indexOf('c') == 0) {
                return;
            }

            if ('teams' in this.#lobby) {
                for (let i = 0; i < 30; ++i) {
                    if (i in this.#lobby.teams) {
                        const team = this.#lobby.teams[i];
                        const name = i < lines.length ? lines[i] : '';
                        if (team.name != name) {
                            this.#webapi.sendSetTeamName(i, name);
                        }
                    }
                }
            }
            this.#webapi.sendGetLobbyPlayers();
        };

        this.#webapi.addEventListener('lobbyenumend', enumend, { once: true });

        timerid = setTimeout(() => {
            this.#webapi.removeEventListener('lobbyenumend', enumend);
            console.warn('setInGameTeamNames() timeout.');
        }, 2000); // 2s timeout / 2秒超时

        this.#webapi.sendGetLobbyPlayers();
    }

    /**
     * Set in-game team names from text area content / 从文本区域内容设置游戏内团队名称
     * @returns {Promise} Returns result of settings / 返回设置结果
     */
    #setInGameSpawnPoints() {
        const spawnpoints = this.#ingamesettings.getSpawnPoints();
        let timerid = null;

        const enumend = (ev) => {
            if (timerid != null) clearTimeout(timerid);

            if (!('token' in this.#lobby) || this.#lobby.token == '' || this.#lobby.token.indexOf('c') == 0) {
                return;
            }

            if ('teams' in this.#lobby) {
                for (let i = 0; i < 30; ++i) {
                    if (i in this.#lobby.teams) {
                        const team = this.#lobby.teams[i];
                        const spawnpoint = i < spawnpoints.length ? spawnpoints[i] : 0;
                        if (team.spawnpoint != spawnpoint) {
                            this.#webapi.sendSetSpawnPoint(i, spawnpoint);
                        }
                    }
                }
            }
            this.#webapi.sendGetLobbyPlayers();
        };

        this.#webapi.addEventListener('lobbyenumend', enumend, { once: true });

        timerid = setTimeout(() => {
            this.#webapi.removeEventListener('lobbyenumend', enumend);
            console.warn('setInGameSpawnPoints() timeout.');
        }, 2000); // 2s timeout / 2秒超时

        this.#webapi.sendGetLobbyPlayers();
    }


    #setInGameSettings() {
        const d = this.#ingamesettings.getCustomSettings();
        this.#webapi.sendSetSettings(d.playlistname, d.adminchat, d.teamrename, d.selfassign, d.aimassist, d.anonmode);
        this.#webapi.sendGetSettings();
    }

    /**
     * Set team names to params from text area content / 从文本区域内容设置团队名称到params
     * @returns {Promise} Returns array of set params / 返回设置的params数组
     */
    #setTeamNames() {
        const lines = this.#teamname.getLines();
        const jobs = [];
        for (let i = 0; i < 30; ++i) {
            if (i < lines.length) {
                const line = lines[i];
                const params = this.#teamparams[i];
                if (line != '') {
                    if (!('name' in params) || line != params.name) {
                        jobs.push(this.#setTeamName(i, line));
                    }
                } else {
                    if ('name' in params) {
                        jobs.push(this.#removeTeamName(i));
                    }
                }
            } else {
                if ('name' in params) {
                    jobs.push(this.#removeTeamName(i));
                }
            }
        }
        return new Promise((resolve, reject) => {
            Promise.all(jobs).then(resolve, reject);
        });
    }

    /**
     * Process player hash and in-game name / 处理玩家哈希和游戏内名称
     * @param {string} hash Player ID (hash) / 玩家ID(哈希)
     * @param {string} ingamename Player name / 玩家名称
     */
    #procPlayerInGameName(hash, ingamename) {
        let updated = false;
        if (!(hash in this.#playerparams)) {
            this.#playerparams[hash] = {};
        }
        const params = this.#playerparams[hash];
        if (!('ingamenames' in params)) {
            params.ingamenames = [];
        }
        if (params.ingamenames.indexOf(ingamename) == -1) {
            params.ingamenames.push(ingamename);
            updated = true;
        }
        if (updated && this.#getallplayers) {
            // Update player parameters / 更新玩家参数
            this.#webapi.setPlayerParams(hash, params);
        }
    }

    /**
     * Process player hash and in-game name from result array / 从结果数组处理玩家哈希和游戏内名称
     * @param {object[]} results Result array / 结果数组
     */
    #procPlayerInGameNameFromResults(results) {
        for (const result of results) {
            for (const [_, team] of Object.entries(result.teams)) {
                for (const player of team.players) {
                    this.#procPlayerInGameName(player.id, player.name);
                }
            }
        }
    }

    /**
     * Set overlay show/hide parameter to tournament params / 设置叠加层显示/隐藏参数到锦标赛params
     * @param {string} id Overlay name / 叠加层名称
     */
    #updateOverlayStatus(id) {
        const params = this.#tournament_params;
        const checked = document.getElementById('overlay-hide-' + id).checked;
        if (!'forcehide' in params) params.forcehide = {};
        const forcehide = params.forcehide;
        forcehide[id] = checked;
    }

    /**
     * Set overlay force hide checkbox state from tournament params / 从锦标赛params设置叠加层强制隐藏复选框状态
     * @param {object} params Tournament params / 锦标赛params
     */
    #setOverlayStatusFromParams(params) {
        if (!('forcehide' in params)) params.forcehide = {};
        const forcehide = params.forcehide;
        const ids = ["leaderboard", "mapleaderboard", "teambanner", "playerbanner", "teamkills", "owneditems", "gameinfo", "championbanner", "squadeliminated", "teamrespawned", "tdmscoreboard"];
        const default_hide_ids = ["playerbanner"];
        for (const id of ids) {
            if (!(id in forcehide)) {
                forcehide[id] = default_hide_ids.indexOf(id) >= 0 ? true : false;
            }
            document.getElementById('overlay-hide-' + id).checked = forcehide[id];
        }

        // group [teamplayerinfo]
        if (forcehide.teambanner == forcehide.playerbanner &&
            forcehide.teambanner == forcehide.teamkills &&
            forcehide.teambanner == forcehide.owneditems) {
                document.getElementById('overlay-hide-teamplayerinfo').checked = forcehide.teambanner;
        }
    }

    /**
     * Get team params, set name key and save / 获取团队params,设置名称键并保存
     * @param {number} teamid Team ID (0~) / 团队ID(0~)
     * @param {string} name Team name / 团队名称
     * @returns Team params / 团队params
     */
    #setTeamName(teamid, name) {
        const params = this.#teamparams[teamid];
        params.name = name;
        return this.#webapi.setTeamParams(teamid, params);
    }

    /**
     * Get team params, delete name key and save / 获取团队params,删除名称键并保存
     * @param {number} teamid Team ID (0~) / 团队ID(0~)
     * @returns {Promise} Team params / 团队params
     */
    #removeTeamName(teamid) {
        const params = this.#teamparams[teamid];
        if ('name' in params) delete params.name;
        return this.#webapi.setTeamParams(teamid, params);
    }

    /**
     * Get team params for 0~29 / 获取0~29的团队params
     * @returns {object[]} Array containing team params / 包含团队params的数组
     */
    #getAllTeamParams() {
        return new Promise((resolve, reject) => {
            const jobs = [];
            for (let i = 0; i < 30; ++i) {
                jobs.push(new Promise((nresolve, nreject) => {
                    return this.#webapi.getTeamParams(i).then((ev) => {
                        nresolve(ev.detail.params);
                    }, nreject);
                }));
            }
            Promise.all(jobs).then(resolve, reject);
        });
    }

    /**
     * Get team parameters and reflect to text area / 获取团队参数并反映到文本区域
     */
    #getTeamNames() {
        this.#getAllTeamParams().then((arr) => { this.#updateTeamNameTextArea(); }, () => {});
    }

    /**
     * Extract team name from team params and set to textarea / 从团队params提取团队名称并设置到textarea
     */
    #updateTeamNameTextArea() {
        let text = '';
        for (const params of Object.values(this.#teamparams)) {
            if (text != '') text += '\r\n';
            if ('name' in params) {
                text += params.name;
            }
        }
        this.#teamname.updateText(text);
    }

    /**
     * Display results / 显示结果
     * @param {string} submenu 'all' or numeric string (1~) / 'all'或数字字符串(1~)
     */
    #showResult(submenu) {
        if (submenu == 'all') {
            this.#resultview.showAllResults();
            this.#resultfixview.hideSwitchViewButton();
        } else {
            const gameid = parseInt(submenu, 10);
            if (submenu == gameid.toString()) {
                this.#resultview.showSingleGameResult(gameid);
                this.#resultfixview.showSwitchViewButton();
                this.#resultfixview.setResult(gameid, this.#_results[gameid]);
                this.#resultfixview.hideAll();
                this.#resultfixview.showFixFromStatsCodeView();
            }
        }
    }

    /**
     * Set current tournament selection status / 设置当前锦标赛选择状态
     * @param {string} id Tournament ID / 锦标赛ID
     * @param {string} name Tournament name / 锦标赛名称
     */
    #setCurrentTournament(id, name) {
        document.getElementById('current_tournament_id').innerText = id;
        document.getElementById('current_tournament_name').innerText = name;
        document.getElementById('tournament-rename-text').value = name;
        for (const tr of document.querySelectorAll('tr.tournament-set-selected')) {
            tr.classList.remove('tournament-set-selected');
        }
        if (id != '' && id in this.#tournament_ids) {
            this.#tournament_ids[id].node.classList.add('tournament-set-selected');
        }
    }

    /**
     * Create result links in left menu from result count / 从结果数量创建左侧菜单的结果链接
     * @param {number} count Result count (0~) / 结果数量(0~)
     */
    #updateResultMenuFromResultsCount(count) {
        const ul = document.getElementById('ulresult');
        if (count + 1 > ul.children.length) {
            // append
            for (let i = ul.children.length - 1; i < count; ++i) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#result-' + i;
                a.innerHTML = '<span class="en">Game</span><span class="zh">比赛</span> ' + (i + 1);
                li.appendChild(a);
                ul.appendChild(li);

                // Class settings / 类设置
                if (this.#getFragment(location.hash) == ('result-' + i)) {
                    a.classList.add('sidebar-selected');
                }
            }
        } else if (count + 1 < ul.children.length) {
            // remove
            while (count + 1 < ul.children.length) {
                ul.removeChild(ul.lastChild);
            }
        }
    }
}
