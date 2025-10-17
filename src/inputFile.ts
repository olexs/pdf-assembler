import {ISizeCalculationResult} from "image-size/dist/types/interface";
import {imageSizeFromFile} from "image-size/fromFile";

export interface CropData {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotate?: number;
    scaleX?: number;
    scaleY?: number;
}

export interface InputFile {
    file: string,
    modified: boolean,
    sizeData: ISizeCalculationResult,
    data: CropData,
}

export async function createNewInput(filename: string): Promise<InputFile> {
    const sizeData = await imageSizeFromFile(filename);

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