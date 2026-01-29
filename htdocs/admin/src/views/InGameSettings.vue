<template>
  <div class="ingame-page">
    <div class="page-header">
      <h2>{{ t('menu.ingame') }}</h2>
    </div>

    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>游戏内设置</span>
          <el-button @click="getLobbyInfo">获取大厅信息</el-button>
        </div>
      </template>

      <el-form label-width="180px">
        <el-form-item label="Token">
          <el-input v-model="settings.token" readonly style="max-width: 400px" />
        </el-form-item>

        <el-divider />

        <el-form-item label="播放列表名称">
          <el-input v-model="settings.playlistName" style="max-width: 300px" />
        </el-form-item>

        <el-form-item label="管理员聊天">
          <el-radio-group v-model="settings.adminChat">
            <el-radio :value="false">允许全部</el-radio>
            <el-radio :value="true">仅管理员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="队伍名称修改">
          <el-radio-group v-model="settings.teamRename">
            <el-radio :value="false">拒绝</el-radio>
            <el-radio :value="true">允许</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="玩家队伍转移">
          <el-radio-group v-model="settings.selfAssign">
            <el-radio :value="false">拒绝</el-radio>
            <el-radio :value="true">允许</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="瞄准辅助">
          <el-radio-group v-model="settings.aimAssist">
            <el-radio :value="false">PC/主机有差异</el-radio>
            <el-radio :value="true">PC/主机相同</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="匿名模式">
          <el-radio-group v-model="settings.anonMode">
            <el-radio :value="false">禁用</el-radio>
            <el-radio :value="true">启用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="applySettings">
            应用设置
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

const settings = ref({
  token: '',
  playlistName: '',
  adminChat: false,
  teamRename: true,
  selfAssign: true,
  aimAssist: true,
  anonMode: false
})

const getLobbyInfo = () => {
  connectionStore.send({ type: 'GET_LOBBY_INFO' })
}

const applySettings = () => {
  connectionStore.send({
    type: 'SET_CUSTOM_SETTINGS',
    ...settings.value
  })
  ElMessage.success('Settings applied')
}

connectionStore.subscribe('LOBBY_INFO', (data) => {
  if (data.token) settings.value.token = data.token
  if (data.settings) {
    Object.assign(settings.value, data.settings)
  }
})
</script>

<style lang="scss" scoped>
.ingame-page {
  max-width: 700px;
}
</style>
