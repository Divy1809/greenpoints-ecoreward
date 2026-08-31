# GreenPoints — Cloud-Based Eco Reward System

GreenPoints helps people record eco-friendly actions, earn controlled reward points, monitor their progress, compare on a leaderboard, earn milestone badges, and review monthly sustainability activity.

## What is implemented locally

- Local account signup/login with an identifiable user ID and password hashing.
- Protected dashboard: profile, total points, activity count, history, rank, badges, milestone progress, leaderboard, and monthly report.
- Controlled activity catalog: points are assigned by the server, not the user.
- JSON-backed, DynamoDB-compatible local repository for a no-credentials classroom demo.
- Existing Add Eco Activity flow, direct `demo` script, and automated tests.

## Run locally

```powershell
cd module
npm start
```

Open `http://localhost:3000`, create an account, and record an activity. No install or cloud credentials are needed for the local demo. See [module/SETUP.md](module/SETUP.md) for the complete flow and API details.

## Rules and features

The catalog uses fixed values: Recycling (25), Tree Planting (100), Public Transport (20), and Reusable Bag (10). The backend rejects any submitted point value that differs from the catalog.

Badges are derived automatically from stored activities: First Green Step (first activity), Eco Starter (100 points), Green Champion (500 points), and Sustainability Hero (1,000 points). Monthly reports summarize activity count, points, a type breakdown, prior-month totals, and badges earned that month.

## AWS deployment readiness

The intended architecture is React/static assets on Amazon S3 + CloudFront, Amazon Cognito authentication, API Gateway + Lambda APIs, DynamoDB tables, and Athena/QuickSight for future managed analytics. `module/template.yaml` is a SAM starting point for Cognito, DynamoDB, and a Cognito-authorized activity API. `module/aws-dynamodb-repository.js` is only used in AWS Lambda; local development continues to use the JSON adapter. Run `npm install` only before packaging the optional AWS SDK for deployment.

No AWS account, credentials, or `.env` file are required locally. For AWS deployment, configure resource identifiers through deployment-time environment variables (`ACTIVITIES_TABLE`, `POINTS_TABLE`) and Cognito client settings in frontend hosting—never commit their values or credentials.

## Tests

```powershell
cd module
npm test
```

Tests cover controlled scoring, invalid activity rejection, totals, history, ranks, badge eligibility, and monthly reporting.
