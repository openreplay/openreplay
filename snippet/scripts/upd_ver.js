const pjson = require("../package.json")


let ver = pjson.dependencies["@openreplay/tracker"]
if (ver.startsWith("file")) {
  const trackerPjson = require("../" + ver.slice(5) + "/package.json")
  ver = trackerPjson.version
}

pjson.version = ver


const fs = require('fs')
fs.writeFile("package.json", JSON.stringify(pjson,  null, 2), function(err) {
  if (err) return console.error(err)
});