#!/usr/bin/env node

const ObjectsToCsv = require('objects-to-csv');
const request = require("request");

if (process.argv.length < 4) {
  console.log(`This is a tool to fetch releases from github api and save download numbers to csv file for further analyses.
The script caches data in a file, the cache expires in one day.

Usage:
$ release-stats-csv <repo_owner> <repo_name>

E.g.:
$ release-stats-csv LiskHQ lisk-hub
`);
  process.exit(1);
}

if (!process.env.GH_TOKEN) {
  console.error(`Please set up Github token to enviroment variable.
export GH_TOKEN=<YOUR-GITHUB-TOKEN>

If needed, you can generate a new token here:
https://github.com/settings/tokens
`);
  process.exit(2);
}

const repoOwner = process.argv[2];
const repoName = process.argv[3];
const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;
const outputFile = `./${repoName}-downloads.csv`;

saveReleaseStats();

async function getReleaseStats(page=0) {
  let data = await fetchData(page);
  if (data.length === 30) {
    data = [
      ...data,
      ...(await getReleaseStats(page+1)),
    ];
  }
  return data;
}

async function saveReleaseStats() {
  const data = await getReleaseStats();
  saveToCsv(data);
}

function fetchData(page) {
  console.log('Fetching page', page);
  const url = `${githubApiUrl}?page=${page}`;
  const options = {
    url,
    headers: {
      'Authorization': `Bearer ${process.env.GH_TOKEN}`,
      'User-Agent': 'request',
    },
  }
  return new Promise(function(resolve, reject){
    request.get(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function getDownloadsFor(release, platform) {
  return release.assets.filter(asset => (
      asset.name.indexOf(platform) !== -1 &&
      asset.name.indexOf('blockmap') === -1
    )).reduce((sum, asset) => {
      sum += asset.download_count;
      return sum
    }, 0);
}

function getReleases(data) {
    let releases = data
    .filter(release => !release.prerelease
    ).map(release => ({
        release: release.tag_name,
        published_at: release.published_at,
        // published_at2: dateFormat(release.published_at, 'd/m/yyyy'),
        win: getDownloadsFor(release, 'win'),
        mac: getDownloadsFor(release, 'mac-'),
        linux: getDownloadsFor(release, 'AppImage'),
        win_check_updates: getDownloadsFor(release, 'latest.yml'),
        mac_check_updates: getDownloadsFor(release, 'latest-mac.yml'),
      })
    ).reverse();
    return releases;
}

function addDownloadsPerDay(releases) {
    releases = releases.map((r, i) => ({
        ...r,
        latest_for_n_days: (
          (new Date((releases[i + 1] ? releases[i + 1].published_at : new Date())) - new Date(r.published_at)) /
          (1000 * 60 * 60 * 24)
        ).toFixed(2),
      })
    );
    releases = releases.map((r) => ({
        ...r,
        win_per_day: (r.win / r.latest_for_n_days).toFixed(2),
        mac_per_day: (r.mac / r.latest_for_n_days).toFixed(2),
        linux_per_day: (r.linux / r.latest_for_n_days).toFixed(2),
        win_check_updates_per_day: (r.win_check_updates / r.latest_for_n_days).toFixed(2),
        mac_check_updates_per_day: (r.mac_check_updates / r.latest_for_n_days).toFixed(2),
      })
    );
    return releases;
}

async function saveToCsv(data) {
    let releases = getReleases(data);
    releases = addDownloadsPerDay(releases);

    let csv = new ObjectsToCsv(releases);
    await csv.toDisk(outputFile);
    console.log('Release stats saved to', outputFile);
}
