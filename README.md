# release-stats-csv

This is a tool to fetch releases from github api and save download numbers to csv file for further analyses.

It assumes the release build names are in format from [electron-builder](https://github.com/electron-userland/electron-builder) for Windows, MacOS, and Linux.

## Instalation

```
npm install -g release-stats-csv
```

## Setup
Set up Github token to enviroment variable:

```
export GH_TOKEN=<YOUR-GITHUB-TOKEN>
```

If needed, you can generate a new token here: https://github.com/settings/tokens

## Usage
```
$ release-stats-csv <repo_owner> <repo_name>
```

E.g.:
```
$ release-stats-csv LiskHQ lisk-hub
```

## License

MIT © [Vít Stanislav](https://github.com/slaweet)
