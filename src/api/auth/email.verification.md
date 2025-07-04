✅ Why Use Redis for Email Verification?
Using Redis allows you to:

Store temporary tokens with TTL (e.g., 15 minutes expiry)

Avoid saving tokens in your main DB

Scale easily with millions of users

✅ Architecture Overview
User signs up

Create a user in DB (isVerified: false)

Generate a secure token

Store token in Redis with expiry (user_id => token)

Send email with link: https://yourapp.com/verify?token=xyz

User clicks link

Your /verify API extracts token

Redis resolves token => user_id

If valid:

Mark user as isVerified: true in DB

Delete token from Redis

(Optional) Add rate limiting & resend logic

✅ Technologies Needed
Tool	Use
Redis	Store temporary tokens with TTL
NestJS	Backend logic & API endpoints
Mailer	Send email (Nodemailer, etc.)
UUID	Generate secure tokens

