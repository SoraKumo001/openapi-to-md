import { OpenAPIV3 } from "openapi-types";
import { ApiDocument, PathMethod, References } from "./types";

/**
 * Creates an API document from an OpenAPI document.
 * @param document The OpenAPI document.
 * @returns The API document.
 */
export const createApiDocument = (document: OpenAPIV3.Document): ApiDocument => {
  const pathMethods: PathMethod[] = [];
  for (const [path, pathItem] of Object.entries<
    OpenAPIV3.PathItemObject | undefined
  >(document.paths)) {
    if (!pathItem) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === "parameters") continue;
      pathMethods.push({
        path,
        method: method.toUpperCase(),
        operation: operation as OpenAPIV3.OperationObject,
      });
    }
  }
  const references: References = {};
  if ("components" in document && document.components) {
    const { components } = document;
    Object.entries(components).forEach(([key, value]) => {
      Object.entries(value).forEach(([key2, value]) => {
        references[`#/components/${key}/${key2}`] = value;
      });
    });
  }
  return { document, pathMethods, references };
};
