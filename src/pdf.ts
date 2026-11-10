import { resolveTocAndSettings } from "./html";
import {
  getHtmlToImageModule,
  getMarkdownModule,
} from "./libs/wasmHtmlToImage";
import { ConvertPdfOptions } from "./types";
import type { HtmlToImageOptions } from "wasm-html-to-image";

/**
 * Converts Markdown string into vector PDF bytes using wasm-html-to-image.
 *
 * @param markdown Markdown string
 * @param options PDF conversion options
 * @param defaultTitle Optional default document title
 */
export const renderPdf = async (
  markdown: string,
  options?: ConvertPdfOptions,
  defaultTitle?: string,
): Promise<Uint8Array> => {
  const { markdownToDocument } = await getMarkdownModule();
  const { render } = await getHtmlToImageModule();

  const title = options?.title ?? defaultTitle ?? "API Documentation";
  const { toc, settings } = resolveTocAndSettings(options, true);

  const doc = markdownToDocument(markdown, {
    ...options,
    title,
    paged: options?.paged ?? true,
    toc,
    settings,
  });

  const { width } = options ?? {};
  const restOptions = { ...options };
  delete restOptions.sort;
  delete restOptions.title;
  delete restOptions.cover;
  delete restOptions.pageSize;
  delete restOptions.tocTitle;
  delete restOptions.tocDepth;
  delete restOptions.settings;

  const renderOptions: HtmlToImageOptions = {
    ...(restOptions as Record<string, unknown>),
    ...doc.renderOptions,
    value: doc.html,
    format: "pdf",
    width: typeof width === "number" ? width : 800,
  };

  const renderResult = await render(renderOptions);

  return typeof renderResult.data === "string"
    ? Buffer.from(renderResult.data, "utf-8")
    : renderResult.data;
};
