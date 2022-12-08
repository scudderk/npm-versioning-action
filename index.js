const core = require("@actions/core");
const github = require("@actions/github");
const { promises: fs } = require("fs");
const { spawn } = require("child_process");

async function main() {
  try {
    let versioningName = "";
    let tag = "beta";
    let defaultReleaseBranchs = core.getInput("release-branch") || "master";
    const packageJsonPath =
      core.getInput("package-json-path") || "./package.json";
    const updateVersion = core.getInput("update-version") || "true";
    console.log("defaultReleaseBranch: ", defaultReleaseBranchs);
    console.log("packageJsonPath: ", packageJsonPath);
    console.log("updateVersion: ", updateVersion);
    if (defaultReleaseBranchs.includes(",")) {
      defaultReleaseBranchs = defaultReleaseBranchs.split(",");
    } else {
      defaultReleaseBranchs = [defaultReleaseBranchs];
    }

    const branchName = github.context.ref
      .replace("refs/heads/", "")
      .replace("\r", "")
      .replace("\n", "");
    const branchNameEscaped = branchName.replace("/", "-");

    const packageJson = JSON.parse(
      (await fs.readFile(packageJsonPath)).toString()
    );
    console.log("packageJsonVersion: ", packageJson.version);
    console.log(
      `defaultReleaseBranchs${JSON.stringify(
        defaultReleaseBranchs
      )}, branchName: ${branchName}`
    );
    if (defaultReleaseBranchs.includes(branchName)) {
      versioningName = packageJson.version;
      tag = "latest";
    } else {
      let countResolve, countReject;

      const countCommitPromise = new Promise((rs, rj) => {
        countResolve = rs;
        countReject = rj;
      });

      const countCommitProcess = spawn("git", ["rev-list", "--count", "HEAD"]);
      countCommitProcess.stdout.on("data", (data) => {
        countResolve(data.toString().trim());
      });
      countCommitProcess.stderr.on("data", (err) => {
        countReject(err.toString());
      });

      const commitCount = await countCommitPromise;
      console.log("commitCount: ", commitCount);
      versioningName = `${packageJson.version}-${branchNameEscaped}.${commitCount}`;
    }
    if (updateVersion === "true") {
      packageJson.version = versioningName;
    }
    console.log(`versioning name: ${versioningName}, tag: ${tag}`);
    core.setOutput("version", versioningName);
    core.setOutput('version-number', `${packageJson.version}`)
    core.setOutput("tag", tag);
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
