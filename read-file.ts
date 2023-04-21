import MFileReader from './frontend/app/player/web/messages/MFileReader';
import {
  MType,
} from './frontend/app/player/web/messages/raw.gen';

import fs from 'fs'


// silent logger
// const logger = {
//     log(){},
//     error(){},
//     warn(){},
//     group(){},
// }

/**
 * For reading big files by chunks
*/
function readBytes(fd, sharedBuffer) {
  return new Promise((resolve, reject) => {
    fs.read(
      fd, 
      sharedBuffer,
      0,
      sharedBuffer.length,
      null,
      (err) => {
          if(err) { return reject(err); }
          resolve(void)
      }
    )
  })
}
async function* readByChunks(filePath, size) {
  const sharedBuffer = Buffer.alloc(size);
  const stats = fs.statSync(filePath); // file details
  const fd = fs.openSync(filePath); // file descriptor
  let bytesRead = 0; // how many bytes were read
  let end = size; 
  
  for(let i = 0; i < Math.ceil(stats.size / size); i++) {
    await readBytes(fd, sharedBuffer);
    bytesRead = (i + 1) * size;
    if(bytesRead > stats.size) {
       // When we reach the end of file, 
       // we have to calculate how many bytes were actually read
       end = size - (bytesRead - stats.size);
    }
    yield sharedBuffer.slice(0, end);
  }
}
/* ==== end chunk-reader === */

/*== Message generators ==*/
async function* readBigFileMessages(file: string, chunkSize: number) {
  let i = 0
  const fileReader = new MFileReader(new Uint8Array(), 0)
  for await(const chunk of readByChunks(file, chunkSize)) {
    i++
    fileReader.append(chunk)
    let msg
    while (msg = fileReader.readNext()) {
      yield msg
    }
    console.log("Read chunk: ", i)
  }
}
function* readMessagesTwoFiles(filename1: string, filename2: string) {
  const file1 = fs.readFileSync(filename1)
  const file2 = fs.readFileSync(filename2)
  console.log("First file: ", file1.length, " bytes")
  const fileReader = new MFileReader(file1, 0 )
  fileReader.append(file2)
  let msg
  while (msg = fileReader.readNext()) {
    yield [ msg, fileReader.getPosition() ]
  }
}
/*== end message generators ==*/



function addToMap(map, key, n=1) {
    map[key] = map[key] ? map[key] + n : n
}

function estimateSize(msg) {
  return Object.values(msg).reduce((prevSum: number, val: any) => {
    if (typeof val === "string") {
        return prevSum + val.length + 1
    }
    if (typeof val ==="number") {
        return prevSum + 2
    }
    return prevSum
  }, 0)
}

const mapByTp = {}
const mapBySize = {}
const stringRepeatMapAttrs = {}
const stringRepeatMapAttrsNodes = {}
const stringRepeatMapOthers = {}
function updateStringsMap(map, msg){
    Object.values(msg).forEach(val => {
        if (typeof val === "string") {
            addToMap(map, val)
        }
    })
}


const CHUNK_SIZE = 100000000; // 100MB
const FILE =  "../decrypted0.mob"

let lastI = 0
let currentPageUrl = ""
async function main() {  
  for (const msg of  readBigFileMessages(FILE, CHUNK_SIZE)) {
    console.log(msg)

    // const index = msg._index
    // lastI = isNaN(index) ? lastI : index

    // addToMap(mapByTp, msg.tp)
    // addToMap(mapBySize, msg.tp, estimateSize(msg))
  
    // if (msg.tp === 4) {
    //   currentPageUrl = msg.url
    // }

    // if (msg.tp === 12) {

    //   if (!stringRepeatMapAttrsNodes[msg.name]) {
    //       stringRepeatMapAttrsNodes[msg.name] = {}
    //   }
    //   if (!stringRepeatMapAttrsNodes[msg.value]) {
    //       stringRepeatMapAttrsNodes[msg.value] = {}
    //   }

    //   addToMap(stringRepeatMapAttrsNodes[msg.name], msg.id)
    //   addToMap(stringRepeatMapAttrsNodes[msg.value], msg.id)

    //   updateStringsMap(stringRepeatMapAttrs, msg)
    // } else { updateStringsMap(stringRepeatMapOthers, msg)}  
 
  }
}
function calcStrMapStats(strMap){
  const topStringMap = {}
  const stringEntries = Object.entries(strMap)
  stringEntries
      .sort(([k1, v1], [k2, v2]) => v1*k1.length - v2*k2.length)
      .slice(-10)
      .forEach(([key, val]) => topStringMap[key]=val)

  const keySize = Math.log10(stringEntries.length)

  const strSum = stringEntries
      .reduce((s, [k, v]) => s+k.length*v, 0)
  const redSum = stringEntries
      .reduce((s, [k, v]) => s+v*keySize, 0)
  const dictSize = stringEntries
      .reduce((s, [k, v]) => s+k.length +keySize, 0)
  return [ strSum, redSum, dictSize, keySize, topStringMap ]
}
const statsAttr = calcStrMapStats(stringRepeatMapAttrs)
const statsOthers = calcStrMapStats(stringRepeatMapOthers)


// main()

