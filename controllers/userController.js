import asyncHandler from 'express-async-handler'
import User from '../model/userModel.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// @desc: add user task
// @route: GET /api/users
export const createUser = asyncHandler(async (req, res) => {

    const { name, email, password, department, role } = req.body

    if (!name || !email || !password || !department ) {
        res.status(400)
        throw new Error('Please fill all fields')
    }

    // Check if user exists
    const userExists = await User.findOne({ email })  

    if (userExists) {
        res.status(400)
        throw new Error('User already exists')
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        department,
        role
    })

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role,
            token: generateToken(user._id)
            
        })
    } else {
        res.status(400)
        throw new Error('Invalid user data')
    }

})

// @desc: Login user
// @route: Post /api/users
export const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    // check for user mail
    const user = await User.findOne({ email })

    if(user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user._id, 
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role,
            token: generateToken(user._id)
        })
    } else {
        res.status(401)
        throw new Error('Invalid email or password')
    }
})


// @desc: Get user data
// @route: GET /api/users
export const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(req.user);
})  


// Generate token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    })
}