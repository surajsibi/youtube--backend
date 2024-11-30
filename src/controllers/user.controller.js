import { dbWrapper } from "../utils/dbWrapper.js"
import { ApiError } from "../utils/Apierrors.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token")

  }
}

const registerUser = dbWrapper(async (req, res) => {
  //get user details from frontend
  //validation -not empty 
  //check if user already exists : username , email
  //checks for images, check for avatar
  //upload them to cloudinary , avatar 
  //create user object - create entry in DB
  //remove password and refresh token filed from response
  //check for user creation 
  //return response

  const { fullname, email, username, password } = req.body


  if ([fullname, email, username, password].some((filed) => filed?.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }]
  })
  if (existedUser) {
    throw new ApiError(409, "Username or email already exists")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;




  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully ")
  )
})


const loginUser = dbWrapper(async (req, res) => {
  // reqbody =>data
  // username or email
  //find user
  //password check
  //access and refresh token
  //send cookie
  // send response

  const { username, email, password } = req.body


  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(400, "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)




  if (!isPasswordValid) {
    throw new ApiError(401, "Given password is incorect")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const opitons = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .cookie("accessToken", accessToken, opitons)
    .cookie("refreshToken", refreshToken, opitons)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
      },
        "user logedin successfully"
      )
    )
})

const logoutUser = dbWrapper(async (req, res) => {

  await User.findByIdAndUpdate(
    req.user._id,

    {
      $unset: {
        refreshToken: 1
      }
    },
    {
      new: true
    }
  )


  const opitons = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .clearCookie("accessToken", opitons)
    .clearCookie("refreshToken", opitons)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = dbWrapper(async (req, res) => {
  const incomingRefreshToken = req.cookies.refrshToken || req.body.refreshToken
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }
 try {
   const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
   )
   const user = await User.findById(decodedToken?._id)
   if (!user) {
     throw new ApiError(401, "Invalid refresh token")
   }
 
   if (incomingRefreshToken !== user?.refreshToken) {
     throw new ApiError(401, "Refresh token is already used or expire")
   }
 
   const options = {
     httpOnly: true,
     secure: true
   }
   const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
   return res.status(200
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
       new ApiResponse(200, { accessToken, newRefreshToken },"Access token refresh successfully")
     )
   )
 } catch (error) {
  throw new ApiError(401,error.message || "invalid refresh token")
 }

})



export { registerUser, loginUser, logoutUser,refreshAccessToken }