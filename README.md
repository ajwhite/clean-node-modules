Lets you find and remove `node_modules` from projects that haven't been touched in a while.

## Install
```
$ npm install --global clean-node-modules
```

## Usage

```
$ clean-node-modules --help

  Usage
    $ clean-node-modules <directory>

  Options
    -f, --force     Force all prompts
    -d, --days-old  Only clean projects unmodified for a certain number of days

  Examples
    $ clean-node-modules -f
      -> cleans all projects in the current directory

    $ clean-node-modules ~/dev -f -d 30
      -> cleans all projects in ~/dev that haven't been modified in 30 days
```

### Force Deletion

![example](https://cloud.githubusercontent.com/assets/656630/26288118/b53e29fe-3e58-11e7-9a28-eeabd72b0f83.gif)

### Safe Deletion

![example](https://cloud.githubusercontent.com/assets/656630/26288179/367876e0-3e5a-11e7-8528-f2cbabcdd591.gif)
