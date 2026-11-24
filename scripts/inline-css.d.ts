export interface InlineCssOptions {
  readonly distDir?: string;
  readonly inlinePolicyPath?: string;
}

export interface InlineCssResult {
  readonly sourceAsset: string;
  readonly inlineStyleHashes: string[];
}

export function inlineCss(options?: InlineCssOptions): InlineCssResult;
