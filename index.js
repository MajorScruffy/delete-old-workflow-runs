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
    const repositoryName = core.getInput('repository-name');
    core.info(repositoryName);

    // `access-token` input defined in action.yml
    const accessToken = core.getInput('access-token');

    let parameters;
    parameters["page"] = 2;

    // workaround for https://github.com/octokit/request-action/issues/71
    // un-encode "repo" in /repos/{repo} URL when "repo" parameter is set to ${{ github.repository }}
    const { url, body, ...options } = octokit.request.endpoint(
      "GET /repos/MajorScruffy/delete-old-workflow-runs/actions/runs",
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

    core.info(`< ${status} ${Date.now() - time}ms`);
    core.info(JSON.stringify(headers));
    core.info(JSON.stringify(data));

    core.setOutput("status", status);
  } catch (error) {
    if (error.status) {
      core.info(`< ${error.status} ${Date.now() - time}ms`);
    }

    core.setOutput("status", error.status);
    core.debug(inspect(error));
    core.setFailed(error.message);
  }
}