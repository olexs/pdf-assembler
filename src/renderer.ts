import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import { ipcRenderer } from 'electron';
import generatePDF from './pdfGenerator';

ipcRenderer.on("inputFiles", (_event, data) => processInputFiles(data as string[]));
let inputFiles: string[] = ["C:/Dev/image-tool-electron/input/IMG_9402.JPG", "C:/Dev/image-tool-electron/input/IMG_9403.JPG"];

async function processInputFiles(newInputFiles: string[]) {
    if (newInputFiles.length === 0) {
        console.error("Renderer: No input files provided!");
    } else {
        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        document.getElementById("input-list").innerHTML = newInputFiles.map((file) => `<li>${file}</li>`).join("");
    }

    document.getElementById("save-button").onclick = savePDF;
    inputFiles = newInputFiles;

    console.log(inputFiles);
    if (inputFiles.length > 0)
        generateTempPDF();
}

async function generateTempPDF() {
    showPreviewPlaceholder();
    const pdfDataUrl = await generatePDF(inputFiles);
    showPreview(pdfDataUrl);
}

function showPreviewPlaceholder() {
    document.getElementById("preview-iframe").style.display = "none";
    document.getElementById("preview-spinner").style.display = "inline";
}

function showPreview(pdfDataUrl: string) {
    document.getElementById("preview-spinner").style.display = "none";

    document.getElementById("preview-iframe").style.display = "block";
    (<HTMLIFrameElement>document.getElementById("preview-iframe")).src = pdfDataUrl;
}

async function savePDF() {
    console.log("TODO: actually save some shit here");    
}

