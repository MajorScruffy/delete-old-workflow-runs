const core = require('@actions/core');
const github = require('@actions/github');

try {
  // `repository-name` input defined in action.yml
  const repositoryName = core.getInput('repository-name');
  console.log(`Hello ${repositoryName}!`);

  // `access-token` input defined in action.yml
  const accessToken = core.getInput('access-token');
  console.log(`Hello ${accessToken}!`);

  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}