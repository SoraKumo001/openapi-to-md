#!/usr/bin/env node
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { program } from "commander";
import { getData } from "./libs/getData";
import { convertMarkdown } from ".";

const getVersion = () => {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, "../package.json"), "utf8"),
    );
    return pkg.version as string;
  } catch {
    return "unknown";
  }
};

export const convertMarkdownFile = async (
  srcFile: string,
  destFile: string | undefined,
  sort = false,
) => {
  const src = await getData(srcFile);
  if (!src) {
    console.error(`'${srcFile}' not found`);
    process.exitCode = 1;
    return;
  }
  let output: string | undefined;
  try {
    output = await convertMarkdown(src.toString(), sort);
  } catch (e) {
    console.error(`convert error: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }
  if (!output) {
    console.error("convert error");
    process.exitCode = 1;
    return;
  }
  if (destFile) {
    await fs.writeFile(destFile, output, "utf8");
  } else {
    console.log(output);
  }
};

program
  .version(getVersion())
  .option("-s, --sort", "sort", false)
  .arguments("<source> [destination]")
  .action((src, dest, options) => convertMarkdownFile(src, dest, options.sort));

if (require.main === module) {
  program.parseAsync(process.argv).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
