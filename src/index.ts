import { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import converter from "swagger2openapi";
import { createApiDocument } from "./converter";
import { renderHtml, DEFAULT_CSS } from "./html";
import { renderPdf } from "./pdf";
import {
  outputPathDetail,
  outputPathTable,
  outputReferences,
  outputReferenceTable,
} from "./renderer";
import { ApiDocument, ConvertHtmlOptions, ConvertPdfOptions } from "./types";
import { readDocument } from "./utils";

export { ConvertHtmlOptions, ConvertPdfOptions, DEFAULT_CSS, renderHtml, renderPdf };

export const parseApiDocument = async (
  src: string,
  sort = false,
): Promise<ApiDocument | undefined> => {
  const document = readDocument<OpenAPIV2.Document | OpenAPIV3.Document>(
    src.toString(),
  );
  if (!document) {
    return undefined;
  }
  const apiDocument = createApiDocument(
    "openapi" in document
      ? document
      : (await converter.convertObj(document, {})).openapi,
  );
  if (sort) {
    apiDocument.pathMethods.sort((a, b) =>
      a.path !== b.path
        ? a.path < b.path
          ? -1
          : 1
        : a.method < b.method
          ? -1
          : 1,
    );
    apiDocument.references = Object.fromEntries(
      Object.entries(apiDocument.references).sort(([a], [b]) =>
        a < b ? -1 : 1,
      ),
    );
  }
  return apiDocument;
};

export const renderMarkdown = (apiDocument: ApiDocument): string => {
  let output = outputPathTable(apiDocument);
  output += outputReferenceTable(apiDocument);
  output += outputPathDetail(apiDocument);
  output += outputReferences(apiDocument);
  return output.trimEnd();
};

export const convertMarkdown = async (
  src: string,
  sort = false,
): Promise<string | undefined> => {
  const apiDocument = await parseApiDocument(src, sort);
  if (!apiDocument) {
    return undefined;
  }
  return renderMarkdown(apiDocument);
};

export const convertHtml = async (
  src: string,
  options?: ConvertHtmlOptions,
): Promise<string | undefined> => {
  const apiDocument = await parseApiDocument(src, options?.sort ?? false);
  if (!apiDocument) {
    return undefined;
  }
  const markdown = renderMarkdown(apiDocument);
  const defaultTitle = apiDocument.document.info?.title;
  return renderHtml(markdown, options, defaultTitle);
};

export const convertPdf = async (
  src: string,
  options?: ConvertPdfOptions,
): Promise<Uint8Array | undefined> => {
  const apiDocument = await parseApiDocument(src, options?.sort ?? false);
  if (!apiDocument) {
    return undefined;
  }
  const markdown = renderMarkdown(apiDocument);
  const defaultTitle = apiDocument.document.info?.title;
  return renderPdf(markdown, options, defaultTitle);
};
