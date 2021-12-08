const { inspect } = require("util");
const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/action");

main();

async function main() {
  const time = Date.now();

  try {
    const octokit = new Octokit();

    // `repository-name` input defined in action.yml
    const repository = core.getInput('repository');
    core.info(repository);

    const createdBefore = core.getInput('created-before');
    core.info(createdBefore);

    const createdBeforeDate = new Date(createdBefore)
    core.info(inspect(createdBeforeDate));

    let parameters = [];
    parameters["page"] = 0;

    for(;;) {
      parameters["page"]++;

      let requestOptions = octokit.request.endpoint(
        `GET /repos/${repository}/actions/runs`,
        parameters
      );

      core.info(`parsed request options: ${inspect(requestOptions)}`);

      let { status, headers, data } = await octokit.request(requestOptions);

      core.info(`< ${status} ${Date.now() - time}ms`);
      core.info(inspect(headers));
      core.info(inspect(data.workflow_runs.map(x => x.head_commit.message)));

      core.setOutput("status", status);

      if(data.workflow_runs <= 0){
        break;
      }

      for (const workflowRun of data.workflow_runs) {
        if(createdBeforeDate < workflowRun.created_at){
          core.info(`Skipped workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}`);
          continue;
        }

        core.info(`Deleting workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}`);

        if(workflowRun.head_commit.message == "Followed documentation to create JS action"){
          let deleteParameters = [];
          deleteParameters["run_id"] = 0;

          let requestOptions = octokit.request.endpoint(
            `DELETE /repos/${repository}/actions/runs/${workflowRun.id}`,
            deleteParameters
          );

          core.info(`parsed request options: ${inspect(requestOptions)}`);

          let { status, headers, data } = await octokit.request(requestOptions);

          core.info(`< ${status} ${Date.now() - time}ms`);
          core.info(inspect(headers));

          if(status == 204){
            core.info(`Deleted workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}`);
          }
          else{
            core.warning(`Something went wrong while deleting workflow "${workflowRun.head_commit.message}" with ID:${workflowRun.id}. Status code: ${status}`);
          }
        }
      }
    } 
  } catch (error) {
    if (error.status) {
      core.info(`< ${error.status} ${Date.now() - time}ms`);
    }

    core.setOutput("status", error.status);
    core.info(inspect(error));
    core.setFailed(error.message);
  }
}