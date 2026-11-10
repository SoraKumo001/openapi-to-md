import type { HtmlToImageOptions, RenderResult } from "wasm-html-to-image";
import type {
  MarkdownDocument,
  MarkdownOptions,
} from "wasm-html-to-image/dist/markdown";

const dynamicImport = async <T>(specifier: string): Promise<T> => {
  try {
    const importFn = new Function("m", "return import(m)") as (
      m: string,
    ) => Promise<T>;
    return await importFn(specifier);
  } catch {
    // Fallback for test runner environments with custom VM contexts (e.g. Vitest)
    return (await import(
      /* @vite-ignore */
      specifier
    )) as T;
  }
};

export interface WasmMarkdownModule {
  markdownToDocument: (
    markdown: string,
    options?: MarkdownOptions,
  ) => MarkdownDocument;
  markdownToHtml: (markdown: string, options?: MarkdownOptions) => string;
}

export interface WasmHtmlToImageModule {
  render: (
    options: HtmlToImageOptions,
  ) => Promise<RenderResult<Uint8Array | string>>;
}

let cachedMarkdownModule: WasmMarkdownModule | null = null;
export const getMarkdownModule = async (): Promise<WasmMarkdownModule> => {
  if (!cachedMarkdownModule) {
    cachedMarkdownModule = await dynamicImport<WasmMarkdownModule>(
      "wasm-html-to-image/markdown",
    );
  }
  return cachedMarkdownModule;
};

let cachedHtmlToImageModule: WasmHtmlToImageModule | null = null;
export const getHtmlToImageModule =
  async (): Promise<WasmHtmlToImageModule> => {
    if (!cachedHtmlToImageModule) {
      cachedHtmlToImageModule =
        await dynamicImport<WasmHtmlToImageModule>("wasm-html-to-image");
    }
    return cachedHtmlToImageModule;
  };
