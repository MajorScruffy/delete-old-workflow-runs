const { inspect } = require("util");
const core = require("@actions/core");
const { Octokit } = require("@octokit/action");

main();

async function main() {
  try {
    const octokit = new Octokit();

    let parameters = {};
    parameters.per_page = 100;
    parameters.page = 1;

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
      parameters.created = `<=${new Date(Date.now() - olderThanSeconds * 1000).toISOString()}`;
    }
    else if(!!createdBefore){
      let createdBeforeDate = new Date(createdBefore);
      core.info(`created-before: ${createdBeforeDate}`);
      parameters.created = `<=${createdBeforeDate.toISOString()}`;
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

    if(whatIf !== "false"){
      if(whatIf !== "true"){
        core.warning(`Invalid value "${whatIf}" for what-if. Should be either "true" or "false". Defaulting to "true".`);
      }

      core.info(`Running in what-if mode. The following workflow runs would be deleted if what-if was set to "false":`);
    }

    for(;;) {
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

      let deletedFromCurrentPage = false;
      for (const workflowRun of response.data.workflow_runs) {
        const title = workflowRun.head_commit.message.split("\n")[0]
        const workflowRunLog = `${workflowRun.id} created at ${workflowRun.created_at}. Title: "${title}", Author: ${workflowRun.head_commit.author.name} - ${workflowRun.head_commit.author.email}, Branch: ${workflowRun.head_branch}, Workflow: ${workflowRun.name}`;

        if(process.env.GITHUB_RUN_ID == workflowRun.id){
          core.info(`Skipping current workflow run.`);

          continue;
        }

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

        try {
          let { status } = await octokit.actions.deleteWorkflowRun(deleteParameters);

          if(status == 204){
            core.info(`Deleted workflow run ${workflowRun.id}.`);
            deletedFromCurrentPage = true;
          } else{
            core.warning(`Something went wrong while deleting workflow "${title}" with ID:${workflowRun.id}. Status code: ${status}`);
          }
        } catch (error) {
          core.info(inspect(error));
        }
      }

      if(deletedFromCurrentPage && response.data.total_count < parameters.per_page){
        break;
      }

      if(whatIf !== "false" || !deletedFromCurrentPage){
        parameters.page += 1;
      }
    }
  } catch (error) {
    core.info(inspect(error));
    core.setFailed(error.message);
  }
}
