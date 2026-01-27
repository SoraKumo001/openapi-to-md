# openapi-to-md

[![](https://img.shields.io/npm/l/openapi-to-md)](https://www.npmjs.com/package/openapi-to-md)
[![](https://img.shields.io/npm/v/openapi-to-md)](https://www.npmjs.com/package/openapi-to-md)
[![](https://img.shields.io/npm/dw/openapi-to-md)](https://www.npmjs.com/package/openapi-to-md)
[![](https://deepwiki.com/badge.svg)](https://deepwiki.com/SoraKumo001/openapi-to-md)

Convert OpenAPI (Swagger) specifications into readable Markdown documentation.

## Description

`openapi-to-md` is a tool that transforms OpenAPI v2 and v3 documents (YAML or JSON) into structured Markdown files. This is particularly useful for generating documentation for your APIs that can be easily viewed on GitHub or other Markdown-supported platforms. The output includes TypeScript-style interface definitions for better readability by developers.

## Features

- **Multi-version Support**: Supports both OpenAPI v2 (Swagger) and v3 formats.
- **Flexible Input**: Accepts both JSON and YAML files.
- **Remote Fetching**: Can convert files directly from a URL.
- **TypeScript-style Output**: Generates data structures resembling TypeScript interfaces.
- **Sorting**: Optional alphabetical sorting of paths and references.
- **Safe Handling**: Does not deeply resolve recursive references to prevent infinite loops.

## CLI Usage

### Command Syntax

```
Usage: openapi-to-md [options] <source> [destination]

Arguments:
  source       Path to the local file or URL of the OpenAPI document
  destination  (Optional) Path to save the generated Markdown file

Options:
  -V, --version  output the version number
  -s, --sort     Sort paths and references alphabetically (default: false)
  -h, --help     display help for command
```

### Examples

**Convert a local YAML file and save to README.md:**
```sh
openapi-to-md openapi.yaml README.md
```

**Convert with sorting enabled:**
```sh
openapi-to-md -s openapi.yaml README.md
```

**Output to stdout (redirect to file):**
```sh
openapi-to-md openapi.json > README.md
```

**Convert from a remote URL:**
```sh
openapi-to-md https://example.com/api-docs.yaml README.md
```

## Programmatic Usage

You can import `openapi-to-md` into your Node.js or TypeScript project to convert OpenAPI documents programmatically.

### Example

```typescript
import { convertMarkdown } from "openapi-to-md";

const src = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Get Test
      responses:
        '200':
          description: OK
`;

// Convert the OpenAPI string to Markdown
const markdown = await convertMarkdown(src, true);
console.log(markdown);
```

### API Reference

#### `convertMarkdown(src: string, sort?: boolean): Promise<string | undefined>`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `src` | `string` | The source OpenAPI document content (YAML or JSON string). |
| `sort` | `boolean` | (Optional) If `true`, sorts paths and references alphabetically. Default is `false`. |

**Returns:**
A `Promise` that resolves to the generated Markdown string. Returns `undefined` if the input cannot be parsed or an error occurs.

## Output Structure

The generated Markdown includes:

1.  **Header**: Title, Version, and Description from the OpenAPI info object.
2.  **Path Table**: A summary table of all API endpoints (Method, Path, Summary).
3.  **Reference Table**: A summary table of all schemas in `components` or `definitions`.
4.  **Path Details**: Detailed information for each endpoint, including parameters, request bodies, and responses.
5.  **References**: Detailed schema definitions in a TypeScript-like format.

## License

MIT