import { OpenAPIV3 } from "openapi-types";
import { ApiDocument } from "./types";
import {
  convertPath,
  getApiObject,
  getRefName,
  markdownText,
  tableText,
} from "./utils";

const outputInfoExtras = (document: ApiDocument["document"]) => {
  const { info, servers, externalDocs } = document;
  const items: string[] = [];
  if (info.license) {
    items.push(
      `- License: ${
        info.license.url
          ? `[${info.license.name}](${info.license.url})`
          : info.license.name
      }`,
    );
  }
  if (info.contact) {
    const { name, email, url } = info.contact;
    const contact = [name, email && `<${email}>`, url].filter(Boolean);
    if (contact.length) items.push(`- Contact: ${contact.join(" ")}`);
  }
  if (info.termsOfService) {
    items.push(`- Terms of service: ${info.termsOfService}`);
  }
  if (externalDocs) {
    items.push(
      `- External docs: ${externalDocs.url}${
        externalDocs.description
          ? ` (${tableText(externalDocs.description)})`
          : ""
      }`,
    );
  }
  for (const server of servers ?? []) {
    items.push(
      `- Server: ${server.url}${
        server.description ? ` (${tableText(server.description)})` : ""
      }`,
    );
  }
  return items.length ? "\n" + items.join("\n") + "\n" : "";
};

export const outputPathTable = ({ document, pathMethods }: ApiDocument) => {
  let output = `# ${document.info.title || "Api-Document"}\n\n> Version ${
    document.info.version || "1.0.0"
  }
${document.info.description ? "\n" + document.info.description + "\n" : ""}${outputInfoExtras(document)}

## Path Table

| Method | Path | Description |
| --- | --- | --- |
`;

  output += pathMethods.reduce(
    (a, { path, method, operation }) =>
      a +
      `| ${method.toUpperCase()} | [${path}](#${method.toLowerCase()}${convertPath(
        path,
      )}) | ${operation.deprecated ? "**deprecated** " : ""}${
        operation.summary ? tableText(operation.summary) : ""
      } |
`,
    "",
  );

  return output + "\n";
};

/**
 * outputReferenceTable outputs a Markdown table of all API references.
 *
 * @param apiDocument The API document to output.
 */
export const outputReferenceTable = (apiDocument: ApiDocument) => {
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
      v.name || v.title || key ? key.slice(key.lastIndexOf("/") + 1) : ""
    } | ${key ? `[${key}](#${convertPath(key)})` : ""} | ${
      v.description ? tableText(v.description) : ""
    } |
`;
  });

  return output + "\n";
};

const outputParamSchemas = (
  apiDocument: ApiDocument,
  parameters: OpenAPIV3.ParameterObject[],
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
  if (!apiObject) return "";
  let output = "";
  if ("content" in apiObject) {
    Object.entries(apiObject.content!).forEach(([key, value]) => {
      output += `- ${key}\n\n`;
      output += outputSchemas(apiDocument, value.schema);
      output += outputExample(value.example);
      output += outputExamples(apiDocument, value.examples);
    });
  } else {
    let body = "";
    if ("schema" in apiObject) {
      body += outputRefComment(schemas, 0);
      body += outputComment(null, { description: apiObject.description }, 0);
      body += outputObject(
        apiDocument,
        apiObject.name,
        apiObject.schema!,
        Array.isArray(apiObject.required)
          ? apiObject.required?.includes(apiObject.name)
          : apiObject.required,
      );
    } else if ("in" in apiObject) {
      body += JSON.stringify(apiObject, undefined, "  ") + "\n";
    } else {
      body += outputObject(apiDocument, undefined, apiObject);
    }
    if (body) {
      output += "```typescript\n" + body + "```\n\n";
    } else if ("description" in apiObject && apiObject.description) {
      output += apiObject.description.trimEnd() + "\n\n";
    }
  }
  return output;
};
const SP = (size: number) => "".padEnd(size * 2);
const outputRefComment = (
  apiObject: OpenAPIV3.ReferenceObject | unknown,
  level: number,
) => {
  const refName = getRefName(apiObject);
  return refName ? SP(level) + `// ${refName}\n` : "";
};
const outputComment = (
  refObject: OpenAPIV3.ReferenceObject | unknown | null,
  apiObject: OpenAPIV3.NonArraySchemaObject,
  level: number,
) => {
  if (refObject) {
    const refName = getRefName(apiObject);
    if (refName) return SP(level) + `// ${refName}\n`;
  }
  return apiObject.description
    ? apiObject.description
        .split("\n")
        .reduce((a, b) => a + SP(level) + `// ${b}\n`, "")
    : "";
};
const getTypeString = (
  apiDocument: ApiDocument,
  apiObject:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.ArraySchemaObject
    | OpenAPIV3.NonArraySchemaObject,
  refs: Set<string>,
  level: number,
) => {
  const refName = getRefName(apiObject);
  if (refName) return refName;
  else if ("type" in apiObject) {
    return apiObject.type === "object" || apiObject.type === "array"
      ? outputObject(
          apiDocument,
          undefined,
          apiObject,
          undefined,
          refs,
          level + 0.5,
        ).trimEnd()
      : apiObject.type;
  }
  return "";
};
const CONSTRAINT_KEYS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
] as const;
const outputConstraints = (apiObject: OpenAPIV3.SchemaObject) =>
  CONSTRAINT_KEYS.reduce((a, key) => {
    const value = apiObject[key];
    return value === undefined ? a : a + ` //${key}: ${value}`;
  }, "");
const outputDiscriminator = (
  apiObject: OpenAPIV3.SchemaObject,
  level: number,
) =>
  apiObject.discriminator
    ? SP(level) + `// discriminator: ${apiObject.discriminator.propertyName}\n`
    : "";
const outputNamePrefix = (
  name: string | undefined,
  required: boolean | undefined,
  level: number,
) =>
  name ? SP(level) + `${name}${required === true ? "" : "?"}: ` : SP(level);
/**
 * Outputs a schema. `refs` holds the `$ref`s currently being expanded, so only
 * real circular references are collapsed; the same `$ref` used by sibling
 * properties is expanded each time.
 */
const outputObject = (
  apiDocument: ApiDocument,
  name: string | undefined,
  schemas: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  required?: boolean,
  refs: Set<string> = new Set(),
  level?: number,
): string => {
  const refName = getRefName(schemas);
  const isNewRef = refName !== undefined && !refs.has(refName);
  try {
    return outputObjectBody(apiDocument, name, schemas, required, refs, level);
  } finally {
    if (isNewRef) refs.delete(refName);
  }
};
const outputObjectBody = (
  apiDocument: ApiDocument,
  name: string | undefined,
  schemas: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  required: boolean | undefined,
  refs: Set<string>,
  level?: number,
) => {
  const nowLevel = level || 0;
  const setRef = refs;
  const apiObject = getApiObject<OpenAPIV3.SchemaObject>(
    apiDocument,
    schemas,
    setRef,
  );
  if (!apiObject) return "";

  let output = "";
  if ("$ref" in apiObject) {
    output +=
      SP(nowLevel) + (name ? `${name}:` : "") + apiObject["$ref"] + "\n";
  } else if (
    apiObject.type === "object" ||
    (!apiObject.type &&
      (apiObject.properties || apiObject.additionalProperties))
  ) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += name ? SP(nowLevel) + `${name}: {\n` : "{\n";
    if (apiObject.properties) {
      Object.entries(apiObject.properties).forEach(([key, value]) => {
        output += outputObject(
          apiDocument,
          key,
          value,
          Array.isArray(apiObject.required)
            ? apiObject.required?.includes(key)
            : apiObject.required,
          setRef,
          nowLevel + 1,
        );
      });
    }
    const additional = apiObject.additionalProperties;
    if (
      additional === true ||
      (additional && !Object.keys(additional).length)
    ) {
      output += SP(nowLevel + 1) + "[key: string]: any\n";
    } else if (additional) {
      output += outputObject(
        apiDocument,
        "[key: string]",
        additional,
        true,
        setRef,
        nowLevel + 1,
      );
    }
    output += SP(nowLevel) + "}\n";
  } else if (apiObject.type === "array") {
    output += outputRefComment(schemas, nowLevel);
    output +=
      outputObject(
        apiDocument,
        name,
        apiObject.items,
        required,
        setRef,
        nowLevel,
      ).trimEnd() +
      "[]" +
      outputConstraints(apiObject) +
      "\n";
  } else if (apiObject.type) {
    output += outputComment(schemas, apiObject, nowLevel);
    const type: string[] = Array.isArray(apiObject.type)
      ? apiObject.type.map(String)
      : apiObject.type
        ? [apiObject.type]
        : [];
    if (apiObject.nullable && !type.includes("null")) {
      type.push("null");
    }
    output += name
      ? SP(nowLevel) + `${name}${required === true ? "" : "?"}: `
      : "";
    if (apiObject.enum) {
      const nullable = type.includes("null") ? " | null" : "";
      output += `enum[${apiObject.enum.join(", ")}]${nullable}`;
    } else {
      output += type.join(" | ");
    }
    if (apiObject.format) {
      output += ` //format: ${apiObject.format}`;
    }
    output += outputConstraints(apiObject);
    if (apiObject.default !== undefined) {
      const value =
        typeof apiObject.default === "object"
          ? JSON.stringify(apiObject.default)
          : apiObject.default;
      output += ` //default: ${value}`;
    }
    output += "\n";
  } else if (apiObject.not) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += outputNamePrefix(name, required, nowLevel);
    output += `not(${getTypeString(apiDocument, apiObject.not, setRef, nowLevel)})\n`;
  } else if (apiObject.anyOf) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += outputDiscriminator(apiObject, nowLevel);
    output += outputNamePrefix(name, required, nowLevel);
    apiObject.anyOf.forEach((obj, index) => {
      const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
      output += (index ? " & " : "") + `Partial(${typeName})`;
    });
    output += "\n";
  } else if (apiObject.allOf) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += outputDiscriminator(apiObject, nowLevel);
    output += outputNamePrefix(name, required, nowLevel);
    apiObject.allOf.forEach((obj, index) => {
      const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
      output += (index ? " & " : "") + `${typeName}`;
    });
    output += "\n";
  } else if (apiObject.oneOf) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += outputDiscriminator(apiObject, nowLevel);
    output += outputNamePrefix(name, required, nowLevel);
    apiObject.oneOf.forEach((obj, index) => {
      const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
      output += (index ? " | " : "") + `${typeName}`;
    });
    output += "\n";
  } else if (name) {
    output += outputComment(schemas, apiObject, nowLevel);
    output += outputNamePrefix(name, required, nowLevel) + "any\n";
  }
  return output;
};

const outputParameters = (
  apiDocument: ApiDocument,
  parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[],
) => {
  const p: { [key: string]: OpenAPIV3.ParameterObject[] } = {};
  for (const param of parameters) {
    const apiParam = getApiObject<OpenAPIV3.ParameterObject>(
      apiDocument,
      param,
    );
    if (!apiParam) continue;
    p[apiParam.in] = p[apiParam.in]
      ? [...p[apiParam.in], apiParam]
      : [apiParam];
  }
  const sections: [string, string][] = [
    ["path", "#### Parameters(Path)"],
    ["query", "#### Parameters(Query)"],
    ["body", "#### Parameters(Body)"],
    ["header", "#### Headers"],
    ["cookie", "#### Parameters(Cookie)"],
  ];
  let output = "";
  for (const [key, title] of sections) {
    if (p[key]) {
      output +=
        `${title}

` + outputParamSchemas(apiDocument, p[key]);
    }
  }
  return output;
};

const outputSecurityScheme = (scheme: OpenAPIV3.SecuritySchemeObject) => {
  const items: [string, unknown][] = [["Type", scheme.type]];
  if (scheme.type === "http") {
    items.push(
      ["Scheme", scheme.scheme],
      ["Bearer format", scheme.bearerFormat],
    );
  } else if (scheme.type === "apiKey") {
    items.push(["In", scheme.in], ["Name", scheme.name]);
  } else if (scheme.type === "openIdConnect") {
    items.push(["OpenID Connect URL", scheme.openIdConnectUrl]);
  }
  let output = "";
  for (const [label, value] of items) {
    if (value) output += `- ${label}: ${value}\n`;
  }
  if (scheme.type === "oauth2") {
    for (const [flowName, flow] of Object.entries(scheme.flows ?? {})) {
      const f = flow as OpenAPIV3.OAuth2SecurityScheme["flows"][
        | "implicit"
        | "password"
        | "clientCredentials"
        | "authorizationCode"] & {
        authorizationUrl?: string;
        tokenUrl?: string;
        refreshUrl?: string;
      };
      output += `- Flow: ${flowName}\n`;
      if (f.authorizationUrl) {
        output += `  - Authorization URL: ${f.authorizationUrl}\n`;
      }
      if (f.tokenUrl) output += `  - Token URL: ${f.tokenUrl}\n`;
      if (f.refreshUrl) output += `  - Refresh URL: ${f.refreshUrl}\n`;
      for (const [scope, description] of Object.entries(f.scopes ?? {})) {
        output += `  - Scope \`${scope}\`: ${tableText(String(description))}\n`;
      }
    }
  }
  output += "\n";
  if (scheme.description) output += scheme.description.trimEnd() + "\n\n";
  return output;
};

const SECURITY_SCHEMES_PREFIX = "#/components/securitySchemes/";

export const outputReferences = (apiDocument: ApiDocument) => {
  let output = "## References\n\n";
  Object.entries(apiDocument.references).forEach(([key, value]) => {
    output += `### ${key}\n\n`;
    const scheme = getApiObject<OpenAPIV3.SecuritySchemeObject | undefined>(
      apiDocument,
      value,
    );
    output +=
      key.startsWith(SECURITY_SCHEMES_PREFIX) && scheme?.type
        ? outputSecurityScheme(scheme)
        : outputSchemas(apiDocument, value);
  });
  return output;
};

const outputHeaders = (
  apiDocument: ApiDocument,
  headers: OpenAPIV3.ResponseObject["headers"],
) => {
  if (!headers) return "";
  let body = "";
  for (const [name, header] of Object.entries(headers)) {
    const h = getApiObject<OpenAPIV3.HeaderObject | undefined>(
      apiDocument,
      header,
    );
    if (!h) continue;
    body += outputComment(null, { description: h.description }, 0);
    body += outputObject(apiDocument, name, h.schema ?? {}, h.required);
  }
  return body ? "`Headers`\n\n```typescript\n" + body + "```\n\n" : "";
};

const outputLinks = (
  apiDocument: ApiDocument,
  links: OpenAPIV3.ResponseObject["links"],
) => {
  if (!links) return "";
  let output = "";
  for (const [name, link] of Object.entries(links)) {
    const l = getApiObject<OpenAPIV3.LinkObject | undefined>(apiDocument, link);
    if (!l) continue;
    const target = l.operationId ?? l.operationRef ?? "";
    const description = l.description ? ` - ${tableText(l.description)}` : "";
    output += `- ${name}${target ? `: ${target}` : ""}${description}\n`;
  }
  return output ? "`Links`\n\n" + output + "\n" : "";
};

const outputRequestBody = (
  apiDocument: ApiDocument,
  requestBody:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.RequestBodyObject
    | undefined,
) => {
  const body = getApiObject<OpenAPIV3.RequestBodyObject>(
    apiDocument,
    requestBody,
  );
  let output = "#### RequestBody\n\n";
  if (body?.required) output += "*Required*\n\n";
  if (body?.description) output += body.description.trimEnd() + "\n\n";
  output += outputSchemas(apiDocument, body);
  return output;
};

const outputExamples = (
  apiDocument: ApiDocument,
  examples: OpenAPIV3.MediaTypeObject["examples"],
) => {
  const e = getApiObject<OpenAPIV3.MediaTypeObject["examples"]>(
    apiDocument,
    examples,
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

const outputExample = (example: unknown) =>
  example === undefined
    ? ""
    : "- Example\n\n```json\n" +
      JSON.stringify(example, undefined, "  ") +
      "\n```\n\n";

const outputResponses = (
  apiDocument: ApiDocument,
  responses: OpenAPIV3.ResponsesObject | undefined,
) => {
  if (!responses) return "";
  const responsesObject = getApiObject<OpenAPIV3.ResponsesObject>(
    apiDocument,
    responses,
  );
  let output = "#### Responses\n\n";

  for (const [code, res] of Object.entries(responsesObject)) {
    const response = getApiObject<OpenAPIV3.ResponseObject | undefined>(
      apiDocument,
      res,
    );
    if (!response) continue;
    output += `- ${code} ${response.description ?? ""}\n\n`;

    if (response.content)
      for (const [contentName, content] of Object.entries(response.content)) {
        output += `\`${contentName}\`\n\n`;
        output += outputSchemas(apiDocument, content.schema);
        output += outputExample(content.example);
        output += outputExamples(apiDocument, content.examples);
      }
    output += outputHeaders(apiDocument, response.headers);
    output += outputLinks(apiDocument, response.links);
  }
  return output;
};

export const outputPathDetail = (apiDocument: ApiDocument) => {
  const { pathMethods } = apiDocument;
  let output = `## Path Details\n\n`;
  output += pathMethods.reduce(
    (a, { path, method, operation }) =>
      a +
      `***\n\n### [${method}]${path}\n\n` +
      (operation.summary
        ? `- Summary  \n${markdownText(operation.summary)}\n\n`
        : "") +
      (operation.operationId
        ? `- Operation id  \n${markdownText(operation.operationId)}\n\n`
        : "") +
      (operation.description
        ? `- Description  \n${markdownText(operation.description)}\n\n`
        : "") +
      (operation.tags?.length
        ? `- Tags  \n  ${operation.tags.map((t) => tableText(t)).join(", ")}\n\n`
        : "") +
      (operation.deprecated ? `- Deprecated  \n  true\n\n` : "") +
      (operation.externalDocs
        ? `- External docs  \n  ${operation.externalDocs.url}${
            operation.externalDocs.description
              ? ` (${tableText(operation.externalDocs.description)})`
              : ""
          }\n\n`
        : "") +
      (operation.security
        ? `- Security  \n${markdownText(
            operation.security
              .map((b) => Object.keys(b).join(" + ") || "None")
              .join("\n"),
          )}\n\n`
        : "") +
      (operation.parameters
        ? outputParameters(apiDocument, operation.parameters)
        : "") +
      (operation.requestBody
        ? outputRequestBody(apiDocument, operation.requestBody)
        : "") +
      (operation.responses
        ? outputResponses(apiDocument, operation.responses)
        : ""),
    "",
  );
  return output;
};
