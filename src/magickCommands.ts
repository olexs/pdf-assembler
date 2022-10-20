const cmdEscapeChar = process.platform === "win32" ? "^" : "\\";

export const magickOptimizeForFax =
    `-colorspace gray ${cmdEscapeChar}( +clone -blur 5,5 ${cmdEscapeChar}) ` +
    `-compose Divide_Src -composite -normalize -threshold 80%% `;

export const magickApplyCropperJsTransform = (d: Partial<Cropper.Data>) =>
    `-rotate ${d.rotate} `
    + `-scale ${d.scaleX * 100}%x${d.scaleY * 100}% `
    + (d.width && d.height ? `-crop ${d.width}x${d.height}${d.x >= 0 ? '+' : ''}${d.x}${d.y >= 0 ? '+' : ''}${d.y} ` : '')