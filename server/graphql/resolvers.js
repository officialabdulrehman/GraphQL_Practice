const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken')

const User = require('../models/user');
const Post = require('../models/post');

module.exports = {
  createUser: async ({ userInput }, req) => {
    const {email, name, password} = userInput
    
    const errors = [];
    if(!validator.isEmail(email)){
      errors.push({ message: 'Invalid email'})
    }
    if(validator.isEmpty(password) || !validator.isLength(password, { min: 8 })){
      errors.push({ message: 'Password should contain at least 8 characters'})
    }
    if(errors.length > 0){
      const error = new Error('Invalid input')
      error.data = errors
      error.code = 422
      throw error
    }
    const existingUser = await User.findOne({email})
    if(existingUser){
      const error = new Error('User already exists')
      throw error
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      password: hashedPw,
      name
    });
    const createdUser = await user.save();
    console.log(createdUser)
    return { ...createdUser._doc, _id: createdUser._id.toString() }
  },

  login: async ({email, password}, req) => {
    const user = await User.findOne({email})
    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    const isEqual = await bcrypt.compare(password, user.password)
    if(!isEqual){
      const error = new Error('Incorrect passord')
      error.code = 401
      throw error
    }
    const token = jwt.sign({
      userId: user._id.toString(),
      email: user.email
    }, 'nizthedevsecret', {expiresIn: '24h'})
    return {
      token,
      userId: user._id.toString()
    }
  },
  createPost: async ({postInput: {title, content, imageUrl}}, req) => {
    //console.log('Request Entered AUTH', token, decodedToken)
    console.log('Request Entered 2')
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const errors = []
    if(validator.isEmpty(title))
      errors.push({ message: 'Invalid Title'})

    if(validator.isEmpty(content))
      errors.push({ message: 'Invalid Content'})

    if(errors.length > 0){
      const error = new Error('Invalid input')
      error.data = errors
      error.code = 422
      throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
      const error = new Error('User not found')
      error.code = 401
      throw error
    }
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user
    })
    const createdPost = await post.save()
    user.posts.push(createdPost)
    await user.save()
    return {
      ...createdPost._doc,
      _id: createdPost._id,
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString()
    }
  },
  posts: async ({page},req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }

    if(!page)
      page = 1

    const perPage = 2

    const totalPosts = await Post.find().countDocuments()
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator')

    return {
      posts: posts.map(post => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString()
        }
      }),
      totalPosts
    }
  },
  post: async ({postId}, req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    console.log(postId)
    const post = await Post.findById(postId).populate('creator')
    if(!post){
      const error = new Error('Post not found')
      error.code = 404
      throw error
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    }
  },
  updatePost: async ({postId, postInput}, req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    console.log(postId)
    const post = await Post.findById(postId).populate('creator')
    if(!post){
      const error = new Error('Post not found')
      error.code = 404
      throw error
    }
    if(post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Unauthorized access')
      error.code = 403
      throw error
    }
    
    const {title, content, imageUrl} = postInput

    const errors = []
    if(validator.isEmpty(title))
      errors.push({ message: 'Invalid Title'})

    if(validator.isEmpty(content))
      errors.push({ message: 'Invalid Content'})

    if(errors.length > 0){
      const error = new Error('Invalid input')
      error.data = errors
      error.code = 422
      throw error
    }

    post.title = title
    post.content = content
    const updatedPost = await post.save()
    
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString()
    }
  },
  deletePost: async ({postId}, req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const post = await Post.findById(postId)
    if(!post){
      const error = new Error('Post not found')
      error.code = 404
      throw error
    }
    if(post.creator.toString() !== req.userId.toString()) {
      const error = new Error('Unauthorized access')
      error.code = 403
      throw error
    }
    await Post.findByIdAndDelete(postId)
    const user = await User.findById(req.userId)
    user.posts.pull(postId)
    await user.save()
    return true
  },
  user: async ({}, req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
      const error = new Error('User not found')
      error.code = 404
      throw error
    }
    return {
      ...user._doc,
      _id: user._id.toString()
    }
  },
  updateStatus: async ({status}, req) => {
    if(!req.isAuth){
      const error = new Error('Unauthorized, access denied')
      error.code = 401
      throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
      const error = new Error('User not found')
      error.code = 404
      throw error
    }
    user.status = status
    await user.save()
    return {
      ...user._doc,
      _id: user._id.toString()
    }
  }
}