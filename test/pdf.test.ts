import { describe, expect, it } from "vitest";
import { convertPdf, renderPdf } from "../src";

const sampleYaml = `
openapi: 3.0.0
info:
  title: Petstore API
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List pets
      responses:
        '200':
          description: OK
`;

const sampleV2Yaml = `
swagger: "2.0"
info:
  title: Swagger 2.0 Pets
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List pets
      responses:
        200:
          description: OK
`;

describe("convertPdf", () => {
  it("converts OpenAPI 3.0 to vector PDF bytes", async () => {
    const pdf = await convertPdf(sampleYaml);
    expect(pdf).toBeDefined();
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf!.length).toBeGreaterThan(100);
    // Verifies PDF magic header %PDF-
    const header = Buffer.from(pdf!.subarray(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("converts Swagger 2.0 to PDF", async () => {
    const pdf = await convertPdf(sampleV2Yaml);
    expect(pdf).toBeDefined();
    const header = Buffer.from(pdf!.subarray(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("returns undefined for invalid document", async () => {
    const result = await convertPdf("invalid content {{");
    expect(result).toBeUndefined();
  });

  it("supports template, cover, theme and pageSize options", async () => {
    const pdf = await convertPdf(sampleYaml, {
      title: "Custom PDF Title",
      theme: "dark",
      template: "report",
      cover: true,
      pageSize: "A4",
      toc: true,
    });
    expect(pdf).toBeDefined();
    expect(pdf!.length).toBeGreaterThan(100);
  });

  it("supports TOC customization and disabling TOC", async () => {
    const withToc = await convertPdf(sampleYaml, {
      tocTitle: "目次",
      tocDepth: 2,
    });
    expect(withToc).toBeDefined();

    const withoutToc = await convertPdf(sampleYaml, {
      toc: false,
      pdfOutline: false,
    });
    expect(withoutToc).toBeDefined();
  });

  it("supports sort option", async () => {
    const multiPathYaml = `
openapi: 3.0.0
info:
  title: Multi API
  version: 1.0.0
paths:
  /z:
    get:
      responses:
        '200':
          description: Z
  /a:
    get:
      responses:
        '200':
          description: A
`;
    const pdf = await convertPdf(multiPathYaml, { sort: true });
    expect(pdf).toBeDefined();
    const header = Buffer.from(pdf!.subarray(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});

describe("renderPdf", () => {
  it("renders markdown directly to PDF bytes", async () => {
    const pdf = await renderPdf("# Hello PDF World\n\nThis is a test.");
    expect(pdf).toBeDefined();
    expect(pdf).toBeInstanceOf(Uint8Array);
    const header = Buffer.from(pdf.subarray(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});
