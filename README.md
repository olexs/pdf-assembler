# Olex's PDF Assembler

This tool allows to merge multiple images or PDF files into a single multi-page PDF, optionally pre-processing the images for quick transfer via fax.

Image manipulation is done using ImageMagick, "magick convert" needs to be available on the PATH for this tool to work.

## How to use

Build and install in a location of your choosing.

`npm run make`

### Windows - SendTo

Create a shortcut to the generated .exe file and place it in the SendTo folder (`C:\Users\<Username>\AppData\Roaming\Microsoft\Windows\SendTo` or just enter `sendto` into the Windows Explorer address bar). Select one or more image and/or PDF files, and use the right-click menu -> Send to -> your new shortcut to run the application.

## Built with

- Electron Forge
- Typescript
- ImageMagick
- PDFkit
- Bootstrap and Bootstrap-Icons
