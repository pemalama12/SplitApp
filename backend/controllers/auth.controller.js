// Import the User model

import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { generateTokenandSetCookie } from "../utils/generateTokenandSetCookie.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from "../mailtrap/emails.js";

import { User } from "../models/user.model.js";

// Controller for handling user signup
export const signup = async (req, res) => {
  // Extract email, password, and name from the request body
  const { email, password, name } = req.body;

  try {
    // Check if any required fields are missing
    if (!email || !password || !name) {
      throw new Error("All fields are required");
    }

    // Check if a user with the same email already exists in the database
    const userAlreadyExists = await User.findOne({ email });
    console.log("user", userAlreadyExists);
    // If user already exists, return a 400 response
    if (userAlreadyExists) {
      return res
        .status(400)
        .json({ success: false, message: "user already exists" });
    }

    // Hash the user's password using bcrypt with 10 salt rounds for security
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generate a 6-digit verification code (as a string) for email verification
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Create a new user document with the provided data
    const user = new User({
      email,
      password: hashedPassword, // Store the hashed password
      name,
      verificationToken, // Store the verification code
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
    });

    // Save the user document to the database
    // If the user is new, it inserts a new record
    // The 'await' ensures the operation finishes before continuing
    await user.save();

    // Generate a JWT token and set it as an HTTP-only cookie
    generateTokenandSetCookie(res, user._id);

    sendVerificationEmail(user.email, verificationToken);

    // Respond with success and return the created user (excluding password)
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        ...user._doc, // Spread all user fields
        password: undefined, // Remove password before sending user object
      },
    });
  } catch (error) {
    // Handle errors (e.g., duplicate email, validation errors)
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;

    await user.save();

    await sendWelcomeEmail(user.email, user.name);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while verifying the email",
    });
  }
};

// Controller for login (currently a placeholder)
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    generateTokenandSetCookie(res, user._id);

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Controller for logout (currently a placeholder)
export const logout = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "user not found" });
    }

    // Genrate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const restTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = restTokenExpiresAt;

    await user.save();

    await sendPasswordResetEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    );

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.log("error in forgot password", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    await sendResetSuccessEmail(user.email);

    res
      .status(200)
      .json({ success: true, message: "password reset successfully" });
  } catch (error) {
    console.log("Error in reset password", error);

    res.status(400).json({ success: false, message: error.message });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log("Error in checkAuth", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
