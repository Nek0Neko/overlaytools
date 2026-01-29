import { TemplateOverlay, TemplateOverlayHandler } from "./template-overlay.js";
import { sortTeamsByRank } from "./overlay-common.js";

class LeaderBoard extends TemplateOverlay {
    static FADEIN_CLASS = 'fadein';
    static FADEOUT_CLASS = 'fadeout';
    static CHANGED_CLASS = 'changed';
    #currentshowindex;
    #nextshowindex;
    #timerid;
    #shownum;
    #showinterval;
    #alivesonly;
    #delaysort;
    #teamsContainer;  // Cached DOM reference

    constructor(shownum = 4) {
        super({ types: ["view-live"] });
        this.#timerid = -1;
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#shownum = shownum;
        this.#showinterval = 5000;
        this.#alivesonly = false;
        this.#delaysort = [];
        this.#teamsContainer = null;
    }

    /** Get cached teams container element */
    get teamsContainer() {
        if (!this.#teamsContainer) {
            this.#teamsContainer = this.root?.shadowRoot?.querySelector('.teams');
        }
        return this.#teamsContainer;
    }

    /**
     * Get current number of surviving teams / 获取当前存活团队数量
     * @returns {number} Number of surviving teams / 存活团队数量
     */
    #countAlives() {
        let alives = 0;
        for (const teamid of Object.keys(this.teams)) {
            if (this.#isAlive(teamid)) alives++;
        }
        return alives;
    }

    #isAlive(teamid) {
        const exists = this.teams[teamid].classList.contains('team-exists');
        const eliminate = this.teams[teamid].classList.contains('team-squad-eliminate');
        return (exists && !eliminate);
    }

    #startFadeIn() {
        const children = this.teamsContainer?.children;
        if (!children) return;
        const length = children.length;
        this.#currentshowindex = this.#nextshowindex;
        let start = this.#currentshowindex;
        for (let i = start; i < length && i < start + this.#shownum; ++i) {
            children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
            children[i].classList.add(LeaderBoard.FADEIN_CLASS);
            children[i].classList.remove(LeaderBoard.HIDE_CLASS);
            this.#nextshowindex++;
        }
        if (this.#nextshowindex >= length) this.#nextshowindex = 0;

        // FadeIn end / 淡入结束
        this.#timerid = setTimeout(() => {
            this.#endFadeIn();
        }, 300); // 300ms
    }

    #endFadeIn() {
        for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEIN_CLASS}`)) {
            node.classList.remove(LeaderBoard.FADEIN_CLASS);
        }
        this.sortTeamTotalRank();
        // Schedule FadeOut / 预约淡出
        this.#timerid = setTimeout(() => {
            this.#startFadeOut();
        }, this.#showinterval);
    }

    #startFadeOut() {
        const children = this.teamsContainer?.children;
        if (!children) return;
        for (const node of children) {
            if (!node.classList.contains(LeaderBoard.HIDE_CLASS)) {
                node.classList.remove(LeaderBoard.CHANGED_CLASS);
                node.classList.add(LeaderBoard.FADEOUT_CLASS);
            }
        }
        // FadeOut end / 淡出结束
        this.#timerid = setTimeout(() => {
            this.#endFadeOut();
        }, 300);
    }

    #endFadeOut() {
        for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEOUT_CLASS}`)) {
            node.classList.add(LeaderBoard.HIDE_CLASS);
            node.classList.remove(LeaderBoard.FADEOUT_CLASS);
        }
        // Schedule FadeIn / 预约淡入
        this.#timerid = setTimeout(() => {
            this.#startFadeIn();
        }, 0);
    }

    setSquadEliminate(placement, teamid, teamname, init) {
        this.#check();
    }

    #check() {
        const alives = this.#countAlives();
        if (alives > this.#shownum) {
            if (this.#timerid >= 0) return; // Animation already started / 动画已开始
            // Hide all / 隐藏全部
            for (const [_, team] of Object.entries(this.teams)) {
                team.classList.add(TemplateOverlay.HIDE_CLASS);
            }
            this.#alivesonly = false;
            this.#currentshowindex = 0;
            this.#nextshowindex = 0;
            this.#startFadeIn();
        } else {
            if (this.#timerid >= 0) {
                clearTimeout(this.#timerid);
                this.#timerid = -1;
            }
            // Remove animation classes / 移除动画类
            for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEIN_CLASS}`)) {
                node.classList.remove(LeaderBoard.FADEIN_CLASS);
            }
            for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEOUT_CLASS}`)) {
                node.classList.remove(LeaderBoard.FADEOUT_CLASS);
            }
            if (!this.#alivesonly) {
                this.#alivesonly = true;
            }
            if (this.#alivesonly) {
                for (const [teamid, team] of Object.entries(this.teams)) {
                    if (this.#isAlive(teamid)) {
                        team.classList.remove(TemplateOverlay.HIDE_CLASS);
                    } else {
                        team.classList.add(TemplateOverlay.HIDE_CLASS);
                    }
                }
            }
        }
    }

    sortTeamTotalRank(changeinfo = []) {
        this.#check();
        this.#delaysort.push(...changeinfo);
        const root = this.teamsContainer;
        if (!root) return;
        sortTeamsByRank(this.teams, '.team-total-rank', root);

        // Do nothing during FadeIn/FadeOut / 淡入淡出期间不做任何操作
        if (root.querySelector(`.${LeaderBoard.FADEIN_CLASS}`)) return;
        if (root.querySelector(`.${LeaderBoard.FADEOUT_CLASS}`)) return;

        if (this.#alivesonly == false) {
            const children = root.children;
            let start = this.#currentshowindex;
            for (let i = 0; i < children.length; ++i) {
                if (start <= i && i < start + this.#shownum) {
                    // Show / 显示
                    children[i].classList.remove(LeaderBoard.HIDE_CLASS);
                    const teamid = parseInt(children[i].dataset.teamId, 10) - 1;
                    if (this.#delaysort.find(x => x.id == teamid && x.changed)) {
                        children[i].classList.remove(LeaderBoard.FADEIN_CLASS);
                        children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
                        children[i].classList.add(LeaderBoard.CHANGED_CLASS);
                    }
                } else {
                    // Hide / 隐藏
                    children[i].classList.remove(LeaderBoard.FADEIN_CLASS);
                    children[i].classList.remove(LeaderBoard.FADEOUT_CLASS);
                    children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
                    children[i].classList.add(LeaderBoard.HIDE_CLASS);
                }
            }
        } else {
            for (const [teamid, team] of Object.entries(this.teams)) {
                if (this.#isAlive(teamid)) {
                    team.classList.remove(LeaderBoard.HIDE_CLASS);
                } else {
                    team.classList.add(LeaderBoard.HIDE_CLASS);
                }
            } 
        }
        this.#delaysort.splice(0);
    }

    removeHide() {
        if (super.removeHide()) {
            this.#check();
        }
    }
}

class MapLeaderBoard extends TemplateOverlay {
    static CHANGED_CLASS = 'changed';
    #teamsContainer = null;  // Cached DOM reference

    constructor() {
        super({types: ["view-map"]});
    }

    /** Get cached teams container element */
    get teamsContainer() {
        if (!this.#teamsContainer) {
            this.#teamsContainer = this.root?.shadowRoot?.querySelector('.teams');
        }
        return this.#teamsContainer;
    }

    sortTeamTotalRank(changeinfo = []) {
        const root = this.teamsContainer;
        if (!root) return;
        sortTeamsByRank(this.teams, '.team-total-rank', root);

        for (const x of changeinfo) {
            if (x.changed && x.id in this.teams) {
                this.teams[x.id].classList.remove(MapLeaderBoard.CHANGED_CLASS);
                this.teams[x.id].classList.add(MapLeaderBoard.CHANGED_CLASS);
            }
        }
    }
}

class TeamBanner extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-team"]});
    }

    setParam(paramname, paramvalue, dataset = false) {
        super.setParam(paramname, paramvalue, dataset);
        if (paramname == "camera-team-name") {
            this.drawCanvas();
            this.drawNameCanvas(paramvalue);
        }
        if (paramname == "camera-team-matchpoints") {
            this.drawCanvas();
        }
    }

    drawCanvas() {
        const canvas = this.root.shadowRoot.querySelector('canvas.apexrect');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Clipping / 裁剪
        const rate = canvas.height / 74;
        ctx.beginPath();
        ctx.moveTo(10 * rate, 0);
        ctx.lineTo(0, 16 * rate);
        ctx.lineTo(34 * rate, canvas.height);
        ctx.lineTo(canvas.width - 9 * rate, canvas.height);
        ctx.lineTo(canvas.width, 60 * rate);
        ctx.lineTo(canvas.width - 36 * rate, 0);
        ctx.closePath();
        ctx.clip();

        // Fill background / 填充背景
        const bgcolor = window.getComputedStyle(canvas).getPropertyValue('--apexrect-background-color');
        ctx.fillStyle = bgcolor != "" ? bgcolor : '#141414';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Red border (X direction) / 红色边框(X方向)
        const bordercolor = window.getComputedStyle(canvas).getPropertyValue('--apexrect-border-color');
        ctx.fillStyle = bordercolor != "" ? bordercolor : '#B03039';
        const xborder = 5;
        ctx.beginPath();
        ctx.moveTo(  xborder + 10 * rate, 0);
        ctx.lineTo(  xborder            , 16 * rate);
        ctx.lineTo(  xborder + 34 * rate, canvas.height);
        ctx.lineTo(- xborder + 34 * rate, canvas.height);
        ctx.lineTo(- xborder            , 16 * rate);
        ctx.lineTo(- xborder + 10 * rate, 0);
        ctx.fill();

        // Draw background color for match point / 绘制赛点时的背景色
        if (canvas.closest('[data-camera-team-matchpoints="1"]') !== null) {
            const backgroundcolor = window.getComputedStyle(canvas).getPropertyValue('--teambanner-matchpoints-background-color');
            ctx.fillStyle = backgroundcolor != "" ? backgroundcolor : '#B03039';
            const width = 87;
            ctx.beginPath();
            ctx.moveTo(canvas.width - width + 10 * rate, 0);
            ctx.lineTo(canvas.width - width            , 16 * rate);
            ctx.lineTo(canvas.width - width + 34 * rate, canvas.height);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(canvas.width, 0);
            ctx.fill();
        }
    }

    drawNameCanvas(name) {
        const canvas = this.root.shadowRoot.querySelector('canvas.camera-team-name');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw text / 绘制文本
        const margin = 10;
        ctx.fillStyle = window.getComputedStyle(canvas).color;
        ctx.font = window.getComputedStyle(canvas).font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = "left";
        ctx.fillText(name, margin, canvas.height / 2 + 3, canvas.width - margin * 2);
    }
}

class PlayerBanner extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-teamplayer", "defaulthide"]});
    }
}

class TeamKills extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-team"]});
    }
}

class OwnedItems extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-teamplayer"]});
    }
}

class GameInfo extends TemplateOverlay {
    constructor() {
        super({types: ["view-live"]});
    }
}

class ChampionBanner extends TemplateOverlay {
    static FADEINOUTTARGET_CLASS = "fadeinout-target";
    static FADEINOUT_CLASS = "fadeinout";
    #target;

    constructor() {
        super();
        this.#target = null;
    }

    async build() {
        await super.build();
        this.#target = this.root.shadowRoot.querySelector(`.${ChampionBanner.FADEINOUTTARGET_CLASS}`);
        return true;
    }

    #startFadeIn() {
        if (this.#target) {
            this.#target.classList.remove(ChampionBanner.FADEINOUT_CLASS);
            setTimeout(() => {
                this.#target.classList.add(ChampionBanner.FADEINOUT_CLASS);
            }, 30);
        }
    }

    setWinnerDetermine(teamid, teamname) {
        this.setParam('winner-teamid', teamid, true);
        this.setParam('winner-team-name', teamname);
        this.#startFadeIn();
    }
}

class SquadEliminated extends TemplateOverlay {
    static FADEINOUTTARGET_CLASS = "fadeinout-target";
    static FADEINOUT_CLASS = "fadeinout";
    static FADEINOUT_ANIMATION_NAME = "fadeinout-animation";

    /**
     * @typedef {object} queuedata
     * @prop {number} placement Placement (1~) / 排名(1~)
     * @prop {number|string} teamid Team ID (0~) / 团队ID(0~)
     * @prop {string} teamname Team name / 团队名称
     */

    /** @type {queuedata[]} */
    #queue;
    #target;

    /**
     * Constructor / 构造函数
     */
    constructor() {
        super({types: ["view-live"]});
        this.#queue = [];
        this.#target = null;
    }

    async build() {
        await super.build();
        this.#target = this.root.shadowRoot.querySelector(`.${SquadEliminated.FADEINOUTTARGET_CLASS}`);
        if (this.#target) {
            // Remove class after animation / 动画后移除类
            this.#target.addEventListener('animationend', (ev) => {
                if (ev.animationName == SquadEliminated.FADEINOUT_ANIMATION_NAME) {
                    this.#target.classList.remove(SquadEliminated.FADEINOUT_CLASS);
                    window.requestAnimationFrame((_) => {
                        window.requestAnimationFrame((_) => {
                            this.#checkNext();
                        });
                    });
                }
            });
        }
        return true;
    }

    /**
     * Set team elimination info / 设置团队淘汰信息
     * @param {number} placement Placement (1~) / 排名(1~)
     * @param {number|string} teamid Team ID (0~) / 团队ID(0~)
     * @param {string} teamname Team name / 团队名称
     * @param {boolean} init During initialization / 初始化中
     * @returns 
     */
    setSquadEliminate(placement, teamid, teamname, init) {
        if (init) return;
        if (placement <= 2) return;
        this.#queue.push({
            placement: placement,
            teamid: teamid,
            teamname: teamname
        });
        this.#checkNext();
    }

    /**
     * Start fade in / 开始淡入
     */
    #startFadeIn() {
        if (this.#target) {
            this.#target.classList.add(SquadEliminated.FADEINOUT_CLASS);
        }
    }

    /**
     * Check if next data exists and perform next action / 检查是否有下一个数据并执行下一步操作
     */
    #checkNext() {
        if (this.#queue.length == 0) {
            return;
        }

        if (this.#target && this.#target.classList.contains(SquadEliminated.FADEINOUT_CLASS)) return; // Waiting for fade out / 等待淡出

        // Show next data / 显示下一个数据
        const data = this.#queue.shift();
        if (data) {
            this.setParam('eliminated-team-id', parseInt(data.teamid, 10) + 1, true);
            this.setParam('eliminated-team-placement', data.placement);
            this.setParam('eliminated-team-name', data.teamname);
            this.#startFadeIn();
        }
    }
}


class TeamRespawned extends TemplateOverlay {
    static FADEINOUTTARGET_CLASS = "fadeinout-target";
    static FADEINOUT_CLASS = "fadeinout";
    static FADEINOUT_ANIMATION_NAME = "fadeinout-animation";

    /**
     * @typedef {object} queuedata
     * @prop {number|string} teamid Team ID (0~) / 团队ID(0~)
     * @prop {string} teamname Team name / 团队名称
     * @prop {string} respawn_playername Player who respawned / 执行复活的玩家名
     * @prop {string[]} respawned_playernames Names of respawned players / 被复活的玩家名
     */

    /** @type {queuedata[]} */
    #queue;
    #target;

    /**
     * Constructor / 构造函数
     */
    constructor() {
        super({types: ["view-live"]});
        this.#queue = [];
        this.#target = null;
    }

    async build() {
        await super.build();
        this.#target = this.root.shadowRoot.querySelector(`.${TeamRespawned.FADEINOUTTARGET_CLASS}`);
        if (this.#target) {
            // Remove class after animation / 动画后移除类
            this.#target.addEventListener('animationend', (ev) => {
                if (ev.animationName == TeamRespawned.FADEINOUT_ANIMATION_NAME) {
                    this.#target.classList.remove(TeamRespawned.FADEINOUT_CLASS);
                    window.requestAnimationFrame((_) => {
                        window.requestAnimationFrame((_) => {
                            this.#checkNext();
                        });
                    });
                }
            });
        }
        return true;
    }

    /**
     * Set team respawn info / 设置团队复活信息
     * @param {number|string} teamid Team ID (0~) / 团队ID(0~)
     * @param {string} teamname Team name / 团队名称
     * @param {string} respawn_playername Player who respawned / 执行复活的玩家名
     * @param {string[]} respawned_playernames Names of respawned players / 被复活的玩家名
     * @returns 
     */
    setTeamRespawn(teamid, teamname, respawn_playername, respawned_playernames) {
        this.#queue.push({
            teamid: teamid,
            teamname: teamname,
            respawn_playername: respawn_playername,
            respawned_playernames: respawned_playernames
        });
        this.#checkNext();
    }

    /**
     * Start fade in / 开始淡入
     */
    #startFadeIn() {
        if (this.#target) {
            this.#target.classList.add(TeamRespawned.FADEINOUT_CLASS);
        }
    }

    /**
     * Check if next data exists and perform next action / 检查是否有下一个数据并执行下一步操作
     */
    #checkNext() {
        if (this.#queue.length == 0) {
            return;
        }

        if (this.#target && this.#target.classList.contains(TeamRespawned.FADEINOUT_CLASS)) return; // Waiting for fade out / 等待淡出

        // Show next data / 显示下一个数据
        const data = this.#queue.shift();
        if (data) {
            this.setParam('teamrespawned-team-id', parseInt(data.teamid, 10) + 1, true);
            this.setParam('teamrespawned-team-name', data.teamname);
            this.setParam('teamrespawned-respawn-player', data.respawn_playername);
            this.setParam('teamrespawned-respawned-players', data.respawned_playernames.join(' / '));
            this.#startFadeIn();
        }
    }
}

class ErrorStatus extends TemplateOverlay {
}

export function initOverlay(params = {}) {
    params.overlays = {
        "leaderboard": new LeaderBoard(),
        "teambanner": new TeamBanner(),
        "playerbanner": new PlayerBanner(),
        "teamkills": new TeamKills(),
        "mapleaderboard": new MapLeaderBoard(),
        "gameinfo": new GameInfo(),
        "owneditems": new OwnedItems(),
        "squadeliminated": new SquadEliminated(),
        "errorstatus": new ErrorStatus(),
        "championbanner": new ChampionBanner(),
        "teamrespawned": new TeamRespawned(),
    }
    const overlay = new TemplateOverlayHandler(params);
}
