/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 389:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 977:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 386:
/***/ ((module) => {

module.exports = eval("require")("@octokit/action");


/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const { inspect } = __nccwpck_require__(837);
const core = __nccwpck_require__(389);
const github = __nccwpck_require__(977);
const { Octokit } = __nccwpck_require__(386);

main();

async function main() {
  const time = Date.now();

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
          core.info(`Skipped workflow run "${workflowRun.head_commit.message}" with ID:${workflowRun.id}...`);
          continue;
        }

        if(!!createdBeforeDate && createdBeforeDate < createdAt){
          continue;
        }

        core.info(`Deleting workflow run "${workflowRun.head_commit.message}" with ID:${workflowRun.id}...`);

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
})();

module.exports = __webpack_exports__;
/******/ })()
;