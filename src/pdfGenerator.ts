import pdfkit from "pdfkit";
import { imageSize } from "image-size";
import BlobStream from "blob-stream";
import {temporaryFile} from 'tempy';
import fs from 'fs';
import * as child from 'child_process';
import util from 'util';
const exec = util.promisify(child.exec);

interface GeneratorOptions {
    pageSize: "A4" | "LETTER",
    orientation: "portrait" | "landscape",
    marginSize: number,
    spacingBetweenElements: number,
    omitFullPageMargin: boolean,
    optimizeForFax: boolean,
    exitAfterSaving: boolean
}

const defaultOptions: GeneratorOptions = {
    pageSize: "A4",
    orientation: "portrait",
    marginSize: 30,
    spacingBetweenElements: 30,
    omitFullPageMargin: true,
    optimizeForFax: false,
    exitAfterSaving: true
}

// https://pdfkit.org/docs/paper_sizes.html, all numbers in PostScript points
const pageSizesPortrait = {
    "A4": [595.28, 841.89],
    "LETTER": [612, 792],
}

const maximumAspectRatioDeviationFromFullPage = 0.05;

// https://exiftool.org/TagNames/EXIF.html, 0x0112 Orientation
const exifOrientationCodes = {
    ROTATE_90: 6,
    ROTATE_270: 8
}

async function generatePdf(inputFiles: string[], options: Partial<GeneratorOptions>, updateProgress: (currentIndex: number) => void): Promise<string> {
    // -------
    //  Setup
    // -------
    const { pageSize, orientation, marginSize, spacingBetweenElements, omitFullPageMargin, optimizeForFax } =
        options ? Object.assign(defaultOptions, options) as GeneratorOptions : defaultOptions;

    const widthIndex = orientation === "portrait" ? 0 : 1;
    const heightIndex = orientation === "portrait" ? 1 : 0;

    const fullPageWidth = pageSizesPortrait[pageSize][widthIndex];
    const fullPageHeight = pageSizesPortrait[pageSize][heightIndex];

    const magickMaxSize = `${Math.round(fullPageWidth * 3)}x${Math.round(fullPageHeight * 3)}`;

    const availableWidth = fullPageWidth - (marginSize * 2);
    const availableHeightPerPage = fullPageHeight - marginSize * 2;

    const fullPageAspectRatio = fullPageHeight / fullPageWidth;

    // -----------------------
    // Pre-process input files
    // -----------------------
    console.log(`Generator: processing ${inputFiles.length} input files`);

    console.debug("Max size", magickMaxSize);

    // -------------------
    // Generate output PDF
    // -------------------
    const doc = new pdfkit({ autoFirstPage: false, size: pageSize, layout: orientation });
    const stream = doc.pipe(BlobStream());

    let currentYPosition = availableHeightPerPage;

    console.debug("---");
    let currentIndex = 0;
    while (inputFiles.length > 0) {
        const inputFile = inputFiles.shift();
        console.log(`Processing ${inputFile}`);

        const sizeData = imageSize(inputFile);

        const isImageRotated = sizeData.orientation 
            && (sizeData.orientation == exifOrientationCodes.ROTATE_90 
                || sizeData.orientation === exifOrientationCodes.ROTATE_270);

        const imageWidth = !isImageRotated ? sizeData.width : sizeData.height;
        const imageHeight = !isImageRotated ? sizeData.height : sizeData.width;

        const imageAspectRatio = imageHeight / imageWidth;
        const aspectRatioDeviationFromFullPage = Math.abs(imageAspectRatio - fullPageAspectRatio);
        const isImageFullPage = aspectRatioDeviationFromFullPage <= maximumAspectRatioDeviationFromFullPage;
        const imageUsesFullPage = omitFullPageMargin && isImageFullPage;
        console.debug("Deviation from full page ratio:", aspectRatioDeviationFromFullPage);
        if (imageUsesFullPage) console.log("Using full page size");

        const scaledHeight = imageHeight * (availableWidth / imageWidth);
        const requiredHeight = Math.ceil(Math.min(availableHeightPerPage, scaledHeight));
        const requiredWidth = requiredHeight / imageAspectRatio;
        console.debug(`Original size: ${imageWidth} x ${imageHeight}, required size: ${requiredWidth} x ${requiredHeight} pt`);

        const heightAvailableOnCurrentPage = availableHeightPerPage - currentYPosition;
        if (imageUsesFullPage || requiredHeight > heightAvailableOnCurrentPage) {
            console.log("Starting next page");
            doc.addPage({ size: pageSize, margin: 0, layout: orientation });
            currentYPosition = marginSize;
        }

        let processedImageFile: string;
        if (optimizeForFax) {
            const tempFile = temporaryFile({ extension: "jpg" });
            console.log("temp file for", inputFile, ":", tempFile);

            try {
                const cmdEscapeChar = process.platform === "win32" ? "^" : "\\";
                const magickCommand = `magick convert "${inputFile}" -resize ${magickMaxSize} ` +
                    `-colorspace gray ${cmdEscapeChar}( +clone -blur 5,5 ${cmdEscapeChar}) ` +
                    `-compose Divide_Src -composite -normalize -threshold 80%% "${tempFile}"`;

                await exec(magickCommand);
            } catch (e: unknown) {
                console.error(e);
            }

            processedImageFile = tempFile;
        } else {
            processedImageFile = inputFile;
        }

        const xOffset = imageUsesFullPage ? 0 : marginSize;
        const yOffset = imageUsesFullPage ? 0 : currentYPosition;

        const fit: [number, number] = imageUsesFullPage ? [fullPageWidth, fullPageHeight] : [requiredWidth, requiredHeight];
        console.debug("Fitting image in", fit);

        if (isImageRotated && sizeData.orientation === exifOrientationCodes.ROTATE_90) {
            console.debug("Image rotation is 90° CW, offsets are", [xOffset, yOffset]);
            doc.rotate(90, { origin: [xOffset, yOffset] });
            doc.image(processedImageFile, 
                xOffset, 
                yOffset - (imageUsesFullPage ? fullPageWidth : requiredWidth), 
                { fit: imageUsesFullPage ? [fullPageHeight, fullPageWidth] : [requiredHeight, requiredWidth] });
            doc.rotate(-90, { origin: [xOffset, yOffset] });
        } else if (isImageRotated && sizeData.orientation === exifOrientationCodes.ROTATE_270) {
            // 270° CW
            console.debug("Image rotation is 270° CW, offsets are", [xOffset, yOffset]);
            doc.rotate(270, { origin: [xOffset, yOffset] });
            doc.image(processedImageFile, 
                xOffset - (imageUsesFullPage ? fullPageHeight : requiredHeight), 
                yOffset, 
                { fit: imageUsesFullPage ? [fullPageHeight, fullPageWidth] : [requiredHeight, requiredWidth] });
            doc.rotate(-270, { origin: [xOffset, yOffset] });
        } else {
            // no or unsupported rotation, place as is
            doc.image(processedImageFile, 
                xOffset, 
                yOffset, 
                { fit: imageUsesFullPage ? [fullPageWidth, fullPageHeight] : [requiredWidth, requiredHeight] });
        }

        if (optimizeForFax) { // remove temp image from IM preproccessing
            await fs.promises.rm(processedImageFile);
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
