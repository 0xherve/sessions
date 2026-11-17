import { Command } from "commander";
import { pair } from "./pair";
import { start } from "./start";
import { status } from "./status";

const program = new Command();

program.name("sessions")
  .description("Give agents controlled access to your browser");

program
  .command("pair")
  .description("mint a pairing code")
  .action(pair);

program
  .command("start")
  .description("run the service")
  .action(start);

program
  .command("status")
  .description("show what's paired")
  .option("--json", "machine-readable output")
  .action(status);

program.parse();
