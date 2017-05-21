const path = require('path');
const meow = require('meow');
const Ora = require('ora')
const inquirer = require('inquirer')
const {getCandidates} = require('./utils');

const cli = meow(`
  Usage
    $ clean-node-modules <directory>

  Options
    --force, -f Force all prompts

  Examples
    $ clean-node-modules . -f
`, {
  alias: {
    f: 'force'
  }
});
const prompt = inquirer.createPromptModule();
const spinner = new Ora();

function cleanNodeModules (inputPath, force) {
  const srcPath = inputPath ? path.resolve(process.cwd(), inputPath) : process.cwd()

  spinner.text = 'Finding projects...'
  spinner.start()
  getCandidates(srcPath)
    .then(projects => {
      spinner.succeed(`Found ${projects.length} projects`)
      confirmRemoval(projects)
    }).catch(e => {
      spinner.fail()
    })
}

function promptMessage (project) {
  return [
    `Purge ${project.name}?`,
    `  Last modified: ${project.latestChange.fromNow()}`,
    `  Path: ${project.dir}`
  ].join('\n')
}


function confirmRemoval(candidates) {
  prompt({
    type: 'confirm',
    name: 'remove',
    message: promptMessage(candidates[0])
  }).then(result => {

    if (result.remove) {
      // ...
    }

    if (candidates.length > 1) {
      confirmRemoval(candidates.slice(1))
    }
  })
}

cleanNodeModules(cli.input[0], cli.flags.force);
