import { promises as fs } from "fs";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getData } from "../src/libs/getData";
import { convertFile, convertMarkdownFile } from "../src/openapi-to-md";

vi.mock("../src/libs/getData", () => ({ getData: vi.fn() }));

vi.mock("fs", () => ({
  promises: {
    writeFile: vi.fn(),
  },
}));

describe("convertFile and CLI options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  const validYaml = `
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

  it("should set a non-zero exit code when the source is missing", async () => {
    vi.mocked(getData).mockResolvedValue(null);
    await convertMarkdownFile("missing.yaml", undefined);
    expect(process.exitCode).toBe(1);
  });

  it("should set a non-zero exit code when the document is invalid", async () => {
    vi.mocked(getData).mockResolvedValue("invalid");
    await convertMarkdownFile("invalid.yaml", undefined);
    expect(process.exitCode).toBe(1);
  });

  it("should set a non-zero exit code when conversion throws", async () => {
    vi.mocked(getData).mockResolvedValue(
      "swagger: '2.0'\ninfo: {title: x, version: '1'}\npaths:\n  /a:\n    get:\n      responses:\n        '200': {$ref: '#/nope'}\n",
    );
    await convertMarkdownFile("bad.yaml", undefined);
    expect(process.exitCode).toBe(1);
  });

  it("should leave the exit code untouched on success", async () => {
    vi.mocked(getData).mockResolvedValue(
      "openapi: 3.0.0\ninfo: {title: T, version: '1'}\npaths: {}\n",
    );
    await convertMarkdownFile("ok.yaml", undefined);
    expect(process.exitCode).toBeUndefined();
  });

  it("should output HTML when options.html is true", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.txt", { html: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.txt",
      expect.stringMatching(/<!doctype html>/i),
      "utf8",
    );
  });

  it("should output HTML when options.format is 'html'", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.txt", { format: "html" });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.txt",
      expect.stringMatching(/<!doctype html>/i),
      "utf8",
    );
  });

  it("should automatically output HTML when destFile ends in .html or .htm", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.html");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.html",
      expect.stringMatching(/<!doctype html>/i),
      "utf8",
    );

    await convertFile("source.yaml", "output.htm");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.htm",
      expect.stringMatching(/<!doctype html>/i),
      "utf8",
    );
  });

  it("should output HTML fragment when standalone is false", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.html", { standalone: false });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.html",
      expect.not.stringMatching(/<!doctype html>/i),
      "utf8",
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.html",
      expect.stringContaining('<div class="markdown-body">'),
      "utf8",
    );
  });

  it("should output Markdown when destination is not html and html option is false", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.md");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.md",
      expect.not.stringMatching(/<!doctype html>/i),
      "utf8",
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.md",
      expect.stringContaining("# Test API"),
      "utf8",
    );
  });

  it("should output PDF when options.pdf is true", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.bin", { pdf: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.bin",
      expect.any(Uint8Array),
    );
  });

  it("should output PDF when options.format is 'pdf'", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.bin", { format: "pdf" });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.bin",
      expect.any(Uint8Array),
    );
  });

  it("should automatically output PDF when destFile ends in .pdf", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.pdf");
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.pdf",
      expect.any(Uint8Array),
    );
  });

  it("should output PDF to stdout when destFile is undefined", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    await convertFile("source.yaml", undefined, { pdf: true });
    expect(stdoutSpy).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("should error on unsupported format", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.docx", { format: "docx" });
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('unsupported format "docx"'),
    );
  });

  it("should support PDF options like toc, cover, theme and outline", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.pdf", {
      toc: true,
      tocTitle: "目次",
      tocDepth: 2,
      cover: true,
      theme: "dark",
      outline: false,
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.pdf",
      expect.any(Uint8Array),
    );
  });

  it("should support disabling TOC via no-toc in PDF", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertFile("source.yaml", "output.pdf", {
      toc: false,
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.pdf",
      expect.any(Uint8Array),
    );
  });

  it("should accept boolean sort argument for backwards compatibility", async () => {
    vi.mocked(getData).mockResolvedValue(validYaml);
    await convertMarkdownFile("source.yaml", "output.md", true);
    expect(fs.writeFile).toHaveBeenCalledWith(
      "output.md",
      expect.stringContaining("# Test API"),
      "utf8",
    );
  });

  it("should handle error during conversion", async () => {
    vi.mocked(getData).mockResolvedValue("invalid content");
    await convertFile("source.yaml", "output.html");
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith("convert error");
  });

  it("should handle error during PDF conversion", async () => {
    vi.mocked(getData).mockResolvedValue("invalid content");
    await convertFile("source.yaml", "output.pdf");
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith("convert error");
  });
});
