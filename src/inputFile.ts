export interface InputFile {
    file: string,
    rotation: 0 | 90 | 180 | 270,
    crop: {
        left: number,
        top: number,
        right: number,
        bottom: number,
    }
}

export function createNewInput(filename: string): InputFile {
    return {
        file: filename,
        rotation: 0,
        crop: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        }
    }
}