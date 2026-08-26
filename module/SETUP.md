# Add Eco Activity — setup and demo

## Local demonstration

1. Install Node.js 18 or later.
2. In this `module` folder, run `npm start`.
3. Visit `http://localhost:3000`, submit an activity, and see the confirmation and leaderboard.
4. For a command-line proof of the same flow, run `npm run demo`.
5. Run `npm test` to execute the validation and processing tests.

No cloud credentials are required for the review demo. The local adapter creates `data/greenpoints-local-dynamodb.json`, representing DynamoDB's `Activities` and `UserPoints` tables.

## AWS deployment mapping

- Host the provided form as a React/static frontend on Amazon S3 behind CloudFront.
- Create API Gateway routes for `POST /activities` and `GET /leaderboard`.
- Package `lambda.js` and `activity-service.js` in AWS Lambda (Node.js 20).
- Replace `LocalDynamoDBRepository` with DynamoDB `TransactWriteItems`: put an activity and increment the user's point total atomically.
- Give the Lambda role least-privilege access to `Activities`, `UserPoints`, CloudWatch Logs, and SNS/EventBridge for reward events.

## API example

```json
POST /activities
{"userId":"student-demo","type":"recycling","points":20,"timestamp":"2026-08-26T10:00:00Z"}
```

The response contains a confirmation, stored activity record, and `updatedPointTotal`.
