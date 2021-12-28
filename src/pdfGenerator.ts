import pdfkit from "pdfkit";
import { imageSize } from "image-size";
import BlobStream from "blob-stream";

interface GeneratorOptions {
    pageSize: "A4",
    marginSize: number,
    spacingBetweenElements: number,
    omitFullPageMargin: boolean,
    optimizeForFax: boolean
}

const defaultOptions: GeneratorOptions = {
    pageSize: "A4",
    marginSize: 35,
    spacingBetweenElements: 35,
    omitFullPageMargin: true,
    optimizeForFax: false
}

async function generatePdf(inputFiles: string[], options?: Partial<GeneratorOptions>): Promise<string> {
    // -------
    //  Setup
    // -------
    const { pageSize, marginSize, spacingBetweenElements } = options ? Object.assign(defaultOptions, options) as GeneratorOptions : defaultOptions;

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
    const stream = doc.pipe(BlobStream());

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
            
            doc.addPage({ size: pageSize, margin: 0 });
            currentYPosition = marginSize;
        }
        
        doc.image(inputFile, marginSize, currentYPosition, { fit: [availableWidth, requiredHeight] });

        currentYPosition += (requiredHeight + spacingBetweenElements);

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
