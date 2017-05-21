const Promise = require('bluebird')
const path = require('path')
const maxBy = require('lodash.maxby')
const moment = require('moment')
const fs = Promise.promisifyAll(require('fs'))

function isPackageFile (file) {
  return file === 'package.json'
}

function isNodeModules (file) {
  return file === 'node_modules' || /(node_modules)/.test(file)
}

function listDirectories (srcPath) {
  return fs.readdirAsync(srcPath).then(files => {
    return files
      .filter(file => fs.lstatSync(path.join(srcPath, file)).isDirectory())
      .map(dir => path.join(srcPath, dir))
  })
}

function findPackage (srcPath) {
  return fs.readdirAsync(srcPath).then(files => {
    var package = files.find(file => isPackageFile(file));
    if (!package) {
      return null;
    }

    return path.join(srcPath, package);
  })
}

function findNodeModulesDirectory (srcPath) {
  return fs.readdirAsync(srcPath).then(files => {
    var nodeModulesDirectory = files.find(file => isNodeModules(file))

    if (nodeModulesDirectory) {
      let nodeModulesPath = path.join(srcPath, nodeModulesDirectory);

      if (fs.statSync(nodeModulesPath).isDirectory()) {
        return nodeModulesPath;
      }
    }

    return null;
  })
}

function findNodeDirectories (path) {
  return listDirectories(path).then(dirs => {
    var promises = dirs.map(dir => {
      return Promise.all([
        findPackage(dir),
        findNodeModulesDirectory(dir)
      ]).spread((package, nodeModules) => {
        if (!package) {
          return findNodeDirectories(dir)
        }
        return [{dir, package, nodeModules}]
      })
    })

    return Promise.all(promises).then(results => {
      return results.reduce((flat, result) => flat.concat(result), [])
    })
  })
}

function latestFileChanges (dir) {
  function allFiles (srcPath) {
    return fs.readdirAsync(srcPath).then(all => {
      all = all.filter(file => !/(node_modules|.git)/.test(file));

      var {files, dirs} = all.reduce((map, file) => {
        var filePath = path.join(srcPath, file)
        if (fs.lstatSync(filePath).isDirectory()) {
          map.dirs.push(filePath)
        } else {
          map.files.push(filePath)
        }
        return map
      }, {files: [], dirs: []});

      return Promise.all(dirs.map(allFiles)).then(results => {
        return files.concat(...results)
      })
    })
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
  return findNodeDirectories(srcPath).then(allResults => {
    var results = allResults.filter(entry => !!entry.nodeModules);

    var promises = results.map(entry => {
      return latestFileChanges(entry.dir).then(allFiles => {
        var latestChange = maxBy(allFiles, file => fs.statSync(file).mtime)
        entry.latestChange = moment(fs.statSync(latestChange).mtime)
        entry.name = getProjectName(entry.package)
        return entry
      })
    })

    return Promise.all(promises)
  })
}
