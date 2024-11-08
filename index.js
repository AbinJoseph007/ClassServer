
// import dotenv
// require .env contents into process .env by default

require('dotenv').config()

// import express

const express = require('express')

// import cors

const cors = require('cors')

// import router

//import connections.js file

require('./connection')

// import application specific middleware

// const appMiddleware = require('./middleware/appMiddleware')

//  create server
const Classes = express()

// use of cors in server
Classes.use(cors())

// returns middleware that only parse.json - jasonserver
Classes.use(express.json())

// 
//  pfServer.use(appMiddleware)

// use of router by  server


// server use uploads folder
// frist arg - the way in which other applicatation sholud use this folder
// sec - arg - exports that folder - express.static

Classes.use('/uploads',express.static('./uploads'))

//  customize the port - by default - 3000
const PORT = 4000 || process.env //automaticaly select port      

// to run the server
Classes.listen(PORT, ()=>{
    console.log(`SERVER RUNNIG SUCCESSFULLY AT PORT ${PORT}`);
})

Classes.get('/',(req,res)=>{
  res.send(`<h1 style="color:red">project fair server runnig successfully and ready to accept requests for client</h1>`)
})
