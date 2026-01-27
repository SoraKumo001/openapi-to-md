/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import https from "https";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getData } from "../src/libs/getData";

// Mock fs
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

// Mock https
vi.mock("https", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const mockResponseData = "url content";

    const mockReq = new EventEmitter();

    (https.get as any).mockImplementation(
      (url: string, callback: (res: any) => void) => {
        const response = new EventEmitter();

        process.nextTick(() => {
          callback(response);
          response.emit("data", mockResponseData);
          response.emit("end");
        });

        return mockReq;
      },
    );

    const result = await getData(mockUrl);

    expect(https.get).toHaveBeenCalledWith(mockUrl, expect.any(Function));
    expect(result).toBe(mockResponseData);
  });

  it("should reject null when https request fails", async () => {
    const mockUrl = "https://example.com/error";

    (https.get as any).mockImplementation((url: string, callback: any) => {
      const req = new EventEmitter();
      process.nextTick(() => {
        req.emit("error", new Error("Network error"));
      });
      return req;
    });

    await expect(getData(mockUrl)).rejects.toBeNull();
  });
});
