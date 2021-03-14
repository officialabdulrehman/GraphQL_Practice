const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken')

const User = require('../models/user');

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

  login: async ({email, password}) => {
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
  }
}