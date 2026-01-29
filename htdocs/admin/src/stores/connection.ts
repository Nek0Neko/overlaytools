import { defineStore } from 'pinia'
import { ref } from 'vue'
import { WebAPIClient } from '@/api/websocket'

export const useConnectionStore = defineStore('connection', () => {
  // WebSocket client instance
  let wsClient: WebAPIClient | null = null

  // Connection state
  const webapiConnected = ref(false)
  const liveapiConnections = ref(0)
  const liveapiRecv = ref(0)
  const liveapiSend = ref(0)

  // Tournament state
  const tournamentName = ref('')
  const tournamentId = ref('')
  const tournaments = ref<Array<{ id: string; name: string }>>([])

  // Observer state
  const observerId = ref('')
  const observers = ref<Array<{ id: string; name: string }>>([])

  // Game state
  const gameState = ref('Lobby')
  const gameCount = ref(0)

  // Message handlers
  const messageHandlers = new Map<string, Set<(data: any) => void>>()

  // Initialize WebSocket connection
  function init(wsUrl: string = 'ws://127.0.0.1:20081') {
    if (wsClient) {
      wsClient.close()
    }

    wsClient = new WebAPIClient(wsUrl)

    wsClient.onOpen = () => {
      webapiConnected.value = true
      // Request initial data
      wsClient?.send({ type: 'GET_STATUS' })
      wsClient?.send({ type: 'GET_TOURNAMENTS' })
    }

    wsClient.onClose = () => {
      webapiConnected.value = false
    }

    wsClient.onMessage = (data: any) => {
      handleMessage(data)
    }

    wsClient.connect()
  }

  // Handle incoming WebSocket messages
  function handleMessage(data: any) {
    // Update connection status
    if (data.liveapi_connection !== undefined) {
      liveapiConnections.value = data.liveapi_connection
    }
    if (data.liveapi_recv !== undefined) {
      liveapiRecv.value = data.liveapi_recv
    }
    if (data.liveapi_send !== undefined) {
      liveapiSend.value = data.liveapi_send
    }

    // Update tournament info
    if (data.tournament_name !== undefined) {
      tournamentName.value = data.tournament_name
    }
    if (data.tournament_id !== undefined) {
      tournamentId.value = data.tournament_id
    }
    if (data.tournaments !== undefined) {
      tournaments.value = data.tournaments
    }

    // Update observer info
    if (data.observer_id !== undefined) {
      observerId.value = data.observer_id
    }
    if (data.observers !== undefined) {
      observers.value = data.observers
    }

    // Update game state
    if (data.gamestate !== undefined) {
      gameState.value = data.gamestate
    }
    if (data.gamecount !== undefined) {
      gameCount.value = data.gamecount
    }

    // Notify subscribers
    const handlers = messageHandlers.get(data.type)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }

    // Notify all subscribers
    const allHandlers = messageHandlers.get('*')
    if (allHandlers) {
      allHandlers.forEach(handler => handler(data))
    }
  }

  // Send message to WebSocket
  function send(data: any) {
    wsClient?.send(data)
  }

  // Reconnect WebSocket
  function reconnect() {
    wsClient?.reconnect()
  }

  // Subscribe to message type
  function subscribe(type: string, handler: (data: any) => void) {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, new Set())
    }
    messageHandlers.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      messageHandlers.get(type)?.delete(handler)
    }
  }

  // Close connection
  function close() {
    wsClient?.close()
    wsClient = null
  }

  return {
    // State
    webapiConnected,
    liveapiConnections,
    liveapiRecv,
    liveapiSend,
    tournamentName,
    tournamentId,
    tournaments,
    observerId,
    observers,
    gameState,
    gameCount,

    // Actions
    init,
    send,
    reconnect,
    subscribe,
    close
  }
})
