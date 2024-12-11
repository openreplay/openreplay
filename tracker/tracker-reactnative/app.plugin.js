const { withMainApplication } = require('@expo/config-plugins');

function addPackageToMainApplication(src) {
  console.log('Adding OpenReplay package to MainApplication.java', src);
  // Insert `packages.add(new ReactNativePackage());` before return packages;
  if (src.includes('packages.add(new ReactNativePackage())')) {
    return src;
  }
  return src.replace(
    'return packages;',
    `packages.add(new com.openreplay.reactnative.ReactNativePackage());\n    return packages;`
  );
}

module.exports = function configPlugin(config) {
  return withMainApplication(config, (config) => {
    if (config.modResults.contents) {
      config.modResults.contents = addPackageToMainApplication(config.modResults.contents);
    }
    return config;
  });
};
