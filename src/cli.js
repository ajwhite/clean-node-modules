const path = require('path');
const moment = require('moment')
const meow = require('meow');
const chalk = require('chalk')
const Ora = require('ora')
const Listr = require('listr')
const Promise = require('bluebird')
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
    f: 'force',
    d: 'days-old'
  }
});
const prompt = inquirer.createPromptModule();

function cleanNodeModules (inputPath, force, daysOld) {
  const srcPath = inputPath ? path.resolve(process.cwd(), inputPath) : process.cwd()

  if (force) {
    removeAll(srcPath, daysOld)
  } else {
    const spinner = new Ora();
    spinner.text = 'Finding projects...'
    spinner.start()
    getProjects(srcPath, daysOld).then(projects => {
      if (projects.length === 0) {
        spinner.fail('No projects found')
      } else {
        spinner.succeed(chalk.green(`Found ${projects.length} projects`))
        confirmRemoval(projects)
      }
    }).catch(e => spinner.fail())
  }
}

function promptMessage (project) {
  return [
    `Purge ${project.name}?`,
    `  Last modified: ${project.latestChange.fromNow()}`,
    `  Path: ${project.dir}`
  ].join('\n')
}

function getProjects(srcPath, daysOld) {
  return getCandidates(srcPath).then(projects => {
    if (daysOld) {
      let before = moment().subtract(daysOld, 'days')
      return projects.filter(project => project.latestChange.isBefore(before))
    }
    return projects
  })
}


function confirmRemoval(projects) {
  const project = projects[0]

  prompt({
    type: 'confirm',
    name: 'remove',
    message: promptMessage(project)
  }).then(result => {
    const spinner = new Ora()

    spinner.text = `Deleting ${project.name}`
    spinner.start()

    if (result.remove) {
      setTimeout(() => {
        spinner.succeed(chalk.green(`Deleted ${project.name}`))
        if (projects.length > 1) {
          confirmRemoval(projects.slice(1))
        }
      }, 2000)
    } else {
      spinner.fail(`Skipping ${project.name}`)
      if (projects.length > 1) {
        confirmRemoval(projects.slice(1))
      }
    }
  })
}

function removeAll (path, daysOld) {
  const tasks = new Listr([
    {
      title: 'Finding projects',
      task: (ctx) => getProjects(path, daysOld).then(projects => {
        ctx.projects = projects
        return Promise.delay(1000)
      })
    },
    {
      title: 'Cleaning projects',
      skip: (ctx) => ctx.projects.length === 0 && 'No projects found',
      task: (ctx) => new Listr(ctx.projects.map(project => ({
        title: `Cleaning ${project.name}`,
        task: () => {
          return Promise.delay((Math.random() * (1.5 - 0.3) + 0.3) * 1000)
        }
      })), {concurrent: true})
    }
  ])

  tasks.tasks[0].subscribe(event => {
    if (event.type === 'STATE' && tasks.tasks[0].isCompleted()) {
      tasks.tasks[0].title = `Found ${baseCtx.projects.length} projects`;
    }
  })

  tasks.tasks[1].subscribe(event => {
    if (event.type === 'STATE' && tasks.tasks[1].isCompleted()) {
      tasks.tasks[1].title = `Cleaned ${baseCtx.projects.length} projects`;
    }
  })

  const baseCtx = {projects: []};

  tasks.run(baseCtx)
}

cleanNodeModules(cli.input[0], cli.flags.force, cli.flags.daysOld);
