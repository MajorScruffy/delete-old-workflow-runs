const { inspect } = require("util");
const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/action");

main();

async function main() {
  try {
    const octokit = new Octokit();

    // `repository-name` input defined in action.yml
    const repository = core.getInput('repository');
    core.info(repository);

    let parameters = [];
    parameters["per_page"] = 50;
    parameters["page"] = 0;

    let createdBeforeDate;
    const workflow = core.getInput('workflow');
    const olderThanSeconds = core.getInput('older-than-seconds');
    const createdBefore = core.getInput('created-before');
    const actor = core.getInput('actor');
    const branch = core.getInput('branch');
    const event = core.getInput('event');
    const status = core.getInput('status');
    const whatIf = core.getInput('what-if');

    core.info(`Applying filters:`);

    if(!!workflow){
      core.info(`workflow: ${workflow}`);
    }

    if(!!olderThanSeconds){
      core.info(`older-than-seconds: ${olderThanSeconds}`);
    }
    else if(!!createdBefore){
      createdBeforeDate = new Date(createdBefore)
      core.info(`created-before: ${createdBeforeDate}`);
    }

    if(!!actor){
      parameters["actor"] = actor;
      core.info(`actor: ${actor}`);
    }

    if(!!branch){
      parameters["branch"] = branch;
      core.info(`branch: ${branch}`);
    }

    if(!!event){
      parameters["event"] = event;
      core.info(`event: ${event}`);
    }

    if(!!status){
      parameters["status"] = status;
      core.info(`status: ${status}`);
    }

    if(!!whatIf){
      core.info(`Running in what-if mode. The following workflows would be deleted if what-if was 'false':`);
    }

    for(;;) {
      parameters["page"]++;

      let requestOptions = octokit.request.endpoint(
        `GET /repos/${repository}/actions/runs`,
        parameters
      );

      let { data } = await octokit.request(requestOptions);

      if(data.workflow_runs <= 0){
        break;
      }

      for (const workflowRun of data.workflow_runs) {
        const createdAt = new Date(workflowRun.created_at);

        if(!!workflow && workflowRun.name != workflow){
          continue;
        }

        if(!!olderThanSeconds && (new Date() - createdAt) / 1000 < olderThanSeconds){
          continue;
        }

        if(!!createdBeforeDate && createdBeforeDate < createdAt){
          continue;
        }

        core.info(`Deleting workflow run "${workflowRun.head_commit.message}" with ID:${workflowRun.id}...`);

        if(!!whatIf){
          continue;
        }

        let deleteParameters = [];
        deleteParameters["run_id"] = 0;

        let requestOptions = octokit.request.endpoint(
          `DELETE /repos/${repository}/actions/runs/${workflowRun.id}`,
          deleteParameters
        );

        let { status } = await octokit.request(requestOptions);

        if(status == 204){
          core.info(`Deleted workflow run with ID:${workflowRun.id}`);
        }
        else{
          core.warning(`Something went wrong while deleting workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}. Status code: ${status}`);
        }
      }
    }
  } catch (error) {
    if (error.status) {
      core.info(`< ${error.status} ${Date.now() - time}ms`);
    }

    core.info(inspect(error));
    core.setFailed(error.message);
  }
}