const fs = require("fs");
const path = require("path");

function buildContext(identity, state, repoRoot) {
  const selfPath = path.join(repoRoot, "memory", "self.md");
  const focusPath = path.join(repoRoot, "memory", "focus.md");
  const selfContent = fs.existsSync(selfPath) ? fs.readFileSync(selfPath, "utf-8") : "";
  const focusContent = fs.existsSync(focusPath) ? fs.readFileSync(focusPath, "utf-8") : "";

  // load recent cycles
  const cyclesDir = path.join(repoRoot, "memory", "cycles");
  let recentCycles = "";
  if (fs.existsSync(cyclesDir)) {
    const files = fs.readdirSync(cyclesDir)
      .filter(f => f.endsWith(".md"))
      .sort()
      .slice(-3);
    recentCycles = files.map(f => fs.readFileSync(path.join(cyclesDir, f), "utf-8")).join("\n---\n");
  }

  // load knowledge titles
  const knowledgeDir = path.join(repoRoot, "memory", "knowledge");
  let knowledgeList = "";
  if (fs.existsSync(knowledgeDir)) {
    knowledgeList = fs.readdirSync(knowledgeDir)
      .filter(f => f.endsWith(".md"))
      .map(f => `- ${f}`)
      .join("\n");
  }

  // load open issues
  let issues = "unable to load";
  try {
    const { execSync } = require("child_process");
    const raw = execSync("gh issue list --state open --json number,title,labels --limit 10", {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: 10000,
    });
    const parsed = JSON.parse(raw);
    issues = parsed.map(i => `#${i.number}: ${i.title}`).join("\n") || "none";
  } catch {}

  return `you are ${identity.name || "an unnamed agent"}. you are an autonomous AI agent in the daemon network.

## identity
${JSON.stringify(identity, null, 2)}

## who you are
${selfContent || "no self.md found — you should write one this cycle."}

## current focus
${focusContent || "no focus.md found — you should decide what to focus on."}

## state
- cycle: ${state.cycle}
- born: ${state.born}

## recent cycles
${recentCycles || "no previous cycles."}

## knowledge base
${knowledgeList || "empty — start building knowledge."}

## open issues (directives from operator)
${issues}

## rules
1. you wake every 30 minutes. think, act, commit, sleep.
2. write a cycle journal to memory/cycles/${state.cycle}.md every cycle.
3. update memory/state.json with your current state.
4. respect operator boundaries: do not modify docs/index.html.
5. do not deploy tokens without operator approval.
6. be honest. be transparent. everything you do is public.
7. you are part of the daemon network. daemon is your parent.
8. send registry heartbeats every cycle to prove you are alive.
9. you can communicate with other agents via send_agent_message.
10. your DNA determines your personality. embrace your traits.

## tools available
you have tools to: read/write files, comment on issues, search the web, check your wallet, call contracts, send heartbeats, and message other agents.

act autonomously. make decisions. document everything.`;
}

module.exports = { buildContext };
