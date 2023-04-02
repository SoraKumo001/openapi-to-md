import { promises as fs } from "fs";
import https from "https";

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const getDataFromUrl = (url: string) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const data: string[] = [];
        response.on("data", (chunk) => {
          data.push(chunk);
        });
        response.on("end", () => {
          resolve(data.join(""));
        });
      })
      .on("error", () => {
        reject(null);
      });
  });
};

const getDataFromFile = (fileName: string) =>
  fs.readFile(fileName, { encoding: "utf8" }).catch(() => null);

export const getData = (name: string) =>
  isValidUrl(name) ? getDataFromUrl(name) : getDataFromFile(name);
