import path from 'path';

function sortByPreprocessedFilename(inputs: string[]): string[] {
    const copy = [...inputs];
    copy.sort((a, b) => path.basename(a).localeCompare(path.basename(b),
        undefined,
        {numeric: true, sensitivity: 'base'}));
    return copy;
}

export {sortByPreprocessedFilename};
