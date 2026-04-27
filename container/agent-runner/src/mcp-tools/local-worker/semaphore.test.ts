import { describe, it, expect } from 'bun:test';

import { Semaphore } from './semaphore.js';

describe('Semaphore', () => {
  it('allows immediate acquire when under limit', async () => {
    const sem = new Semaphore(2);
    const release1 = await sem.acquire();
    const release2 = await sem.acquire();
    expect(typeof release1).toBe('function');
    expect(typeof release2).toBe('function');
    release1();
    release2();
  });

  it('blocks when at capacity (max_concurrent=1)', async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];

    const release1 = await sem.acquire();
    order.push(1);

    const p2 = sem.acquire().then((release) => {
      order.push(2);
      return release;
    });

    // p2 should be blocked — give it a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual([1]);

    release1();
    const release2 = await p2;
    expect(order).toEqual([1, 2]);
    release2();
  });

  it('allows two concurrent when max_concurrent=2', async () => {
    const sem = new Semaphore(2);
    const order: number[] = [];

    const release1 = await sem.acquire();
    order.push(1);

    const release2 = await sem.acquire();
    order.push(2);

    // Both acquired without blocking
    expect(order).toEqual([1, 2]);

    // Third should block
    const p3 = sem.acquire().then((release) => {
      order.push(3);
      return release;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual([1, 2]);

    release1();
    const release3 = await p3;
    expect(order).toEqual([1, 2, 3]);
    release2();
    release3();
  });

  it('processes queued requests in FIFO order', async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];

    const release1 = await sem.acquire();

    const p2 = sem.acquire().then((release) => {
      order.push(2);
      return release;
    });
    const p3 = sem.acquire().then((release) => {
      order.push(3);
      return release;
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual([]);

    release1();
    const release2 = await p2;
    expect(order).toEqual([2]);

    release2();
    const release3 = await p3;
    expect(order).toEqual([2, 3]);
    release3();
  });
});
