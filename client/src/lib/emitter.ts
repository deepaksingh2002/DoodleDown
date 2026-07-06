type Listener<T> = (payload: T) => void;

/**
 * Minimal typed pub/sub. The GameEngine exposes on/off/emit with exactly
 * this shape so that swapping it for a real `socket.io-client` instance
 * later is a one-file change (see src/lib/socket.ts).
 */
export class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, cb: Listener<Events[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event]!.add(cb);
    return () => this.off(event, cb);
  }

  off<K extends keyof Events>(event: K, cb: Listener<Events[K]>): void {
    this.listeners[event]?.delete(cb);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }
}
