import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import { ipcRenderer } from 'electron';
import { generatePdf, GeneratorOptions } from './pdfGenerator';
import sharp from 'sharp';

/*
 * Helpers
 */

function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

/*
 * Initialization
 */

window.addEventListener("DOMContentLoaded", () => {
    loadSavedOptions();
    registerStaticChangeListeners();
});

function loadSavedOptions(): void {
    const savedOptionsString = localStorage.getItem("generator-preferences");

    if (savedOptionsString) {
        const savedOptions = JSON.parse(savedOptionsString) as GeneratorOptions;
        getInput("margin-slider").value = savedOptions.marginSize.toString();
        getInput("margin-slider-value").value = savedOptions.marginSize.toString();
        getInput("spacing-slider").value = savedOptions.spacingBetweenElements.toString();
        getInput("spacing-slider-value").value = savedOptions.spacingBetweenElements.toString();
        getInput("omit-full-page-margin").checked = savedOptions.omitFullPageMargin;
        getInput("optimize-for-fax").checked = savedOptions.optimizeForFax;
    }
}

function registerStaticChangeListeners(): void {
    document.getElementById("save-button").onclick = savePDF;

    getInput("margin-slider").onchange = generateTempPDF;
    getInput("margin-slider").oninput = () => { 
        getInput("margin-slider-value").value = getInput("margin-slider").value;
    };
    getInput("spacing-slider").onchange = generateTempPDF;
    getInput("spacing-slider").oninput = () => { 
        getInput("spacing-slider-value").value = getInput("spacing-slider").value;
    };
    getInput("omit-full-page-margin").onchange = generateTempPDF;
    getInput("optimize-for-fax").onchange = generateTempPDF;
}

/*
 * Input processing and input preview
 */

let inputFiles: string[] = [];
ipcRenderer.on("inputFiles", (_event, data) => processInputFiles(data as string[]));

async function processInputFiles(newInputFiles: string[]) {
    if (newInputFiles.length === 0) {
        console.error("Renderer: No input files provided!");
    } else {
        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        const previews = await Promise.all(newInputFiles.map(async (file, index) => await generateInputThumbnail(file, index, newInputFiles.length)));
        document.getElementById("input-list").innerHTML = previews.join("");
    }

    inputFiles = newInputFiles;    

    if (inputFiles.length > 0) generateTempPDF();
}

async function generateInputThumbnail(file: string, index: number, totalImages: number): Promise<string> {
    const imageThumbnail = await sharp(file)
        .resize(128, 64, { fit: 'contain', background: "white" })
        .toFormat("jpg")
        .toBuffer();
    const imageThumbnailSrc = "data:image/jpeg;base64," + imageThumbnail.toString("base64");

    const filenameSegments = file.split("\\");
    const filename = filenameSegments[filenameSegments.length - 1];
    
    return `<li class="list-group-item d-flex flex-row px-2">
        <img src="${imageThumbnailSrc}" alt="${filename}" class="me-2">
        <div class="flex-fill" style="min-width: 0">
            <div style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-weight: bold">${filename}</div>
            <div class="mt-2">
                <button type="button" 
                        title="Entfernen"
                        id="btn-input-up-${index}" 
                        class="btn btn-danger float-end btn-sm ms-1">
                    <i class="bi-trash"></i>
                </button>
                <button type="button" 
                        title="Nach unten bewegen"
                        id="btn-input-down-${index}" 
                        class="btn btn-secondary float-end btn-sm ms-1" 
                        ${index === totalImages - 1 ? 'disabled' : ''}>
                    <i class="bi-arrow-down"></i>
                </button>
                <button type="button" 
                        title="Nach oben bewegen"
                        id="btn-input-up-${index}" 
                        class="btn btn-secondary float-end btn-sm ms-1" 
                        ${index === 0 ? 'disabled' : ''}>
                    <i class="bi-arrow-up"></i>
                </button>
            </div>
        </div>
    </li>`;
}

/*
 * PDF generation
 */

async function generateTempPDF() {
    const options = readOptionsFromUI();
    const pdfDataUrl = await generatePdf([...inputFiles], options);
    console.log("PDF data: string size: " + pdfDataUrl.length);
    showPreview(pdfDataUrl);

    localStorage.setItem("generator-preferences", JSON.stringify(options));
}

function readOptionsFromUI(): Partial<GeneratorOptions> {
    return {
        marginSize: parseInt(getInput("margin-slider").value) || 35,
        spacingBetweenElements: parseInt(getInput("spacing-slider").value) || 35,
        omitFullPageMargin: getInput("omit-full-page-margin").checked,
        optimizeForFax: getInput("optimize-for-fax").checked,
    }
}

function showPreview(pdfDataUrl: string) {
    document.getElementById("preview-spinner").style.display = "none";
    document.getElementById("preview-iframe").style.display = "block";
    (<HTMLIFrameElement>document.getElementById("preview-iframe")).src = pdfDataUrl + "#toolbar=0&view=FitH";
}

/*
 * Result saving
 */

async function savePDF() {
    console.log("TODO: actually save some shit here");    
}




