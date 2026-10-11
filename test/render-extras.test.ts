import { describe, it, expect } from "vitest";
import { convertMarkdown } from "../src/index";

const spec = (body: string) => `
openapi: 3.0.0
info:
  title: T
  version: "1"
${body}`;

describe("security and examples", () => {
  it("should output optional security as None instead of undefined", async () => {
    const result = await convertMarkdown(
      spec(`paths:
  /a:
    get:
      security:
        - {}
        - ApiKey: []
          Oauth: []
      responses:
        '200':
          description: OK
`),
    );
    expect(result).not.toContain("undefined");
    expect(result).toContain("- Security  \n  None  \n  ApiKey + Oauth");
  });

  it("should output a singular example", async () => {
    const result = await convertMarkdown(
      spec(`paths:
  /a:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: {type: string}
              example: hello
`),
    );
    expect(result).toContain('- Example\n\n```json\n"hello"\n```');
  });
});
