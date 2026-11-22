import { Command } from "commander";
import { runMcp } from "../mcp/server";
import { pair } from "./pair";
import { start } from "./start";
import { status } from "./status";

const program = new Command();

program
  .name("sessions")
  .description("Give agents controlled access to your browser");

program.command("pair").description("pair a browser").action(pair);

program.command("start").description("run the service").action(start);

program
  .command("mcp")
  .description("Start an MCP server over stdio for coding agents")
  .action(runMcp);

program
  .command("status")
  .description("show what's paired")
  .option("--json", "machine-readable output")
  .action(status);

program.parse();
