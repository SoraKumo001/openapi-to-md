import { OpenAPIV3 } from "openapi-types";

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
