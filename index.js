const { inspect } = require("util");
const core = require("@actions/core");
const { Octokit } = require("@octokit/action");

main();

async function main() {
  try {
    const octokit = new Octokit();

    let parameters = {};
    parameters.per_page = 100;
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
    const maximumWorkflowRunsToKeep = core.getInput("maximum-workflow-runs-to-keep");
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

    if(!!maximumWorkflowRunsToKeep){
      core.info(`Keeping at most ${maximumWorkflowRunsToKeep} workflow runs.`);
    }

    if(whatIf !== "false"){
      if(whatIf !== "true"){
        core.warning(`Invalid value "${whatIf}" for what-if. Should be either "true" or "false". Defaulting to "true".`);
      }

      core.info(`Running in what-if mode. The following workflow runs would be deleted if what-if was set to "false":`);
    }

    let index = 0;
    for(;;) {
      parameters.page++;

      let response;
      if(!!workflow){
        response = await octokit.actions.listWorkflowRuns(parameters);
      }
      else{
        response = await octokit.actions.listWorkflowRunsForRepo(parameters);
      }

      if(response.data.workflow_runs <= 0){
        break;
      }

      for (const workflowRun of response.data.workflow_runs) {
        const createdAt = new Date(workflowRun.created_at);

        if(!!olderThanSeconds && (new Date() - createdAt) / 1000 < olderThanSeconds){
          continue;
        }

        if(!!createdBeforeDate && createdBeforeDate < createdAt){
          continue;
        }

        index++;
        if(!!maximumWorkflowRunsToKeep && index <= maximumWorkflowRunsToKeep){
          continue;
        }

        const workflowRunLog = `${workflowRun.id} created at ${workflowRun.created_at}. Title: "${workflowRun.head_commit.message}", Author: ${workflowRun.head_commit.author.name} - ${workflowRun.head_commit.author.email}, Branch: ${workflowRun.head_branch}, Workflow: ${workflowRun.name}`;

        if(whatIf !== "false"){
          core.info(`Workflow run ${workflowRunLog}`);

          continue;
        }
        else{
          core.info(`Deleting workflow run ${workflowRunLog}...`);
        }

        let deleteParameters = {
          owner: parameters.owner,
          repo: parameters.repo,
          run_id: workflowRun.id
        };

        let { status } = await octokit.actions.deleteWorkflowRun(deleteParameters);

        if(status == 204){
          core.info(`Deleted workflow run ${workflowRun.id}.`);
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