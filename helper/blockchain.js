const SHA256 = require('crypto-js/sha256');
const level = require('level');
const Block = require('../model/block')
const chainDB = './data/chain';
const db = level(chainDB);


class Blockchain{
  constructor(){    
    this.getBlockHeight().then((height) => {
      if (height === -1) {
        this.addBlock(new Block("Genesis block")).then(() => console.log("Genesis block added!"))
      }
    })
  }

  // Add new block
  async addBlock(newBlock){
    // Block height
    const height = parseInt(await this.getBlockHeight())
    newBlock.height = height+1
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(newBlock.height>0){
      const previousBlockHeight = newBlock.height - 1 
      const previousBlock = JSON.parse(await this.getBlock(previousBlockHeight))
      newBlock.previousBlockHash = previousBlock.hash
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    // Adding block object to chain
  	await this.addBlockToDB(newBlock.height, JSON.stringify(newBlock));
  }

  // Get block height
  async getBlockHeight(){
    return await this.getBlockHeightFromDB().catch(e=>console.log("error",e))
  }

  // get block
  async getBlock(blockHeight){
    // return object as a single string
    return await this.getBlockFromDB(blockHeight);
  }

  // validate block
  async validateBlock(blockHeight){
    // get block object
    let block = JSON.parse(await (this.getBlock(blockHeight)))
    // get block hash
    let blockHash = block.hash;
    // remove block hash to test block integrity
    block.hash = '';
    // generate block hash
    let validBlockHash = SHA256(JSON.stringify(block)).toString();
    // Compare
    if (blockHash===validBlockHash) {
        return true;
      } else {
        console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
        return false;
      }
  }

  // Validate blockchain
  async validateChain(){
    let errorLog = [];
    for (var i = 0; i < await this.getBlockHeight()+1; i++) {
      // validate block
      if (await !this.validateBlock(i))errorLog.push(i);
      // compare blocks hash link
      let blockHash = JSON.parse(await this.getBlock(i)).hash;
      let previousHash = JSON.parse(await this.getBlock(i+1)).previousBlockHash;
      if (blockHash!==previousHash) {
        errorLog.push(i);
      }
    }
    if (errorLog.length>0) {
      console.log('Block errors = ' + errorLog.length);
      console.log('Blocks: '+errorLog);
    } else {
      console.log('No errors detected');
    }
  }


  // Get block height
  async getBlockHeightFromDB() {
    return new Promise((resolve, reject) => {
      let height = -1

      db.createReadStream().on('data', (data) => {
        height++
      }).on('error', (error) => {
        reject(error)
      }).on('close', () => {
        resolve(height)
      })
    })
  }

  async getBlockByHeight(key) {
    return new Promise((resolve, reject) => {
      db.get(key, (error, value) => {
        if (value === undefined) {
          return reject('Not found')
        } else if (error) {
          return reject(error)
        }

        value = JSON.parse(value)

        return resolve(value)
      })
    })
  }

  async getBlocksByAddress (address) {
    const blocks = []
    let block

    return new Promise((resolve, reject) => {
      db.createReadStream().on('data', (data) => {
        // Don't check the genesis block
        if (!this.isGenesis(data.key)) {
          block = JSON.parse(data.value)

          if (block.body.address === address) {
            block.body.star.storyDecoded = new Buffer(block.body.star.story, 'hex').toString()
            blocks.push(block)
          }
        }
      }).on('error', (error) => {
        return reject(error)
      }).on('close', () => {
        return resolve(blocks)
      })
    })
  }

  isGenesis (key) {
    return parseInt(key) === 0
  }

  async getBlockByHash (hash) {
    let block

    return new Promise((resolve, reject) => {
      db.createReadStream().on('data', (data) => {    
        block = JSON.parse(data.value)
        
        if (block.hash === hash) {
          if (!this.isGenesis(data.key)) {
            block.body.star.storyDecoded = new Buffer(block.body.star.story, 'hex').toString()
            return resolve(block)
          } else {
            return resolve(block)
          }
        }
      }).on('error', (error) => {
        return reject(error)
      }).on('close', () => {
        return reject('Not found')
      })
    })
  }

  // Add block to levelDB with key/value pair
  async addBlockToDB(key,value){
    return new Promise((resolve, reject) => {
      db.put(key, value, (error) =>  {
        if (error){
          reject(error) }
        console.log(`Block added ${key}`)
        resolve(`Block added ${key}`)
      });
    })
  }

  // Get block from levelDB with key
  async getBlockFromDB(key){
    return new Promise((resolve, reject) => {
      db.get(key,(error, value) => {
        if (error){
          reject(error)
        }
        console.log(`Block requested ${value}`)
        resolve(value)
      });
    })
  }
}

module.exports = Blockchain;