import { useState, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type, duration }])

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const notify = {
    success: (message, duration) => addNotification(message, 'success', duration),
    error: (message, duration) => addNotification(message, 'error', duration),
    warning: (message, duration) => addNotification(message, 'warning', duration),
    info: (message, duration) => addNotification(message, 'info', duration),
  }

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

function Notification({ message, type, onClose }) {
  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
      icon: CheckCircle2,
      iconColor: 'text-white'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-rose-500',
      icon: XCircle,
      iconColor: 'text-white'
    },
    warning: {
      bg: 'bg-gradient-to-r from-orange-500 to-amber-500',
      icon: AlertCircle,
      iconColor: 'text-white'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      icon: Info,
      iconColor: 'text-white'
    }
  }

  const style = styles[type] || styles.info
  const Icon = style.icon

  return (
    <div
      className={`${style.bg} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[320px] max-w-[500px] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300`}
    >
      <Icon className={`w-6 h-6 ${style.iconColor} flex-shrink-0`} />
      <span className="flex-1 font-medium text-base">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
