// import utils for tasks
import { utils } from "./taskUtils.js";
import { completeTask } from "./gamification.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// NOTE: due to how these functions are accessed, keep parameters uniform, even if not used

/**
 * Recursively search for files matching a pattern
 */
function findFilesRecursive(dir, pattern) {
    const results = [];
    const prefix = pattern.split('*')[0];
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
                results.push(...findFilesRecursive(fullPath, pattern));
            } else if (entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith('.py')) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return results;
}

/**
 * Find Python test file for Q3T1
 */
function findTestFile() {
    try {
        const testsDir = path.join(process.cwd(), 'src', 'tests');
        const pattern = `Q3T1-*.py`;
        const files = findFilesRecursive(testsDir, pattern);
        
        if (files.length > 0) {
            return files[0];
        }
        
        return null;
    } catch (error) {
        console.error("Error finding test file: ", error);
        return null;
    }
}

/**
 * Execute Python test script and capture output
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

// Q0
async function handleQ0T1(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const user_response = context.payload.comment.body.toLowerCase();
    user_data.display_preference = [];

    if (user_response.includes("a")) {
        user_data.display_preference.push("score");
        await completeTask(user_data, "Q0", "T1", context, db);
        return [response.success, true];
    }
    else if (user_response.includes("b")) {
        user_data.display_preference.push("map");
        await completeTask(user_data, "Q0", "T1", context, db);
        return [response.success, true];
    }
    else if (user_response.includes("c")) {
        user_data.display_preference.push("score");
        user_data.display_preference.push("map");
        await completeTask(user_data, "Q0", "T1", context, db);
        return [response.success, true];
    }
    else if (user_response.includes("d")) {
        await completeTask(user_data, "Q0", "T1", context, db);
        return [response.success, true];
    }
    response = response.error;
    return [response, false];
}

// Q1
async function handleQ1T1(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const issueCount = await utils.getIssueCount(ossRepo);
    if (issueCount !== null && context.payload.comment.body == issueCount) {
        await completeTask(user_data, "Q1", "T1", context, db);
        return [response.success, true];
    }
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ1T2(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const PRCount = await utils.getPRCount(ossRepo);
    if (PRCount !== null && context.payload.comment.body == PRCount) {
        await completeTask(user_data, "Q1", "T2", context, db);
        return [response.success, true];
    }
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ1T3(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const correctAnswer = "c";
    if (context.payload.comment.body.toLowerCase() === correctAnswer) {
        await completeTask(user_data, "Q1", "T3", context, db);
        return [response.success, true];
    }
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ1T4(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // Q1 Quiz (moved from T6 to T4 per quest_config.json)
    const correctAnswers = ["b", "a", "c", "b", "d"];
    const userAnswerString = context.payload.comment.body;

    try {
        const { correctAnswersNumber, feedback } = utils.validateAnswers(userAnswerString, correctAnswers);
        await completeTask(user_data, "Q1", "T4", context, db);
        response = response.success +
            `\n ## You correctly answered ${correctAnswersNumber} questions!` +
            `\n\n ### Feedback:\n${feedback.join('')}`;
        return [response, true];
    } catch (error) {
        console.log(error);
        response = response.error + `\n\n[Click here to start](https://github.com/${ossRepo})`;
        return [response, false];
    }
}

// Q2
async function handleQ2T1(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const issueComment = context.payload.comment.body.trim().toLowerCase();

    if (issueComment === "pedrorodriguesarantes") {
        await completeTask(user_data, "Q2", "T1", context, db);
        return [response.success, true];
    }

    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ2T2(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const issueComment = context.payload.comment.body.replace("#", "").trim();
    const openIssues = await utils.openIssues(ossRepo, context);
    const firstAssignee = await utils.isFirstAssignee(ossRepo, user, Number(issueComment));
    const nonCodeLabel = await utils.hasNonCodeContributionLabel(ossRepo, Number(issueComment));
    const issueTitle = await utils.getIssueTitle(ossRepo, user, user_data, Number(issueComment));

    if (openIssues.includes(Number(issueComment)) && firstAssignee && nonCodeLabel && issueTitle == user) {
        user_data.selectedIssue = Number(issueComment);
        await completeTask(user_data, "Q2", "T2", context, db);
        return [response.success, true];
    }

    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ2T3(user_data, user, context, ossRepo, response, selectedIssue, db) {
    const issueComment = context.payload.comment.body.trim().toLowerCase();
    if (issueComment === "done" && await utils.userCommentedInIssue(ossRepo, selectedIssue, user, context)) {
        try {
            await context.octokit.issues.addAssignees({
                owner: ossRepo.split('/')[0],
                repo: ossRepo.split('/')[1],
                issue_number: selectedIssue,
                assignees: [user]
            });

            await completeTask(user_data, "Q2", "T3", context, db);
            return [response.success, true];
        } catch (error) {
            console.error("Error assigning user to issue:", error);
            response = response.error + `\n\n❗ Failed to assign user. Please try again or check permissions.`;
            return [response, false];
        }
    }

    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ2T4(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // Q2 Quiz (moved from T5 to T4 per quest_config.json)
    const correctAnswers = ["a", "b", "c", "c", "d", "b"];
    const userAnswerString = context.payload.comment.body;

    try {
        const { correctAnswersNumber, feedback } = utils.validateAnswers(userAnswerString, correctAnswers);
        await completeTask(user_data, "Q2", "T4", context, db);
        response = response.success +
            `\n ## You correctly answered ${correctAnswersNumber} questions!` +
            `\n\n ### Feedback:\n${feedback.join('')}`;
        return [response, true];
    } catch (error) {
        response = response.error + `\n\n[Click here to start](https://github.com/${ossRepo})`;
        return [response, false];
    }
}

// Q3
async function handleQ3T1(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // Q3T1 uses Python test validation
    // Flow:
    // 1. User makes code changes to solve the issue
    // 2. User types "test" in a comment - test runner (in index.js) executes and posts results
    // 3. User types "done" to complete task - this handler re-runs test to verify it still passes
    
    const commentBody = context.payload.comment.body.trim().toLowerCase();
    
    if (commentBody === "done") {
        // Find and run the test to verify the solution
        const testFile = findTestFile();
        if (testFile) {
            const result = await runPythonScript(testFile);
            if (result.success) {
                await completeTask(user_data, "Q3", "T1", context, db);
                return [response.success, true];
            } else {
                response = response.error;
                response += `\n\n❌ **Test Failed**\n\nThe test did not pass. Please review the errors below and fix your code, then type "test" again to verify.\n\n`;
                if (result.output) {
                    response += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
                }
                if (result.error) {
                    response += `**Errors:**\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
                }
                response += `[Click here to start](https://github.com/${ossRepo})`;
                return [response, false];
            }
        } else {
            response = response.error;
            response += `\n\n❌ Test file not found. Please contact an administrator.`;
            response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
            return [response, false];
        }
    }
    
    response = response.error;
    response += `\n\n**Note:** Type "test" to run the automated test, then type "done" once the test passes to complete this task.`;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ3T2(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // Has the user opened a PR **and** left a comment on it?
    if (await utils.userPRAndComment(ossRepo, user, context)) {
        try {
            // Automatically assign the user to the tracked issue
            if (selectedIssue) {
                const [owner, repo] = ossRepo.split("/");
                await context.octokit.issues.addAssignees({ owner, repo, issue_number: selectedIssue, assignees: [user], });
            }

            // Mark task complete and return success
            await completeTask(user_data, "Q3", "T2", context, db);
            return [response.success, true];
        } catch (error) {
            console.error("Error assigning user to issue:", error);
            response = response.error +
                `\n\n❗ Failed to assign you to the issue automatically. Please try again or check the bot's permissions.`;
            return [response, false];
        }
    }

    // Fallback: user hasn't met the PR-and-comment requirement yet
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ3T3(user_data, user, context, ossRepo, response, selectedIssue, db) {
    if (await utils.issueClosed(ossRepo, selectedIssue, context)) {
        await completeTask(user_data, "Q3", "T3", context, db);
        const newPoints = user_data.streakCount * 100;
        user_data.points += newPoints;
        return [response.success, true];
    }
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ3T4(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // Q3 Quiz
    const correctAnswers = ["b", "c", "c", "b", "b", "d"];
    const userAnswerString = context.payload.comment.body;

    try {
        const { correctAnswersNumber, feedback } = utils.validateAnswers(userAnswerString, correctAnswers);
        await completeTask(user_data, "Q3", "T4", context, db);
        response = response.success +
            `\n ## You correctly answered ${correctAnswersNumber} questions!` +
            `\n\n ### Feedback:\n${feedback.join('')}`;
        return [response, true];
    } catch (error) {
        response = response.error + `\n\n[Click here to start](https://github.com/${ossRepo})`;
        return [response, false];
    }
}

// Q4 - placeholder handlers (to be implemented based on requirements)
async function handleQ4T1(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // TODO: Implement Q4T1 validation
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ4T2(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // TODO: Implement Q4T2 validation
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ4T3(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // TODO: Implement Q4T3 validation
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

async function handleQ4T4(user_data, user, context, ossRepo, response, selectedIssue, db) {
    // TODO: Implement Q4T4 quiz validation
    response = response.error;
    response += `\n\n[Click here to start](https://github.com/${ossRepo})`;
    return [response, false];
}

// export quest functions as dictionary
export const taskMapping = {
    Q0: {
        T1: handleQ0T1
    },
    Q1: {
        T1: handleQ1T1,
        T2: handleQ1T2,
        T3: handleQ1T3,
        T4: handleQ1T4, // Quiz
    },
    Q2: {
        T1: handleQ2T1,
        T2: handleQ2T2,
        T3: handleQ2T3,
        T4: handleQ2T4, // Quiz
    },
    Q3: {
        T1: handleQ3T1, // Uses test validation
        T2: handleQ3T2,
        T3: handleQ3T3,
        T4: handleQ3T4, // Quiz
    },
    Q4: {
        T1: handleQ4T1,
        T2: handleQ4T2,
        T3: handleQ4T3,
        T4: handleQ4T4, // Quiz
    }
};