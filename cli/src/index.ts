import { Command } from "commander"
import { submitCommand } from "./submit.js"

const program = new Command()

program
  .name("token-leaderboard")
  .description("Submit your Claude token usage to the Token Consumption Leaderboard")
  .version("0.1.0")

program.addCommand(submitCommand)

program.parse()
