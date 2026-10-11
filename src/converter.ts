import { OpenAPIV3 } from "openapi-types";
import { ApiDocument, PathMethod, References } from "./types";
import { getApiObject } from "./utils";

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

/**
 * Merges path-level parameters into operation-level parameters.
 * Operation-level parameters override path-level ones with the same name and location.
 */
const mergeParameters = (
  references: References,
  pathParameters: OpenAPIV3.PathItemObject["parameters"],
  operationParameters: OpenAPIV3.OperationObject["parameters"],
) => {
  if (!pathParameters?.length) return operationParameters;
  const apiDocument = { references } as ApiDocument;
  const getKey = (
    param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
  ) => {
    const p = getApiObject<OpenAPIV3.ParameterObject | undefined>(
      apiDocument,
      param,
    );
    return p ? `${p.in}:${p.name}` : undefined;
  };
  const operationKeys = new Set((operationParameters ?? []).map(getKey));
  return [
    ...pathParameters.filter((param) => !operationKeys.has(getKey(param))),
    ...(operationParameters ?? []),
  ];
};

/**
 * Creates an API document from an OpenAPI document.
 * @param document The OpenAPI document.
 * @returns The API document.
 */
export const createApiDocument = (
  document: OpenAPIV3.Document,
): ApiDocument => {
  const references: References = {};
  if ("components" in document && document.components) {
    const { components } = document;
    Object.entries(components).forEach(([key, value]) => {
      if (!value) return;
      Object.entries(value).forEach(([key2, value]) => {
        references[`#/components/${key}/${key2}`] = value;
      });
    });
  }
  const pathMethods: PathMethod[] = [];
  for (const [path, pathItem] of Object.entries<
    OpenAPIV3.PathItemObject | undefined
  >(document.paths ?? {})) {
    if (!pathItem) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !operation) continue;
      const op = operation as OpenAPIV3.OperationObject;
      const parameters = mergeParameters(
        references,
        pathItem.parameters,
        op.parameters,
      );
      pathMethods.push({
        path,
        method: method.toUpperCase(),
        operation: parameters ? { ...op, parameters } : op,
      });
    }
  }
  return { document, pathMethods, references };
};
