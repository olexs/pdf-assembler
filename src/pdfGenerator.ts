import pdfkit from "pdfkit";
import { imageSize } from "image-size";
import BlobStream from "blob-stream";
import tempy from 'tempy';
import fs from 'fs';
import * as child from 'child_process';
import util from 'util';
const exec = util.promisify(child.exec);

interface GeneratorOptions {
    pageSize: "A4",
    marginSize: number,
    spacingBetweenElements: number,
    omitFullPageMargin: boolean,
    optimizeForFax: boolean
}

const defaultOptions: GeneratorOptions = {
    pageSize: "A4",
    marginSize: 30,
    spacingBetweenElements: 30,
    omitFullPageMargin: true,
    optimizeForFax: false
}

async function generatePdf(inputFiles: string[], options: Partial<GeneratorOptions>, updateProgress: (currentIndex: number) => void): Promise<string> {
    // -------
    //  Setup
    // -------
    const { pageSize, marginSize, spacingBetweenElements, omitFullPageMargin, optimizeForFax } = options ? Object.assign(defaultOptions, options) as GeneratorOptions : defaultOptions;

    // https://pdfkit.org/docs/paper_sizes.html, all numbers in PostScript points
    const fullPageWidth = 595.28;
    const fullPageHeight = 841.89;

    const magickMaxSize = `${Math.round(fullPageWidth * 3)}x${Math.round(fullPageHeight * 3)}`;

    const availableWidth = fullPageWidth - (marginSize * 2);
    const availableHeightPerPage = fullPageHeight - marginSize; // full height minus bottom margin, top is included in y pos calculation

    const fullPageAspectRatio = fullPageHeight / fullPageWidth;

    // -----------------------
    // Pre-process input files
    // -----------------------
    console.log(`Generator: processing ${inputFiles.length} input files`);

    console.debug("Max size", magickMaxSize);

    // -------------------
    // Generate output PDF
    // -------------------
    const doc = new pdfkit({ autoFirstPage: false, size: pageSize });
    const stream = doc.pipe(BlobStream());

    let currentYPosition = availableHeightPerPage;

    console.debug("---");
    let currentIndex = 0;
    while (inputFiles.length > 0) {
        const inputFile = inputFiles.shift();
        console.log(`Processing ${inputFile}`);
        
        const size = imageSize(inputFile);

        const imageAspectRatio = size.height / size.width;
        const isImageFullPage = Math.abs(imageAspectRatio - fullPageAspectRatio) <= 0.02;
        const imageUsesFullPage = omitFullPageMargin && isImageFullPage;
        if (imageUsesFullPage) console.log("Using full page size");

        const scaledHeight = size.height * (availableWidth / size.width);
        const requiredHeight = Math.ceil(Math.min(availableHeightPerPage, scaledHeight));
        console.debug(`Original size: ${size.width} x ${size.height}, required height: ${requiredHeight} pt`);
        
        const heightAvailableOnCurrentPage = availableHeightPerPage - currentYPosition;
        if (imageUsesFullPage || requiredHeight > heightAvailableOnCurrentPage) {
            console.log("Starting next page");
            doc.addPage({ size: pageSize, margin: 0 });
            currentYPosition = marginSize;
        }

        let processedImage: string;  
        if (optimizeForFax) {
            const tempFile = tempy.file({extension: "jpg"});
            console.log("temp file for", inputFile, ":", tempFile);

            try {
                await exec(`magick convert "${inputFile}" -resize ${magickMaxSize} -colorspace gray ^( +clone -blur 5,5 ^) -compose Divide_Src -composite -normalize -threshold 80%% "${tempFile}"`);
            } catch(e: any) {
                console.error(e);
            }

            processedImage = tempFile;
        } else {
            processedImage = inputFile;
        }
        
        const xOffset = imageUsesFullPage ? 0 : marginSize;
        const yOffset = imageUsesFullPage ? 0 : currentYPosition;
        const fit: [number, number] = imageUsesFullPage ? [fullPageWidth, fullPageHeight] : [availableWidth, requiredHeight];
        doc.image(processedImage, xOffset, yOffset, { fit });

        if (optimizeForFax) { // remove temp image from IM preproccessing
            await fs.promises.rm(processedImage);
        }

        currentYPosition += (requiredHeight + spacingBetweenElements);

        updateProgress(currentIndex);
        currentIndex++;

        console.debug(`Placed image on page`);
        console.debug(`Height still available: ${availableHeightPerPage - currentYPosition} pt`);
        console.debug("---");
    }

    console.log("All images processed, outputting PDF document");
    const dataUrl = await new Promise<string>(resolve => {
        doc.end();
        stream.on('finish', async function () {
            console.log("Output done.");
            resolve(stream.toBlobURL('application/pdf'));
        });
    });

    console.log("All done.");

    return dataUrl;
}

export { generatePdf, GeneratorOptions };
