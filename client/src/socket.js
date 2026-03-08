import { io } from 'socket.io-client'
const socket = io(window.location.origin, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
})
export default socket
