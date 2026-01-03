// WebSocket service for real-time updates
class WebSocketService {
  private socket: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  constructor(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url)

        this.socket.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          resolve()
        }

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.socket.onclose = () => {
          console.log('WebSocket disconnected')
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  subscribe(topic: string, callback: (data: any) => void) {
    if (!this.socket) return

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.topic === topic) {
          callback(message.data)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    })

    // Send subscription message
    this.send({
      type: 'subscribe',
      topic
    })
  }

  send(data: Record<string, any>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.connect(), this.reconnectDelay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}

export default WebSocketService
