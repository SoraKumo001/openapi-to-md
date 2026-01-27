import { OpenAPIV3 } from "openapi-types";
import YAML from "yaml";
import { ApiDocument } from "./types";

export const readDocument = <T>(src: string): T | null => {
  try {
    const doc = YAML.parse(src) as T;
    if (typeof doc === "object" && doc !== null) return doc;
  } catch {
    //
  }
  try {
    const doc = JSON.parse(src) as T;
    if (typeof doc === "object" && doc !== null) return doc;
  } catch {
    //
  }
  return null;
};

/**
 * Replaces newlines with two spaces and a newline character, as required by
 * Markdown for a line break.
 */
export const markdownText = (text: string) => text.replace(/\n/g, "  \n");

/**
 * Replaces newlines with <br> for use in Markdown tables.
 */
export const tableText = (text: string) => text.replace(/\n/g, "<br>");

/**
 * Converts a path to a format that can be used in a URL, such as replacing
 * spaces.
 *
 * @param path Path to convert
 * @returns The converted path
 */
export const convertPath = (path: string) =>
  path
    .replace(/[!@#$%^&*()+|~=`[\]{};':",./<>?]/g, "")
    .replace(/ /g, "-")
    .toLowerCase();

/**
 * Return the name of a reference object.
 * @param refObject
 */
export const getRefName = (
  refObject: unknown | OpenAPIV3.ReferenceObject,
): string | undefined => {
  if (typeof refObject === "object" && refObject && "$ref" in refObject) {
    return (refObject as OpenAPIV3.ReferenceObject)["$ref"];
  }
  return undefined;
};

export const getApiObject: {
  <T = unknown | OpenAPIV3.ReferenceObject>(
    apiDocument: ApiDocument,
    object: OpenAPIV3.ReferenceObject | unknown,
  ): T;
  <T = unknown | OpenAPIV3.ReferenceObject>(
    apiDocument: ApiDocument,
    object: OpenAPIV3.ReferenceObject | unknown,
    refs?: Set<string>,
  ): T | OpenAPIV3.ReferenceObject;
} = <T = unknown | OpenAPIV3.ReferenceObject>(
  { references }: ApiDocument,
  object: OpenAPIV3.ReferenceObject | unknown,
  refs?: Set<string>,
) => {
  const refName = getRefName(object);
  if (refName) {
    const ref = (object as OpenAPIV3.ReferenceObject)["$ref"];
    if (refs) {
      if (refs.has(ref)) {
        return object;
      }
      refs.add(ref);
    }
    return references[ref] as T;
  }
  return object as T;
};
