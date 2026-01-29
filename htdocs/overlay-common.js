export class OverlayBase {
    /** @type {string} Class name added/removed by hide()/show() / hide()/show()添加/移除的类名 */
    static HIDE_CLASS = "hide";
    /** @type {string} Class name added/removed by addForceHide()/removeForceHide() / addForceHide()/removeForceHide()添加/移除的类名 */
    static FORCEHIDE_CLASS = "forcehide";
    /** @type {string} ID of base node / 基础节点的ID */
    ID;
    /** @type {string} Prefix string added when setting class / 设置类时添加的前缀字符串 */
    PREFIX;
    /** @type {HTMLElement[]} List of nodes related to overlay / 与叠加层相关的节点列表 */
    nodes;
    /**
     * Constructor / 构造函数
     * @param {string} id ID of base node / 基础节点的ID
     * @param {string} prefix PREFIX when adding class / 添加类时的前缀
     * @param {HTMLElement} root Destination to add base node / 添加基础节点的目标位置
     */
    constructor(id, prefix, root = document.body) {
        this.ID = id;
        this.PREFIX = prefix;

        this.nodes = {
            base: document.createElement('div')
        };

        if (id != "") {
            this.nodes.base.id = this.ID;
        }

        root.appendChild(this.nodes.base);
    }

    /**
     * Add node to base node / 向基础节点添加节点
     * @param {string} name String included in class name / 类名中包含的字符串
     * @param {string} tag Tag name of node to add (default:div) / 要添加的节点标签名(默认:div)
     * @returns 
     */
    addNode(name, tag = "div") {
        if (name == "" || name in this.nodes) return; // Do nothing if already exists / 如果已存在则不做任何操作
        this.nodes[name] = document.createElement(tag);
        this.nodes[name].classList.add(this.PREFIX + name);
    }

    /**
     * Remove hide class from base node / 从基础节点移除hide类
     */
    hide() {
        this.nodes.base.classList.add(OverlayBase.HIDE_CLASS);
    }

    /**
     * Add hide class to base node / 向基础节点添加hide类
     */
    show() {
        this.nodes.base.classList.remove(OverlayBase.HIDE_CLASS);
    }

    /**
     * Check if base node contains hide class / 检查基础节点是否包含hide类
     * @returns {boolean} Hidden state=true / 隐藏状态=true
     */
    isHidden() {
        return this.nodes.base.classList.contains(OverlayBase.HIDE_CLASS);
    }

    /**
     * Add forcehide class to base node / 向基础节点添加forcehide类
     */
    addForceHide() {
        this.nodes.base.classList.add(OverlayBase.FORCEHIDE_CLASS);
    }

    /**
     * Remove forcehide class from base node / 从基础节点移除forcehide类
     */
    removeForceHide() {
        this.nodes.base.classList.remove(OverlayBase.FORCEHIDE_CLASS);
    }

    /**
     * Add class with PREFIX to base node / 向基础节点添加带前缀的类
     * @param {string} name String included in class name / 类名中包含的字符串
     */
    addClass(name) {
        this.nodes.base.classList.add(this.PREFIX + name);
    }

    /**
     * Remove class with PREFIX from base node / 从基础节点移除带前缀的类
     * @param {string} name String included in class name / 类名中包含的字符串
     */
    removeClass(name) {
        this.nodes.base.classList.remove(this.PREFIX + name);
    }

    /**
     * Remove all classes starting with PREFIX + argument string / 移除所有以前缀+参数字符串开头的类
     * @param {string} name String included in class name / 类名中包含的字符串
     */
    clearClasses(name) {
        for (const id of this.nodes.base.classList) {
            if (id.indexOf(this.PREFIX + name) == 0) {
                this.nodes.base.classList.remove(id);
            }
        }
    }
}


/**
 * @const {number[]} calcpoints_table Placement points / 排名积分
 */
const calcpoints_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

/**
 * Point details / 积分详情
 * @typedef {object} detailpoints
 * @prop {number} total Total points / 总积分
 * @prop {number} kills Kill points / 击杀积分
 * @prop {number} placement Placement points / 排名积分
 * @prop {number} other Other points / 其他积分
 */

/**
 * Calculate match points from placement and kills / 根据排名和击杀数计算比赛积分
 * @param {number} gameid Game number to calculate (0~) / 要计算的比赛编号(0~)
 * @param {number} placement Placement (1~20) / 排名(1~20)
 * @param {number} kills Number of kills / 击杀数
 * @param {object} params Tournament params (for point calculation) / 锦标赛参数(用于积分计算)
 * @returns {detailpoints} Points (detailed data) / 积分(详细数据)
 */
export function calcPoints(gameid, placement, kills, params) {
    if (placement <= 0) throw new Error('placement is >= 0.');
    const points = {
        total: 0,
        kills: 0,
        placement: 0,
        other: 0
    };

    let calcmethod = {};
    if ('calcmethod' in params && gameid in params.calcmethod) calcmethod = params.calcmethod[gameid];

    // Calculate points from kills / 根据击杀计算积分
    let killamp = 1;
    if ('killamp' in calcmethod) killamp = calcmethod.killamp;
    points.kills = kills * killamp;

    let killcap = 0xff;
    if ('killcap' in calcmethod) killcap = calcmethod.killcap;
    if (points.kills > killcap) points.kills = killcap;

    // Calculate placement points / 计算排名积分
    if ('customtable' in calcmethod) {
        if (placement - 1 < calcmethod.customtable.length) points.placement = calcmethod.customtable[placement - 1];
    } else {
        if (placement - 1 < calcpoints_table.length) points.placement = calcpoints_table[placement - 1];
    }

    // Calculate other points / 计算其他积分
    points.other = 0;

    // Total / 合计
    points.total = points.kills + points.placement + points.other;
    return points;
}

export function getAdvancePoints(teamid, params) {
    try {
        if (!('calcmethod' in params)) return 0;
        if (!('advancepoints' in params.calcmethod)) return 0;
        const points = params.calcmethod.advancepoints;
        if (points instanceof Array && teamid < points.length) {
            return points[teamid];
        }
    } catch (e) {
        return 0;
    }
    return 0;
}

/**
 * Team object for calculation / 计算用的团队对象
 * @typedef {object} teamresult
 * @prop {string} name Team name / 团队名称
 * @prop {number} total_points Total points / 总积分
 * @prop {number[]} points Points for each game / 每场比赛的积分
 * @prop {number[]} placements Placement for each game (1~) / 每场比赛的排名(1~)
 * @prop {number[]} kills Kills for each game / 每场比赛的击杀数
 * @prop {number[]} kill_points Kill points for each game / 每场比赛的击杀积分
 * @prop {number[]} placement_points Placement points for each game / 每场比赛的排名积分
 * @prop {number[]} other_points Other points for each game / 每场比赛的其他积分
 * @prop {number} rank Rank (-1 is unevaluated, 0=1st, 1=2nd...) / 排名(-1为未评估, 0=第1名, 1=第2名...)
 * @prop {boolean} eliminated Whether eliminated / 是否已被淘汰
 * @prop {number[]} status Player survival status / 玩家生存状态
 */

/**
 * Container for team objects for calculation / 计算用的团队对象容器
 * @typedef {Object.<number, teamresult>} teamresults
 */

/**
 * Initialize teamresult object / 初始化teamresult对象
 * @param {number} teamid Team ID (0~) / 团队ID(0~)
 * @param {string} name Team name / 团队名称
 * @returns {teamresult} Team result / 团队结果
 */
function initTeamResult(teamid, name) {
    return {
        id: teamid,
        name: name,
        total_points: 0,
        points: [],
        placements: [],
        kills: [],
        kill_points: [],
        placement_points: [],
        other_points: [],
        cumulative_points: [],
        eliminated: false,
        status: [],
        rank: -1,
        matchpoints: false,
        winner: false
    };
}

/**
 * Convert results from webapi to teamresults format / 将从webapi获取的结果转换为teamresults格式
 * @param {object[]} results Array of results from webapi / 从webapi获取的结果数组
 * @return {teamresults} Data in teamresult format / teamresult格式的数据
 */
export function resultsToTeamResults(results) {
    const teamresults = {};
    results.forEach((result, index) => {
        for (const [teamid, team] of Object.entries(result.teams)) {
            if (!(teamid in teamresults)) {
                teamresults[teamid] = initTeamResult(teamid, team.name);
            }
            const tr = teamresults[teamid];

            // Fill in for matches not participated / 填充未参与的比赛
            while (tr.kills.length < index) { tr.kills.push(0) }
            while (tr.placements.length < index) { tr.placements.push(0xff) }

            // Add data for participated matches / 添加已参与比赛的数据
            tr.kills.push(team.kills);
            tr.placements.push(team.placement);
        }
    });

    // Fill remaining non-participated matches to the end (placement is 0xff) / 填充剩余未参与的比赛到末尾(排名为0xff)
    for (const team of Object.values(teamresults)) {
        while (team.kills.length < results.length) { team.kills.push(0) }
        while (team.placements.length < results.length) { team.placements.push(0xff) }
    }

    return teamresults;
}

/**
 * Add kills and placement / 添加击杀数和排名
 * @param {teamresults} teamresults Target to add / 添加目标
 * @param {number} gameid Game ID / 比赛ID
 * @param {number} teamid Team ID / 团队ID
 * @param {string} name Team name / 团队名称
 * @param {number} kills Number of kills / 击杀数
 * @param {number} placement Placement / 排名
 */
export function appendToTeamResults(teamresults, gameid, teamid, name, kills, placement) {
    if (!(teamid in teamresults)) {
        teamresults[teamid] = initTeamResult(teamid, name);
    }
    const tr = teamresults[teamid];

    // Fill in for matches not participated / 填充未参与的比赛
    while (tr.kills.length < gameid) { tr.kills.push(0) }
    while (tr.placements.length < gameid) { tr.placements.push(0xff) }

    // Add data for participated matches / 添加已参与比赛的数据
    tr.kills.push(kills);
    tr.placements.push(placement);
}

/**
 * Calculate current rank and set to teamresults parameters / 计算当前排名并设置到teamresults参数
 * @param {teamresults} teamresults Has total_points, points, placements, kills as parameters / 具有total_points, points, placements, kills参数
 * @return {string[]}
 */
export function setRankParameterToTeamResults(teamresults) {
    const keys = JSON.parse(JSON.stringify(Object.keys(teamresults)));
    const sorted_teamids = keys.sort((a, b) => {
        // Compare current total points / 比较当前总积分
        const ta = teamresults[a];
        const tb = teamresults[b];

        // Match point winner / 赛点获胜者
        if ('winner' in ta && ta.winner) return -1;
        if ('winner' in tb && tb.winner) return  1;

        // Compare current total points / 比较当前总积分
        if (ta.total_points > tb.total_points) return -1;
        if (ta.total_points < tb.total_points) return  1;

        // Sort / 排序
        const numsort = (a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        };

        const numrevsort = (a, b) => {
            if (a < b) return 1;
            if (a > b) return -1;
            return 0;
        };

        ta.points.sort(numrevsort);
        tb.points.sort(numrevsort);
        ta.placements.sort(numsort);
        tb.placements.sort(numsort);
        ta.kills.sort(numrevsort);
        tb.kills.sort(numrevsort);

        // In case of tie, compare highest points from past games / 平分时比较过去比赛的最高积分
        for (let i = 0; i < ta.points.length && i < tb.points.length; ++i) {
            if (ta.points[i] > tb.points[i]) return -1;
            if (ta.points[i] < tb.points[i]) return  1;
        }

        // In case of tie, compare highest placement from past games / 平分时比较过去比赛的最高排名
        for (let i = 0; i < ta.placements.length && i < tb.placements.length; ++i) {
            if (ta.placements[i] > tb.placements[i]) return  1;
            if (ta.placements[i] < tb.placements[i]) return -1;
        }

        // In case of tie, compare highest kills from past games / 平分时比较过去比赛的最高击杀数
        for (let i = 0; i < ta.kills.length && i < tb.kills.length; ++i) {
            if (ta.kills[i] > tb.kills[i]) return -1;
            if (ta.kills[i] < tb.kills[i]) return  1;
        }

        // Irregular: team with more matches wins (more comparison targets) / 特殊情况: 比赛场次多的获胜(比较对象更多)
        if (ta.points.length > tb.points.length) return -1;
        if (ta.points.length < tb.points.length) return  1;

        return 0;
    });

    for (let rank = 0; rank < sorted_teamids.length; ++rank) {
        const teamid = sorted_teamids[rank];
        teamresults[teamid].rank = rank;
    }

    return sorted_teamids;
}

/**
 * Player stats object for calculation / 计算用的玩家战绩对象
 * @typedef {object} playerstat
 * @prop {string} name Player name / 玩家名称
 * @prop {string} hash Player ID (hash) / 玩家ID(哈希)
 * @prop {string} teamname Team name / 团队名称
 * @prop {string} teamid Team ID / 团队ID
 * @prop {number} kills Points for each game / 每场比赛的积分
 * @prop {number} assists Placement for each game (1~) / 每场比赛的排名(1~)
 * @prop {number} damage Kills for each game / 每场比赛的击杀数
 * @prop {number} rank Rank / 排名
 */

/**
 * Player stats / 玩家战绩
 * @typedef {Object.<string, playerstat>} playerstats
 */

/**
 * Initialize playerstat object / 初始化playerstat对象
 * @param {string} hash Player ID (hash) / 玩家ID(哈希)
 * @param {string} name Player name / 玩家名称
 * @returns {playerstat} Player stats / 玩家战绩
 */
function initPlayerStat(hash, name) {
    return {
        name: name,
        hash: hash,
        teamname: "",
        teamid: "",
        kills: 0,
        assists: 0,
        damage: 0,
        rank: 0,
    };
}

/**
 * Convert results from webapi to playerstats format / 将从webapi获取的结果转换为playerstats格式
 * @param {object[]} results Array of results from webapi / 从webapi获取的结果数组
 * @return {playerstats} Data in playerstats format / playerstats格式的数据
 */
export function resultsToPlayerStats(results) {
    const playerstats = {};
    for (const result of results) {
        for (const [teamid, team] of Object.entries(result.teams)) {
            for (const player of team.players) {
                if (!(player.id in playerstats)) {
                    playerstats[player.id] = initPlayerStat(player.id, player.name);
                }
                const stats = playerstats[player.id];
                if (stats.teamid == "") stats.teamid = teamid;
                if (stats.teamname == "") stats.teamname = team.name;
                stats.kills += player.kills;
                stats.assists += player.assists;
                stats.damage += player.damage_dealt;
            }
        }
    }
    return playerstats;
}

/**
 * @param {string} html HTML string containing one element / 包含一个元素的HTML字符串
 * @return {HTMLElement} Created HTMLElement / 创建的HTMLElement
 */
export function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
}

/**
 * Sort team elements by rank and reorder them in the DOM
 * @param {Object} teamsObj - Object containing team elements keyed by team ID
 * @param {string} rankSelector - CSS selector for the rank element within each team
 * @param {HTMLElement} rootElement - Parent element containing all team elements
 * @returns {HTMLElement[]} - Sorted array of team elements
 */
export function sortTeamsByRank(teamsObj, rankSelector, rootElement) {
    const teams = Object.values(teamsObj);
    teams.sort((a, b) => {
        const a_node = a.querySelector(rankSelector);
        const b_node = b.querySelector(rankSelector);
        const a_rank = parseInt(a_node?.innerText || '0', 10);
        const b_rank = parseInt(b_node?.innerText || '0', 10);
        if (a_rank > b_rank) return 1;
        if (a_rank < b_rank) return -1;
        return 0;
    });

    for (const team of teams) {
        const rankNode = team.querySelector(rankSelector);
        const rank = parseInt(rankNode?.innerText || '1', 10) - 1;
        if (rootElement.children[rank] != team) {
            rootElement.insertBefore(team, rootElement.children[rank]);
        }
    }

    return teams;
}
