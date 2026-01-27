import { describe, it, expect } from "vitest";
import { convertPath, markdownText, readDocument, tableText } from "../src/utils";

describe("utils", () => {
  describe("readDocument", () => {
    it("should parse YAML string", () => {
      const yaml = "key: value";
      const result = readDocument(yaml);
      expect(result).toEqual({ key: "value" });
    });

    it("should parse JSON string", () => {
      const json = '{"key": "value"}';
      const result = readDocument(json);
      expect(result).toEqual({ key: "value" });
    });

    it("should return null for invalid input", () => {
      expect(readDocument("invalid")).toBeNull();
      expect(readDocument(null as any)).toBeNull();
    });

    it("should return null if parsed result is not an object", () => {
      expect(readDocument('"string"')).toBeNull();
      expect(readDocument("123")).toBeNull();
    });
  });

  describe("markdownText", () => {
    it("should replace newlines with two spaces and a newline", () => {
      const text = "line1\nline2";
      expect(markdownText(text)).toBe("line1  \nline2");
    });
  });

  describe("tableText", () => {
    it("should replace newlines with <br>", () => {
      const text = "line1\nline2";
      expect(tableText(text)).toBe("line1<br>line2");
    });
  });

  describe("convertPath", () => {
    it("should remove special characters and replace spaces", () => {
      const path = "Test Path!@#";
      expect(convertPath(path)).toBe("test-path");
    });

    it("should be lowercase", () => {
      const path = "MixedCase";
      expect(convertPath(path)).toBe("mixedcase");
    });
  });
});
