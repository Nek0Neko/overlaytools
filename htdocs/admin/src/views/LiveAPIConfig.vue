<template>
  <div class="liveapi-config">
    <div class="page-header">
      <h2>{{ t('liveapi.title') }}</h2>
    </div>

    <!-- Current Connections -->
    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('liveapi.currentConnections') }}</span>
        </div>
      </template>
      
      <div class="connections-list">
        <el-empty v-if="connections.length === 0" description="No connections" />
        <el-table v-else :data="connections" stripe>
          <el-table-column prop="address" label="Address" />
          <el-table-column prop="port" label="Port" width="100" />
          <el-table-column prop="status" label="Status" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 'connected' ? 'success' : 'info'" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="connection-form">
        <el-form :inline="true">
          <el-form-item label="Address">
            <el-input v-model="newConnection.address" placeholder="127.0.0.1" />
          </el-form-item>
          <el-form-item label="Port">
            <el-input-number v-model="newConnection.port" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addConnection">Add</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-button type="primary" @click="writeConfig">
        {{ t('liveapi.writeConfig') }}
      </el-button>
    </el-card>

    <!-- Current Config -->
    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('liveapi.currentConfig') }}</span>
          <el-button size="small" @click="refreshConfig">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>
      
      <el-input
        v-model="configContent"
        type="textarea"
        :rows="10"
        readonly
        class="config-display"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const { t } = useI18n()
const connectionStore = useConnectionStore()

interface Connection {
  address: string
  port: number
  status: string
}

const connections = ref<Connection[]>([])
const newConnection = ref({
  address: '127.0.0.1',
  port: 7777
})
const configContent = ref('')

const addConnection = () => {
  connections.value.push({
    ...newConnection.value,
    status: 'pending'
  })
}

const writeConfig = () => {
  connectionStore.send({
    type: 'WRITE_CONFIG',
    connections: connections.value.map(c => ({
      address: c.address,
      port: c.port
    }))
  })
  ElMessage.success('Config written')
}

const refreshConfig = () => {
  connectionStore.send({ type: 'GET_CONFIG' })
}

onMounted(() => {
  // Subscribe to config updates
  connectionStore.subscribe('CONFIG', (data) => {
    configContent.value = JSON.stringify(data.config, null, 2)
    if (data.connections) {
      connections.value = data.connections
    }
  })

  // Request initial config
  refreshConfig()
})
</script>

<style lang="scss" scoped>
.liveapi-config {
  max-width: 800px;
}

.connection-form {
  margin: 20px 0;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.config-display {
  font-family: monospace;
  
  :deep(.el-textarea__inner) {
    font-family: monospace;
    background-color: var(--el-fill-color-darker);
  }
}
</style>
