import type {Buffer} from 'node:buffer';

export interface ArtifactDescriptor { file: string; sha256: string }
export interface ProductManifest {
  schemaVersion: 1;
  source: {repository: string; commit: string};
  apis: Array<ArtifactDescriptor & {id: 'branch-api' | 'country-api'}>;
  database: ArtifactDescriptor;
}
export interface ApiDocument {
  openapi: string;
  info: {title: string; description?: string; version?: string};
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
}
export interface ApiOperation {
  method: string; route: string; operationId: string;
  summary?: string; description?: string;
  parameters: unknown[]; requestBody?: unknown;
  responses: Record<string, unknown>;
  security: Array<Record<string, string[]>>;
}
export type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};
export interface DocumentationSource {path: string; symbol?: string}
export interface TableDocumentation {description: string; usage: string; sources: DocumentationSource[]}
export type ColumnDocumentation = {description: string; usage: string} & ({example: JsonValue; exampleOmittedReason?: never} | {example?: never; exampleOmittedReason: string});
export interface DatabaseColumn {name: string; type: string; nullable: boolean; default: string | null; comment: string | null; documentation: ColumnDocumentation}
export interface DatabaseConstraint {name: string; type: string; definition: string; columns: string[]; references?: {schema: string; table: string; columns: string[]}}
export interface DatabaseTable {schema: string; name: string; context: string; documentation: TableDocumentation; columns: DatabaseColumn[]; constraints: DatabaseConstraint[]; indexes: Array<{name: string; definition: string}>}
export interface DatabaseReference {id: string; app: string; migrations: Array<{id: string; checksum: string}>; schemas: string[]; tables: DatabaseTable[]}
export interface ProductBundle {
  manifest: ProductManifest;
  apis: Array<{id: 'branch-api' | 'country-api'; document: ApiDocument}>;
  database: {schemaVersion: 1; databases: DatabaseReference[]};
  files: Map<string, Buffer>;
}
export const productRepository: string;
export const snapshotRoot: URL;
export function digest(bytes: string | Buffer): string;
export function validateOpenApi(document: unknown): ApiDocument;
export function loadBundle(directory?: string | URL): ProductBundle;
export function operations(document: ApiDocument): ApiOperation[];
