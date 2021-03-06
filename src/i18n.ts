import {init, t, TOptions} from "i18next";

async function initialize(language = "en"): Promise<void> {
    console.log("Initializing i18next in", language);
    await init({
        lng: language,
        fallbackLng: "en",
        resources: {
            en: {
                translation: {
                    "title": "PDF helper",
                    "header_input": "Input",
                    "loading": "Loading...",
                    "button_sort": "Sort A-Z",
                    "button_add": "Add input...",
                    "header_output": "Output",
                    "checkbox_optimize_for_fax": "Optimize for fax",
                    "header_page_settings": "Page settings",
                    "slider_margins": "Margins:",
                    "checkbox_omit_full_page_margin": "Omit margins for full-page images",
                    "slider_spacing": "Spacing between images:",
                    "header_preview": "Preview",
                    "loading_preview": "Loading preview...",
                    "button_save": "Save PDF...",
                    "button_print": "Print...",
                    "checkbox_exit_after_saving": "Close after saving",
                    "save_dialog_title": "Save PDF as...",
                    "save_dialog_file_type": "PDF file",
                    "save_dialog_default_suffix": "-combined",
                    "add_dialog_title": "Add input file...",
                    "add_dialog_file_type": "Supported input formats",
                    "button_delete": "Delete",
                    "drag_handle": "Drag-and-drop to change order",
                    "page": "Page",
                    "confirm_delete": "Delete {{filename}} from the list of inputs?",
                    "page_size": "Page layout:",
                    "orientation_portrait": "Portrait",
                    "orientation_landscape": "Landscape",             
                }
            },
            de: {
                translation: {
                    "title": "PDF Helfer",
                    "header_input": "Eingabe",
                    "loading": "Wird geladen...",
                    "button_sort": "Sortieren",
                    "button_add": "Hinzuf??gen...",
                    "header_output": "Ausgabe",
                    "checkbox_optimize_for_fax": "F??r Faxversand optimieren",
                    "header_page_settings": "Seiteneinstellungen",
                    "slider_margins": "R??nder:",
                    "checkbox_omit_full_page_margin": "R??nder bei gro??en Bildern weglassen",
                    "slider_spacing": "Abstand zwischen Bildern:",
                    "header_preview": "Vorschau",
                    "loading_preview": "Erstelle Vorschau...",
                    "button_save": "PDF speichern...",
                    "button_print": "Drucken...",
                    "checkbox_exit_after_saving": "Nach Speichern schlie??en",
                    "save_dialog_title": "PDF speichern unter...",
                    "save_dialog_file_type": "PDF-Datei",
                    "save_dialog_default_suffix": "-kombiniert",
                    "add_dialog_title": "Eingabe hinzuf??gen...",
                    "add_dialog_file_type": "Unterst??tzte Dateiformate",
                    "button_delete": "Entfernen",
                    "drag_handle": "Drag-and-Drop, um die Reihenfolge zu ??ndern",
                    "page": "Seite",
                    "confirm_delete": "{{filename}} wirklich aus den Eingaben entfernen?",
                    "page_size": "Seitengr????e:",
                    "orientation_portrait": "Hochformat",
                    "orientation_landscape": "Querformat",
                }
            }
        }
    });
}

async function translateHtml(): Promise<void> {
    Array.from(document.getElementsByTagName("*")).forEach((element: HTMLElement) => {
        const i18nkey = element.attributes.getNamedItem("data-i18n");
        if (i18nkey && i18nkey.value) {
            element.textContent = t(i18nkey.value);
        }

        const i18nTitleKey = element.attributes.getNamedItem("data-i18n-title");
        if (i18nTitleKey && i18nTitleKey.value) {
            element.title = t(i18nTitleKey.value);
        }
    });
}

function translate(key: string, options?: unknown): string {
    return t(key, options as TOptions<object>);
}

export { initialize, translateHtml, translate };