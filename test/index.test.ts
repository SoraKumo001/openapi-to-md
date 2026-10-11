import { promises as fs } from "fs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertMarkdown } from "../src/index";
import { getData } from "../src/libs/getData";
import { convertMarkdownFile } from "../src/openapi-to-md";

// Mock dependencies
vi.mock("../src/libs/getData", () => ({
  getData: vi.fn(),
}));

vi.mock("fs", () => ({
  promises: {
    writeFile: vi.fn(),
  },
}));

describe("convertMarkdownFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should convert openapi yaml to markdown and write to file", async () => {
    const mockYaml = `
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
    vi.mocked(getData).mockResolvedValue(mockYaml);

    await convertMarkdownFile("source.yaml", "dest.md");

    expect(getData).toHaveBeenCalledWith("source.yaml");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "dest.md",
      expect.stringContaining("Test API"),
      "utf8",
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      "dest.md",
      expect.stringContaining("Path Table"),
      "utf8",
    );
  });

  it("should output to console if destFile is not provided", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;
    vi.mocked(getData).mockResolvedValue(mockYaml);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await convertMarkdownFile("source.yaml", undefined);

    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Test API"),
    );
  });

  it("should handle missing source file", async () => {
    vi.mocked(getData).mockResolvedValue(null);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await convertMarkdownFile("missing.yaml", "dest.md");

    expect(consoleErrorSpy).toHaveBeenCalledWith("'missing.yaml' not found");
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
  it("should handle convert error", async () => {
    vi.mocked(getData).mockResolvedValue("invalid json");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await convertMarkdownFile("invalid.json", "dest.md");

    expect(consoleErrorSpy).toHaveBeenCalledWith("convert error");
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});

describe("convertMarkdown", () => {
  it("should handle complex schemas", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Complex API
  version: 1.0.0
components:
  schemas:
    ComplexObject:
      type: object
      properties:
        prop1:
          type: string
        prop2:
          type: array
          items:
            type: integer
      required:
        - prop1
    AllOfSchema:
        allOf:
            - $ref: '#/components/schemas/ComplexObject'
            - type: object
              properties:
                extra:
                    type: boolean
    AnyOfSchema:
        anyOf:
            - type: string
            - type: integer
    OneOfSchema:
        oneOf:
            - type: string
            - type: boolean
    EnumSchema:
        type: string
        enum: [A, B, C]
        default: A

paths:
  /complex:
    post:
      parameters:
        - name: id
          in: query
          schema:
            type: string
        - name: header-param
          in: header
          schema:
            type: string
      requestBody:
        content:
            application/json:
                schema:
                    $ref: '#/components/schemas/ComplexObject'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ComplexObject'
              examples:
                example1:
                    value: { prop1: "val", prop2: [1, 2] }
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toBeDefined();
    expect(result).toContain("ComplexObject");
    expect(result).toContain("AllOfSchema");
    expect(result).toContain("AnyOfSchema");
    expect(result).toContain("OneOfSchema");
    expect(result).toContain("EnumSchema");
    expect(result).toContain("enum[A, B, C]");
    expect(result).toContain("default: A");
    expect(result).toContain("Parameters(Query)");
    expect(result).toContain("Headers");
    expect(result).toContain("RequestBody");
    expect(result).toContain("Examples");
  });

  it("should sort paths and references when sort option is true", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Sort API
  version: 1.0.0
components:
  schemas:
    B:
      type: string
    A:
      type: string
paths:
  /b:
    get:
      responses:
        '200':
            description: OK
  /a:
    get:
      responses:
        '200':
            description: OK
`;
    const result = await convertMarkdown(mockYaml, true);

    // Check if path /a appears before /b
    const indexA = result?.indexOf("/a");
    const indexB = result?.indexOf("/b");
    expect(indexA).toBeLessThan(indexB!);

    // Check if reference A appears before B
    // Note: exact string matching might be tricky depending on output format,
    // but the order in the references section should be A then B.
    const refIndexA = result?.indexOf("### #/components/schemas/A");
    const refIndexB = result?.indexOf("### #/components/schemas/B");
    expect(refIndexA).toBeLessThan(refIndexB!);
  });
  it("should return undefined for invalid document", async () => {
    const result = await convertMarkdown("invalid");
    expect(result).toBeUndefined();
  });

  it("should handle array of types", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Array Type API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: [string, null]
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("string | null");
  });

  it("should handle operation security, summary, description, and operationId", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Full Op API
  version: 1.0.0
paths:
  /test:
    get:
      summary: My Summary
      description: My Description
      operationId: myOpId
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: OK
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("My Summary");
    expect(result).toContain("My Description");
    expect(result).toContain("myOpId");
    expect(result).toContain("ApiKeyAuth");
  });

  it("should handle references in responses", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Ref Response API
  version: 1.0.0
components:
    schemas:
        MySchema:
            type: string
paths:
  /test:
    get:
      responses:
        '200':
            description: OK
            content:
                application/json:
                    schema:
                        $ref: '#/components/schemas/MySchema'
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("MySchema");
  });

  it("should handle JSON input", async () => {
    const mockJson = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "JSON API", version: "1.0.0" },
      paths: {},
    });
    const result = await convertMarkdown(mockJson);
    expect(result).toContain("JSON API");
  });

  it("should handle newlines in summary and description for tables", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Newline API
  version: 1.0.0
components:
  schemas:
    MySchema:
      description: |
        Line 1
        Line 2
      type: string
paths:
  /test:
    get:
      summary: |
        Summary Line 1
        Summary Line 2
      responses:
        '200':
          description: OK
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("Summary Line 1<br>Summary Line 2");
    expect(result).toContain("Line 1<br>Line 2");
  });

  it("should handle empty or invalid schemas gracefully", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Edge Case API
  version: 1.0.0
paths:
  /empty:
    get:
      responses:
        '204':
          description: No Content
  /invalid:
    get:
      parameters:
        - name: broken
          in: query
          # Missing schema
      responses:
        '200':
          description: OK
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("Edge Case API");
  });

  it("should handle circular references", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Circular API
  version: 1.0.0
components:
  schemas:
    Node:
      type: object
      properties:
        child:
          $ref: '#/components/schemas/Node'
paths: {}
`;
    const result = await convertMarkdown(mockYaml);
    expect(result).toContain("Node");
    expect(result).toContain("child:");
  });

  it("should handle parameters in path item", async () => {
    const mockYaml = `
openapi: 3.0.0
info:
  title: Path Param API
  version: 1.0.0
paths:
  /param/{id}:
    parameters:
      - name: id
        in: path
        schema:
          type: string
        required: true
    get:
      responses:
        '200':
          description: OK
`;
    // Note: The current implementation of converter.ts skips 'parameters' in path items loop:
    // if (method === "parameters") continue;
    // So this test mainly ensures it doesn't crash, even if it doesn't output them.
    // If the implementation changes to support common parameters, this test can be updated.
    const result = await convertMarkdown(mockYaml);
    expect(result).toBeDefined();
  });

  describe("regressions", () => {
    const spec = (body: string) => `
openapi: 3.0.0
info:
  title: T
  version: "1"
${body}`;

    it("should not treat path item summary as a method", async () => {
      const result = await convertMarkdown(
        spec(`paths:
  /a:
    summary: path summary
    description: path description
    get:
      responses:
        '200':
          description: OK
`),
      );
      expect(result).not.toContain("SUMMARY");
      expect(result).not.toContain("DESCRIPTION");
      expect(result).toContain("| GET |");
    });

    it("should output path-level and cookie parameters", async () => {
      const result = await convertMarkdown(
        spec(`paths:
  /users/{id}:
    parameters:
      - {name: id, in: path, required: true, schema: {type: string}}
    get:
      parameters:
        - {name: session, in: cookie, schema: {type: string}}
      responses:
        '200':
          description: OK
`),
      );
      expect(result).toContain("Parameters(Path)");
      expect(result).toContain("Parameters(Cookie)");
      expect(result).toContain("session");
    });

    it("should let operation parameters override path-level ones", async () => {
      const result = await convertMarkdown(
        spec(`paths:
  /a:
    parameters:
      - {name: q, in: query, schema: {type: string}}
    get:
      parameters:
        - {name: q, in: query, schema: {type: integer}}
      responses:
        '200':
          description: OK
`),
      );
      expect(result!.match(/q\?: /g)).toHaveLength(1);
      expect(result).toContain("q?: integer");
    });

    it("should resolve $ref responses", async () => {
      const result = await convertMarkdown(
        spec(`paths:
  /a:
    get:
      responses:
        '404':
          $ref: '#/components/responses/NotFound'
components:
  responses:
    NotFound:
      description: not found here
`),
      );
      expect(result).toContain("- 404 not found here");
      expect(result).not.toContain("undefined");
    });

    it("should not print undefined for top-level oneOf", async () => {
      const result = await convertMarkdown(
        spec(`paths: {}
components:
  schemas:
    U:
      oneOf:
        - type: string
        - type: integer
`),
      );
      expect(result).toContain("string | integer");
      expect(result).not.toContain("undefined");
    });

    it("should escape pipes in table cells", async () => {
      const result = await convertMarkdown(
        spec(`paths:
  /a:
    get:
      summary: "a | b"
      responses:
        '200':
          description: OK
`),
      );
      expect(result).toContain("a \\| b |");
    });
  });
});
