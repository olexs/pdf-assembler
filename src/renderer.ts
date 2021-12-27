import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import { ipcRenderer } from 'electron';
import { generatePdf, GeneratorOptions } from './pdfGenerator';

ipcRenderer.on("inputFiles", (_event, data) => processInputFiles(data as string[]));
let inputFiles: string[] = ["C:/Dev/image-tool-electron/input/IMG_9402.JPG", "C:/Dev/image-tool-electron/input/IMG_9403.JPG"];

async function processInputFiles(newInputFiles: string[]) {
    if (newInputFiles.length === 0) {
        console.error("Renderer: No input files provided!");
    } else {
        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        document.getElementById("input-list").innerHTML = newInputFiles.map((file) => `<li>${file}</li>`).join("");
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
    (<HTMLIFrameElement>document.getElementById("preview-iframe")).src = pdfDataUrl;
}

async function savePDF() {
    console.log("TODO: actually save some shit here");    
}

