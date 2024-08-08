const otpEmail = (otp: number) =>
	`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset OTP</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
      }
      p {
        color: #555;
        line-height: 1.6;
      }
      .otp {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
        margin: 20px 0;
      }
      .footer {
        margin-top: 20px;
        font-size: 12px;
        color: #888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Password Reset Request</h1>
      <p>Dear User,</p>
      <p>
        We received a request to reset your password. Please use the OTP (One-Time Password) below to proceed with
        resetting your password:
      </p>
      <div class="otp">${otp}</div>
      <!-- Replace this with dynamic OTP -->
      <p>This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
      <p>Thank you!</p>
      <div class="footer">&copy; 2024 Your Company Name. All rights reserved.</div>
    </div>
  </body>
</html>`;

export default otpEmail;
