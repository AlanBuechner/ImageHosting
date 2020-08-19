const fs = require('fs');

function readFile(filename)
{
	return JSON.parse(fs.existsSync(filename) ?
	 fs.readFileSync(filename).toString() : '{}');
}

const config = readFile("config.json");

module.exports = config;