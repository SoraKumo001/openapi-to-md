import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getData } from "../src/libs/getData";
import { convertMarkdownFile } from "../src/openapi-to-md";

vi.mock("../src/libs/getData", () => ({ getData: vi.fn() }));

describe("convertMarkdownFile exit code", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

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
});
