import { promises as fs } from "fs";

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const getDataFromUrl = async (url: string) => {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
};

const getDataFromFile = (fileName: string) =>
  fs.readFile(fileName, { encoding: "utf8" }).catch(() => null);

export const getData = (name: string): Promise<string | null> =>
  isHttpUrl(name) ? getDataFromUrl(name) : getDataFromFile(name);
