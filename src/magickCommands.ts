import {exifOrientationCodes} from "./exifOrientationCodes";
import {ISizeCalculationResult} from "image-size/dist/types/interface";

const cmdEscapeChar = process.platform === "win32" ? "^" : "\\";

export const magickOptimizeForFax =
    `-colorspace gray ${cmdEscapeChar}( +clone -blur 5,5 ${cmdEscapeChar}) ` +
    `-compose Divide_Src -composite -normalize -threshold 80%% `;

export const magickApplyCropperJsTransform = (raw: Partial<Cropper.Data>, sizeData: ISizeCalculationResult) => {

    const exifRotated = sizeData.orientation === exifOrientationCodes.ROTATE_90
        || sizeData.orientation === exifOrientationCodes.ROTATE_270;
    const exifRotation = sizeData.orientation === exifOrientationCodes.ROTATE_90 ? '90' : '270';

    return (exifRotated ? `-rotate ${exifRotation} ` : '')
        + `-rotate ${raw.rotate} `
        + `-scale ${raw.scaleX * 100}%x${raw.scaleY * 100}% `
        + (raw.width && raw.height
            ? `-crop ${raw.width}x${raw.height}${raw.x >= 0 ? '+' : ''}${raw.x}${raw.y >= 0 ? '+' : ''}${raw.y} `
            : '')
        + (exifRotated ? `-rotate -${exifRotation} ` : '');
}