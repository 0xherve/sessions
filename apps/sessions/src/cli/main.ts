import { Command } from "commander";
import { runMcp } from "../mcp";
import { list } from "./list";
import { pair } from "./pair";
import { start } from "./start";
import { status } from "./status";
import { stop } from "./stop";
import { unpair } from "./unpair";

const program = new Command();

program
  .name("sessions")
  .description("Give agents controlled access to your browser");

program.command("pair").description("pair a browser").action(pair);

program
  .command("start")
  .description("run the Sessions service")
  .action(async () => {
    const message = await start();
    if (message) console.log(message);
  });

program
  .command("mcp")
  .description("Start an MCP server over stdio for coding agents")
  .action(runMcp);

program
  .command("status")
  .description("show what's paired")
  .option("--json", "machine-readable output")
  .action(status);

program
  .command("list")
  .description("show shared sessions")
  .option("--json", "machine-readable output")
  .action(list);

program.command("stop").description("stop the running service").action(stop);

program
  .command("unpair")
  .description("remove a paired browser")
  .argument("<id>")
  .action(unpair);

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
