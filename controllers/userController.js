import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import razorpay from "razorpay";
import transactionModel from "../models/transactionModel.js";
import sendEmail from "../utils/sendEmail.js";

// register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all fields" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.status(201).json({
      success: true,
      token,
      user: {
        name: user.name,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Eamail is required",
      });
    }
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    } else {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.status(200).json({
        success: true,
        token,
        user: {
          name: user.name,
        },
        message: "User logged in successfully",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API to check if the email is registered
export const checkEmailRegistered = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not registered, Please enter registered email address.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email is registered.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min expiry

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  // Email OTP to user

  const subject = "🔐 [Imagify] Your OTP for Password Reset";

  const htmlContent = `
  <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
    <h2 style="color: #4a90e2;">Imagify - Password Reset</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>You recently requested to reset your password. Please use the OTP below to proceed:</p>
    <h1 style="text-align: center; color: #333;">${otp}</h1>
    <p>This OTP is valid for <strong>5 minutes</strong>.</p>
    <p>If you did not request this, please ignore this email.</p>
    <br/>
    <p style="font-size: 14px; color: gray;">Thank you,<br/>Team Imagify</p>
  </div>
`;

  await sendEmail(email, subject, htmlContent);

  res.status(200).json({
    success: true,
    message: "OTP sent to your email",
  });
};

// verify otp
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }
  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  if (user.otpExpiry < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "OTP expired",
    });
  }

  user.isOtpVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
};

// reset password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "OTP is required",
    });
  }

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: "Please enter your new password",
    });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  user.otp = null;
  user.otpExpiry = null;
  user.isOtpVerified = false;
  await user.save();
  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
};

// credits handler
export const userCredits = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    res.status(200).json({
      success: true,
      credits: user.creditBalance,
      user: {
        name: user.name,
      },
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const paymentRazorpay = async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    let credits, plan, amount, date;

    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;

      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;

      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid plan",
        });
    }

    date = Date.now();

    const transactionData = {
      userId,
      plan,
      amount,
      credits,
      date,
    };

    const newTransaction = await transactionModel.create(transactionData);

    const options = {
      amount: amount * 100,
      currency: process.env.CURRENCY,
      receipt: newTransaction._id.toString(),
    };

    await razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      res.status(200).json({
        success: true,
        order,
        message: "Order created successfully",
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// payment verification
export const paymentVerification = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (orderInfo.status === "paid") {
      const transactionData = await transactionModel.findById(
        orderInfo.receipt
      );

      if (transactionData.payment) {
        return res.status(400).json({
          success: false,
          message: "Payment already verified",
        });
      }

      const userData = await userModel.findById(transactionData.userId);

      const creditBalance = userData.creditBalance + transactionData.credits;
      await userModel.findByIdAndUpdate(userData._id, {
        creditBalance,
      });

      await transactionModel.findByIdAndUpdate(transactionData._id, {
        payment: true,
      });

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment not verified",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
