<template>
  <el-config-provider :locale="locale">
    <div class="app-container">
      <Sidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import Sidebar from './components/Sidebar.vue'

const { locale: i18nLocale } = useI18n()

const locale = computed(() => {
  return i18nLocale.value === 'zh' ? zhCn : en
})
</script>

<style lang="scss">
.app-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
  background-color: var(--el-bg-color);
}

.main-content {
  padding: 20px;
  overflow-y: auto;
}
</style>
