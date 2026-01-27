#!/usr/bin/env node
import { promises as fs } from "fs";
import { program } from "commander";
import { getData } from "./libs/getData";
import { convertMarkdown } from ".";

export const convertMarkdownFile = async (
  srcFile: string,
  destFile: string | undefined,
  sort = false,
) => {
  const src = await getData(srcFile);
  if (!src) {
    console.error(`'${srcFile}' not found`);
    return;
  }
  const output = await convertMarkdown(src.toString(), sort);
  if (!output) {
    console.error("convert error");
    return;
  }
  if (destFile) {
    fs.writeFile(destFile, output, "utf8");
  } else {
    console.log(output);
  }
};

program
  .version(process.env.npm_package_version || "unknown")
  .option("-s, --sort", "sort", false)
  .arguments("<source> [destination]")
  .action((src, dest, options) => {
    convertMarkdownFile(src, dest, options.sort);
  });

if (require.main === module) {
  program.parse(process.argv);
}
