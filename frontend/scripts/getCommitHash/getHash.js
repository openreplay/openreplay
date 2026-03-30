// exec writeHash.sh to get latest commit hash in echo, write it to .env file
const { exec } = require('child_process');

const currentFileLocation = __dirname;

exec(`sh ${currentFileLocation}/writeHash.sh`, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error executing script: ${err}`);
    return;
  }
  if (stderr) {
    console.error(`Script error output: ${stderr}`);
    return;
  }
  const envContent = `COMMIT_HASH=${stdout.trim()}\n`;
  // we need to get .env and .env.sample and check if it has COMMIT_HASH,
  // if it does, replace it, if not, add it to the end of the file
  const fs = require('fs');
  const envPath = `${currentFileLocation}/../../.env`;
  const envSamplePath = `${currentFileLocation}/../../.env.sample`;
  let envFileContent = '';
  let envSampleFileContent = '';
  if (fs.existsSync(envPath)) {
    envFileContent = fs.readFileSync(envPath, 'utf-8');
  }
  if (fs.existsSync(envSamplePath)) {
    envSampleFileContent = fs.readFileSync(envSamplePath, 'utf-8');
  }
  if (envFileContent.includes('COMMIT_HASH=')) {
    const updatedEnvContent = envFileContent.replace(/COMMIT_HASH=.*/g, `COMMIT_HASH=${stdout.trim()}`);
    fs.writeFileSync(envPath, updatedEnvContent);
  } else {
    fs.appendFileSync(envPath, envContent);
  }
  if (envSampleFileContent.includes('COMMIT_HASH=')) {
    const updatedEnvSampleContent = envSampleFileContent.replace(/COMMIT_HASH=.*/g, `COMMIT_HASH=${stdout.trim()}`);
    fs.writeFileSync(envSamplePath, updatedEnvSampleContent);
  } else {
    fs.appendFileSync(envSamplePath, envContent);
  }
  console.log(`Commit hash written to ${envPath} and ${envSamplePath}: ${stdout.trim()}`);
});
