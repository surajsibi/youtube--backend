import {dbWrapper} from "../utils/dbWrapper.js"
import {ApiError} from "../utils/Apierrors.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const  registerUser = dbWrapper(async (req, res) =>{
    //get user details from frontend
    //validation -not empty 
    //check if user already exists : username , email
    //checks for images, check for avatar
    //upload them to cloudinary , avatar 
    //create user object - create entry in DB
    //remove password and refresh token filed from response
    //check for user creation 
    //return response

    const {fullname,email,username,password}=req.body
   

    if([fullname,email,username,password].some((filed)=> filed?.trim() === ""))
        {
        throw new ApiError(400,"All fields are required")
    }

   const existedUser = await  User.findOne({
        $or :[{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"Username or email already exists")
    }

   const avatarLocalPath =  req.files?.avatar[0]?.path;
//    console.log("this is a req log ",req);
   
   
   
   let coverImageLocalPath ;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath  = req.files?.coverImage[0]?.path;
}

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
   }    
   
   const avatar =   await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   
   if(!avatar ){
    throw new ApiError(400,"Avatar file is required")
   }    

   const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

  const createdUser =await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user")
  }
  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully ")
  )
})

export {registerUser}