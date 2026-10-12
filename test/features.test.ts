import { describe, it, expect } from "vitest";
import { convertMarkdown } from "../src/index";

const spec = (body: string) => `
openapi: 3.0.0
info:
  title: T
  version: "1"
${body}`;

describe("additionalProperties", () => {
  it("should output map types", async () => {
    const result = await convertMarkdown(
      spec(`paths: {}
components:
  schemas:
    Typed:
      type: object
      additionalProperties: {type: integer}
    Any:
      type: object
      additionalProperties: true
    Mixed:
      properties:
        id: {type: string}
      additionalProperties: {type: string}
`),
    );
    expect(result).toContain("{\n  [key: string]: integer\n}");
    expect(result).toContain("{\n  [key: string]: any\n}");
    expect(result).toContain("  id?: string\n  [key: string]: string\n}");
  });
});

describe("request body and responses", () => {
  const doc = spec(`paths:
  /a:
    post:
      requestBody:
        description: body desc
        required: true
        content:
          application/json:
            schema: {type: string}
            example: hello
      responses:
        '200':
          description: OK
          headers:
            X-Rate:
              description: remaining
              required: true
              schema: {type: integer}
          links:
            Next: {operationId: getNext, description: the next}
`);

  it("should output request body description, required and example", async () => {
    const result = await convertMarkdown(doc);
    expect(result).toContain("#### RequestBody\n\n*Required*\n\nbody desc");
    expect(result).toContain('- Example\n\n```json\n"hello"\n```');
  });

  it("should output response headers and links", async () => {
    const result = await convertMarkdown(doc);
    expect(result).toContain(
      "`Headers`\n\n```typescript\n// remaining\nX-Rate: integer\n```",
    );
    expect(result).toContain("`Links`\n\n- Next: getNext - the next");
  });
});

describe("metadata", () => {
  it("should output info extras, servers, tags, deprecated and externalDocs", async () => {
    const result = await convertMarkdown(`
openapi: 3.0.0
info:
  title: T
  version: "1"
  license: {name: MIT, url: "https://example.com/mit"}
  contact: {name: Dev, email: dev@example.com}
  termsOfService: https://example.com/tos
servers:
  - {url: "https://api.example.com", description: prod}
paths:
  /a:
    get:
      summary: old
      deprecated: true
      tags: [x, y]
      externalDocs: {url: "https://e.example.com", description: more}
      responses:
        '200':
          description: OK
`);
    expect(result).toContain("- License: [MIT](https://example.com/mit)");
    expect(result).toContain("- Contact: Dev <dev@example.com>");
    expect(result).toContain("- Terms of service: https://example.com/tos");
    expect(result).toContain("- Server: https://api.example.com (prod)");
    expect(result).toContain("| **deprecated** old |");
    expect(result).toContain("- Tags  \n  x, y");
    expect(result).toContain("- Deprecated  \n  true");
    expect(result).toContain("https://e.example.com (more)");
  });

  it("should output security schemes", async () => {
    const result = await convertMarkdown(
      spec(`paths: {}
components:
  securitySchemes:
    Oauth:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://a.example.com/auth
          tokenUrl: https://a.example.com/token
          scopes: {read: Read access}
    Key: {type: apiKey, in: header, name: X-Key}
`),
    );
    expect(result).toContain("- Type: oauth2\n- Flow: authorizationCode");
    expect(result).toContain("  - Scope `read`: Read access");
    expect(result).toContain("- Type: apiKey\n- In: header\n- Name: X-Key");
  });
});

describe("schema details", () => {
  it("should output discriminator, not and constraints", async () => {
    const result = await convertMarkdown(
      spec(`paths: {}
components:
  schemas:
    Pet:
      oneOf:
        - {type: string}
        - {type: integer}
      discriminator: {propertyName: kind}
    NotStr:
      not: {type: string}
    C:
      type: object
      properties:
        s: {type: string, minLength: 1, maxLength: 5, pattern: "^a"}
        n: {type: integer, minimum: 0}
        l: {type: array, items: {type: string}, minItems: 1}
`),
    );
    expect(result).toContain("// discriminator: kind\nstring | integer");
    expect(result).toContain("not(string)");
    expect(result).toContain("//minLength: 1 //maxLength: 5 //pattern: ^a");
    expect(result).toContain("n?: integer //minimum: 0");
    expect(result).toContain("l?: string[] //minItems: 1");
  });
});
