import {dbWrapper} from "../utils/dbWrapper.js"

const  registerUser = dbWrapper(async (req, res) =>{
    res.status(700).json({
        message:"Ok how are you"
    })
})

export {registerUser}