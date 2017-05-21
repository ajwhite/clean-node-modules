const fs = require('fs')
const path = require('path')
const maxBy = require('lodash.maxby')

function listDirectories (srcPath) {
  var files = fs.readdirSync(srcPath)
    .filter(file => fs.lstatSync(path.join(srcPath, file)).isDirectory())
    .map(dir => path.join(srcPath, dir))
  return files;
}

function findPackage (srcPath) {
  var files = fs.readdirSync(srcPath)
  var package = files.find(file => file === 'package.json');
  if (!package) {
    return null;
  }

  return path.join(srcPath, package);
}

function findNodeModulesDirectory (srcPath) {
  var files = fs.readdirSync(srcPath);
  var nodeModulesDirectory = files.find(file => file === 'node_modules')

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
    var package = findPackage(dir);
    //var nodeModules = findNodeModulesDirectory(dir);

    if (!package) {
      let innerPackages = findNodeDirectories(dir)
      if (innerPackages.length > 0) {
        packages = packages.concat(innerPackages)
      }
    } else {
      packages.push({dir, package})
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

module.exports.getCandidates = function getCandidates (srcPath) {
  return findNodeDirectories(path.resolve('../'))
  .map(entry => {
    var allFiles = latestFileChanges(entry.dir)
    var latestChange = maxBy(allFiles, file => {
      return fs.statSync(file).mtime
    })
    entry.latestChange = fs.statSync(latestChange).mtime
    return entry
  })
}
