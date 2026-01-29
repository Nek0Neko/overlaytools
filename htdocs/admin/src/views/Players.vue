<template>
  <div class="players-page">
    <div class="page-header">
      <h2>{{ t('menu.players') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>收集玩家哈希</span>
          <el-button-group>
            <el-button @click="getFromResults">从结果获取</el-button>
            <el-button @click="getFromLobby">从大厅获取</el-button>
          </el-button-group>
        </div>
      </template>

      <el-table :data="players" stripe>
        <el-table-column prop="id" label="ID" width="200" />
        <el-table-column prop="ingameName" label="游戏内名称" />
        <el-table-column label="设置名称" width="250">
          <template #default="{ row }">
            <el-input 
              v-model="row.customName" 
              size="small"
              placeholder="输入自定义名称"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('common.action')" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="setPlayerName(row)">
              设置
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const connectionStore = useConnectionStore()

interface Player {
  id: string
  ingameName: string
  customName: string
}

const players = ref<Player[]>([])

const getFromResults = () => {
  connectionStore.send({ type: 'GET_PLAYERS_FROM_RESULTS' })
}

const getFromLobby = () => {
  connectionStore.send({ type: 'GET_PLAYERS_FROM_LOBBY' })
}

const setPlayerName = (row: Player) => {
  connectionStore.send({
    type: 'SET_PLAYER_NAME',
    id: row.id,
    name: row.customName
  })
  ElMessage.success('Player name set')
}

// Subscribe to player updates
connectionStore.subscribe('PLAYERS', (data) => {
  if (data.players) {
    players.value = data.players.map((p: any) => ({
      id: p.id,
      ingameName: p.name || '',
      customName: p.customName || ''
    }))
  }
})
</script>

<style lang="scss" scoped>
.players-page {
  max-width: 900px;
}
</style>
