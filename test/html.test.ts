import { describe, expect, it } from "vitest";
import { convertHtml, renderHtml, DEFAULT_CSS } from "../src";

const sampleYaml = `
openapi: 3.0.0
info:
  title: "Test <API> & 'Service'"
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Successful response
`;

const sampleV2Yaml = `
swagger: "2.0"
info:
  title: Swagger 2.0 API
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List pets
      responses:
        200:
          description: OK
`;

describe("convertHtml", () => {
  it("converts OpenAPI 3.0 to standalone HTML by default", async () => {
    const html = await convertHtml(sampleYaml);
    expect(html).toBeDefined();
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain("<title>Test &lt;API&gt; &amp; 'Service'</title>");
    expect(html).toContain("<style>");
    expect(html).toContain('<article class="markdown-body">');
    expect(html).toContain("List users");
    // Verifies slugified heading ID generation for internal anchor navigation
    expect(html).toContain('id="getusers"');
    expect(html).toContain('href="#getusers"');
  });

  it("converts Swagger 2.0 to HTML", async () => {
    const html = await convertHtml(sampleV2Yaml);
    expect(html).toBeDefined();
    expect(html).toContain("<title>Swagger 2.0 API</title>");
    expect(html).toContain("List pets");
    expect(html).toContain('id="getpets"');
  });

  it("returns undefined for invalid document", async () => {
    const result = await convertHtml("not valid yaml or json {{{");
    expect(result).toBeUndefined();
  });

  it("supports standalone: false for HTML fragments", async () => {
    const html = await convertHtml(sampleYaml, { standalone: false });
    expect(html).toBeDefined();
    expect(html).not.toMatch(/<!doctype html>/i);
    expect(html).not.toContain("<head>");
    expect(html).toMatch(/^<div class="markdown-body">/);
    expect(html).toMatch(/<\/div>$/);
    expect(html).toContain("List users");
  });

  it("uses custom title when provided", async () => {
    const html = await convertHtml(sampleYaml, { title: "Custom Title & Co" });
    expect(html).toContain("<title>Custom Title &amp; Co</title>");
  });

  it("uses custom CSS when provided", async () => {
    const customCss = "body { background: red; }";
    const html = await convertHtml(sampleYaml, { css: customCss });
    expect(html).toContain(customCss);
  });

  it("supports theme and template options", async () => {
    const html = await convertHtml(sampleYaml, {
      theme: "dark",
      template: "report",
      cover: true,
      pageSize: "A4",
    });
    expect(html).toBeDefined();
    expect(html).toContain("cover");
  });

  it("supports TOC customization options", async () => {
    const html = await convertHtml(sampleYaml, {
      tocTitle: "目次",
      tocDepth: 2,
    });
    expect(html).toBeDefined();
    expect(html).toContain('<p class="toc-title">目次</p>');
    expect(html).toContain('<nav class="toc">');
  });

  it("supports sorting option", async () => {
    const multiPathYaml = `
openapi: 3.0.0
info:
  title: Multi API
  version: 1.0.0
paths:
  /b:
    get:
      responses:
        '200':
          description: B
  /a:
    get:
      responses:
        '200':
          description: A
`;
    const html = await convertHtml(multiPathYaml, { sort: true });
    expect(html).toBeDefined();
    const indexA = html!.indexOf('href="#geta"');
    const indexB = html!.indexOf('href="#getb"');
    expect(indexA).toBeLessThan(indexB);
  });
});

describe("renderHtml", () => {
  it("falls back to default title and generates heading ids", async () => {
    const html = await renderHtml("# Hello");
    expect(html).toContain("<title>API Documentation</title>");
    expect(html).toContain('<h1 id="hello">Hello</h1>');
  });
});
