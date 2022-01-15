import { sortByPreprocessedFilename } from "./sort";

describe('input sort', () => {

    it('should sort input files alphabetically', () => {
        const inputs = ["input3.jpg", "input1.png", "input2.bmp"];

        const sorted = sortByPreprocessedFilename(inputs);

        expect(sorted).toEqual(["input1.png", "input2.bmp", "input3.jpg"]);
    });

    it('should sort based on file names only, ignoring folders', () => {
        const inputs = ["aaa/input3.jpg", "bbb/input1.png", "ccc/input2.bmp"];

        const sorted = sortByPreprocessedFilename(inputs);

        expect(sorted).toEqual(["bbb/input1.png", "ccc/input2.bmp", "aaa/input3.jpg"]);
    });

    it('should sort pages extracted from a PDF by number', () => {
        const inputs = ["file.pdf-0.jpg", "file.pdf-1.jpg", "file.pdf-10.jpg", "file.pdf-11.jpg", "file.pdf-2.jpg", "file.pdf-3.jpg"];

        const sorted = sortByPreprocessedFilename(inputs);

        expect(sorted).toEqual(["file.pdf-0.jpg", "file.pdf-1.jpg", "file.pdf-2.jpg", "file.pdf-3.jpg", "file.pdf-10.jpg", "file.pdf-11.jpg"]);
    });

});
