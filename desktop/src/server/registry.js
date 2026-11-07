/** Explicit allowlist of application operations registered by the existing services. */
export class OperationRegistry {
  constructor() {
    this.operations = new Map();
  }

  handle(name, handler) {
    if (this.operations.has(name)) throw new Error(`Duplicate operation: ${name}`);
    this.operations.set(name, handler);
  }

  on(name, handler) {
    this.handle(name, handler);
  }
}
