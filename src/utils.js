const fs = require('fs')
const path = require('path')
const maxBy = require('lodash.maxby')
const moment = require('moment')

function isPackageFile (file) {
  return file === 'package.json'
}

function isNodeModules (file) {
  return file === 'node_modules' || /(node_modules)/.test(file)
}

function listDirectories (srcPath) {
  var files = fs.readdirSync(srcPath)
    .filter(file => fs.lstatSync(path.join(srcPath, file)).isDirectory())
    .map(dir => path.join(srcPath, dir))
  return files;
}

function findPackage (srcPath) {
  var files = fs.readdirSync(srcPath)
  var package = files.find(file => isPackageFile(file));
  if (!package) {
    return null;
  }

  return path.join(srcPath, package);
}

function findNodeModulesDirectory (srcPath) {
  var files = fs.readdirSync(srcPath);
  var nodeModulesDirectory = files.find(file => isNodeModules(file))

  if (nodeModulesDirectory) {
    let nodeModulesPath = path.join(srcPath, nodeModulesDirectory);

    if (fs.statSync(nodeModulesPath).isDirectory()) {
      return nodeModulesPath;
    }
  }

  return null;
}

function findNodeDirectories (path) {
  var dirs = listDirectories(path);
  var packages = [];

  dirs.forEach(dir => {
    if (isNodeModules(dir)) {
      return;
    }

    var package = findPackage(dir);
    var nodeModules = findNodeModulesDirectory(dir);

    if (!package) {
      let innerPackages = findNodeDirectories(dir)
      if (innerPackages.length > 0) {
        packages = packages.concat(innerPackages)
      }
    } else {
      packages.push({dir, package, nodeModules})
    }
  })

  return packages
}

function latestFileChanges (dir) {
  function allFiles (srcPath) {
    var all = fs.readdirSync(srcPath)
      .filter(file => !/(node_modules|.git)/.test(file))

    var {files, dirs} = all.reduce((map, file) => {
      var filePath = path.join(srcPath, file)
      if (fs.lstatSync(filePath).isDirectory()) {
        map.dirs.push(filePath)
      } else {
        map.files.push(filePath)
      }
      return map
    }, {files: [], dirs: []});

    return files.concat(...dirs.map(allFiles))
  }

  return allFiles(dir)
}

function getProjectName (packageFile) {
  try {
    return JSON.parse(fs.readFileSync(packageFile)).name
  } catch (e) {
    return null;
  }
}

module.exports.getCandidates = function getCandidates (srcPath) {
  return findNodeDirectories(srcPath)
  .filter(entry => !!entry.nodeModules)
  .map(entry => {
    var allFiles = latestFileChanges(entry.dir)
    var latestChange = maxBy(allFiles, file => {
      return fs.statSync(file).mtime
    })
    entry.latestChange = moment(fs.statSync(latestChange).mtime)
    entry.name = getProjectName(entry.package)
    return entry
  })
}
