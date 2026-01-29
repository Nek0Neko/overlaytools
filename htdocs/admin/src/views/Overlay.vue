<template>
  <div class="overlay-page">
    <div class="page-header">
      <h2>{{ t('menu.overlay') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <span>{{ t('overlay.forceHide') }}</span>
      </template>

      <div class="overlay-controls">
        <el-checkbox v-model="hideSettings.leaderboard" @change="updateHide">
          {{ t('overlay.leaderboard') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.mapLeaderboard" @change="updateHide">
          {{ t('overlay.mapLeaderboard') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.teamBanner" @change="updateHide">
          {{ t('overlay.teamBanner') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.playerBanner" @change="updateHide">
          {{ t('overlay.playerBanner') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.teamKills" @change="updateHide">
          {{ t('overlay.teamKills') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.ownedItems" @change="updateHide">
          {{ t('overlay.ownedItems') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.gameInfo" @change="updateHide">
          {{ t('overlay.gameInfo') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.championBanner" @change="updateHide">
          {{ t('overlay.championBanner') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.squadEliminated" @change="updateHide">
          {{ t('overlay.squadEliminated') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.teamRespawned" @change="updateHide">
          {{ t('overlay.teamRespawned') }}
        </el-checkbox>
        
        <el-checkbox v-model="hideSettings.tdmScoreboard" @change="updateHide">
          {{ t('overlay.tdmScoreboard') }}
        </el-checkbox>
      </div>
    </el-card>

    <el-card class="content-card">
      <template #header>
        <span>{{ t('overlay.groupSelect') }}</span>
      </template>

      <el-checkbox v-model="hideSettings.teamPlayerInfo" @change="updateGroupHide">
        {{ t('overlay.teamPlayerInfo') }}
      </el-checkbox>
    </el-card>

    <el-card class="content-card">
      <template #header>
        <span>叠加层 URL</span>
      </template>

      <el-table :data="overlayUrls" stripe>
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="url" label="URL">
          <template #default="{ row }">
            <el-link :href="row.url" target="_blank" type="primary">
              {{ row.url }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="copyUrl(row.url)">
              复制
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

const hideSettings = ref({
  leaderboard: false,
  mapLeaderboard: false,
  teamBanner: false,
  playerBanner: false,
  teamKills: false,
  ownedItems: false,
  gameInfo: false,
  championBanner: false,
  squadEliminated: false,
  teamRespawned: false,
  tdmScoreboard: false,
  teamPlayerInfo: false
})

const baseUrl = 'http://127.0.0.1:20080'
const overlayUrls = [
  { name: '排行榜', url: `${baseUrl}/overlays/leaderboard.html` },
  { name: '地图排行榜', url: `${baseUrl}/overlays/mapleaderboard.html` },
  { name: '队伍横幅', url: `${baseUrl}/overlays/teambanner.html` },
  { name: '玩家横幅', url: `${baseUrl}/overlays/playerbanner.html` },
  { name: '持有物品', url: `${baseUrl}/overlays/owneditems.html` },
  { name: '队伍击杀', url: `${baseUrl}/overlays/teamkills.html` },
  { name: '游戏信息', url: `${baseUrl}/overlays/gameinfo.html` },
  { name: '冠军横幅', url: `${baseUrl}/overlays/championbanner.html` },
  { name: '单场结果', url: `${baseUrl}/overlays/singleresult.html` },
  { name: '综合结果', url: `${baseUrl}/overlays/totalresult.html` }
]

const updateHide = () => {
  connectionStore.send({
    type: 'SET_OVERLAY_HIDE',
    ...hideSettings.value
  })
}

const updateGroupHide = () => {
  if (hideSettings.value.teamPlayerInfo) {
    hideSettings.value.teamBanner = true
    hideSettings.value.playerBanner = true
    hideSettings.value.teamKills = true
    hideSettings.value.ownedItems = true
  }
  updateHide()
}

const copyUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('URL copied')
  } catch {
    ElMessage.error('Failed to copy')
  }
}
</script>

<style lang="scss" scoped>
.overlay-page {
  max-width: 900px;
}

.overlay-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
</style>
