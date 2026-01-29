<template>
  <div class="announce-page">
    <div class="page-header">
      <h2>{{ t('menu.announce') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <span>发送聊天消息</span>
      </template>

      <el-form @submit.prevent="sendMessage">
        <el-form-item>
          <el-input
            v-model="message"
            placeholder="输入消息内容"
            @keyup.enter="sendMessage"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="sendMessage">
            {{ t('common.send') }}
          </el-button>
        </el-form-item>
      </el-form>
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

const message = ref('')

const sendMessage = () => {
  if (!message.value.trim()) {
    ElMessage.warning('Please enter a message')
    return
  }
  
  connectionStore.send({
    type: 'SEND_ANNOUNCE',
    message: message.value
  })
  
  ElMessage.success('Message sent')
  message.value = ''
}
</script>

<style lang="scss" scoped>
.announce-page {
  max-width: 600px;
}
</style>
