export type Listener<T> = (event: T) => void;

export class EventEmitter<EventMap extends object> {
  readonly #listeners = new Map<keyof EventMap, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): () => void {
    let listeners = this.#listeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.#listeners.set(type, listeners);
    }
    listeners.add(listener as Listener<unknown>);
    return () => this.off(type, listener);
  }

  off<K extends keyof EventMap>(type: K, listener: Listener<EventMap[K]>): void {
    const listeners = this.#listeners.get(type);
    listeners?.delete(listener as Listener<unknown>);
    if (listeners?.size === 0) this.#listeners.delete(type);
  }

  emit<K extends keyof EventMap>(type: K, event: EventMap[K]): void {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
