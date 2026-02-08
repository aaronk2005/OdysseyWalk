#!/usr/bin/env node
/**
 * One-off: generate public/favicon.ico from public/favicon-16x16.png and public/favicon-32x32.png
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pngToIco from "png-to-ico";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const out = join(publicDir, "favicon.ico");
const png16 = join(publicDir, "favicon-16x16.png");
const png32 = join(publicDir, "favicon-32x32.png");

const buf = await pngToIco([png16, png32]);
writeFileSync(out, buf);
console.log("Done: public/favicon.ico generated from 16x16 and 32x32 PNGs.");
