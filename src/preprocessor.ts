import tempy from 'tempy';
import fs from 'fs';
import path from 'path';
import * as child from 'child_process';
import util from 'util';
const exec = util.promisify(child.exec);

async function preprocessInputFiles(inputFiles: string[]): Promise<string[]> {
    const processedFiles = await Promise.all(inputFiles.map(processFile));
    return processedFiles.flat();
}

const supportedExtensions = [
    ".jpg", ".jpeg",
    ".png", 
    ".bmp",
    ".pdf",
    ".tiff"
];

async function processFile(inputFile: string): Promise<string[]> {
    if (!fs.existsSync(inputFile)) {
        console.error("Input file error: file doesn't exist:", inputFile);
        return [];
    }

    const extension = path.extname(inputFile).toLowerCase();
    if (supportedExtensions.indexOf(extension) === -1) {
        console.error("Input file error: unsupported extension:", inputFile);
        return [];
    }

    if (extension === ".pdf") {
        return deconstructPdf(inputFile);
    }

    return [inputFile];
}

async function deconstructPdf(inputFile: string): Promise<string[]> {
    const inputFilename = path.basename(inputFile);
    const tempDir = tempy.directory({prefix: 'pdfhelper_deconstruct'});
    console.log("Deconstructing", inputFilename, "to", tempDir);
    const magickTargetFilename = tempDir + path.sep + inputFilename + ".jpg";
    
    await exec(`magick convert -density 216 "${inputFile}" "${magickTargetFilename}"`);

    const files = await fs.promises.readdir(tempDir);

    return files.map(file => tempDir + path.sep + file);
}

export { preprocessInputFiles };