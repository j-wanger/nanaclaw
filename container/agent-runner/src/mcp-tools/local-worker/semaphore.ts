export class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.available = maxConcurrent;
  }

  acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve(() => this.release());
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.available--;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.available++;
    const next = this.queue.shift();
    if (next) next();
  }
}
