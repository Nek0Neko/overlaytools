<template>
  <div class="observer-page">
    <div class="page-header">
      <h2>{{ t('menu.observer') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>收集观察者哈希</span>
          <el-button type="primary" @click="getFromLobby">
            从大厅获取
          </el-button>
        </div>
      </template>

      <el-table :data="observers" stripe>
        <el-table-column prop="id" label="ID" />
        <el-table-column prop="name" :label="t('common.name')" />
        <el-table-column :label="t('common.action')" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="selectObserver(row)">
              {{ t('common.select') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const connectionStore = useConnectionStore()

const observers = computed(() => connectionStore.observers)

const getFromLobby = () => {
  connectionStore.send({ type: 'GET_OBSERVERS_FROM_LOBBY' })
}

const selectObserver = (row: { id: string; name: string }) => {
  connectionStore.send({
    type: 'SELECT_OBSERVER',
    id: row.id
  })
  ElMessage.success(`Selected: ${row.name}`)
}
</script>

<style lang="scss" scoped>
.observer-page {
  max-width: 800px;
}
</style>
