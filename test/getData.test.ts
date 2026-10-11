/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from "fs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getData } from "../src/libs/getData";

// Mock fs
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe("getData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("should read data from file when given a file path", async () => {
    const mockFileContent = "file content";
    (fs.readFile as any).mockResolvedValue(mockFileContent);

    const result = await getData("test.txt");

    expect(fs.readFile).toHaveBeenCalledWith("test.txt", { encoding: "utf8" });
    expect(result).toBe(mockFileContent);
  });

  it("should return null when reading file fails", async () => {
    (fs.readFile as any).mockRejectedValue(new Error("File not found"));

    const result = await getData("nonexistent.txt");

    expect(fs.readFile).toHaveBeenCalledWith("nonexistent.txt", {
      encoding: "utf8",
    });
    expect(result).toBeNull();
  });

  it("should fetch data from URL when given a valid URL", async () => {
    const mockUrl = "https://example.com/data";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => "url content" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getData(mockUrl);

    expect(fetchMock).toHaveBeenCalledWith(mockUrl);
    expect(result).toBe("url content");
  });

  it("should return null when the HTTP status is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, text: async () => "Not Found" }),
    );

    expect(await getData("https://example.com/missing")).toBeNull();
  });

  it("should return null when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    expect(await getData("https://example.com/error")).toBeNull();
  });

  it("should treat a Windows absolute path as a file, not a URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    (fs.readFile as any).mockResolvedValue("content");

    const result = await getData("C:\work\api.yaml");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toBe("content");
  });
});
