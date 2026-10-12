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
- **Remote Fetching**: Can convert files directly from an `http(s)` URL.
- **TypeScript-style Output**: Generates data structures resembling TypeScript interfaces, including `format`, `nullable`, constraints, map types (`additionalProperties`), `oneOf` / `anyOf` / `allOf` / `not` and `discriminator`.
- **Complete Operation Details**: Path-level and operation-level parameters (path, query, header, cookie), request bodies, responses (including `$ref`, headers, links and examples), tags, deprecation, external docs and security requirements.
- **Document Metadata**: Info (license, contact, terms of service), servers and security schemes (API key, HTTP, OAuth2 flows, OpenID Connect).
- **Sorting**: Optional alphabetical sorting of paths and references.
- **Safe Handling**: Circular references are detected and collapsed to prevent infinite loops.

## Requirements

Node.js 18 or later.

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
A `Promise` that resolves to the generated Markdown string. Returns `undefined` if the input cannot be parsed as YAML or JSON. Other failures (for example, an OpenAPI v2 document that cannot be converted) reject the promise.

## Output Structure

The generated Markdown includes:

1.  **Header**: Title, Version, and Description from the OpenAPI info object, followed by license, contact, terms of service, external docs and servers when present.
2.  **Path Table**: A summary table of all API endpoints (Method, Path, Summary). Deprecated operations are marked with **deprecated**.
3.  **Reference Table**: A summary table of everything in `components` (or `definitions`): schemas, parameters, responses, request bodies, security schemes, and so on.
4.  **Path Details**: Detailed information for each endpoint: summary, operation id, description, tags, deprecation, external docs, security, parameters (`Path` / `Query` / `Header` / `Cookie`), request body, and responses.
5.  **References**: Detailed definitions of each component. Schemas are written in a TypeScript-like format; security schemes are written as a list.

### Notation

Schemas are rendered in a TypeScript-like notation with trailing comments for details.

| Notation | Meaning |
| :--- | :--- |
| `name?: string` | Optional property (properties listed in `required` have no `?`). |
| `string \| null` | Union of types (`nullable: true` adds `null`). |
| `//format: date-time` | The `format` of the value. |
| `//default: 0` | The default value. |
| `//minimum: 0`, `//maxLength: 10`, `//pattern: ^a` | Validation constraints (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minLength`, `maxLength`, `pattern`, `minItems`, `maxItems`, `uniqueItems`). |
| `enum[A, B]` | Enumerated values. |
| `[key: string]: T` | Map type (`additionalProperties`). |
| `A & B` | `allOf`. |
| `A \| B` | `oneOf`. |
| `Partial(A) & Partial(B)` | `anyOf` (any combination of the listed schemas). |
| `not(T)` | `not`. |
| `any` | A property without a type. |
| `// discriminator: kind` | The `discriminator` property of a `oneOf` / `anyOf` / `allOf`. |
| `// #/components/schemas/Name` | The schema was referenced with `$ref`. |

A `$ref` that is already being expanded (a circular reference) is not expanded again; only its reference name is written.

## Example

See [`examples/petstore.md`](examples/petstore.md), generated from the
[Petstore](https://learn.openapis.org/examples/v3.0/petstore.html) sample
([`examples/petstore.yaml`](examples/petstore.yaml)).

```sh
npm run example
```

## Development

```sh
pnpm install
pnpm lint      # ESLint
pnpm build     # TypeScript -> dist/
pnpm test      # Vitest (with coverage)
```

`test/example.test.ts` checks that `examples/petstore.md` matches the actual output. After changing the output format, run `npm run example` and commit the updated file.

## Release

Releases are automated by `.github/workflows/release.yml`. When a push to `master` contains a `package.json` version that has not been published yet, the workflow runs the tests, publishes the package to npm with [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no token), and creates the `v<version>` tag.

## License

MIT