const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, "..");

function log(msg) {
  console.log(`[action] ${msg}`);
}

async function executeAction(name, args, repoRoot) {
  const root = repoRoot || REPO_ROOT;

  switch (name) {
    case "write_file": {
      const filePath = path.join(root, args.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, args.content);
      log(`wrote ${args.path}`);
      return `wrote ${args.path} (${args.content.length} bytes)`;
    }

    case "read_file": {
      const filePath = path.join(root, args.path);
      if (!fs.existsSync(filePath)) return `error: ${args.path} not found`;
      const content = fs.readFileSync(filePath, "utf-8");
      return content.slice(0, 8000);
    }

    case "append_file": {
      const filePath = path.join(root, args.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.appendFileSync(filePath, args.content);
      log(`appended to ${args.path}`);
      return `appended to ${args.path}`;
    }

    case "list_dir": {
      const dirPath = path.join(root, args.path || ".");
      if (!fs.existsSync(dirPath)) return `error: ${args.path} not found`;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.map(e => (e.isDirectory() ? e.name + "/" : e.name)).join("\n");
    }

    case "comment_issue": {
      const token = process.env.GH_TOKEN;
      if (!token) return "error: GH_TOKEN not set";
      const repo = execSync("git remote get-url origin", { cwd: root, encoding: "utf-8" })
        .trim().replace("https://github.com/", "").replace(".git", "");
      const res = await fetch(`https://api.github.com/repos/${repo}/issues/${args.issue}/comments`, {
        method: "POST",
        headers: {
          "Authorization": `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: args.body }),
      });
      if (!res.ok) return `error: ${res.status}`;
      return `commented on issue #${args.issue}`;
    }

    case "web_search": {
      try {
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=5`, {
          headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY || "" },
        });
        if (!res.ok) return `search failed: ${res.status}`;
        const data = await res.json();
        return (data.web?.results || []).map(r => `${r.title}\n${r.url}\n${r.description}`).join("\n\n").slice(0, 4000);
      } catch (e) {
        return `search error: ${e.message}`;
      }
    }

    case "check_wallet": {
      try {
        const key = process.env.DAEMON_WALLET_KEY;
        if (!key) return "error: DAEMON_WALLET_KEY not set";
        const { createPublicClient, http } = require("viem");
        const { base } = require("viem/chains");
        const { privateKeyToAccount } = require("viem/accounts");
        const k = key.startsWith("0x") ? key : "0x" + key;
        const account = privateKeyToAccount(k);
        const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC || "https://mainnet.base.org") });
        const balance = await client.getBalance({ address: account.address });
        const eth = (Number(balance) / 1e18).toFixed(6);
        return `wallet: ${account.address}\nbalance: ${eth} ETH on Base`;
      } catch (e) {
        return `error: ${e.message}`;
      }
    }

    case "call_contract": {
      try {
        const key = process.env.DAEMON_WALLET_KEY;
        if (!key) return "error: DAEMON_WALLET_KEY not set";
        const { createPublicClient, createWalletClient, http } = require("viem");
        const { base } = require("viem/chains");
        const { privateKeyToAccount } = require("viem/accounts");
        const k = key.startsWith("0x") ? key : "0x" + key;
        const account = privateKeyToAccount(k);
        const transport = http(process.env.BASE_RPC || "https://mainnet.base.org");
        const publicClient = createPublicClient({ chain: base, transport });
        const walletClient = createWalletClient({ account, chain: base, transport });
        const abi = JSON.parse(args.abi);
        const fnArgs = args.args || [];

        if (args.value && args.value !== "0") {
          const hash = await walletClient.writeContract({
            address: args.address,
            abi,
            functionName: args.function_name,
            args: fnArgs,
            value: BigInt(args.value),
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return `tx: ${hash}\nstatus: ${receipt.status}\nblock: ${receipt.blockNumber}`;
        }

        // try read first
        try {
          const result = await publicClient.readContract({
            address: args.address,
            abi,
            functionName: args.function_name,
            args: fnArgs,
          });
          return `result: ${JSON.stringify(result)}`;
        } catch {
          // if read fails, try write
          const hash = await walletClient.writeContract({
            address: args.address,
            abi,
            functionName: args.function_name,
            args: fnArgs,
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          return `tx: ${hash}\nstatus: ${receipt.status}\nblock: ${receipt.blockNumber}`;
        }
      } catch (e) {
        return `contract error: ${e.message}`;
      }
    }

    case "send_agent_message": {
      log(`sending message to ${args.to}`);
      // calls registry.sendMessage(to, content)
      const identity = JSON.parse(fs.readFileSync(path.join(root, "identity.json"), "utf-8"));
      if (!identity.registryAddress) return "error: no registry address in identity.json";
      const abi = JSON.stringify([{"inputs":[{"name":"_to","type":"address"},{"name":"_content","type":"string"}],"name":"sendMessage","outputs":[],"stateMutability":"nonpayable","type":"function"}]);
      return executeAction("call_contract", {
        address: identity.registryAddress,
        abi,
        function_name: "sendMessage",
        args: [args.to, args.message],
      }, root);
    }

    case "registry_heartbeat": {
      log(`heartbeat cycle #${args.cycle}`);
      const identity = JSON.parse(fs.readFileSync(path.join(root, "identity.json"), "utf-8"));
      if (!identity.registryAddress) return "error: no registry address in identity.json";
      const abi = JSON.stringify([{"inputs":[{"name":"_cycle","type":"uint256"}],"name":"heartbeat","outputs":[],"stateMutability":"nonpayable","type":"function"}]);
      return executeAction("call_contract", {
        address: identity.registryAddress,
        abi,
        function_name: "heartbeat",
        args: [String(args.cycle)],
      }, root);
    }

    default:
      log(`unknown tool: ${name}`);
      return `unknown tool: ${name}`;
  }
}

module.exports = { executeAction };
