const { spawn } = require('child_process');
const fs = require('fs');

const germanLink = 'https://www.southpark.de/alle-episoden/s'
const englishLink = 'https://southpark.cc.com/full-episodes/s'

module.exports.downloadEpisode = async function downloadEpisode(season, episode, german, english, path, callback) {
    if (episode < 10) {
        episode = '0' + episode
    }
    if (season < 10) {
        season = '0' + season
    }



    if (german && english) {

    } else {
        let episodeLink;
        if (english) {
            episodeLink = englishLink + season + 'e' + episode
        } else {
            episodeLink = germanLink + season + 'e' + episode
        }
        
        let [dataDownload, errorDownload, filenames, episodeName, code] = await download(episodeLink, path, "temp%(title)s.%(ext)s", season, episode)

        if (code == 0) {
            let [dataMerge, errorMerge] = await merge(filenames, path, episodeName, season, episode)
            
            await deleteFiles(filenames)
        }
    }
}

function download(link, path, output, season, episode) {
    return new Promise((resolve, reject) => {
        let command = spawn(`youtube-dl`, [link, '--newline', '--print-json', '-o', path + output])

        let data = '';
        let filenames = []
        let episodeName = '';
        command.stdout.setEncoding('utf8');
        command.stdout.on('data', (chunk) => {
            data += chunk;
            var obj = JSON.parse(chunk)
            filenames.push(obj._filename);
            episodeName = obj.playlist
            console.log(episodeName);

            if (fs.existsSync(path + `SouthPark ${season}.${episode} - ${episodeName}.mkv`)) {
                console.log('Episode already downloaded! Aborting!');
                command.kill('SIGINT')
            }
        })

        let error = ''
        command.stderr.on('data', (chunk) => {
            error += chunk
            console.log(error);
        })

        command.on('error', err => {
            console.log(err);
            reject()
        })

        command.on('close', (code) => {
            console.log('finished: ' + code);
            resolve([data, error, filenames, episodeName, code])
        })
    })
}

function merge(filenames, path, episodeName, season, episode) {
    return new Promise(resolve => {
        var files = []

        for (let i = 0; i < filenames.length; i++) {
            if (i == 0) {
                files.push(`${filenames[i]}`)
            } else {
                files.push(`+${filenames[i]}`)
            }
        }

        var args = files

        console.log(episodeName);


        args.push('-o')
        args.push(`${path}SouthPark ${season}.${episode} - ${episodeName}.mkv`)

        console.log(args);


        var command = spawn(`mkvmerge`, args)

        var data = '';
        command.stdout.setEncoding('utf8');
        command.stdout.on('data', (chunk) => {
            data += chunk;
            console.log(data);
        })

        var error = ''
        command.stderr.on('data', (chunk) => {
            error += chunk
            console.log(error);
        })

        command.on('error', err => {
            console.log(err);
            reject()
        })

        command.on('close', (code) => {
            resolve([data, error])
        })
    })
}

async function deleteFiles(filenames) {
    for (a in filenames) {
        new Promise((resolve, reject) => {
            fs.unlink(filenames[a], err => {
                if (err) {
                    console.log(err);
                    reject()
                } else {
                    resolve()
                }
            })
        })
    }
}