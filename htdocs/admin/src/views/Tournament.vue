<template>
  <div class="tournament-page">
    <div class="page-header">
      <h2>{{ t('tournament.createTitle') }}</h2>
      <p>{{ t('tournament.createDesc') }}</p>
    </div>

    <el-tabs v-model="activeTab">
      <!-- Create / Select Tab -->
      <el-tab-pane :label="t('menu.tournamentCreate')" name="create">
        <el-card class="content-card">
          <template #header>
            <span>{{ t('tournament.createNew') }}</span>
          </template>
          
          <el-form @submit.prevent="createTournament">
            <el-form-item>
              <el-input 
                v-model="newTournamentName" 
                :placeholder="t('tournament.inputName')"
                style="max-width: 400px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="createTournament">
                {{ t('common.create') }}
              </el-button>
            </el-form-item>
          </el-form>
          <el-text type="info">{{ t('tournament.existsNote') }}</el-text>
        </el-card>

        <el-card class="content-card">
          <template #header>
            <span>{{ t('tournament.selectExisting') }}</span>
          </template>
          
          <el-table :data="tournaments" stripe @row-click="selectTournament">
            <el-table-column prop="name" :label="t('common.name')" />
            <el-table-column prop="id" :label="t('common.id')" width="300" />
            <el-table-column :label="t('common.action')" width="120">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click.stop="selectTournament(row)">
                  {{ t('common.select') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Rename Tab -->
      <el-tab-pane :label="t('menu.tournamentRename')" name="rename">
        <el-card class="content-card">
          <template #header>
            <span>{{ t('tournament.renameTitle') }}</span>
          </template>
          <p>{{ t('tournament.renameDesc') }}</p>
          
          <el-form @submit.prevent="renameTournament">
            <el-form-item>
              <el-input 
                v-model="renameTournamentName" 
                :placeholder="t('tournament.inputName')"
                style="max-width: 400px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="renameTournament">
                {{ t('menu.tournamentRename') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- Points Calculation Tab -->
      <el-tab-pane :label="t('menu.tournamentCalc')" name="calc">
        <el-card class="content-card">
          <template #header>
            <span>{{ t('tournament.calcTitle') }}</span>
          </template>
          
          <el-form label-width="150px">
            <el-form-item :label="t('tournament.advancePoints')">
              <el-input 
                v-model="calcSettings.advancePoints" 
                placeholder="5,4,3,2,1"
                style="max-width: 300px"
              />
            </el-form-item>
            
            <el-form-item :label="t('tournament.matchPoints')">
              <el-input-number 
                v-model="calcSettings.matchPoints" 
                :min="0" 
              />
            </el-form-item>
            
            <el-form-item :label="t('tournament.matchCount')">
              <el-select v-model="calcSettings.matchCount">
                <el-option v-for="n in 16" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="setCalcMethod">
                {{ t('tournament.setCalcMethod') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const route = useRoute()
const connectionStore = useConnectionStore()

const activeTab = ref((route.query.tab as string) || 'create')
const newTournamentName = ref('')
const renameTournamentName = ref('')

const tournaments = computed(() => connectionStore.tournaments)

const calcSettings = ref({
  advancePoints: '',
  matchPoints: 0,
  matchCount: 6
})

const createTournament = () => {
  if (!newTournamentName.value) {
    ElMessage.warning('Please enter tournament name')
    return
  }
  connectionStore.send({
    type: 'CREATE_TOURNAMENT',
    name: newTournamentName.value
  })
  ElMessage.success('Tournament created')
}

const selectTournament = (row: { id: string; name: string }) => {
  connectionStore.send({
    type: 'SELECT_TOURNAMENT',
    id: row.id
  })
  ElMessage.success(`Selected: ${row.name}`)
}

const renameTournament = () => {
  if (!renameTournamentName.value) {
    ElMessage.warning('Please enter new name')
    return
  }
  connectionStore.send({
    type: 'RENAME_TOURNAMENT',
    name: renameTournamentName.value
  })
  ElMessage.success('Tournament renamed')
}

const setCalcMethod = () => {
  connectionStore.send({
    type: 'SET_CALC_METHOD',
    ...calcSettings.value
  })
  ElMessage.success('Calculation method updated')
}

onMounted(() => {
  connectionStore.send({ type: 'GET_TOURNAMENTS' })
})
</script>

<style lang="scss" scoped>
.tournament-page {
  max-width: 900px;
}
</style>
