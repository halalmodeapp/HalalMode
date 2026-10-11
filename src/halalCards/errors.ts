/** Another phone moved the session on first. Refetch and look again. */
export class StaleSessionError extends Error {
  constructor() {
    super('This session has moved on.');
    this.name = 'StaleSessionError';
  }
}
