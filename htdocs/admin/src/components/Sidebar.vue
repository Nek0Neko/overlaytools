<template>
  <aside class="sidebar">
    <!-- Logo / Title -->
    <div class="sidebar-header">
      <h1>Apex LiveAPI</h1>
    </div>

    <!-- Navigation Menu -->
    <el-menu
      :default-active="currentRoute"
      :router="true"
      class="sidebar-menu"
    >
      <el-menu-item index="/liveapi">
        <el-icon><Setting /></el-icon>
        <span>{{ t('menu.liveapi') }}</span>
      </el-menu-item>

      <el-sub-menu index="tournament">
        <template #title>
          <el-icon><Trophy /></el-icon>
          <span>{{ t('menu.tournament') }}</span>
        </template>
        <el-menu-item index="/tournament?tab=create">
          {{ t('menu.tournamentCreate') }}
        </el-menu-item>
        <el-menu-item index="/tournament?tab=rename">
          {{ t('menu.tournamentRename') }}
        </el-menu-item>
        <el-menu-item index="/tournament?tab=calc">
          {{ t('menu.tournamentCalc') }}
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/observer">
        <el-icon><View /></el-icon>
        <span>{{ t('menu.observer') }}</span>
      </el-menu-item>

      <el-sub-menu index="players">
        <template #title>
          <el-icon><User /></el-icon>
          <span>{{ t('menu.players') }}</span>
        </template>
        <el-menu-item index="/players?tab=name">
          {{ t('menu.playerName') }}
        </el-menu-item>
        <el-menu-item index="/players?tab=lobby">
          {{ t('menu.playerLobby') }}
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/teams">
        <el-icon><UserFilled /></el-icon>
        <span>{{ t('menu.teams') }}</span>
      </el-menu-item>

      <el-menu-item index="/ingame">
        <el-icon><Operation /></el-icon>
        <span>{{ t('menu.ingame') }}</span>
      </el-menu-item>

      <el-menu-item index="/overlay">
        <el-icon><Monitor /></el-icon>
        <span>{{ t('menu.overlay') }}</span>
      </el-menu-item>

      <el-menu-item index="/announce">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ t('menu.announce') }}</span>
      </el-menu-item>

      <el-menu-item index="/results">
        <el-icon><DataAnalysis /></el-icon>
        <span>{{ t('menu.results') }}</span>
      </el-menu-item>

      <el-menu-item index="/test">
        <el-icon><Cpu /></el-icon>
        <span>{{ t('menu.test') }}</span>
      </el-menu-item>
    </el-menu>

    <!-- Status Panel -->
    <div class="sidebar-status">
      <!-- Current Tournament -->
      <div class="status-section">
        <h4>{{ t('sidebar.currentTournament') }}</h4>
        <div class="status-item">
          <span class="label">{{ t('common.name') }}:</span>
          <span class="value">{{ connectionStore.tournamentName || 'N/A' }}</span>
        </div>
        <div class="status-item">
          <span class="label">{{ t('common.id') }}:</span>
          <span class="value">{{ connectionStore.tournamentId || 'N/A' }}</span>
        </div>
      </div>

      <!-- Current Observer -->
      <div class="status-section">
        <h4>{{ t('sidebar.currentObserver') }}</h4>
        <div class="status-item">
          <span class="label">{{ t('common.id') }}:</span>
          <span class="value">{{ connectionStore.observerId || 'N/A' }}</span>
        </div>
      </div>

      <!-- WebAPI Connection -->
      <div class="status-section">
        <h4>{{ t('sidebar.webapiConnection') }}</h4>
        <div class="status-item">
          <el-tag 
            :type="connectionStore.webapiConnected ? 'success' : 'danger'" 
            size="small"
          >
            {{ connectionStore.webapiConnected ? t('common.connected') : t('common.disconnected') }}
          </el-tag>
          <el-button size="small" @click="reconnect">
            {{ t('sidebar.forceReconnect') }}
          </el-button>
        </div>
      </div>

      <!-- LiveAPI Connection -->
      <div class="status-section">
        <h4>{{ t('sidebar.liveapiConnection') }}</h4>
        <div class="status-item">
          <span class="label">{{ t('sidebar.connectionCount') }}:</span>
          <span class="value">{{ connectionStore.liveapiConnections }}</span>
        </div>
        <div class="status-item">
          <span class="label">{{ t('sidebar.recvPackets') }}:</span>
          <span class="value">{{ connectionStore.liveapiRecv }}</span>
        </div>
        <div class="status-item">
          <span class="label">{{ t('sidebar.sendPackets') }}:</span>
          <span class="value">{{ connectionStore.liveapiSend }}</span>
        </div>
      </div>

      <!-- Language Switcher -->
      <div class="language-switcher">
        <el-button-group>
          <el-button 
            :type="locale === 'en' ? 'primary' : 'default'" 
            size="small"
            @click="locale = 'en'"
          >
            EN
          </el-button>
          <el-button 
            :type="locale === 'zh' ? 'primary' : 'default'" 
            size="small"
            @click="locale = 'zh'"
          >
            中文
          </el-button>
        </el-button-group>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores/connection'
import {
  Setting,
  Trophy,
  View,
  User,
  UserFilled,
  Operation,
  Monitor,
  ChatDotRound,
  DataAnalysis,
  Cpu
} from '@element-plus/icons-vue'

const route = useRoute()
const { t, locale } = useI18n()
const connectionStore = useConnectionStore()

const currentRoute = computed(() => route.path)

const reconnect = () => {
  connectionStore.reconnect()
}
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  height: 100vh;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  
  h1 {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0;
  }
}

.sidebar-menu {
  flex: 1;
  border: none;
}

.sidebar-status {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-light);
  font-size: 12px;
}

.status-section {
  margin-bottom: 16px;
  
  h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
  }
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  
  .label {
    color: var(--el-text-color-secondary);
  }
  
  .value {
    color: var(--el-text-color-primary);
    font-family: monospace;
  }
}

.language-switcher {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
