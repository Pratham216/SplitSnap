import { execSync } from "child_process";

const port = process.argv[2] ?? "3001";
const portNum = parseInt(port, 10);

function freePortWindows(targetPort) {
  const pids = new Set();
  const portPattern = new RegExp(`:${targetPort}\\s`);

  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
      encoding: "utf8",
      timeout: 10000,
    });

    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING") || !portPattern.test(line)) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }
  } catch {
    // nothing listening
  }

  if (pids.size === 0) return;

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore", timeout: 5000 });
      console.log(`Freed port ${targetPort} (stopped PID ${pid})`);
    } catch {
      // process may have already exited
    }
  }

  // Brief pause so OS releases the port
  execSync("timeout /t 1 /nobreak >nul", { shell: true, stdio: "ignore" });
}

function freePortUnix(targetPort) {
  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9 2>/dev/null`, {
      shell: true,
      stdio: "ignore",
    });
    console.log(`Freed port ${targetPort}`);
  } catch {
    // nothing listening on port
  }
}

if (process.platform === "win32") {
  freePortWindows(portNum);
} else {
  freePortUnix(portNum);
}
