const express = require('express');
const http = require('http');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Blockchain = require('./helper/blockchain')
const Block = require('./model/block')
const chain = new Blockchain();
const Validation = require('./helper/validation')


// App setup
const app = express();

// Logging incoming requests
app.use(morgan('combined'));

// Parse incoming requests
app.use(bodyParser.json({type: '*/*'}));




validateAddressParameter = async (req, res, next) => {
  try {
    const validation = new Validation(req)
    validation.validateAddressParameter()
    next()
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message
    })
  }
}

validateSignatureParameter = async (req, res, next) => {
  try {
    const validation = new Validation(req)
    validation.validateSignatureParameter()
    next()
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message
    })
  }
}

validateNewStarRequest = async (req, res, next) => {
  try {
    const validation = new Validation(req)
    validation.validateNewStarRequest()
    next()
  } catch (error) {
    res.status(400).json({
      status: 400,
      message: error.message
    })
  }
}

app.listen(8000, () => console.log('API listening on port 8000'))
app.use(bodyParser.json())
app.get('/', (req, res) => res.status(404).json({
  status: 404,
  message: 'Check the README.md for the accepted endpoints'
}))

/**
 * @description Criteria: Web API post endpoint validates request with JSON response.
 */
app.post('/requestValidation', [validateAddressParameter], async (req, res) => {
  const validation = new Validation(req)
  const address = req.body.address

  try {
    data = await validation.getPendingAddressRequest(address)
  } catch (error) {
    data = await validation.saveNewRequestValidation(address)
  }

  res.json(data)
})

/**
 * @description Criteria: Web API post endpoint validates message signature with JSON response.
 */
app.post('/message-signature/validate', [validateAddressParameter, validateSignatureParameter], async (req, res) => {
  const validation = new Validation(req)

  try {
    const { address, signature } = req.body
    const response = await validation.validateMessageSignature(address, signature)

    if (response.registerStar) {
      res.json(response)
    } else {
      res.status(401).json(response)
    }
  } catch (error) {
    res.status(404).json({
      status: 404,
      message: error.message
    })
  }
})

/**
 * @description Criteria: Star registration Endpoint
 */
app.post('/block', [validateNewStarRequest], async (req, res) => {
  const validation = new Validation(req)

  try {
    const isValid = await validation.isValid()

    if (!isValid) {
      throw new Error('Signature is not valid')
    }
  } catch (error) {
    res.status(401).json({
      status: 401,
      message: error.message
    })

    return
  }

  const body = { address, star } = req.body
  const story = star.story

  body.star = {
    dec: star.dec,
    ra: star.ra,
    story: new Buffer(story).toString('hex'),
    mag: star.mag,
    con: star.con
  }
  
  await chain.addBlock(new Block(body))
  const height = await chain.getBlockHeight()
  const response = await chain.getBlock(height)

  validation.invalidate(address)

  res.status(201).send(response)
})

/**
 * @description Criteria: Get star block by star block height with JSON response.
 */
app.get('/block/:height', async (req, res) => {
  try {
    const response = await chain.getBlock(req.params.height)

    res.send(response)
  } catch (error) {
    res.status(404).json({
      status: 404,
      message: 'Block not found'
    })
  }
})

/**
 * @description Criteria: Get star block by wallet address (blockchain identity) with JSON response.
 */
app.get('/stars/address:address', async (req, res) => {
  try {
    const address = req.params.address.slice(1)
    const response = await chain.getBlocksByAddress(address)

    res.send(response)
  } catch (error) {
    res.status(404).json({
      status: 404,
      message: 'Block not found'
    })
  }
})

/**
 * @description Criteria: Get star block by hash with JSON response.
 */
app.get('/stars/hash:hash', async (req, res) => {
  try {
    const hash = req.params.hash.slice(1)
    const response = await chain.getBlockByHash(hash)

    res.send(response)
  } catch (error) {
    res.status(404).json({
      status: 404,
      message: 'Block not found'
    })
  }
})
