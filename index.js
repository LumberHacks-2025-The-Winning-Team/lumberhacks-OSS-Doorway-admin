/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
import mongoose from "mongoose";
import fs from "fs";
import readline from "readline";
import { spawn } from "child_process";
import path from "path";

import { gameFunction } from "./src/gamification.js";
import { MongoDB } from "./src/database.js";
const responseFilePath = "./src/config/response.json";
const questConfigFilepath = "./src/config/quest_config.json"

const questConfig = JSON.parse(fs.readFileSync(questConfigFilepath));
const responses = JSON.parse(fs.readFileSync(responseFilePath, "utf-8")).responses;

const db = new MongoDB();
await db.connect();

await checkOSSRepo();


export default (app) => {
  app.on("issues.opened", async (context) => {
    const { owner, repo } = context.repo();
    if (context.payload.issue.user.type === "Bot") return;
    // edge case: OSS repo also under user/org
    if (owner + "/" + repo == process.env.OSS_REPO) return;

    const user = context.payload.issue.user;
    const issueComment = context.issue({
      body: responses.newIssue,
    });

    try {
      context.octokit.issues.createComment(issueComment);
    } catch (error) {
      console.error("Error commenting: ", error);
    }

    return;
  });

  app.on("issue_comment.created", async (context) => {
    const user = context.payload.comment.user.login;
    // in orgs, the org is the "owner" of the repo
    const { owner, repo } = context.repo();
    // edge case: OSS repo also under user/org
    if (owner + "/" + repo == process.env.OSS_REPO) return;
    const comment = context.payload.comment.body;
    // admin commands
    if (comment.startsWith("/")) {
      if (await isAdmin(context, owner, user) || context.payload.comment.user.type === "Bot") {
        await parseCommand(context, owner, comment);
      } else{
        issueComment(context, "You need to be a repo or org owner to run / commands.");
      }
    } 
    else if (comment.startsWith("help")){
      try{
        await connectToDatabase();
        var user_document = await db.downloadUserData(user);
        await gameFunction.giveHint(user_document.user_data, context, db);
        db.updateData(user_document);
        mongoose.disconnect();
      }
      catch (error) {
        console.log(error);
      }
    }
    else if (comment.trim().toLowerCase() === "test"){
      // Handle test command
      if (context.payload.comment.user.type === "Bot") return;
      try {
        await runTest(context);
      } catch (error) {
        console.error("Error running test: ", error);
        issueComment(context, `❌ Error running test: ${error.message}`);
      }
    }

    // quest response
    else {
      if (context.payload.comment.user.type === "Bot") return;
      try {
        await connectToDatabase();
        var user_document = await db.downloadUserData(user);
        await gameFunction.validateTask(user_document.user_data, context, user, db);
        db.updateData(user_document);
        mongoose.disconnect();
      } catch (error) {
        issueComment(
          context,
          "user " +
            user +
            " commented but does not yet exist in database. /new_user <user>"
        );
        console.log(error);
      }
    }
  });
};

async function connectToDatabase() {
  try {
    await mongoose.connect(`${process.env.URI}/${process.env.DB_NAME}`);
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1); // fail code
  }
}

// match and break down / command
async function parseCommand(context, org, comment) {
  const regex = /^(\/(new_user|del_user|del_repo|reset_repo|create_repos))(\s+(.+))?$/;
  const match = comment.match(regex);
  if (match) {
    const command = match[2];
    var argument = match[4];

    var response = "";
    var status = false;

    // detect command
    if (command) {
      const { owner, repo } = context.repo();
      switch (command) {
        case "create_repos":
          const users = argument.split(',').map(user => user.trim());
          response = await gameFunction.createRepos(context, org, users, db); 
          break;
        case "new_user":
          // create user
          status = await db.createUser(argument);
          if (status) {
            response = responses.newUserResponse;
            var user_document = await db.downloadUserData(argument);
            gameFunction.acceptQuest(context, user_document.user_data, "Q0");
            // update readme and data
            gameFunction.updateReadme(
              owner,
              repo,
              context,
              user_document.user_data
            );
            await db.updateData(user_document);
          } else {
            response = "Failed to create new user, user already exists";
          }
          break;
        case "del_user":
          // wipe user from database
          await db.wipeUser(argument);
          response = "user wipe complete";
          break;
        case "del_repo":
          // delete repo
          response = await gameFunction.deleteRepo(context, owner, argument);
          break;
        case "reset_repo": // does not delete
          try {
            await gameFunction.resetReadme(org, argument, context);
            await gameFunction.closeIssues(context);
            response = "repo reset successful";
          } catch {
            response = "repo reset failed";
          }
          // might need to add hints to this?
          case "new_hint":
          // create hint
          status = await db.createHint(argument);
          if (status) {
            response = "Hint added";
            //var user_document = await db.downloadUserData(argument);
            //gameFunction.acceptQuest(context, user_document.user_data, "Q0");
            // update readme and data
            /*gameFunction.updateReadme(
              owner,
              repo,
              context,
              user_document.user_data
            );*/ // TODO: same as below
            //await db.hintData(user_document);
          } else {
            response = "Failed to create new user, user already exists";
          }
          break;
          
          
          break;
        default:
          response = responses.invalidCommand;
          break;
      }

      // feedback
      if (response !== "") {
        issueComment(context, response);
      }
    }
  }else{
    issueComment(context, responses.invalidCommand);
  }
}

async function issueComment(context, msg) {
  const issueComment = context.issue({ body: msg });
  try {
    await context.octokit.issues.createComment(issueComment);
  } catch (error) {
    console.error("Error creating issue comment: ", error);
  }
}

async function isAdmin(context, org, username) {
  try {
    const owner_list = await context.octokit.orgs.listMembers({
      org,
      role: "owner",
    });
    const owners = owner_list.data.map(user => user.login)
    return owners.includes(username);

  } catch (error) {
    context.log.error(error);
    throw new Error(
      "Failed to check if user is the owner of the organization."
    );
  }
}

async function checkOSSRepo() {
  if (!process.env.OSS_REPO) {
      console.log('OSS_REPO is missing in the .env file.');
      console.log('Expected input: <owner/repo>, owner is either a GitHub username or organization and repo is the OSS repo.')
      console.warn('The bot cannot respond in this repo, it is read only. The user or organization should own the OSS repo.')
      console.log('Please enter the repository:');
      
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
      });

      return new Promise((resolve) => {
          rl.question('OSS_REPO: ', (answer) => {
              rl.close();
              
              fs.appendFileSync('.env', `OSS_REPO="${answer}"\n`);
              console.log('OSS_REPO has been added to .env file.\n');
              resolve(answer);
          });
      });
  } else {
      console.log('✅ OSS_REPO found:', process.env.OSS_REPO, '\n');
      return process.env.OSS_REPO;
  }
}

/**
 * Extract quest and task numbers from issue title
 * @param {string} title - Issue title (e.g., "❗ Q1 T2: Explore the pull-request menu")
 * @returns {{quest: string, task: string}|null} - Object with quest and task (e.g., {quest: "Q1", task: "T2"}) or null if not found
 */
function extractQuestAndTask(title) {
  // Match pattern like "Q1 T2" or "Q1T2" in the title
  const regex = /Q(\d+)\s*T(\d+)/i;
  const match = title.match(regex);
  
  if (match) {
    return {
      quest: `Q${match[1]}`,
      task: `T${match[2]}`
    };
  }
  
  return null;
}

/**
 * Recursively search for files matching a pattern
 * @param {string} dir - Directory to search
 * @param {string} pattern - Filename pattern (e.g., "Q1T2-*.py")
 * @returns {string[]} - Array of matching file paths
 */
function findFilesRecursive(dir, pattern) {
  const results = [];
  const prefix = pattern.split('*')[0]; // Get the prefix before the wildcard
  
  // Skip common directories that shouldn't be searched
  const skipDirs = ['node_modules', '.git', '.env', 'dist', 'build', '.next'];
  const dirName = path.basename(dir);
  
  if (skipDirs.includes(dirName)) {
    return results;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        results.push(...findFilesRecursive(fullPath, pattern));
      } else if (entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith('.py')) {
        // Match files that start with the prefix and end with .py
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return results;
}

/**
 * Find Python test file matching the quest and task pattern
 * @param {string} quest - Quest identifier (e.g., "Q1")
 * @param {string} task - Task identifier (e.g., "T2")
 * @returns {string|null} - Path to test file or null if not found
 */
function findTestFile(quest, task) {
  try {
    // Search for files matching Q#T#-*.py pattern
    const pattern = `${quest}${task}-*.py`;
    const files = findFilesRecursive(process.cwd(), pattern);
    
    if (files.length > 0) {
      // Return the first matching file (relative to cwd)
      const cwd = process.cwd();
      return files[0].startsWith(cwd) ? files[0] : path.join(cwd, files[0]);
    }
    
    return null;
  } catch (error) {
    console.error("Error finding test file: ", error);
    return null;
  }
}

/**
 * Execute Python test script and capture output
 * @param {string} scriptPath - Path to Python test script
 * @returns {Promise<{success: boolean, output: string, error: string}>}
 */
function runPythonScript(scriptPath) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    
    const python = spawn('python3', [scriptPath], {
      cwd: process.cwd(),
      env: process.env
    });
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr,
        exitCode: code
      });
    });
    
    python.on('error', (error) => {
      resolve({
        success: false,
        output: stdout,
        error: `Failed to execute Python script: ${error.message}`,
        exitCode: -1
      });
    });
  });
}

/**
 * Format test results as a markdown comment
 * @param {boolean} success - Whether test passed
 * @param {string} output - Test output
 * @param {string} error - Test error output
 * @param {string} quest - Quest identifier
 * @param {string} task - Task identifier
 * @returns {string} - Formatted markdown comment
 */
function formatTestResults(success, output, error, quest, task) {
  let result = `## 🧪 Test Results for ${quest} ${task}\n\n`;
  
  if (success) {
    result += '✅ **Test Passed**\n\n';
  } else {
    result += '❌ **Test Failed**\n\n';
  }
  
  if (output && output.trim()) {
    result += '### Output:\n```\n';
    result += output.trim();
    result += '\n```\n\n';
  }
  
  if (error && error.trim()) {
    result += '### Error:\n```\n';
    result += error.trim();
    result += '\n```\n\n';
  }
  
  return result;
}

/**
 * Main function to run test based on issue title
 * @param {object} context - Probot context
 */
async function runTest(context) {
  try {
    const { owner, repo } = context.repo();
    const issueNumber = context.issue().issue_number;
    let issueTitle;
    
    // Try to get issue from payload first
    if (context.payload.issue?.title) {
      issueTitle = context.payload.issue.title;
    } else {
      // Fetch issue if not in payload (for issue_comment.created events)
      const issueResponse = await context.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });
      
      issueTitle = issueResponse.data.title;
    }
    
    if (!issueTitle) {
      await issueComment(context, '❌ Could not retrieve issue title.');
      return;
    }
    
    // Extract quest and task from title
    const extracted = extractQuestAndTask(issueTitle);
    
    if (!extracted) {
      await issueComment(context, '❌ Could not find quest and task in issue title. Issue title should follow the pattern "Q# T#: ..."');
      return;
    }
    
    // Find test file
    const testFile = findTestFile(extracted.quest, extracted.task);
    
    if (!testFile) {
      await issueComment(context, `❌ Test file not found for ${extracted.quest} ${extracted.task}. Expected pattern: ${extracted.quest}${extracted.task}-*.py`);
      return;
    }
    
    // Post initial message
    await issueComment(context, `🔄 Running test for ${extracted.quest} ${extracted.task}...`);
    
    // Run test
    const result = await runPythonScript(testFile);
    
    // Format and post results
    const formattedResult = formatTestResults(result.success, result.output, result.error, extracted.quest, extracted.task);
    
    await issueComment(context, formattedResult);
    
  } catch (error) {
    console.error("Error in runTest: ", error);
    await issueComment(context, `❌ Error running test: ${error.message}`);
  }
}