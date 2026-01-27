import { OpenAPIV2, OpenAPIV3 } from "openapi-types";
import converter from "swagger2openapi";
import { createApiDocument } from "./converter";
import {
  outputPathDetail,
  outputPathTable,
  outputReferences,
  outputReferenceTable,
} from "./renderer";
import { readDocument } from "./utils";

export const convertMarkdown = async (src: string, sort = false) => {
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
  let output = outputPathTable(apiDocument);
  output += outputReferenceTable(apiDocument);
  output += outputPathDetail(apiDocument);
  output += outputReferences(apiDocument);
  output = output.trimEnd();
  return output;
};