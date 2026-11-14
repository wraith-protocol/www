declare module '../../scripts/lint-i18n.mjs' {
  export interface AllowlistEntry {
    readonly term: string;
    readonly category: 'brand' | 'protocol' | 'product' | 'technical' | 'schema' | 'cognate';
    readonly locales?: readonly string[];
    readonly reason: string;
  }

  export interface I18nViolation {
    type: string;
    locale: string;
    key: string;
    message: string;
  }

  export interface RouteInventory {
    localizedBasePaths: string[];
    seoPagePaths: Record<string, string>;
    staticOgRoutes: string[];
    dynamicOgRoutes: string[];
  }

  export interface HardcodedFinding {
    file: string;
    line: number;
    text: string;
  }

  export interface I18nValidationResult {
    locales: string[];
    inventory: RouteInventory;
    structureViolations: I18nViolation[];
    routeViolations: I18nViolation[];
    hardcodedFindings: HardcodedFinding[];
    totalViolations: number;
  }

  export const UNTRANSLATED_TERM_ALLOWLIST: readonly AllowlistEntry[];
  export const CLDR_PLURAL_CATEGORIES: readonly string[];
  export const ALLOWED_PLURAL_CATEGORIES_BY_LOCALE: Readonly<Record<string, readonly string[]>>;
  export const REQUIRED_PLURAL_CATEGORIES: readonly string[];

  export function getNodeType(
    value: unknown,
  ): 'null' | 'array' | 'object' | 'string' | 'number' | 'boolean' | 'undefined';

  export function extractPlaceholders(text: string): {
    placeholders: string[];
    malformed: boolean;
  };

  export function isAllowlistedUntranslatedTerm(
    value: string,
    locale: string,
    allowlist?: readonly { term: string; locales?: readonly string[] }[],
  ): boolean;

  export function parsePluralKey(keyPath: string): {
    isPluralCandidate: boolean;
    baseKey: string;
    suffix: string | null;
  };

  export function validatePluralForms(
    locale: string,
    data: Record<string, unknown>,
  ): I18nViolation[];

  export function validateLocaleStructureAndParity(
    referenceLocale: string,
    localesMap: Record<string, Record<string, unknown>>,
    options?: { allowlist?: readonly { term: string; locales?: readonly string[] }[] },
  ): I18nViolation[];

  export function loadProjectRouteInventory(projectRoot?: string): RouteInventory;

  export function validateRouteCoverage(
    referenceLocale: string,
    localesMap: Record<string, Record<string, unknown>>,
    inventory: RouteInventory,
    options?: { allowlist?: readonly { term: string; locales?: readonly string[] }[] },
  ): I18nViolation[];

  export function scanHardcodedComponentStrings(componentsDir?: string): HardcodedFinding[];

  export function runI18nValidation(options?: {
    i18nDir?: string;
    componentsDir?: string;
    projectRoot?: string;
  }): I18nValidationResult;
}
