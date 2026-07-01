import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packageDir = join(root, "packages", "local-app")
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => (
    key.toLowerCase() !== "npm_config_only_built_dependencies"
  )),
)

const result = spawnSync("npm pack --dry-run", {
  cwd: packageDir,
  env,
  shell: true,
  stdio: "inherit",
})

if (result.error) {
  console.error(result.error.message)
}

process.exit(result.status ?? 1)
