import {ISizeCalculationResult} from "image-size/dist/types/interface";
import {imageSize} from "image-size";

export interface InputFile {
    file: string,
    modified: boolean,
    sizeData: ISizeCalculationResult,
    data: Partial<Cropper.Data>,
}

export function createNewInput(filename: string): InputFile {
    const sizeData = imageSize(filename);

    return {
        file: filename,
        modified: false,
        sizeData: sizeData,
        data: {
            x: 0,
            y: 0,
            rotate: 0,
            scaleX: 1,
            scaleY: 1,
        }
    }
}