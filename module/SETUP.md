# GreenPoints local setup

## Start the complete demo

1. Install Node.js 18 or later.
2. Open a terminal in this `module` directory.
3. Run `npm start`.
4. Open `http://localhost:3000`.
5. Create an account with a display name, lower-case user ID, and an 8+ character password.
6. Select an eco activity. Its point value is displayed as read-only. Record it to update the dashboard, history, rank, badge progress, and monthly report.

The local database is created at `data/greenpoints-local-dynamodb.json`. It is ignored by Git and can be deleted to reset local demo data.

## Verify

Run `npm test` to test catalog validation, point protection, totals, history, leaderboard rank, badges, and monthly reports. Run `npm run demo` to preserve the original Review 1 command-line Add Eco Activity proof.

## Local authentication

The local demo uses a password-hashed JSON account store and short-lived in-memory bearer sessions. This allows the full flow without AWS credentials. It is for local academic demonstration—not a replacement for Cognito in production.

## AWS hand-off (not deployed automatically)

`template.yaml` creates a Cognito user pool, API Gateway, Lambda, and DynamoDB tables with AWS SAM. The Lambda uses the Cognito JWT subject as the user ID and `aws-dynamodb-repository.js` for transactional point updates. Run `npm install` before packaging the optional AWS SDK, then authenticate the AWS CLI yourself and validate/deploy with SAM in an AWS account. The local dashboard/report endpoints remain application-level logic; Athena/QuickSight is an architecture integration point for future managed analytics.

Never commit AWS credentials, Cognito secrets, or `.env` files. Supply table IDs and Cognito frontend configuration through deployment environment settings only.
