import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { convertMarkdown } from "../src/index";

describe("examples", () => {
  it("petstore.md should match the generated output (run `npm run example` to update)", async () => {
    const src = readFileSync("examples/petstore.yaml", "utf8");
    const expected = readFileSync("examples/petstore.md", "utf8");
    expect(await convertMarkdown(src)).toBe(expected.trimEnd());
  });
});
