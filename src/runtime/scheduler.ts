export class RenderScheduler {
  #handle: number | ReturnType<typeof setTimeout> | null = null;

  schedule(task: () => void): void {
    this.cancel();
    if (typeof requestAnimationFrame === 'function') {
      this.#handle = requestAnimationFrame(() => {
        this.#handle = null;
        task();
      });
    } else {
      this.#handle = setTimeout(() => {
        this.#handle = null;
        task();
      }, 0);
    }
  }

  cancel(): void {
    if (this.#handle === null) return;
    if (typeof this.#handle === 'number' && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.#handle);
    } else {
      clearTimeout(this.#handle as ReturnType<typeof setTimeout>);
    }
    this.#handle = null;
  }
}
