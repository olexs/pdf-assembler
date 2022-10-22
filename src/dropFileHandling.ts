
export function registerDropHandlers(callbackOnDrop: (x: string[]) => void): void {

    // https://medium.com/@richard.stromer/how-to-get-drop-events-working-in-electron-a6f6173d9ae6
    document.body.addEventListener("dragover", evt => {
        evt.preventDefault();
    });

    const appWrapper = document.getElementById('app-wrapper') as HTMLDivElement;
    const dropOverlay = document.getElementById('input-drop-overlay') as HTMLDivElement;

    appWrapper.ondragenter = (event) => {
        dropOverlay.style.display = 'block';
        event.preventDefault();
        event.stopPropagation();
    }

    appWrapper.ondragleave = (event: DragEvent & { fromElement: unknown }) => {
        if (!event.fromElement) {
            dropOverlay.style.display = 'none';
        }
        event.preventDefault();
        event.stopPropagation();
    }

    appWrapper.ondrop = (event: DragEvent) => {
        dropOverlay.classList.remove('drop-highlight');
        dropOverlay.style.display = 'none';

        const filePaths = [...event.dataTransfer.files]
            .map(f => f.path);
        callbackOnDrop(filePaths);

        event.stopPropagation();
        event.preventDefault();
    }

    appWrapper.ondragend = (event) => {
        dropOverlay.style.display = 'none';
        event.preventDefault();
        event.stopPropagation();
    }

    dropOverlay.ondragenter = (event) => {
        dropOverlay.classList.add('drop-highlight');
        event.preventDefault();
        event.stopPropagation();
    }

    dropOverlay.ondragleave = (event) => {
        dropOverlay.classList.remove('drop-highlight');
        event.preventDefault();
        event.stopPropagation();
    }

    dropOverlay.ondragend = (event) => {
        dropOverlay.classList.remove('drop-highlight');
        dropOverlay.style.display = 'none';
        event.preventDefault();
        event.stopPropagation();
    }
}