import {exifOrientationCodes} from "./exifOrientationCodes";
import {ISizeCalculationResult} from "image-size/dist/types/interface";
import {CropData} from "./inputFile";

const cmdEscapeChar = process.platform === "win32" ? "^" : "\\";

export const magickOptimizeForFax =
    `-colorspace gray ${cmdEscapeChar}( +clone -blur 5,5 ${cmdEscapeChar}) ` +
    `-compose Divide_Src -composite -normalize -threshold 80%% `;

export const magickApplyCropperJsTransform = (raw: CropData, sizeData: ISizeCalculationResult) => {

    const exifRotated = sizeData.orientation === exifOrientationCodes.ROTATE_90
        || sizeData.orientation === exifOrientationCodes.ROTATE_270;
    const exifRotation = sizeData.orientation === exifOrientationCodes.ROTATE_90 ? '90' : '270';

    return (exifRotated ? `-rotate ${exifRotation} ` : '')
        + `-rotate ${raw.rotate} `
        + (raw.scaleY < 0 ? '-flip ' : '') + (raw.scaleX < 0 ? '-flop ' : '')
        + `-scale ${Math.abs(raw.scaleX) * 100}%x${Math.abs(raw.scaleY) * 100}% `
        + (raw.width && raw.height
            ? `-crop ${raw.width}x${raw.height}${raw.x >= 0 ? '+' : ''}${raw.x}${raw.y >= 0 ? '+' : ''}${raw.y} `
            : '')
        + (exifRotated ? `-rotate -${exifRotation} ` : '');
}