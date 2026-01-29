<template>
  <div class="results-page">
    <div class="page-header">
      <h2>{{ t('menu.results') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>比赛结果</span>
          <el-button @click="forcePostMatch">强制结束比赛</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="综合结果" name="all">
          <el-table :data="totalResults" stripe>
            <el-table-column prop="rank" label="排名" width="80" />
            <el-table-column prop="teamName" label="队伍名称" />
            <el-table-column prop="totalPoints" label="总积分" width="100" />
            <el-table-column prop="kills" label="击杀" width="80" />
            <el-table-column prop="placement" label="排名积分" width="100" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane 
          v-for="(match, index) in matchResults" 
          :key="index"
          :label="`比赛 ${index + 1}`" 
          :name="`match-${index}`"
        >
          <div class="match-info">
            <p>数据中心: {{ match.datacenter }}</p>
            <p>时间: {{ match.timestamp }}</p>
          </div>
          
          <el-table :data="match.teams" stripe>
            <el-table-column prop="placement" label="排名" width="80" />
            <el-table-column prop="teamName" label="队伍名称" />
            <el-table-column prop="kills" label="击杀" width="80" />
            <el-table-column prop="points" label="积分" width="80" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { ElMessage, ElMessageBox } from 'element-plus'

const { t } = useI18n()
const connectionStore = useConnectionStore()

const activeTab = ref('all')

interface TeamResult {
  rank?: number
  placement?: number
  teamName: string
  kills: number
  points?: number
  totalPoints?: number
}

interface MatchResult {
  datacenter: string
  timestamp: string
  teams: TeamResult[]
}

const totalResults = ref<TeamResult[]>([])
const matchResults = ref<MatchResult[]>([])

const forcePostMatch = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要强制结束当前比赛吗？这可能导致数据不准确。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    connectionStore.send({ type: 'FORCE_POST_MATCH' })
    ElMessage.success('Post match triggered')
  } catch {
    // Cancelled
  }
}

// Subscribe to result updates
connectionStore.subscribe('RESULTS', (data) => {
  if (data.total) {
    totalResults.value = data.total
  }
  if (data.matches) {
    matchResults.value = data.matches
  }
})

// Request results on mount
connectionStore.send({ type: 'GET_RESULTS' })
</script>

<style lang="scss" scoped>
.results-page {
  max-width: 1000px;
}

.match-info {
  margin-bottom: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  
  p {
    margin: 4px 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}
</style>
