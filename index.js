const { inspect } = require("util");
const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/action");

main();

async function main() {
  try {
    const octokit = new Octokit();

    let parameters = {};
    parameters.per_page = 50;
    parameters.page = 0;

    const repository = core.getInput("repository");
    const ownerAndRepo = repository.split("/");
    if(ownerAndRepo.length !== 2){
      throw new Error(`The repository input parameter '${repository}' is not in the format {owner}/{repo}.`);
    }

    parameters.owner = ownerAndRepo[0];
    parameters.repo = ownerAndRepo[1];

    if(!parameters.owner){
      throw new Error(`Owner cannot be empty. Make sure the repository input parameter '${repository}' is in the format {owner}/{repo}.`);
    }

    if(!parameters.repo){
      throw new Error(`Repository cannot be empty. Make sure the repository input parameter '${repository}' is in the format {owner}/{repo}.`);
    }

    let createdBeforeDate;
    const workflow = core.getInput("workflow");
    const olderThanSeconds = core.getInput("older-than-seconds");
    const createdBefore = core.getInput("created-before");
    const actor = core.getInput("actor");
    const branch = core.getInput("branch");
    const event = core.getInput("event");
    const status = core.getInput("status");
    const whatIf = core.getInput("what-if");

    core.info(`Applying filters:`);

    if(!!workflow){
      core.info(`workflow: ${workflow}`);
      parameters.workflow_id = workflow;
    }

    if(!!olderThanSeconds){
      core.info(`older-than-seconds: ${olderThanSeconds}`);
    }
    else if(!!createdBefore){
      createdBeforeDate = new Date(createdBefore)
      core.info(`created-before: ${createdBeforeDate}`);
    }

    if(!!actor){
      parameters.actor = actor;
      core.info(`actor: ${actor}`);
    }

    if(!!branch){
      parameters.branch = branch;
      core.info(`branch: ${branch}`);
    }

    if(!!event){
      parameters.event = event;
      core.info(`event: ${event}`);
    }

    if(!!status){
      parameters.status = status;
      core.info(`status: ${status}`);
    }

    if(!!whatIf){
      core.info(`Running in what-if mode. The following workflows would be deleted if what-if was "false":`);
    }

    for(;;) {
      parameters.page++;

      let data;
      if(!!workflow){
        data = await octokit.actions.listWorkflowRuns(parameters);
      }
      else{
        data = await octokit.actions.listWorkflowRunsForRepo(parameters);
      }

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

        let deleteParameters = {
          owner: parameters.owner,
          repo: parameters.repo,
          run_id: workflowRun.id
        };

        let { status } = await octokit.actions.deleteWorkflowRun(deleteParameters);

        if(status == 204){
          core.info(`Deleted workflow run with ID:${workflowRun.id}`);
        }
        else{
          core.warning(`Something went wrong while deleting workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}. Status code: ${status}`);
        }
      }
    }
  } catch (error) {
    core.info(inspect(error));
    core.setFailed(error.message);
  }
}