export interface InputFile {
    file: string,
    data: Partial<Cropper.Data>,
}

export function createNewInput(filename: string): InputFile {
    return {
        file: filename,
        data: {
            x: 0,
            y: 0,
            rotate: 0,
            scaleX: 1,
            scaleY: 1,
        }
    }
}