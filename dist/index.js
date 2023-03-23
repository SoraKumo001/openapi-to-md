#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMarkdown = void 0;
const fs_1 = require("fs");
const yaml_1 = __importDefault(require("yaml"));
const commander_1 = require("commander");
const converter = require("swagger2openapi");
const readDoument = (src) => {
    try {
        return yaml_1.default.parse(src);
    }
    catch (e) { }
    try {
        return JSON.parse(src);
    }
    catch (e) { }
    return null;
};
const markdownText = (text) => text.replace(/\n/g, "  \n");
const createApiDocument = (document) => {
    const pathMethods = [];
    for (const [path, pathItem] of Object.entries(document.paths)) {
        if (!pathItem)
            continue;
        for (const [method, operation] of Object.entries(pathItem)) {
            if (method === "parameters")
                continue;
            pathMethods.push({
                path,
                method: method.toUpperCase(),
                operation: operation,
            });
        }
    }
    const references = {};
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
const convertPath = (path) => path
    .replace(/[!@#$%^&*()+|~=`[\]{};':",./<>?]/g, "")
    .replace(/ /g, "-")
    .toLowerCase();
const outputPathTable = ({ document, pathMethods }) => {
    let output = `# ${document.info.title || "Api-Document"}\n\n> Version ${document.info.version || "1.0.0"}
${document.info.description ? "\n" + document.info.description + "\n" : ""}
## Path Table

| Method | Path | Description |
| --- | --- | --- |
`;
    output += pathMethods.reduce((a, { path, method, operation }) => a +
        `| ${method.toUpperCase()} | [${path}](#${method.toLowerCase()}${convertPath(path)}) | ${operation.summary || ""} |\n`, "");
    return output + "\n";
};
const outputReferenceTable = (apiDocument) => {
    const { references } = apiDocument;
    let output = `## Reference Table

| Name | Path | Description |
| --- | --- | --- |
`;
    Object.entries(references).forEach(([key, value]) => {
        const v = getApiObject(apiDocument, value);
        output += `| ${v.name || v.title || key ? key.substr(key.lastIndexOf("/") + 1) : ""} | ${key ? `[${key}](#${convertPath(key)})` : ""} | ${v.description || ""} |\n`;
    });
    return output + "\n";
};
const getRefName = (refObjecgt) => {
    if (typeof refObjecgt === "object" && refObjecgt && "$ref" in refObjecgt) {
        return refObjecgt["$ref"];
    }
    return undefined;
};
const getApiObject = ({ references }, object, refs) => {
    const refName = getRefName(object);
    if (refName) {
        const ref = object["$ref"];
        if (refs) {
            if (refs.has(ref)) {
                return object;
            }
            refs.add(ref);
        }
        return references[ref];
    }
    return object;
};
const outputParamSchemas = (apiDocument, parameters) => {
    let output = "";
    for (const param of parameters) {
        const p = getApiObject(apiDocument, param);
        output += outputSchemas(apiDocument, p);
    }
    return output;
};
const outputSchemas = (apiDocument, schemas) => {
    var _a;
    const apiObject = getApiObject(apiDocument, schemas);
    if (!apiObject)
        return "";
    let output = "";
    if ("content" in apiObject) {
        Object.entries(apiObject.content).forEach(([key, value]) => {
            output += `- ${key}\n\n`;
            output += outputSchemas(apiDocument, value.schema);
        });
    }
    else {
        output += "```ts\n";
        if ("in" in apiObject) {
            output += outputRefComment(schemas, 0);
            output += outputObject(apiDocument, apiObject.name, apiObject.schema, Array.isArray(apiObject.required)
                ? (_a = apiObject.required) === null || _a === void 0 ? void 0 : _a.includes(apiObject.name)
                : apiObject.required);
        }
        else {
            if (apiObject.type === "object") {
                output += outputObject(apiDocument, undefined, apiObject);
            }
            else if (apiObject.type === "array") {
                output += outputObject(apiDocument, undefined, apiObject);
            }
            else {
                output += JSON.stringify(apiObject, undefined, "  ") + "\n";
            }
        }
        output += "```\n\n";
    }
    return output;
};
const SP = (size) => "".padEnd(size * 2);
const outputRefComment = (apiObject, level) => {
    const refName = getRefName(apiObject);
    return refName ? SP(level) + `// ${refName}\n` : "";
};
const outputComment = (refObject, apiObject, level) => {
    if (refObject) {
        const refName = getRefName(apiObject);
        if (refName)
            return SP(level) + `// ${refName}\n`;
    }
    return apiObject.description
        ? apiObject.description
            .split("\n")
            .reduce((a, b) => a + SP(level) + `// ${b}\n`, "")
        : "";
};
const getTypeString = (apiDocument, apiObject, refs, level) => {
    const refName = getRefName(apiObject);
    if (refName)
        return refName;
    else if ("type" in apiObject) {
        return apiObject.type === "object" || apiObject.type === "array"
            ? outputObject(apiDocument, undefined, apiObject, undefined, refs, level + 0.5).trimEnd()
            : apiObject.type;
    }
    return "";
};
const outputObject = (apiDocument, name, schemas, required, refs, level) => {
    const nowLevel = level || 0;
    const setRef = refs || new Set();
    const apiObject = getApiObject(apiDocument, schemas, setRef);
    if (!apiObject)
        return "";
    let output = "";
    if ("$ref" in apiObject) {
        output += SP(nowLevel) + `${name}:${apiObject["$ref"]}\n`;
    }
    else if (apiObject.type === "object") {
        output += outputComment(schemas, apiObject, nowLevel);
        output += name ? SP(nowLevel) + `${name}: {\n` : "{\n";
        apiObject.properties &&
            Object.entries(apiObject.properties).forEach(([key, value]) => {
                var _a;
                output += outputObject(apiDocument, key, value, Array.isArray(apiObject.required)
                    ? (_a = apiObject.required) === null || _a === void 0 ? void 0 : _a.includes(key)
                    : apiObject.required, setRef, nowLevel + 1);
            });
        output += SP(nowLevel) + "}\n";
    }
    else if (apiObject.type === "array") {
        output += outputRefComment(schemas, nowLevel);
        output +=
            outputObject(apiDocument, name, apiObject.items, undefined, setRef, nowLevel).trimEnd() + "[]\n";
    }
    else if (apiObject.type) {
        output += outputComment(schemas, apiObject, nowLevel);
        const type = Array.isArray(apiObject.type)
            ? apiObject.type
            : apiObject.type
                ? [apiObject.type]
                : [];
        output +=
            (name ? SP(nowLevel) + `${name}${required === true ? "" : "?"}: ` : "");
        if (apiObject.enum) {
            output += `enum[${apiObject.enum.join(', ')}]`;
        }
        else {
            output += `${type.reduce((a, b, index) => a + (index ? " | " : "") + b, "")}`;
        }
        if (apiObject.default) {
            output += ` //default: ${apiObject.default}`;
        }
        output += "\n";
    }
    else if (apiObject.anyOf) {
        output += outputComment(schemas, apiObject, nowLevel);
        output += SP(nowLevel) + `${name}${required === true ? "" : "?"}: `;
        apiObject.anyOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
            output += (index ? " & " : "") + `Partial(${typeName})`;
        });
        output += "\n";
    }
    else if (apiObject.allOf) {
        output += outputComment(schemas, apiObject, nowLevel);
        output += SP(nowLevel) + `${name}${required === true ? "" : "?"}: `;
        apiObject.allOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
            output += (index ? " & " : "") + `${typeName}`;
        });
        output += "\n";
    }
    else if (apiObject.oneOf) {
        output += outputComment(schemas, apiObject, nowLevel);
        output += SP(nowLevel) + `${name}${required === true ? "" : "?"}: `;
        apiObject.oneOf.forEach((obj, index) => {
            const typeName = getTypeString(apiDocument, obj, setRef, nowLevel);
            output += (index ? " | " : "") + `${typeName}`;
        });
        output += "\n";
    }
    return output;
};
const outputParameters = (apiDocument, parameters) => {
    const p = {};
    for (const param of parameters) {
        const apiParam = getApiObject(apiDocument, param);
        if (!apiParam)
            continue;
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
const outputReferences = (apiDocument) => {
    let output = "## References\n\n";
    Object.entries(apiDocument.references).forEach(([key, value]) => {
        output += `### ${key}\n\n`;
        output += outputSchemas(apiDocument, value);
    });
    return output;
};
const outputRequestBody = (apiDocument, requestBody) => {
    const body = getApiObject(apiDocument, requestBody);
    let output = "#### RequestBody\n\n";
    output += outputSchemas(apiDocument, body);
    return output;
};
const outputExamples = (apiDocument, examples) => {
    const e = getApiObject(apiDocument, examples);
    if (!e)
        return "";
    let output = "- Examples\n\n";
    Object.entries(e).forEach(([key, value]) => {
        const example = getApiObject(apiDocument, value);
        output += `  - ${key}\n\n`;
        output +=
            "```json\n" + JSON.stringify(example, undefined, "  ") + "\n```\n\n";
    });
    return output;
};
const outputResponses = (apiDocument, responses) => {
    if (!responses)
        return "";
    const responsesObject = getApiObject(apiDocument, responses);
    let output = "#### Responses\n\n";
    for (const [code, res] of Object.entries(responsesObject)) {
        const response = res;
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
const outputPathDatail = (apiDocument) => {
    const { pathMethods } = apiDocument;
    let output = `## Path Details\n\n`;
    output += pathMethods.reduce((a, { path, method, operation }) => a +
        `***\n\n### [${method}]${path}\n\n` +
        (operation.summary
            ? `- Summary  \n${markdownText(operation.summary)}\n\n`
            : "") +
        (operation.description
            ? `- Description  \n${markdownText(operation.description)}\n\n`
            : "") +
        (operation.security
            ? `- Security  \n${markdownText(operation.security.reduce((a, b) => a + Object.keys(b)[0] + "\n", ""))}\n`
            : "") +
        (operation.parameters
            ? outputParameters(apiDocument, operation.parameters)
            : "") +
        ("requestBody" in operation
            ? outputRequestBody(apiDocument, operation.requestBody)
            : "") +
        ("responses" in operation
            ? outputResponses(apiDocument, operation.responses)
            : ""), "");
    return output;
};
const convertMarkdown = async (srcFile, destFile, sort = false) => {
    const src = await fs_1.promises
        .readFile(srcFile, { encoding: "utf8" })
        .catch(() => null);
    if (!src) {
        console.error(`'${srcFile}' not found`);
        return;
    }
    const document = readDoument(src.toString());
    if (!document) {
        console.error(`'${srcFile}'  is not 'yaml' or 'json'`);
        return;
    }
    const apiDocument = createApiDocument("openapi" in document
        ? document
        : (await converter.convertObj(document, {})).openapi);
    if (sort) {
        apiDocument.pathMethods.sort((a, b) => a.path !== b.path
            ? a.path < b.path
                ? -1
                : 1
            : a.method < b.method
                ? -1
                : 1);
        apiDocument.references = Object.fromEntries(Object.entries(apiDocument.references).sort(([a], [b]) => a < b ? -1 : 1));
    }
    let output = outputPathTable(apiDocument);
    output += outputReferenceTable(apiDocument);
    output += outputPathDatail(apiDocument);
    output += outputReferences(apiDocument);
    output = output.trimEnd();
    if (destFile) {
        fs_1.promises.writeFile(destFile, output, "utf8");
    }
    else {
        console.log(output);
    }
};
exports.convertMarkdown = convertMarkdown;
commander_1.program
    .version(process.env.npm_package_version || "unknown")
    .option("-s, --sort", "sort", false)
    .arguments("<source> [destination]")
    .action((src, dest, options) => {
    (0, exports.convertMarkdown)(src, dest, options["sort"]);
});
commander_1.program.parse(process.argv);
//# sourceMappingURL=index.js.map