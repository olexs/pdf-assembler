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
                    "button_down": "Move down",
                    "button_up": "Move up",
                    "page": "Page",
                    "confirm_delete": "Delete {{filename}} from the list of inputs?"                
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
                    "button_down": "Nach unten beewgen",
                    "button_up": "Nach oben bewegen",
                    "page": "Seite",
                    "confirm_delete": "{{filename}} wirklich aus den Eingaben entfernen?"
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
    });
}

function translate(key: string, options?: any): string {
    return i18next.t(key, options);
}

export { init, translateHtml, translate };