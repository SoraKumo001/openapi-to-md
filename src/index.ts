import { promises as fs } from "fs";
import YAML from "yaml";
import { OpenAPIV3 } from "openapi-types";
const converter = require("swagger2openapi");

type References = { [key: string]: unknown };

const readDoument = <T>(src: string): T | null => {
  try {
    return YAML.parse(src) as T;
  } catch (e) {}
  try {
    return JSON.parse(src) as T;
  } catch (e) {}
  return null;
};

interface PathMethod {
  path: string;
  method: string;
  operation: OpenAPIV3.OperationObject;
}
interface ApiDocument {
  document: OpenAPIV3.Document;
  pathMethods: PathMethod[];
  references: References;
}
const markdownText = (text: string) => text.replace(/\n/g, "  \n");

const createApiDocument = (document: OpenAPIV3.Document): ApiDocument => {
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
        operation: operation,
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

const outputPathTable = ({ document, pathMethods }: ApiDocument) => {
  let output = `# ${document.info.title || "Api-Document"}\n\n> Version ${
    document.info.version || "1.0.0"
  }
${document.info.description ? "\n" + document.info.description + "\n" : ""}
## Path Table

| Method | Path | Description |
| --- | --- | --- |
`;

  output += pathMethods.reduce(
    (a, { path, method, operation }) =>
      a +
      `| ${method.toUpperCase()} | [${path}](#[${method}]${path}) | ${
        operation.summary || ""
      } |\n`,
    ""
  );

  return output + "\n";
};
const outputReferenceTable = (apiDocument: ApiDocument) => {
  const { references } = apiDocument;
  let output = `## Reference Table

| Name | Path | Description |
| --- | --- | --- |
`;

  Object.entries(references).forEach(([key, value]) => {
    const v = getApiObject<{
      description?: string;
      name?: string;
      title?: string;
    }>(apiDocument, value);
    output += `| ${
      v.name || v.title || key ? key.substr(key.lastIndexOf("/") + 1) : ""
    } | ${key ? `[${key}](${key})` : ""} | ${v.description || ""} |\n`;
  });

  return output + "\n";
};

const getApiObject: {
  <T = unknown | OpenAPIV3.ReferenceObject>(
    apiDocument: ApiDocument,
    object: OpenAPIV3.ReferenceObject | unknown
  ): T;
  <T = unknown | OpenAPIV3.ReferenceObject>(
    apiDocument: ApiDocument,
    object: OpenAPIV3.ReferenceObject | unknown,
    refs?: Set<string>
  ): T | OpenAPIV3.ReferenceObject;
} = <T = unknown | OpenAPIV3.ReferenceObject>(
  { references }: ApiDocument,
  object: OpenAPIV3.ReferenceObject | unknown,
  refs?: Set<string>
) => {
  if (typeof object === "object" && object && "$ref" in object) {
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

const outputParamSchemas = (
  apiDocument: ApiDocument,
  parameters: OpenAPIV3.ParameterObject[]
) => {
  let output = "";
  for (const param of parameters) {
    const p = getApiObject<OpenAPIV3.ParameterObject>(apiDocument, param);
    output += outputSchemas(apiDocument, p);
  }
  return output;
};
const outputSchemas = (apiDocument: ApiDocument, schemas: unknown): string => {
  const apiObject = getApiObject<
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.ParameterObject
  >(apiDocument, schemas);
  let output = "";

  if ("content" in apiObject) {
    Object.entries(apiObject.content!).forEach(([key, value]) => {
      output += `- ${key}\n\n`;
      output += outputSchemas(apiDocument, value.schema);
    });
  } else {
    output += "```ts\n";
    if ("in" in apiObject) {
      output += outputObject(
        apiDocument,
        apiObject.name,
        apiObject.schema!,
        Array.isArray(apiObject.required)
          ? apiObject.required?.includes(apiObject.name)
          : apiObject.required
      );
    } else {
      if (apiObject.type === "object") {
        output += outputObject(apiDocument, undefined, apiObject);
      } else if (apiObject.type === "array") {
        output += outputObject(apiDocument, undefined, apiObject);
      }
    }
    output += "```\n\n";
  }
  return output;
};
const SP = (size: number) => "".padEnd(size);
const outputObject = (
  apiDocument: ApiDocument,
  name: string | undefined,
  schemas: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  required?: boolean,
  refs?: Set<string>,
  level?: number
) => {
  const nowLevel = level || 0;
  const setRef = refs || new Set();
  const apiObject = getApiObject<OpenAPIV3.SchemaObject>(
    apiDocument,
    schemas,
    setRef
  );
  if (!apiObject) return "";

  let output = "";
  if ("$ref" in apiObject) {
    output += SP(nowLevel * 2) + `${name}:${apiObject["$ref"]}\n`;
  } else if (apiObject.type === "object") {
    output += name ? SP(nowLevel * 2) + `${name}: {\n` : "{\n";
    apiObject.properties &&
      Object.entries(apiObject.properties).forEach(([key, value]) => {
        output += outputObject(
          apiDocument,
          key,
          value,
          undefined,
          setRef,
          nowLevel + 1
        );
      });
    output += SP(nowLevel * 2) + "}\n";
  } else if (apiObject.type === "array") {
    output +=
      outputObject(
        apiDocument,
        name,
        apiObject.items,
        undefined,
        setRef,
        nowLevel
      ).trimEnd() + "[]\n";
  } else {
    const type: string[] = Array.isArray(apiObject.type)
      ? apiObject.type
      : apiObject.type
      ? [apiObject.type]
      : [];
    output +=
      SP(nowLevel * 2) +
      `${name}${required === true ? "" : "?"}: ${type.reduce(
        (a, b, index) => a + (index ? " | " : "") + b,
        ""
      )}\n`;
  }
  return output;
};

const outputParameters = (
  apiDocument: ApiDocument,
  parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]
) => {
  const p: { [key: string]: OpenAPIV3.ParameterObject[] } = {};
  for (const param of parameters) {
    const apiParam = getApiObject<OpenAPIV3.ParameterObject>(
      apiDocument,
      param
    );
    if (!apiParam) continue;
    p[apiParam.in] = p[apiParam.in]
      ? [...p[apiParam.in], apiParam]
      : [apiParam];
  }
  let output = "";
  if (p["query"]) {
    output +=
      "#### Parameters(Query)\n\n" +
      outputParamSchemas(apiDocument, p["query"]);
  }
  if (p["body"]) {
    output +=
      "#### Parameters(Body)\n\n" + outputParamSchemas(apiDocument, p["body"]);
  }
  if (p["header"]) {
    output += "#### Headers\n\n" + outputParamSchemas(apiDocument, p["header"]);
  }
  return output;
};
const outputReferences = (apiDocument: ApiDocument) => {
  let output = "## References\n\n";
  Object.entries(apiDocument.references).forEach(([key, value]) => {
    output += `### ${key}\n\n`;
    output += outputSchemas(apiDocument, value);
  });
  return output;
};
const outputRequestBody = (
  apiDocument: ApiDocument,
  requestBody:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.RequestBodyObject
    | undefined
) => {
  const body = getApiObject<OpenAPIV3.RequestBodyObject>(
    apiDocument,
    requestBody
  );
  let output = "#### RequestBody\n\n";
  output += outputSchemas(apiDocument, body);
  return output;
};
const outputExamples = (
  apiDocument: ApiDocument,
  examples: OpenAPIV3.MediaTypeObject["examples"]
) => {
  const e = getApiObject<OpenAPIV3.MediaTypeObject["examples"]>(
    apiDocument,
    examples
  );
  if (!e) return "";
  let output = "- Examples\n\n";
  Object.entries(e).forEach(([key, value]) => {
    const example = getApiObject<OpenAPIV3.ExampleObject>(apiDocument, value);
    output += `  - ${key}\n\n`;
    output +=
      "```json\n" + JSON.stringify(example, undefined, "  ") + "\n```\n\n";
  });
  return output;
};
const outputResponses = (
  apiDocument: ApiDocument,
  responses: OpenAPIV3.ResponsesObject | undefined
) => {
  if (!responses) return "";
  const responsesObject = getApiObject<OpenAPIV3.ResponsesObject>(
    apiDocument,
    responses
  );
  let output = "#### Responses\n\n";

  for (const [code, res] of Object.entries(responsesObject)) {
    const response = res as OpenAPIV3.ResponseObject;
    output += `- ${code} ${response.description}\n\n`;

    if (response.content)
      for (const [contentName, content] of Object.entries(response.content)) {
        output += `\`${contentName}\`\n\n`;
        output += outputSchemas(apiDocument, content.schema);
        output += outputExamples(apiDocument, content.examples);
      }
  }
  return output;
};
const outputPathDatail = (apiDocument: ApiDocument) => {
  const { pathMethods } = apiDocument;
  let output = `## Path Details\n\n`;
  output += pathMethods.reduce(
    (a, { path, method, operation }) =>
      a +
      `***\n\n### [${method}]${path}\n\n` +
      (operation.summary
        ? `- Summary  \n${markdownText(operation.summary)}\n\n`
        : "") +
      (operation.description
        ? `- Description  \n${markdownText(operation.description)}\n\n`
        : "") +
      (operation.parameters
        ? outputParameters(apiDocument, operation.parameters)
        : "") +
      ("requestBody" in operation
        ? outputRequestBody(apiDocument, operation.requestBody)
        : "") +
      ("responses" in operation
        ? outputResponses(apiDocument, operation.responses)
        : ""),
    ""
  );
  return output;
};

export const convertMarkdown = async (srcFile: string, destFile?: string) => {
  const src = await fs
    .readFile(srcFile, { encoding: "utf8" })
    .catch(() => null);
  if (!src) {
    console.error(`'${srcFile}' not found`);
    return;
  }

  const document = readDoument<Document>(src);
  if (!document) {
    console.error(`'${srcFile}'  is not 'yaml' or 'json'`);
    return;
  }
  const apiDocument = createApiDocument(
    "openapi" in document
      ? document
      : (await converter.convertObj(document, {})).openapi
  );

  let output = outputPathTable(apiDocument);
  output += outputReferenceTable(apiDocument);
  output += outputPathDatail(apiDocument);
  output += outputReferences(apiDocument);
  output = output.trimEnd();
  if (destFile) {
    fs.writeFile(destFile, output, "utf8");
  } else {
    console.log(output);
  }
};

if (process.argv.length < 3) {
  console.log("swagger-to-md src-file [dist-file]");
} else {
  convertMarkdown(process.argv[2], process.argv[3]);
}
