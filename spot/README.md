# spot
Report bugs in no time. Simply record bugs you spot directly from your browser and instantly generate comprehensive bug reports with all the information engineers need to fix them. No more back-and-forth.

## Contributing

Be sure to install [nvm](https://github.com/nvm-sh/nvm) or [n](https://www.npmjs.com/package/n) before starting, or simply use node >= v20.0.0.

Running `yarn dev` will start new chrome instance with spot extension installed already, but you need to change ingest point to your local dev env if you don't have account on app.openreplay.com.

## Building

If you wish to compile your own version of the extension:

- run `yarn build` 
- open chrome://extensions/ in your browser
- enable developer mode
- click on "Load unpacked" and select the `chrome-mv3` folder inside `spot/.output`