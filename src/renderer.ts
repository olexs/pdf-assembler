import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import { ipcRenderer } from 'electron';
import { generatePdf, GeneratorOptions } from './pdfGenerator';
import { preprocessInputFiles } from './preprocessor';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

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
    registerStaticCallbacks();
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

function registerStaticCallbacks(): void {
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

    document.getElementById("btn-input-sort").onclick = sortInputs;
    document.getElementById("btn-input-add").onclick = addInput;
}

/*
 * Input processing and input preview
 */

let originalInputFiles: string[] = [];
let inputFiles: string[] = [];
ipcRenderer.on("inputFiles", async (_event, data) => { 
    originalInputFiles = data as string[];
    await processInputFiles(await preprocessInputFiles(originalInputFiles));
});

async function processInputFiles(newInputFiles: string[]) {
    if (newInputFiles.length === 0) {
        console.error("Renderer: No input files provided!");
    } else {
        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        const previews = await Promise.all(newInputFiles.map(async (file, index) => await generateInputThumbnail(file, index, newInputFiles.length)));
        document.getElementById("input-list").innerHTML = previews.join("");
    }

    inputFiles = newInputFiles;    

    registerThumbnailCallbacks();
    if (inputFiles.length > 0) generateTempPDF();
}

async function generateInputThumbnail(file: string, index: number, totalImages: number): Promise<string> {
    const imageThumbnail = await sharp(file)
        .resize(128, 64, { fit: 'contain', background: "white" })
        .toFormat("jpg")
        .toBuffer();
    const imageThumbnailSrc = "data:image/jpeg;base64," + imageThumbnail.toString("base64");

    const filename = path.basename(file, path.extname(file));

    let page = "";
    const pageMatch = filename.match(/\.pdf-[0-9]+$/);
    if (pageMatch && pageMatch[0])
        page = "Seite " + (parseInt(pageMatch[0].replace(".pdf-", "")) + 1);
    
    return `<li class="list-group-item d-flex flex-row px-2">
        <img src="${imageThumbnailSrc}" alt="${filename}" class="me-2">
        <div class="flex-fill" style="min-width: 0">
            <div style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-weight: bold">${filename}</div>
            <div class="mt-2">
                ${page}
                <button type="button" 
                        title="Entfernen"
                        id="btn-input-delete-${index}" 
                        class="btn btn-danger float-end btn-sm ms-1"
                        ${totalImages <= 1 ? 'disabled' : ''}>
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

function registerThumbnailCallbacks() {
    for (let index = 0; index < inputFiles.length; index++) {
        document.getElementById(`btn-input-delete-${index}`).onclick = () => deleteInput(index);     
        document.getElementById(`btn-input-up-${index}`).onclick = () => moveInputUp(index);     
        document.getElementById(`btn-input-down-${index}`).onclick = () => moveInputDown(index);     
    }
}

function deleteInput(index: number): void {
    const filename = path.basename(inputFiles[index], path.extname(inputFiles[index]));
    if (!confirm(`${filename} wirklich aus den Eingaben entfernen?`)) return;

    inputFiles.splice(index, 1);

    processInputFiles(inputFiles);
}

function moveInputUp(index: number): void {
    if (index <= 0) return;

    const temp = inputFiles[index];
    inputFiles[index] = inputFiles[index - 1];
    inputFiles[index - 1] = temp;

    processInputFiles(inputFiles);
}

function moveInputDown(index: number): void {
    if (index >= inputFiles.length - 1) return;

    const temp = inputFiles[index];
    inputFiles[index] = inputFiles[index + 1];
    inputFiles[index + 1] = temp;

    processInputFiles(inputFiles);
}

function sortInputs(): void {
    inputFiles.sort();

    processInputFiles(inputFiles);
}

function addInput(): void {

}

/*
 * PDF generation
 */

let previousBlobUrl = "";

async function generateTempPDF() {
    document.getElementById("preview-iframe").style.display = "none";
    document.getElementById("preview-spinner").style.display = "block";
    document.getElementById("progressbar").style.width = `0%`;
    
    (<HTMLButtonElement>document.getElementById("save-button")).disabled = true;
    if (previousBlobUrl) window.URL.revokeObjectURL(previousBlobUrl);
    
    const options = readOptionsFromUI();
    const pdfDataUrl = await generatePdf([...inputFiles], options, updateProgress);
    showPreview(pdfDataUrl + "#view=FitH&toolbar=0");

    localStorage.setItem("generator-preferences", JSON.stringify(options));
    previousBlobUrl = pdfDataUrl;

    (<HTMLButtonElement>document.getElementById("save-button")).disabled = false;
}

function readOptionsFromUI(): Partial<GeneratorOptions> {
    return {
        marginSize: parseInt(getInput("margin-slider").value) || 30,
        spacingBetweenElements: parseInt(getInput("spacing-slider").value) || 30,
        omitFullPageMargin: getInput("omit-full-page-margin").checked,
        optimizeForFax: getInput("optimize-for-fax").checked,
    }
}

function updateProgress(currentIndex: number): void {
    if (document.getElementById("progressbar")) {
        const percent = Math.round((currentIndex + 1) / inputFiles.length * 100);
        document.getElementById("progressbar").style.width = `${percent}%`;
    }
}

function showPreview(pdfDataUrl: string) {
    document.getElementById("preview-spinner").style.display = "none";
    document.getElementById("preview-iframe").style.display = "block";

    (<HTMLIFrameElement>document.getElementById("preview-iframe")).src = pdfDataUrl;
}

/*
 * Result saving
 */

async function savePDF() {
    ipcRenderer.send("saveDialogTriggered", originalInputFiles[0]);
}

ipcRenderer.on("saveDialogConfirmed", async (_event, data) => finishSaving(data as string));

async function finishSaving(chosenFilename: string) {
    const response = await fetch(previousBlobUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(chosenFilename, buffer);
}


