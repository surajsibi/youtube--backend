import connectDB from "./db/index.js";
// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import { app } from "./app.js";


dotenv.config({
    path:'./env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 7000,()=>{
        console.log('server is running at port',process.env.PORT);
        
    })
})
.catch((err)=>{
    console.log('MONGO db connection fail !!!',err);
    
})