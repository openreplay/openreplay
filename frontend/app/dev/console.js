export const KEY = '__OPENREPLAY_DEV_TOOLS__';

export const options = {
  logStuff(verbose = true) {
    this.verbose = verbose;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        verbose: this.verbose,
        enableCrash: this.enableCrash,
      }),
    );
  },
  enableCrash: false,
  verbose: false,
  exceptionsLogs: [],
};

export const clearLogs = () => {
  options.exceptionsLogs = [];
};

const storedString = localStorage.getItem(KEY);
if (storedString) {
  const storedOptions = JSON.parse(storedString);
  Object.assign(options, storedOptions);
}

window[KEY] = options;
