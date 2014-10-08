# sync-packages

Helper methods for syncing files between locally maintained web packages and working project

## Getting Started
Install the module with: `npm install git+https://github.com/aheller/sync-packages.git --save-dev`

```javascript
 var syncPackages = require('sync-packages')(grunt, {
      env: 'env.json',
      watch: {
          js: {
              files: ['<%= yeoman.app %>/scripts/{,*/}*.js']
          },
          jade: {
              files: ['<%= yeoman.app %>/{,views/**/}*.jade']
          },
          sass: {
              files: ['<%= yeoman.app %>/styles/{,*/}*.scss']
          }
      }
  });
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
_(Coming soon)_

## Release History
_(Nothing yet)_

## License
_(Nothing yet)_
