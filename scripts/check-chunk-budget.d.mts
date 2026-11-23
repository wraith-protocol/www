export interface ChunkAllowlistEntry {
  maxKB: number;
  reason: string;
}

export interface TransferBudgetLimitsKB {
  jsKB?: number;
  cssKB?: number;
  dataKB?: number;
  fontKB?: number;
  preloadedFontKB?: number;
  imageKB?: number;
  totalKB?: number;
}

export interface RouteFamilyBudget {
  routeSpecific: TransferBudgetLimitsKB;
  total: TransferBudgetLimitsKB;
}

export interface RouteSpec {
  route: string;
  family: string;
  entryKey: string;
  htmlPath: string;
  allowedCollections: string[];
  allowedSdks: string[];
  usesEcosystemImages?: boolean;
  deferredComponentPrefix?: string;
  forbiddenDynamicSdks?: string[];
}

export interface ChunkAuditResult {
  key: string;
  file: string;
  label: string;
  bytes: number;
  kb: number;
  status: 'ok' | 'allow' | 'fail';
  allowlisted: boolean;
  limitKB: number;
  reason?: string;
}

export interface EntryClosureResult {
  entryKey: string;
  label: string;
  chunkCount: number;
  chunks: string[];
  bytes: number;
  kb: number;
  passed: boolean;
}

export interface SharedShellAudit {
  entryKey: string | null;
  jsBytes: number;
  cssBytes: number;
  dataBytes: number;
  bundledDataBytes: number;
  externalDataBytes: number;
  fontBytes: number;
  preloadedFontBytes: number;
  imageBytes: number;
  totalBytes: number;
  jsChunks: string[];
  cssSources: string[];
  dataSources: string[];
  fontSources: string[];
  preloadedFontSources: string[];
  imageSources: string[];
  collections: string[];
  sdks: string[];
  budgetsKB: TransferBudgetLimitsKB;
}

export interface RouteMetricBreakdown {
  jsBytes: number;
  cssBytes: number;
  dataBytes: number;
  fontBytes: number;
  imageBytes: number;
  totalBytes: number;
}

export interface RouteTransferAudit {
  route: string;
  family: string;
  entryKey: string;
  passed: boolean;
  sharedShell: RouteMetricBreakdown;
  routeSpecific: RouteMetricBreakdown & {
    bundledDataBytes: number;
    externalDataBytes: number;
    jsChunks: string[];
    cssSources: string[];
    dataSources: string[];
    fontSources: string[];
    imageSources: string[];
  };
  total: RouteMetricBreakdown & {
    bundledDataBytes: number;
    externalDataBytes: number;
  };
  deferred: {
    jsBytes: number;
    imageBytes: number;
    jsChunks: string[];
    sdks: string[];
    collections: string[];
  };
  sdks: string[];
  collections: string[];
  budgets: RouteFamilyBudget;
}

export interface BudgetViolation {
  scope: string;
  kind: string;
  metric?: string;
  actualKB?: number;
  limitKB?: number;
  sdk?: string;
  collection?: string;
  message: string;
}

export interface ChunkModuleMetadata {
  bytes: number;
  modules: Array<{ id: string; renderedLength: number; bytes?: number }>;
}

export interface AnalyzeDistOptions {
  chunkModules?: Record<string, ChunkModuleMetadata>;
  sharedShellBudgets?: TransferBudgetLimitsKB;
  routeFamilyBudgets?: Record<string, RouteFamilyBudget>;
}

export interface TransferBudgetReport {
  schemaVersion: number;
  passed: boolean;
  manifestMissing: boolean;
  manifestPath: string;
  legacy: {
    checkedChunks: number;
    chunks: ChunkAuditResult[];
    entryClosures: EntryClosureResult[];
  };
  sharedShell: SharedShellAudit | null;
  routes: RouteTransferAudit[];
  violations: BudgetViolation[];
}

export interface CliRunResult {
  exitCode: number;
  report: TransferBudgetReport;
  stdout: string;
  stderr: string;
}

export const CHUNK_BUDGET_KB: number;
export const ROUTE_TRANSITIVE_KB: number;
export const CHUNK_ALLOWLIST: Record<string, ChunkAllowlistEntry>;
export const SHARED_SHELL_BUDGET_KB: TransferBudgetLimitsKB;
export const ROUTE_FAMILY_BUDGETS: Record<string, RouteFamilyBudget>;
export const ALLOWED_SHELL_COLLECTIONS: string[];
export const ALLOWED_SHELL_SDKS: string[];
export const ROUTE_SPECS: RouteSpec[];
export const CHAIN_SDK_PATTERNS: Array<{ id: string; pattern: RegExp }>;

export function chunkPrefixName(relativeFile: string): string;
export function getAllowlistEntry(relativeFile: string): ChunkAllowlistEntry | null;
export function classifyCollection(rawModuleId: string): string | null;
export function classifyChainSdk(rawId: string): string | null;
export function analyzeDist(rootDir?: string, options?: AnalyzeDistOptions): TransferBudgetReport;
export function formatBudgetReport(report: TransferBudgetReport): {
  stdout: string;
  stderr: string;
};
export function runCli(argv?: string[], cwd?: string): CliRunResult;
