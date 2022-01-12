import i18next from "i18next";

async function init(language: string = "en"): Promise<void> {
    console.log("Initializing i18next in", language);
    await i18next.init({
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
                    "button_add": "Hinzufügen...",
                    "header_output": "Ausgabe",
                    "checkbox_optimize_for_fax": "Für Faxversand optimieren",
                    "header_page_settings": "Seiteneinstellungen",
                    "slider_margins": "Ränder:",
                    "checkbox_omit_full_page_margin": "Ränder bei großen Bildern weglassen",
                    "slider_spacing": "Abstand zwischen Bildern:",
                    "header_preview": "Vorschau",
                    "loading_preview": "Erstelle Vorschau...",
                    "button_save": "PDF speichern...",
                    "checkbox_exit_after_saving": "Nach Speichern schließen",
                    "save_dialog_title": "PDF speichern unter...",
                    "save_dialog_file_type": "PDF-Datei",
                    "save_dialog_default_suffix": "-kombiniert",
                    "add_dialog_title": "Eingabe hinzufügen...",
                    "add_dialog_file_type": "Unterstützte Dateiformate",
                    "button_delete": "Entfernen",
                    "drag_handle": "Drag-and-Drop, um die Reihenfolge zu ändern",
                    "page": "Seite",
                    "confirm_delete": "{{filename}} wirklich aus den Eingaben entfernen?",
                    "page_size": "Seitengröße:",
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
            element.textContent = i18next.t(i18nkey.value);
        }

        const i18nTitleKey = element.attributes.getNamedItem("data-i18n-title");
        if (i18nTitleKey && i18nTitleKey.value) {
            element.title = i18next.t(i18nTitleKey.value);
        }
    });
}

function translate(key: string, options?: any): string {
    return i18next.t(key, options);
}

export { init, translateHtml, translate };