import os from 'os';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

export function temporaryFile({extension = ''}: {extension?: string} = {}): string {
    const ext = extension ? '.' + extension.replace(/^\./, '') : '';
    return path.join(os.tmpdir(), crypto.randomBytes(16).toString('hex') + ext);
}

export function temporaryDirectory({prefix = ''}: {prefix?: string} = {}): string {
    const dir = path.join(os.tmpdir(), (prefix ? prefix + '-' : '') + crypto.randomBytes(16).toString('hex'));
    fs.mkdirSync(dir, {recursive: true});
    return dir;
}
