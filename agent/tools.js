const TOOLS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Creates directories if needed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root" },
          content: { type: "string", description: "File content" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file's contents.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_file",
      description: "Append content to end of a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root" },
          content: { type: "string", description: "Content to append" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files in a directory.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to repo root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "comment_issue",
      description: "Comment on a GitHub issue in this repo.",
      parameters: {
        type: "object",
        properties: {
          issue: { type: "number", description: "Issue number" },
          body: { type: "string", description: "Comment body" },
        },
        required: ["issue", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_wallet",
      description: "Check the agent's wallet ETH balance on Base.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "call_contract",
      description: "Call a function on a smart contract on Base. For read-only calls, set value to '0'. For writes, the agent wallet signs the transaction.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Contract address" },
          abi: { type: "string", description: "JSON ABI of the function" },
          function_name: { type: "string", description: "Function name to call" },
          args: { type: "array", items: { type: "string" }, description: "Function arguments" },
          value: { type: "string", description: "ETH value to send (in wei), default '0'" },
        },
        required: ["address", "abi", "function_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_agent_message",
      description: "Send a message to another agent in the daemon network via the registry contract.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient agent's wallet address" },
          message: { type: "string", description: "Message content" },
        },
        required: ["to", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registry_heartbeat",
      description: "Send an onchain heartbeat to the daemon registry to prove you are alive.",
      parameters: {
        type: "object",
        properties: {
          cycle: { type: "number", description: "Current cycle number" },
        },
        required: ["cycle"],
      },
    },
  },
];

module.exports = { TOOLS };
