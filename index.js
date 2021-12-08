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

    let parameters = [];
    parameters["page"] = 0;

    do {
      parameters["page"]++;

      // workaround for https://github.com/octokit/request-action/issues/71
      // un-encode "repo" in /repos/{repo} URL when "repo" parameter is set to ${{ github.repository }}
      const { url, body, ...options } = octokit.request.endpoint(
        `GET /repos/${repository}/actions/runs`,
        parameters
      );

      const requestOptions = {
        ...options,
        data: body,
        url: url.replace(
          /\/repos\/([^/]+)/,
          (_, match) => "/repos/" + decodeURIComponent(match)
        ),
      };

      core.info(`parsed request options: ${inspect(requestOptions)}`);

      const { status, headers, data } = await octokit.request(requestOptions);

      data.workflow_runs

      core.info(`< ${status} ${Date.now() - time}ms`);
      core.info(JSON.stringify(headers));
      core.info(JSON.stringify(data));

      core.setOutput("status", status);
    } while (data.workflow_runs > 0);
  } catch (error) {
    if (error.status) {
      core.info(`< ${error.status} ${Date.now() - time}ms`);
    }

    core.setOutput("status", error.status);
    core.debug(inspect(error));
    core.setFailed(error.message);
  }
}