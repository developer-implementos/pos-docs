/**
 * Raised by an importer's read-only check when its published snapshot no longer matches the product
 * facts. It is the only outcome that means "import again"; any other error means the source, the
 * checkout or the snapshot is invalid, and nothing may be published from it.
 */
export class StaleSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StaleSnapshotError';
    this.code = 'STALE_SNAPSHOT';
  }
}

export function isStaleSnapshot(error) {
  return error instanceof StaleSnapshotError;
}
