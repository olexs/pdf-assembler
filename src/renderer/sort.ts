import path from 'path';
import {InputFile} from "../inputFile";

function sortByPreprocessedFilename(inputs: InputFile[]): InputFile[] {
    const copy = [...inputs];
    copy.sort((a, b) => path.basename(a.file)
        .localeCompare(path.basename(b.file),
            undefined,
            {numeric: true, sensitivity: 'base'}));
    return copy;
}

export {sortByPreprocessedFilename};
