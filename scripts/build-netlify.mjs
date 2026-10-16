process.env.NETLIFY = "true";
process.env.NITRO_PRESET = "netlify";
process.argv = [process.execPath, new URL("./run-framework.mjs", import.meta.url).pathname, "build"];
await import("./run-framework.mjs");
