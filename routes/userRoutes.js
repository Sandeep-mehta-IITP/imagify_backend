import express from 'express';
import { 
    registerUser, 
    loginUser,
    userCredits, 
    paymentRazorpay, 
    paymentVerification, 
    forgotPassword, 
    verifyOtp, 
    resetPassword 
} from '../controllers/userController.js';
import userAuth from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits', userAuth, userCredits);
userRouter.post('/pay-razor', userAuth, paymentRazorpay);
userRouter.post('/verify-razor', paymentVerification);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/verify-otp', verifyOtp);
userRouter.post('/reset-password', resetPassword);


export default userRouter;

// http://localhost:4000/api/user/register
// http://localhost:4000/api/user/login
// http://localhost:4000/api/user/credits
//http://localhost:4000/api/user/pay-razor
//http://localhost:4000/api/user/verify-razor
//http://localhost:4000/api/user/forgot-password
//http://localhost:4000/api/user/verify-otp
//http://localhost:4000/api/user/reset-password