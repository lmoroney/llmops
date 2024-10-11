// version.js
const fs = require('fs').promises;
const path = require('path');
const semver = require('semver');

const VERSION_FILE = path.join(__dirname, 'version.json');

async function getCurrentVersion() {
  try {
    const data = await fs.readFile(VERSION_FILE, 'utf8');
    const { version } = JSON.parse(data);
    return version;
  } catch (error) {
    console.warn('Version file not found, creating new one with version 0.1.0');
    await updateVersion('0.1.0');
    return '0.1.0';
  }
}

async function updateVersion(type = 'patch') {
  let version;
  try {
    const data = await fs.readFile(VERSION_FILE, 'utf8');
    version = JSON.parse(data).version;
  } catch (error) {
    version = '0.1.0';
  }

  if (['major', 'minor', 'patch'].includes(type)) {
    version = semver.inc(version, type);
  } else if (semver.valid(type)) {
    version = type;
  } else {
    throw new Error('Invalid version or version type');
  }

  await fs.writeFile(VERSION_FILE, JSON.stringify({ version }, null, 2));
  console.log(`Version updated to ${version}`);
  return version;
}

module.exports = {
  getCurrentVersion,
  updateVersion
};