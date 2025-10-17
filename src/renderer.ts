import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import {Modal} from 'bootstrap';
import {ipcRenderer} from 'electron';
import {generatePdf, GeneratorOptions} from './pdfGenerator';
import {preprocessInputFiles} from './preprocessor';
import path from 'path';
import fs from 'fs';
import * as child from 'child_process';
import util from 'util';
import {temporaryFile} from 'tempy';
import {initialize, translate, translateHtml} from './i18n/i18n';
import {sortByPreprocessedFilename} from './renderer/sort';

// eslint-disable-next-line import/no-named-as-default
import Sortable from 'sortablejs';
import {InputFile} from "./inputFile";
import Cropper from 'cropperjs';
import {magickApplyCropperJsTransform} from "./magickCommands";
import {registerDropHandlers} from "./dropFileHandling";

const exec = util.promisify(child.exec);

/*
 * Helpers
 */

function getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
}

/*
 * I18n
 */
ipcRenderer.on("initI18n", async (_event, data) => {
    await initialize(data as string);
    await translateHtml();
});

/*
 * Initialization
 */

window.addEventListener("DOMContentLoaded", async () => {
    loadSavedOptions();
    registerStaticCallbacks();
    initSortableJs();
    registerDropHandlers(addNewInputs);
});

function loadSavedOptions(): void {
    const savedOptionsString = localStorage.getItem("generator-preferences");

    if (savedOptionsString) {
        const savedOptions = JSON.parse(savedOptionsString) as Partial<GeneratorOptions>;
        getInput("margin-slider").value = savedOptions.marginSize.toString() || "30";
        getInput("margin-slider-value").value = savedOptions.marginSize.toString() || "30";
        getInput("spacing-slider").value = savedOptions.spacingBetweenElements.toString() || "30";
        getInput("spacing-slider-value").value = savedOptions.spacingBetweenElements.toString() || "30";
        getInput("omit-full-page-margin").checked = savedOptions.omitFullPageMargin || true;
        getInput("optimize-for-fax").checked = savedOptions.optimizeForFax || false;
        getInput("radio-orientation-portrait").checked = savedOptions.orientation === "portrait" || !savedOptions.orientation;
        getInput("radio-orientation-landscape").checked = savedOptions.orientation === "landscape";
        (document.getElementById("select-pagesize") as HTMLSelectElement).value = savedOptions.pageSize || "A4";
    }
}

function registerStaticCallbacks(): void {
    document.getElementById("save-button").onclick = savePDF;
    document.getElementById("print-button").onclick = printPDF;

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

    getInput("exit-after-saving").onchange = () => {
        const options = readOptionsFromUI();
        options.exitAfterSaving = getInput("exit-after-saving").checked;
        localStorage.setItem("generator-preferences", JSON.stringify(options));
    };

    getInput("radio-orientation-portrait").onclick = generateTempPDF;
    getInput("radio-orientation-landscape").onclick = generateTempPDF;
    (document.getElementById("select-pagesize") as HTMLSelectElement).onchange = generateTempPDF;
}

function initSortableJs() {
    const sortContainer = document.getElementById("input-list");
    Sortable.create(sortContainer, {
        handle: ".sortable-handle",
        onUpdate: (event) => {
            const draggedElement = inputFiles[event.oldDraggableIndex];
            inputFiles.splice(event.oldDraggableIndex, 1);
            inputFiles.splice(event.newDraggableIndex, 0, draggedElement);
            processInputFiles(inputFiles);
        }
    });
}

/*
 * Input processing and input preview
 */

const originalInputFiles: string[] = [];
let inputFiles: InputFile[] = [];
ipcRenderer.on("inputFiles", async (_event, data) => await addNewInputs(data as string[]));

async function addNewInputs(newInputs: string[]) {
    originalInputFiles.push(...newInputs);
    const newPreprocessed = await preprocessInputFiles(newInputs);
    const sortedPreprocessedInputs = sortByPreprocessedFilename(newPreprocessed);
    inputFiles.push(...sortedPreprocessedInputs);
    await processInputFiles(inputFiles);
}

async function processInputFiles(newInputFiles: InputFile[]) {
    if (newInputFiles.length === 0) {
        console.log("Renderer: No input files provided!");
    } else {
        if (document.getElementById("inputs-add-inputs")) {
            document.getElementById("inputs-add-inputs").style.display = "none";
        }
        if (document.getElementById("inputs-loading")) {
            document.getElementById("inputs-loading").style.display = "block";
        }

        console.log(`Renderer: Processing ${newInputFiles.length} input files`);
        const previews = await Promise.all(newInputFiles.map(async (file, index) => await generateInputThumbnail(file, index, newInputFiles.length)));
        document.getElementById("input-list").innerHTML = previews.join("");
    }

    inputFiles = newInputFiles;

    registerThumbnailCallbacks();
    if (inputFiles.length > 0) await generateTempPDF();
}

async function generateInputThumbnail(file: InputFile, index: number, totalImages: number): Promise<string> {

    const tempFile = temporaryFile({extension: "jpg"});

    const magickCommand = `magick convert "${file.file}" `
        + magickApplyCropperJsTransform(file.data, file.sizeData)
        + `-resize 64x64 -gravity Center -extent 64x64 "${tempFile}"`;

    await exec(magickCommand);

    const imageThumbnail = await fs.promises.readFile(tempFile);
    const imageThumbnailSrc = "data:image/jpeg;base64," + imageThumbnail.toString("base64");
    await fs.promises.rm(tempFile);

    const filename = path.basename(file.file, path.extname(file.file));

    let page = "";
    const pageMatch = filename.match(/\.pdf-[0-9]+$/);
    if (pageMatch && pageMatch[0])
        page = translate('page') + " " + (parseInt(pageMatch[0].replace(".pdf-", "")) + 1);

    return `<li class="list-group-item d-flex flex-row px-2">
        <img src="${imageThumbnailSrc}" alt="${filename}" class="me-2">
        <div class="flex-fill" style="min-width: 0">
            <div style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-weight: bold">${filename}</div>
            <div class="mt-2">${page}</div>
        </div>
        <div class="d-flex flex-row align-items-center">
            <button type="button" 
                    title="${translate('button_edit')}"
                    id="btn-input-edit-${index}" 
                    class="btn btn-primary float-end btn-sm ms-1">
                <i class="bi-sliders"></i>
            </button>
            <button type="button" 
                    title="${translate('button_delete')}"
                    id="btn-input-delete-${index}" 
                    class="btn btn-danger float-end btn-sm ms-1"
                    ${totalImages <= 1 ? 'disabled' : ''}>
                <i class="bi-trash"></i>
            </button>
            <span class="sortable-handle fs-2 ms-2"><i class="bi bi-list" title="${translate("drag_handle")}"></i></span>
        </div>
    </li>`;
}

function registerThumbnailCallbacks() {
    for (let index = 0; index < inputFiles.length; index++) {
        document.getElementById(`btn-input-delete-${index}`).onclick = () => deleteInput(index);
        document.getElementById(`btn-input-edit-${index}`).onclick = () => editInput(index);
    }
}

async function deleteInput(index: number): Promise<void> {
    const filename = path.basename(inputFiles[index].file, path.extname(inputFiles[index].file));
    if (!confirm(translate("confirm_delete", {filename}))) return;

    inputFiles.splice(index, 1);

    await processInputFiles(inputFiles);
}

async function editInput(index: number): Promise<void> {
    const modal = new Modal('#input-edit-modal');
    modal.show();

    const img = document.getElementById('input-edit-cropper') as HTMLImageElement;
    img.src = "file://" + inputFiles[index].file;

    const cropper = new Cropper(img);
    const cropperImage = cropper.getCropperImage();
    const cropperSelection = cropper.getCropperSelection();

    if (!cropperImage || !cropperSelection) {
        console.error('Failed to initialize cropper components');
        return;
    }

    // Apply initial transform data if exists
    const initialData = inputFiles[index].data;
    if (initialData.rotate) {
        cropperImage.$rotate((initialData.rotate * Math.PI) / 180);
    }
    if (initialData.scaleX !== undefined && initialData.scaleX !== 1) {
        cropperImage.$scale(initialData.scaleX, initialData.scaleY || 1);
    }
    if (initialData.x !== undefined && initialData.width && initialData.height) {
        cropperSelection.$change(initialData.x, initialData.y || 0, initialData.width, initialData.height);
    }

    const getCropData = () => {
        const transform = cropperImage.$getTransform();
        // Extract rotation from transformation matrix
        const rotation = Math.atan2(transform[1], transform[0]);
        const rotationDegrees = (rotation * 180) / Math.PI;

        // Extract scale from transformation matrix
        const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
        const scaleY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);

        return {
            x: cropperSelection.x,
            y: cropperSelection.y,
            width: cropperSelection.width,
            height: cropperSelection.height,
            rotate: rotationDegrees,
            scaleX: transform[0] < 0 ? -scaleX : scaleX,
            scaleY: transform[3] < 0 ? -scaleY : scaleY,
        };
    };

    const cleanup = () => {
        // Remove the cropper container element
        const container = cropper.container;
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    };

    document.getElementById('btn-input-edit-cancel').onclick = () => { cleanup(); modal.hide(); }
    document.getElementById('btn-input-edit-close').onclick = () => { cleanup(); modal.hide(); }
    document.getElementById('btn-input-edit-confirm').onclick = async () => {
        inputFiles[index].data = getCropData();
        inputFiles[index].modified = true;
        cleanup();
        modal.hide();
        await processInputFiles(inputFiles);
    }

    document.getElementById('btn-input-edit-reset').onclick = () => {
        cropperImage.$resetTransform();
        cropperSelection.$reset();
    }
    document.getElementById('btn-input-edit-rotate-cw').onclick = () => {
        cropperImage.$rotate((90 * Math.PI) / 180);
    }
    document.getElementById('btn-input-edit-rotate-ccw').onclick = () => {
        cropperImage.$rotate((-90 * Math.PI) / 180);
    }
    document.getElementById('btn-input-edit-flip-horizontal').onclick = () => {
        const transform = cropperImage.$getTransform();
        const currentScaleX = transform[0];
        cropperImage.$scale(-currentScaleX, transform[3]);
    }
    document.getElementById('btn-input-edit-flip-vertical').onclick = () => {
        const transform = cropperImage.$getTransform();
        const currentScaleY = transform[3];
        cropperImage.$scale(transform[0], -currentScaleY);
    }
    document.getElementById('btn-input-edit-zoom-in').onclick = () => { cropperImage.$zoom(0.1); }
    document.getElementById('btn-input-edit-zoom-out').onclick = () => { cropperImage.$zoom(-0.1); }
}

async function sortInputs(): Promise<void> {
    inputFiles = sortByPreprocessedFilename(inputFiles);
    await processInputFiles(inputFiles);
}

function addInput(): void {
    ipcRenderer.send("addDialogTriggered",
        originalInputFiles.length ? originalInputFiles[originalInputFiles.length - 1] : '');
}

ipcRenderer.on("addDialogConfirmed", async (_event, data) => await addNewInputs(data as string[]));

/*
 * PDF generation
 */

let previousBlobUrl = "";

async function generateTempPDF() {
    document.getElementById("preview-iframe").style.display = "none";
    document.getElementById("preview-no-input").style.display = "none";
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
    (<HTMLButtonElement>document.getElementById("print-button")).disabled = false;
}

function readOptionsFromUI(): Partial<GeneratorOptions> {
    return {
        marginSize: parseInt(getInput("margin-slider").value) || 30,
        spacingBetweenElements: parseInt(getInput("spacing-slider").value) || 30,
        omitFullPageMargin: getInput("omit-full-page-margin").checked,
        optimizeForFax: getInput("optimize-for-fax").checked,
        exitAfterSaving: getInput("exit-after-saving").checked,
        pageSize: (document.getElementById("select-pagesize") as HTMLSelectElement).value as "A4" | "LETTER",
        orientation: getSelectedOrientation()
    }
}

function getSelectedOrientation(): "portrait" | "landscape" {
    if (getInput("radio-orientation-portrait").checked) return "portrait";
    else return "landscape";
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

    // await exec(`explorer /select,"${chosenFilename}"`);

    if (getInput("exit-after-saving").checked) ipcRenderer.send("exitAfterSavingTriggered");
}

async function printPDF() {
    const pdfIframe = <HTMLIFrameElement>document.getElementById("preview-iframe");
    pdfIframe.focus();
    pdfIframe.contentWindow.print();
}
