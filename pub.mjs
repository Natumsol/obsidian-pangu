#!/usr/bin/env zx
const calcVersion = require('semver/functions/inc');

async function pub(version) {
  await $`npm run version`;
  await $`git add --all`;
  await $`git commit -m "chore: ${version}"`;
  await $`git tag -a ${version} -m "version ${version}"`;
  // await $`git push --follow-tags`;
}

async function getVersion(type) {
  const pkg = JSON.parse(await fs.readFile('./package.json'));
  const versionTypeMap = {
    x: 'major',
    y: 'minor',
    z: 'patch',
  };
  const version = calcVersion(pkg.version, versionTypeMap[type]);
  return version;
}

async function updatePkgVersion(version) {
  let pkg = JSON.parse(await fs.readFile('./package.json'));
  pkg.version = version;
  await fs.writeFile('./package.json', JSON.stringify(pkg, null, 2));
  let manifest = JSON.parse(await fs.readFile('./manifest.json'));
  manifest.version = version;
  await fs.writeFile('./manifest.json', JSON.stringify(manifest, null, 2));
}

async function main() {
  let type = await question('which version do you want to upgrade (`x` or `y` or `z`)?');
  type = type.toLowerCase();
  if (['x', 'y', 'z'].indexOf(type) > -1) {
    const version = await getVersion(type);
    await updatePkgVersion(version);
    await pub(version);
    console.log(chalk.green('[Info]: publish successfully!'));
  } else {
    console.log(chalk.red('[Error]: you must enter one of `x` or `y` or `z`.\n'));
  }
}

main();
