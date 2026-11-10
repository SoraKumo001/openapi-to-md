import { OpenAPIV3 } from "openapi-types";
import type { HtmlToImageOptions } from "wasm-html-to-image";
import type { MarkdownOptions, TocOptions } from "wasm-html-to-image/dist/markdown";

export type { TocOptions };

export type References = { [key: string]: unknown };

export interface PathMethod {
  path: string;
  method: string;
  operation: OpenAPIV3.OperationObject;
}

export interface ApiDocument {
  document: OpenAPIV3.Document;
  pathMethods: PathMethod[];
  references: References;
}

export interface ConvertHtmlOptions extends MarkdownOptions {
  sort?: boolean;
  standalone?: boolean;
  cover?: boolean;
  pageSize?: string;
  tocTitle?: string;
  tocDepth?: number;
}

export interface ConvertPdfOptions
  extends MarkdownOptions,
    Omit<HtmlToImageOptions, "value" | "format" | "css" | "mermaid"> {
  sort?: boolean;
  cover?: boolean;
  pageSize?: string;
  tocTitle?: string;
  tocDepth?: number;
}
