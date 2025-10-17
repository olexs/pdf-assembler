import path from 'path';
import { app } from 'electron';

/**
 * Get the path to the bundled ImageMagick binary
 *
 * In development mode, binaries are located in resources/bin/{platform}/
 * In production mode, binaries are in app.asar.unpacked or process.resourcesPath
 *
 * @returns Full path to the magick executable
 */
export function getMagickBinaryPath(): string {
    const platform = process.platform;
    const isDev = !app.isPackaged;

    if (isDev) {
        // In development, use bundled binaries from resources
        const basePath = path.join(__dirname, '..', 'resources', 'bin', platform);
        return platform === 'win32'
            ? path.join(basePath, 'magick.exe')
            : path.join(basePath, 'magick');
    }

    // In production, binaries are in app.asar.unpacked or app resources
    const basePath = path.join(process.resourcesPath, 'bin', platform);
    return platform === 'win32'
        ? path.join(basePath, 'magick.exe')
        : path.join(basePath, 'magick');
}

/**
 * Get environment variables configured for bundled ImageMagick
 *
 * Sets MAGICK_HOME and MAGICK_CONFIGURE_PATH to use bundled configuration
 *
 * @returns Environment object to pass to child_process.exec()
 */
export function getMagickEnv(): NodeJS.ProcessEnv {
    const platform = process.platform;
    const isDev = !app.isPackaged;

    const basePath = isDev
        ? path.join(__dirname, '..', 'resources', 'bin', platform)
        : path.join(process.resourcesPath, 'bin', platform);

    return {
        ...process.env,
        MAGICK_HOME: basePath,
        MAGICK_CONFIGURE_PATH: path.join(basePath, 'config'),
    };
}
