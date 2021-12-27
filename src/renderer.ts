import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import { ipcRenderer } from 'electron';
import { generatePdf, GeneratorOptions } from './pdfGenerator';
import sharp from 'sharp';

ipcRenderer.on("inputFiles", (_event, data) => processInputFiles(data as string[]));
let inputFiles: string[] = ["C:/Dev/image-tool-electron/input/IMG_9402.JPG", "C:/Dev/image-tool-electron/input/IMG_9403.JPG"];

async function processInputFiles(newInputFiles: string[]) {
    if (newInputFiles.length === 0) {
        console.error("Renderer: No input files provided!");
    } else {
        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        const previews = await Promise.all(newInputFiles.map(async (file, index) => { return await generateInputFilePreview(file, index, newInputFiles.length) }));
        document.getElementById("input-list").innerHTML = previews.join("");
    }
    inputFiles = newInputFiles;

    loadSavedOptions();
    registerChangeListeners();

    if (inputFiles.length > 0)
        generateTempPDF();
}

function registerChangeListeners(): void {
    document.getElementById("save-button").onclick = savePDF;

    (<HTMLInputElement>document.getElementById("margin-slider")).onchange = generateTempPDF;
    (<HTMLInputElement>document.getElementById("margin-slider")).oninput = () => { 
        (<HTMLInputElement>document.getElementById("margin-slider-value")).value = (<HTMLInputElement>document.getElementById("margin-slider")).value;
    };
    (<HTMLInputElement>document.getElementById("spacing-slider")).onchange = generateTempPDF;
    (<HTMLInputElement>document.getElementById("spacing-slider")).oninput = () => { 
        (<HTMLInputElement>document.getElementById("spacing-slider-value")).value = (<HTMLInputElement>document.getElementById("spacing-slider")).value;
    };
    (<HTMLInputElement>document.getElementById("omit-full-page-margin")).onchange = generateTempPDF;
    (<HTMLInputElement>document.getElementById("optimize-for-fax")).onchange = generateTempPDF;
}

function readFormData(): Partial<GeneratorOptions> {
    return {
        marginSize: parseInt((<HTMLInputElement>document.getElementById("margin-slider")).value) || 35,
        spacingBetweenElements: parseInt((<HTMLInputElement>document.getElementById("spacing-slider")).value) || 35,
        omitFullPageMargin: (<HTMLInputElement>document.getElementById("omit-full-page-margin")).checked,
        optimizeForFax: (<HTMLInputElement>document.getElementById("optimize-for-fax")).checked,
    }
}

function loadSavedOptions(): void {
    const savedOptionsString = localStorage.getItem("generator-preferences");

    if (savedOptionsString) {
        const savedOptions = JSON.parse(savedOptionsString) as GeneratorOptions;
        (<HTMLInputElement>document.getElementById("margin-slider")).value = savedOptions.marginSize.toString();
        (<HTMLInputElement>document.getElementById("margin-slider-value")).value = savedOptions.marginSize.toString();
        (<HTMLInputElement>document.getElementById("spacing-slider")).value = savedOptions.spacingBetweenElements.toString();
        (<HTMLInputElement>document.getElementById("spacing-slider-value")).value = savedOptions.spacingBetweenElements.toString();
        (<HTMLInputElement>document.getElementById("omit-full-page-margin")).checked = savedOptions.omitFullPageMargin;
        (<HTMLInputElement>document.getElementById("optimize-for-fax")).checked = savedOptions.optimizeForFax;
    }
}

async function generateTempPDF() {
    const options = readFormData();
    const pdfDataUrl = await generatePdf([...inputFiles], options);
    showPreview(pdfDataUrl);

    localStorage.setItem("generator-preferences", JSON.stringify(options));
}

function showPreview(pdfDataUrl: string) {
    document.getElementById("preview-spinner").style.display = "none";
    document.getElementById("preview-iframe").style.display = "block";
    (<HTMLIFrameElement>document.getElementById("preview-iframe")).src = pdfDataUrl + "#toolbar=0&view=FitH";
}

async function savePDF() {
    console.log("TODO: actually save some shit here");    
}

async function generateInputFilePreview(file: string, index: number, totalImages: number): Promise<string> {
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


