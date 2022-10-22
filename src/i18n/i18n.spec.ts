import fs from 'fs';
import path from 'path';
import {english} from "./strings/english";
import {german} from "./strings/german";

describe('i18n', () => {

    it.each(getAllI18nKeys().flatMap((key) => [
        [key, 'english', english],
        [key, 'german', german]
    ]))('should have a translation for %s in %s', (key: string, language: string, resource: object) => {
        expect(resource).toHaveProperty(key);
    });

});

function getAllI18nKeys(): string[] {
    const srcDir = path.join(__dirname, '..');
    const allFiles = getAllFilesInDir(srcDir);

    console.log(allFiles);

    const allKeys = allFiles.flatMap((file) => {
        const fileContents = fs.readFileSync(file).toString();
        const htmlKeys = (fileContents.match(/data-i18n(-title)?=["']([^"']+)["']/g) || [])
            .map(str => str.replace(/data-i18n(-title)?=["']([^"']+)["']/, '$2'));
        const codeKeys = (fileContents.match(/translate\(["']([^"']+)["']\)/g) || [])
            .map(str => str.replace(/translate\(["']([^"']+)["']\)/, '$1'));
        return [...htmlKeys, ...codeKeys];
    });

    return [...new Set(allKeys)];
}

function getAllFilesInDir(dir: string): string[] {
    const files: string[] = [];
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isFile()) {
            files.push(fullPath);
        } else {
            files.push(...getAllFilesInDir(fullPath));
        }
    });
    return files;
}