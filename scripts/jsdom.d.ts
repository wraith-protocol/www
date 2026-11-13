declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string; contentType?: string });
    readonly window: {
      readonly document: Document;
    };
  }
}
