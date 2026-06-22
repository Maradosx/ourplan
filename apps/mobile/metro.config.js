const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const localReactDir = path.resolve(projectRoot, 'node_modules/react');
const localReactExists = fs.existsSync(localReactDir);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force react to resolve from mobile's local node_modules (react@19.1.0)
// to match react-native-renderer@19.1.0 bundled inside react-native
if (localReactExists) {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react') {
      return { filePath: path.resolve(localReactDir, 'index.js'), type: 'sourceFile' };
    }
    if (moduleName.startsWith('react/')) {
      const sub = moduleName.slice('react/'.length);
      const candidate = path.resolve(localReactDir, sub + '.js');
      if (fs.existsSync(candidate)) {
        return { filePath: candidate, type: 'sourceFile' };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
