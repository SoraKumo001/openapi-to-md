import { getMarkdownModule } from "./libs/wasmHtmlToImage";
import { ConvertHtmlOptions, ConvertPdfOptions, TocOptions } from "./types";

export const DEFAULT_CSS = `
:root {
  --color-canvas-default: #ffffff;
  --color-canvas-subtle: #f6f8fa;
  --color-border-default: #d0d7de;
  --color-border-muted: #d8dee4;
  --color-fg-default: #1f2328;
  --color-fg-muted: #656d76;
  --color-accent-fg: #0969da;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-canvas-default: #0d1117;
    --color-canvas-subtle: #161b22;
    --color-border-default: #30363d;
    --color-border-muted: #21262d;
    --color-fg-default: #e6edf3;
    --color-fg-muted: #848d97;
    --color-accent-fg: #2f81f7;
  }
}
body {
  margin: 0;
  padding: 0;
  background-color: var(--color-canvas-default);
  color: var(--color-fg-default);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
`.trim();

export interface TocAndSettingsResult {
  toc: boolean | TocOptions | undefined;
  settings: Record<string, unknown> | undefined;
}

export const resolveTocAndSettings = (
  options: (ConvertHtmlOptions | ConvertPdfOptions) | undefined,
  isPdf: boolean,
): TocAndSettingsResult => {
  const settings: Record<string, unknown> = {
    ...options?.settings,
    ...(options?.cover !== undefined ? { cover: options.cover } : {}),
    ...(options?.pageSize !== undefined ? { page_size: options.pageSize } : {}),
    ...(options?.tocTitle !== undefined ? { toc_title: options.tocTitle } : {}),
    ...(options?.tocDepth !== undefined ? { toc_depth: options.tocDepth } : {}),
  };

  let toc: boolean | TocOptions | undefined;
  if (options?.toc === false) {
    toc = false;
  } else if (typeof options?.toc === "object") {
    toc = {
      ...(options.tocTitle !== undefined ? { title: options.tocTitle } : {}),
      ...(options.tocDepth !== undefined ? { depth: options.tocDepth } : {}),
      ...options.toc,
    };
  } else if (
    options?.toc === true ||
    options?.tocTitle !== undefined ||
    options?.tocDepth !== undefined
  ) {
    toc = {
      ...(options?.tocTitle !== undefined ? { title: options.tocTitle } : {}),
      ...(options?.tocDepth !== undefined ? { depth: options.tocDepth } : {}),
    };
  } else {
    toc = isPdf ? undefined : false;
  }

  return {
    toc,
    settings: Object.keys(settings).length ? settings : undefined,
  };
};

/**
 * Converts Markdown string into HTML using wasm-html-to-image/markdown's markdownToHtml.
 *
 * @param markdown Markdown string
 * @param options HTML conversion options
 * @param defaultTitle Optional default document title
 */
export const renderHtml = async (
  markdown: string,
  options?: ConvertHtmlOptions,
  defaultTitle?: string,
): Promise<string> => {
  const { markdownToHtml } = await getMarkdownModule();
  const { toc, settings } = resolveTocAndSettings(options, false);

  const opts = {
    ...options,
    title: options?.title ?? defaultTitle ?? "API Documentation",
    toc,
    settings,
  };
  const html = markdownToHtml(markdown, opts);

  if (options?.standalone === false) {
    const match = /<article class="markdown-body">([\s\S]*?)<\/article>/.exec(
      html,
    );
    const inner = match ? match[1] : html;
    return `<div class="markdown-body">${inner}</div>`;
  }

  return html;
};
