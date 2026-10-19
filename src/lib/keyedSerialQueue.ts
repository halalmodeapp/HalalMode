/** Serializes read/modify/write operations without poisoning the queue on failure. */
export function createKeyedSerialQueue() {
  const tails = new Map<string, Promise<void>>();
  return function run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const result = (tails.get(key) ?? Promise.resolve()).then(work);
    const tail = result.then(() => undefined, () => undefined);
    tails.set(key, tail);
    void tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return result;
  };
}
