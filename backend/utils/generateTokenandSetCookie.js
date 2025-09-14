// Import the jsonwebtoken package to create JWT tokens
import jwt from "jsonwebtoken";

// Function to generate a JWT token and set it as an HTTP-only cookie
export const generateTokenandSetCookie = (res, userId) => {
  // Create a JWT token that includes the userId in its payload
  // The token is signed using a secret key from environment variables
  // It will expire in 7 days
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token will expire in 7 days
  });

  // Set the token in a cookie named "token"
  res.cookie("token", token, {
    httpOnly: true, // Prevents JavaScript access to the cookie (mitigates XSS)
    secure: process.env.NODE_ENV === "production", // Only sends cookie over HTTPS in production
    sameSite: "strict", // Ensures the cookie is only sent with same-site requests (CSRF protection)
    maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie will expire in 7 days (in milliseconds)
  });

  // Return the token (in case it's needed elsewhere in the app)
  return token;
};
