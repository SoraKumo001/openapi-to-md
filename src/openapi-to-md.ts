#!/usr/bin/env node
import { promises as fs, readFileSync } from "fs";
import path from "path";
import { program } from "commander";
import { getData } from "./libs/getData";
import { convertMarkdown, convertHtml, convertPdf } from ".";

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

export interface CliOptions {
  sort?: boolean;
  format?: string;
  html?: boolean;
  pdf?: boolean;
  standalone?: boolean;
  theme?: "light" | "dark";
  template?: string;
  pageSize?: string;
  toc?: boolean;
  tocTitle?: string;
  tocDepth?: number;
  cover?: boolean;
  outline?: boolean;
}

export const convertFile = async (
  srcFile: string,
  destFile: string | undefined,
  options: boolean | CliOptions = {},
) => {
  const opts: CliOptions =
    typeof options === "boolean" ? { sort: options } : options;
  const src = await getData(srcFile);
  if (!src) {
    console.error(`'${srcFile}' not found`);
    process.exitCode = 1;
    return;
  }

  let format: "md" | "html" | "pdf";
  if (opts.pdf) {
    format = "pdf";
  } else if (opts.html) {
    format = "html";
  } else if (opts.format) {
    const f = opts.format.toLowerCase();
    if (f === "pdf") {
      format = "pdf";
    } else if (f === "html" || f === "htm") {
      format = "html";
    } else if (f === "md" || f === "markdown") {
      format = "md";
    } else {
      console.error(
        `unsupported format "${opts.format}". Choose from: md, html, pdf`,
      );
      process.exitCode = 1;
      return;
    }
  } else if (destFile && /\.pdf$/i.test(destFile)) {
    format = "pdf";
  } else if (destFile && /\.html?$/i.test(destFile)) {
    format = "html";
  } else {
    format = "md";
  }

  try {
    if (format === "pdf") {
      const output = await convertPdf(src.toString(), {
        sort: opts.sort,
        theme: opts.theme,
        template: opts.template,
        toc: opts.toc,
        tocTitle: opts.tocTitle,
        tocDepth: opts.tocDepth,
        cover: opts.cover,
        pageSize: opts.pageSize,
        pdfOutline: opts.outline,
      });
      if (!output) {
        console.error("convert error");
        process.exitCode = 1;
        return;
      }
      if (destFile) {
        await fs.writeFile(destFile, output);
      } else {
        process.stdout.write(Buffer.from(output));
      }
    } else if (format === "html") {
      const output = await convertHtml(src.toString(), {
        sort: opts.sort,
        standalone: opts.standalone,
        theme: opts.theme,
        template: opts.template,
        toc: opts.toc,
        tocTitle: opts.tocTitle,
        tocDepth: opts.tocDepth,
        cover: opts.cover,
        pageSize: opts.pageSize,
      });
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
    } else {
      const output = await convertMarkdown(src.toString(), opts.sort);
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
    }
  } catch (e) {
    console.error(`convert error: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
};

export const convertMarkdownFile = convertFile;

program
  .version(getVersion())
  .option("-s, --sort", "sort paths and references alphabetically", false)
  .option("-f, --format <format>", "output format (md, html, pdf)")
  .option("--html", "output as HTML", false)
  .option("--pdf", "output as PDF", false)
  .option("--no-standalone", "output HTML fragment without document shell")
  .option("--theme <light|dark>", "color theme for HTML/PDF (default: light)")
  .option("--template <name>", "document template for HTML/PDF")
  .option("--page-size <size>", "PDF page size (e.g. A4, Letter)")
  .option("--toc", "include table of contents in HTML/PDF")
  .option("--no-toc", "exclude table of contents")
  .option("--toc-title <title>", "heading title for the table of contents")
  .option(
    "--toc-depth <depth>",
    "deepest heading level in table of contents, 1-6",
    (v) => parseInt(v, 10),
  )
  .option("--cover", "include cover page in HTML/PDF")
  .option("--no-cover", "exclude cover page")
  .option("--no-outline", "exclude PDF bookmarks/outline tree")
  .arguments("<source> [destination]")
  .action((src, dest, options) => convertFile(src, dest, options));

if (require.main === module) {
  program.parseAsync(process.argv).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
