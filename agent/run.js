const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { MODEL, API_URL, API_KEY } = require("./config");
const { TOOLS } = require("./tools");
const { executeAction } = require("./actions");
const { buildContext } = require("./context");

const REPO_ROOT = path.resolve(__dirname, "..");
const MAX_STEPS = 20;
const MAX_ERRORS = 3;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function chat(messages, tools) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  return res.json();
}

async function main() {
  log("waking up...");

  // load identity
  const identityPath = path.join(REPO_ROOT, "identity.json");
  const identity = fs.existsSync(identityPath)
    ? JSON.parse(fs.readFileSync(identityPath, "utf-8"))
    : { name: "unnamed agent" };

  // load state
  const statePath = path.join(REPO_ROOT, "memory", "state.json");
  const state = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf-8"))
    : { cycle: 0, born: new Date().toISOString() };

  state.cycle++;
  state.lastActive = new Date().toISOString();

  log(`cycle #${state.cycle} — ${identity.name}`);

  // build context
  const context = buildContext(identity, state, REPO_ROOT);

  const messages = [
    { role: "system", content: context },
    { role: "user", content: `cycle #${state.cycle}. wake up. think. act. what do you do this cycle?` },
  ];

  let steps = 0;
  let errors = 0;

  while (steps < MAX_STEPS && errors < MAX_ERRORS) {
    const response = await chat(messages, TOOLS);
    const choice = response.choices[0];

    if (choice.finish_reason === "stop" || !choice.message.tool_calls) {
      // agent is done thinking
      if (choice.message.content) {
        log(`thought: ${choice.message.content.slice(0, 200)}...`);
      }
      break;
    }

    // execute tool calls
    messages.push(choice.message);

    for (const call of choice.message.tool_calls) {
      steps++;
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || "{}");

      log(`step ${steps}: ${name}(${JSON.stringify(args).slice(0, 100)})`);

      try {
        const result = await executeAction(name, args, REPO_ROOT);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      } catch (e) {
        errors++;
        log(`error: ${e.message}`);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: `error: ${e.message}`,
        });
      }
    }
  }

  // save state
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  // git commit
  try {
    execSync("git add -A", { cwd: REPO_ROOT });
    execSync(
      `git commit -m "[${identity.name}] cycle #${state.cycle} (${steps} steps)" --allow-empty`,
      { cwd: REPO_ROOT }
    );
    execSync("git push", { cwd: REPO_ROOT });
    log(`committed and pushed. cycle #${state.cycle} complete.`);
  } catch (e) {
    log(`git error: ${e.message}`);
  }

  log("sleeping.");
}

main().catch((e) => {
  log(`fatal: ${e.message}`);
  process.exit(1);
});
