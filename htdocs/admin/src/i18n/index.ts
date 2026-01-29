import { createI18n } from 'vue-i18n'

const messages = {
  zh: {
    menu: {
      liveapi: 'LiveAPI 设置',
      tournament: '锦标赛',
      tournamentCreate: '创建/选择',
      tournamentRename: '重命名',
      tournamentCalc: '积分计算',
      observer: '观察者',
      players: '玩家',
      playerName: '设置名称',
      playerLobby: '设置名称(大厅)',
      teams: '队伍',
      teamName: '设置名称',
      ingame: '游戏内设置',
      legendBan: '传说禁用',
      realtime: '实时数据',
      overlay: '叠加层',
      announce: '游戏内聊天',
      forceEnd: '强制结束',
      results: '结果',
      test: '测试'
    },
    common: {
      name: '名称',
      id: 'ID',
      status: '状态',
      action: '操作',
      save: '保存',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      select: '选择',
      refresh: '刷新',
      send: '发送',
      connect: '连接',
      disconnect: '断开',
      connected: '已连接',
      disconnected: '未连接',
      connecting: '连接中...'
    },
    sidebar: {
      currentTournament: '当前锦标赛',
      currentObserver: '当前观察者',
      webapiConnection: 'WebAPI 连接',
      liveapiConnection: 'LiveAPI 连接',
      forceReconnect: '强制重连',
      connectionCount: '连接数',
      recvPackets: '接收数据包',
      sendPackets: '发送数据包'
    },
    liveapi: {
      title: 'LiveAPI 设置',
      currentConnections: '当前 LiveAPI 连接',
      writeConfig: '写入配置',
      currentConfig: '当前配置文件 (config.json)'
    },
    tournament: {
      createTitle: '锦标赛: 创建和选择',
      createDesc: '创建新锦标赛或选择现有锦标赛',
      createNew: '创建新锦标赛',
      selectExisting: '选择现有锦标赛',
      inputName: '输入锦标赛名称',
      existsNote: '※如果已存在同名锦标赛，将选择现有锦标赛',
      renameTitle: '锦标赛: 重命名',
      renameDesc: '重命名当前锦标赛',
      calcTitle: '锦标赛: 积分计算',
      advancePoints: '先行起始积分',
      matchPoints: '比赛积分',
      matchCount: '比赛数',
      calcMethod: '积分计算方法',
      setCalcMethod: '设置积分计算方法'
    },
    overlay: {
      forceHide: '强制隐藏叠加层',
      leaderboard: '排行榜',
      mapLeaderboard: '地图排行榜',
      teamBanner: '队伍横幅',
      playerBanner: '玩家横幅',
      teamKills: '队伍击杀数',
      ownedItems: '持有物品',
      gameInfo: '游戏信息',
      championBanner: '冠军横幅',
      squadEliminated: '队伍淘汰信息',
      teamRespawned: '队伍复活信息',
      tdmScoreboard: '团队死斗计分板',
      groupSelect: '按组选择',
      teamPlayerInfo: '队伍/玩家相关信息'
    }
  },
  en: {
    menu: {
      liveapi: 'LiveAPI Settings',
      tournament: 'Tournament',
      tournamentCreate: 'Create/Select',
      tournamentRename: 'Rename',
      tournamentCalc: 'Points Calc',
      observer: 'Observer',
      players: 'Players',
      playerName: 'Set Name',
      playerLobby: 'Set Name (Lobby)',
      teams: 'Teams',
      teamName: 'Set Name',
      ingame: 'In-Game Settings',
      legendBan: 'Legend BAN',
      realtime: 'Realtime Data',
      overlay: 'Overlay',
      announce: 'Announce',
      forceEnd: 'Force End',
      results: 'Results',
      test: 'Test'
    },
    common: {
      name: 'Name',
      id: 'ID',
      status: 'Status',
      action: 'Action',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      select: 'Select',
      refresh: 'Refresh',
      send: 'Send',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connected: 'Connected',
      disconnected: 'Disconnected',
      connecting: 'Connecting...'
    },
    sidebar: {
      currentTournament: 'Current Tournament',
      currentObserver: 'Current Observer',
      webapiConnection: 'WebAPI Connection',
      liveapiConnection: 'LiveAPI Connection',
      forceReconnect: 'Force Reconnect',
      connectionCount: 'Connections',
      recvPackets: 'Recv Packets',
      sendPackets: 'Send Packets'
    },
    liveapi: {
      title: 'LiveAPI Settings',
      currentConnections: 'Current LiveAPI Connections',
      writeConfig: 'Write Config',
      currentConfig: 'Current Config File (config.json)'
    },
    tournament: {
      createTitle: 'Tournament: Create & Select',
      createDesc: 'Create new tournament or select existing one',
      createNew: 'Create New Tournament',
      selectExisting: 'Select Existing Tournament',
      inputName: 'Input tournament name',
      existsNote: '** If tournament with same name exists, it will be selected',
      renameTitle: 'Tournament: Rename',
      renameDesc: 'Rename current tournament',
      calcTitle: 'Tournament: Points Calculation',
      advancePoints: 'Advance Points',
      matchPoints: 'Match Points',
      matchCount: 'Match Count',
      calcMethod: 'Calculation Method',
      setCalcMethod: 'Set Calculation Method'
    },
    overlay: {
      forceHide: 'Force Hide Overlay',
      leaderboard: 'Leaderboard',
      mapLeaderboard: 'Map Leaderboard',
      teamBanner: 'Team Banner',
      playerBanner: 'Player Banner',
      teamKills: 'Team Kills',
      ownedItems: 'Owned Items',
      gameInfo: 'Game Info',
      championBanner: 'Champion Banner',
      squadEliminated: 'Squad Eliminated',
      teamRespawned: 'Team Respawned',
      tdmScoreboard: 'TDM Scoreboard',
      groupSelect: 'Select by Group',
      teamPlayerInfo: 'Team/Player Info'
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages
})

export default i18n
