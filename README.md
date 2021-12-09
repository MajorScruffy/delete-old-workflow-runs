# delete-old-workflow-runs
A GitHub Action used to delete workflow runs from a repository.

Behind the scenes it uses [Octokit request-action](https://github.com/octokit/request-action) to call the GitHub API, so you'll need to add the GITHUB_TOKEN as an environment variable:
```
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Example usage
```
steps:
  - name: Delete workflow runs
    uses: MajorScruffy/delete-workflow-runs
    id: delete-workflow-runs
    with:
      repository: MajorScruffy/delete-workflow-runs   # replace this with your own repository
      older-than-seconds: 86400                       # remove all workflow runs older than 1 day
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

See also the [Demo workflow](.github/workflows/main.yml).

## Inputs

### `repository` **required**
This is the repository for which to delete workflow runs. Should be in the format `{user}/{repository}`

### `workflow`
The path to the workflow's .yml file. For example `.github/workflows/main.yml`. Use this parameter in case you have multiple workflows in the same repository, but you only want to delete the workflow runs for a single workflow.

### `older-than-seconds`
Use this parameter to delete only the workflow runs that are older than the given number of seconds. If this parameter is set, the `created-before` parameter will be ignored.

### `created-before`
Use this parameter to delete only the workflow runs that were created before the given date in ISO 8601 format. For example, `2021-12-08T16:34:00Z`. This parameter is ignored if `older-than-seconds` is set.

### `actor`
Delete only the workflow runs for the given GitHub user. This is the e-mail address of the user who pushed the code.

### `branch`
Delete only the workflow runs on the given branch.

### `event`
Delete only the workflow runs triggered by the given event type. For example, push, pull_request or issue.

### `status`
Delete only the workflow runs with the give status. Can be one of queued, in_progress, or completed.

### `maximum-workflow-runs-to-keep`
The maximum number of workflow runs to keep, after applying all the given filters. Defaults to 5.

### `what-if`
Set to true to preview the changes made by this action without deleting any workflow runs. Defaults to false.
