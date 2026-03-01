import i18next, {Resource, TOptions} from "i18next";
import {english} from "./strings/english";
import {german} from "./strings/german";

const resources: Resource = {
    en: {
        translation: english
    },
    de: {
        translation: german
    }
};

async function initialize(language = "en"): Promise<void> {
    console.log("Initializing i18next in", language);

    await i18next.init({
        lng: language,
        fallbackLng: "en",
        resources: resources
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

function translate(key: string, options?: unknown): string {
    return i18next.t(key, options as TOptions);
}

export {initialize, translateHtml, translate, resources};