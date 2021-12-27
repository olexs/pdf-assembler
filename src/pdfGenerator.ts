import pdfkit from "pdfkit";
import { imageSize } from "image-size";
import BlobStream from "blob-stream";

export default async function generatePdf(inputFiles: string[]): Promise<string> {
    // -------
    //  Setup
    // -------

    const pageSize = "A4";
    const marginSize = 36;
    const spacingBetweenElements = 36;

    // https://pdfkit.org/docs/paper_sizes.html, all numbers in PostScript points
    const fullPageWidth = 595.28;
    const fullPageHeight = 841.89;

    const availableWidth = fullPageWidth - (marginSize * 2);
    const availableHeightPerPage = fullPageHeight - marginSize; // full height minus bottom margin, top is included in y pos calculation

    // -----------------------
    // Pre-process input files
    // -----------------------
    console.log(`Generator: processing ${inputFiles.length} input files`);

    // -------------------
    // Generate output PDF
    // -------------------
    const doc = new pdfkit({ autoFirstPage: false, size: pageSize });

    let currentYPosition = availableHeightPerPage;

    console.debug("---");
    while (inputFiles.length > 0) {
        const inputFile = inputFiles.shift();
        console.log(`Processing ${inputFile}`);

        const size = imageSize(inputFile);
        const scaledHeight = size.height * (availableWidth / size.width);
        const requiredHeight = Math.ceil(Math.min(availableHeightPerPage, scaledHeight));
        console.debug(`Original size: ${size.width} x ${size.height}, required height: ${requiredHeight} pt`);

        const heightAvailableOnCurrentPage = availableHeightPerPage - currentYPosition;
        if (requiredHeight > heightAvailableOnCurrentPage) {

            console.log("Starting next page");

            doc.addPage({ margin: marginSize });
            currentYPosition = marginSize;
        }

        doc.image(inputFile, marginSize, currentYPosition, { fit: [availableWidth, requiredHeight] });

        currentYPosition += (requiredHeight + spacingBetweenElements);

        console.debug(`Placed image on page`);
        console.debug(`Height still available: ${availableHeightPerPage - currentYPosition} pt`);
        console.debug("---");
    }

    console.log("All images processed, outputting PDF document");
    let dataUrl = "";

    await new Promise<void>(async resolve => {
        const stream = doc.pipe(BlobStream());
        doc.end();
        stream.on('finish', async function () {
            dataUrl = await blobToDataURL(stream.toBlob('application/pdf'));
            console.log("Output done.");
            resolve();
        });
    });

    console.log("All done.");

    return dataUrl;
}

function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = _e => resolve(reader.result as string);
        reader.onerror = _e => reject(reader.error);
        reader.onabort = _e => reject(new Error("Read aborted"));
        reader.readAsDataURL(blob);
    });
}