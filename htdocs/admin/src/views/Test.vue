<template>
  <div class="test-page">
    <div class="page-header">
      <h2>{{ t('menu.test') }}</h2>
    </div>

    <el-row :gutter="20">
      <!-- Game State -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>游戏状态</span>
          </template>
          <p>当前状态: <el-tag>{{ currentState }}</el-tag></p>
          <el-button @click="nextState">切换到下一状态</el-button>
        </el-card>
      </el-col>

      <!-- Team Banner -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>队伍横幅</span>
          </template>
          <el-button @click="toggleTeamBanner">显示/隐藏</el-button>
        </el-card>
      </el-col>

      <!-- Camera -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>镜头</span>
          </template>
          <el-input-number v-model="cameraTeamId" :min="1" :max="30" />
          <div class="button-row">
            <el-button @click="cameraDown">◀</el-button>
            <el-button @click="cameraUp">▶</el-button>
          </div>
        </el-card>
      </el-col>

      <!-- Team Kills -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>队伍击杀数</span>
          </template>
          <el-input-number v-model="teamKills" :min="0" />
          <div class="button-row">
            <el-button @click="killsDown">◀</el-button>
            <el-button @click="killsUp">▶</el-button>
          </div>
        </el-card>
      </el-col>

      <!-- Squad Eliminated -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>队伍淘汰</span>
          </template>
          <el-form :inline="true">
            <el-form-item label="排名">
              <el-input-number v-model="elimPlacement" :min="1" :max="30" />
            </el-form-item>
            <el-form-item label="队伍ID">
              <el-input-number v-model="elimTeamId" :min="1" :max="30" />
            </el-form-item>
          </el-form>
          <el-button type="primary" @click="showSquadEliminated">显示</el-button>
        </el-card>
      </el-col>

      <!-- Winner Determine -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>确定胜者</span>
          </template>
          <el-form-item label="队伍ID">
            <el-input-number v-model="winnerTeamId" :min="1" :max="30" />
          </el-form-item>
          <el-button type="primary" @click="showWinner">显示</el-button>
          <el-button @click="resetWinner">重置</el-button>
        </el-card>
      </el-col>

      <!-- Reload -->
      <el-col :span="12">
        <el-card class="content-card">
          <template #header>
            <span>叠加层重载</span>
          </template>
          <el-button type="warning" @click="reloadOverlays">重新加载</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'

const { t } = useI18n()
const connectionStore = useConnectionStore()

const gameStates = ['Lobby', 'Prematch', 'Playing', 'Postmatch']
const currentState = ref('Lobby')
const stateIndex = ref(0)

const cameraTeamId = ref(1)
const teamKills = ref(0)
const elimPlacement = ref(15)
const elimTeamId = ref(1)
const winnerTeamId = ref(1)

const nextState = () => {
  stateIndex.value = (stateIndex.value + 1) % gameStates.length
  currentState.value = gameStates[stateIndex.value]
  connectionStore.send({ type: 'TEST_GAME_STATE', state: currentState.value })
}

const toggleTeamBanner = () => {
  connectionStore.send({ type: 'TEST_TOGGLE_TEAM_BANNER' })
}

const cameraUp = () => {
  cameraTeamId.value = Math.min(30, cameraTeamId.value + 1)
  connectionStore.send({ type: 'TEST_CAMERA', teamId: cameraTeamId.value })
}

const cameraDown = () => {
  cameraTeamId.value = Math.max(1, cameraTeamId.value - 1)
  connectionStore.send({ type: 'TEST_CAMERA', teamId: cameraTeamId.value })
}

const killsUp = () => {
  teamKills.value++
  connectionStore.send({ type: 'TEST_TEAM_KILLS', kills: teamKills.value })
}

const killsDown = () => {
  teamKills.value = Math.max(0, teamKills.value - 1)
  connectionStore.send({ type: 'TEST_TEAM_KILLS', kills: teamKills.value })
}

const showSquadEliminated = () => {
  connectionStore.send({
    type: 'TEST_SQUAD_ELIMINATED',
    placement: elimPlacement.value,
    teamId: elimTeamId.value
  })
}

const showWinner = () => {
  connectionStore.send({ type: 'TEST_WINNER', teamId: winnerTeamId.value })
}

const resetWinner = () => {
  connectionStore.send({ type: 'TEST_WINNER_RESET' })
}

const reloadOverlays = () => {
  connectionStore.send({ type: 'RELOAD_OVERLAYS' })
}
</script>

<style lang="scss" scoped>
.test-page {
  max-width: 1000px;
}

.button-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.el-card {
  margin-bottom: 20px;
}
</style>
