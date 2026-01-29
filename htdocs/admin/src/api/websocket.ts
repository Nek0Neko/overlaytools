/**
 * WebSocket API Client
 * 复用原有 apex-webapi.js 的通信协议逻辑
 */

export class WebAPIClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number = 3000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect: boolean = true

  // Callbacks
  public onOpen: (() => void) | null = null
  public onClose: (() => void) | null = null
  public onMessage: ((data: any) => void) | null = null
  public onError: ((error: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[WebAPI] Connected to', this.url)
        this.onOpen?.()
      }

      this.ws.onclose = () => {
        console.log('[WebAPI] Disconnected')
        this.onClose?.()
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.warn('[WebAPI] Error:', error)
        this.onError?.(error)
      }

      this.ws.onmessage = (event) => {
        try {
          const data = this.parseMessage(event.data)
          if (data) {
            this.onMessage?.(data)
          }
        } catch (e) {
          console.warn('[WebAPI] Failed to parse message:', e)
        }
      }
    } catch (e) {
      console.warn('[WebAPI] Failed to connect:', e)
      this.scheduleReconnect()
    }
  }

  /**
   * Parse incoming WebSocket message
   * 保持与原有协议兼容
   */
  private parseMessage(data: string | ArrayBuffer): any {
    if (typeof data === 'string') {
      return JSON.parse(data)
    }

    // Binary message handling (compatible with original protocol)
    if (data instanceof ArrayBuffer) {
      const view = new DataView(data)
      const result: any = {}

      let offset = 0
      const count = view.getUint8(offset)
      offset++

      for (let i = 0; i < count; i++) {
        const type = view.getUint8(offset)
        offset++

        switch (type) {
          case 0x01: // uint8
            result[this.readString(view, offset)] = view.getUint8(offset + this.getStringLength(view, offset) + 1)
            offset += this.getStringLength(view, offset) + 2
            break
          case 0x02: // uint16
            result[this.readString(view, offset)] = view.getUint16(offset + this.getStringLength(view, offset) + 1, true)
            offset += this.getStringLength(view, offset) + 3
            break
          case 0x03: // uint32
            result[this.readString(view, offset)] = view.getUint32(offset + this.getStringLength(view, offset) + 1, true)
            offset += this.getStringLength(view, offset) + 5
            break
          case 0x10: // string
            const keyLen = this.getStringLength(view, offset)
            const key = this.readString(view, offset)
            offset += keyLen + 1
            const valLen = view.getUint8(offset)
            offset++
            result[key] = this.readStringN(view, offset, valLen)
            offset += valLen
            break
          case 0x20: // JSON
            const jsonKeyLen = this.getStringLength(view, offset)
            const jsonKey = this.readString(view, offset)
            offset += jsonKeyLen + 1
            const jsonLen = view.getUint32(offset, true)
            offset += 4
            const jsonStr = this.readStringN(view, offset, jsonLen)
            offset += jsonLen
            try {
              result[jsonKey] = JSON.parse(jsonStr)
            } catch {
              result[jsonKey] = jsonStr
            }
            break
        }
      }

      return result
    }

    return null
  }

  private getStringLength(view: DataView, offset: number): number {
    let len = 0
    while (view.getUint8(offset + len) !== 0) {
      len++
    }
    return len
  }

  private readString(view: DataView, offset: number): string {
    const decoder = new TextDecoder()
    const len = this.getStringLength(view, offset)
    const bytes = new Uint8Array(view.buffer, offset, len)
    return decoder.decode(bytes)
  }

  private readStringN(view: DataView, offset: number, length: number): string {
    const decoder = new TextDecoder()
    const bytes = new Uint8Array(view.buffer, offset, length)
    return decoder.decode(bytes)
  }

  /**
   * Send message to WebSocket server
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (typeof data === 'object') {
        this.ws.send(JSON.stringify(data))
      } else {
        this.ws.send(data)
      }
    } else {
      console.warn('[WebAPI] Cannot send: WebSocket not connected')
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect() {
    if (!this.shouldReconnect) return

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('[WebAPI] Attempting to reconnect...')
      this.connect()
    }, this.reconnectInterval)
  }

  /**
   * Force reconnect
   */
  reconnect() {
    this.close()
    this.shouldReconnect = true
    this.connect()
  }

  /**
   * Close connection
   */
  close() {
    this.shouldReconnect = false

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
