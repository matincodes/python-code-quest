import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (data: any) => void;

class SocketManager {
  private static instance: SocketManager;
  public socket: Socket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();

  private constructor() {
    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
    });

    // We catch all events and dispatch to our registered handlers
    this.socket.onAny((event, ...args) => {
      const callbacks = this.handlers.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => cb(args[0]));
      }
    });
  }

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  public off(event: string, handler: EventHandler) {
    const callbacks = this.handlers.get(event);
    if (callbacks) {
      callbacks.delete(handler);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }
}

export function getSocket() {
  return SocketManager.getInstance();
}

export function useSocket() {
  const manager = getSocket();
  const [connected, setConnected] = useState(manager.socket?.connected || false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    manager.socket?.on('connect', onConnect);
    manager.socket?.on('disconnect', onDisconnect);

    return () => {
      manager.socket?.off('connect', onConnect);
      manager.socket?.off('disconnect', onDisconnect);
    };
  }, [manager]);

  const on = (event: string, handler: EventHandler) => {
    useEffect(() => {
      manager.on(event, handler);
      return () => manager.off(event, handler);
    }, [event, handler]);
  };

  return {
    socket: manager.socket,
    connected,
    emit: manager.emit.bind(manager),
    on,
    isMock: false,
  };
}

