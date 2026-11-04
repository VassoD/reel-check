import { CommandError, CommandTimeoutError } from "@/lib/errors";

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RunCommandOptions {
  timeoutMs: number;
  cwd?: string;
}

const STDERR_TAIL_CHARS = 2_000;

export async function runCommand(cmd: string[], options: RunCommandOptions): Promise<CommandResult> {
  const name = cmd[0] ?? "command";
  const proc = Bun.spawn({ cmd, cwd: options.cwd, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, options.timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (timedOut) throw new CommandTimeoutError(name, options.timeoutMs);
    if (exitCode !== 0) throw new CommandError(name, exitCode, stderr.slice(-STDERR_TAIL_CHARS));
    return { stdout, stderr };
  } finally {
    clearTimeout(timer);
  }
}
