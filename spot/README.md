# spot
Report bugs in no time. Simply record bugs you spot directly from your browser and instantly generate comprehensive bug reports with all the information engineers need to fix them. No more back-and-forth.

## Contributing

This project uses [bun](https://bun.sh) as its package manager and Node >= v20.0.0. Install dependencies with `bun install`.

Running `bun run dev` will start a new chrome instance with the spot extension installed already, but you need to change the ingest point to your local dev env if you don't have an account on app.openreplay.com.

## Building

If you wish to compile your own version of the extension:

- run `bun run build`
- open chrome://extensions/ in your browser
- enable developer mode
- click on "Load unpacked" and select the `chrome-mv3` folder inside `spot/.output`