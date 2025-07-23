import {
  BatchClient,
  SubmitJobCommand,
  ListJobsCommand,
} from '@aws-sdk/client-batch';

const client = new BatchClient({ region: process.env.AWS_REGION });

const activeStates = [
  'SUBMITTED',
  'PENDING',
  'RUNNABLE',
  'STARTING',
  'RUNNING',
];

const jobName = (proj, sess) =>
  `${process.env.JOB_BASE_NAME}_${proj}-${sess}`;

export async function isRunning(projectId, sessionId) {
  const name = jobName(projectId, sessionId);
  for (const status of activeStates) {
    const { jobSummaryList = [] } = await client.send(
      new ListJobsCommand({
        jobQueue: process.env.JOB_QUEUE,
        jobStatus: status,
        maxResults: 100,
      }),
    );
    if (jobSummaryList.find((j) => j.jobName === name)) return true;
  }
  return false;
}

export async function launch(projectId, sessionId, jwt) {
  const cmd = new SubmitJobCommand({
    jobName: jobName(projectId, sessionId),
    jobQueue: process.env.JOB_QUEUE,
    jobDefinition: process.env.JOB_DEFINITION,
    retryStrategy: { attempts: Number(process.env.ATTEMPTS || 1) },
    containerOverrides: {
      command: [
        'node',
        'index.js',
        '-p',
        String(projectId),
        '-s',
        String(sessionId),
        '-j',
        jwt,
      ],
      environment: JSON.parse(process.env.ENV_OVERRIDES || '[]'),
    },
  });
  return client.send(cmd);
}
