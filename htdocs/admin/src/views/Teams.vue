<template>
  <div class="teams-page">
    <div class="page-header">
      <h2>{{ t('menu.teams') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <span>队伍名称设置</span>
      </template>

      <div class="team-input-grid">
        <div class="team-numbers">
          <div v-for="n in 30" :key="n" class="team-num">{{ n }}</div>
        </div>
        <el-input
          v-model="teamNamesText"
          type="textarea"
          :rows="30"
          placeholder="每行一个队伍名称"
        />
        <div class="team-preview">
          <div v-for="(name, index) in previewNames" :key="index" class="preview-name">
            {{ name || '-' }}
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <el-button type="primary" @click="setTeamNames">
          设置队伍名称
        </el-button>
        <el-button @click="setIngameTeamNames">
          设置游戏内队伍名称
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const connectionStore = useConnectionStore()

const teamNamesText = ref('')

const previewNames = computed(() => {
  const lines = teamNamesText.value.split('\n')
  const result = []
  for (let i = 0; i < 30; i++) {
    result.push(lines[i] || '')
  }
  return result
})

const setTeamNames = () => {
  const names = teamNamesText.value.split('\n').slice(0, 30)
  connectionStore.send({
    type: 'SET_TEAM_NAMES',
    names
  })
  ElMessage.success('Team names set')
}

const setIngameTeamNames = () => {
  const names = teamNamesText.value.split('\n').slice(0, 30)
  connectionStore.send({
    type: 'SET_INGAME_TEAM_NAMES',
    names
  })
  ElMessage.success('In-game team names set')
}
</script>

<style lang="scss" scoped>
.teams-page {
  max-width: 900px;
}

.team-input-grid {
  display: grid;
  grid-template-columns: 40px 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.team-numbers {
  .team-num {
    height: 24px;
    line-height: 24px;
    text-align: right;
    padding-right: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.team-preview {
  .preview-name {
    height: 24px;
    line-height: 24px;
    padding-left: 8px;
    font-size: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
}
</style>
