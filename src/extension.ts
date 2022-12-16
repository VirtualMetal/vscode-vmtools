/**
 * @file extension.ts
 *
 * @copyright 2022 Bill Zissimopoulos
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext)
{
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider("vmdbg", new DebugConfigurationProvider()));
}

class DebugConfigurationProvider implements vscode.DebugConfigurationProvider
{
    resolveDebugConfigurationWithSubstitutedVariables(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken | undefined):
        vscode.ProviderResult<vscode.DebugConfiguration>
    {
        if (config.type !== "vmdbg")
            return config;

        if (config.request === "launch")
        {
            if (!config.vmconf)
                return null;

            if (!config.cwd)
                config.cwd = path.dirname(config.vmconf)

            if (!config.program)
            {
                const text = fs.readFileSync(config.vmconf, "utf-8");
                for (const line of text.split(/[\r\n]+/))
                    if (line.startsWith("exec="))
                    {
                        const parts = line.split(",");
                        if (parts.length === 3)
                            config.program = path.resolve(config.cwd, parts[2]);
                        break;
                    }
            }

            config.vmconf = path.relative(config.cwd, config.vmconf)
            if (!config.vmconf.includes(path.sep))
                config.vmconf = "./" + config.vmconf;

            if (!config.MIMode)
                config.MIMode = "gdb";
            if (!config.miDebuggerPath)
                config.miDebuggerPath = "gdb";
            if (!config.debugServerPath)
                config.debugServerPath = os.platform() === "win32" ? "vm.exe" : "vm";

            /*
             * Node.js does not(?) have an easy way to bind to port 0 (without listening)
             * and get a free port from the OS. So instead compute a random value between
             * 28022 = 'm'*256 + 'v' and 30317 = 'v'*256 + 'm' and hope for the best.
             */
            const port = Math.floor(Math.random() * (30317 - 28022 + 1) + 28022);

            let { vmconf, ...c } = config   // exclude extraneous fields from config
            c = {
                ...c,
                "type": "cppdbg",
                "request": "launch",
                "miDebuggerArgs": config.program,
                "debugServerArgs": `-C "${config.cwd}" "${config.vmconf}" debug_host=:${port} debug_break=1`,
                "filterStderr": true,
                "serverStarted": "^vm: debug server listening on :",
                "targetArchitecture": os.arch(),
                "customLaunchSetupCommands": [
                    {
                        "description": "Connect to remote",
                        "text": `-target-select remote localhost:${port}`,
                        "ignoreFailures": false
                    }
                ],
            };
            return c;
        }
        else if (config.request === "attach")
        {
            config.cwd = path.dirname(config.program)

            if (!config.MIMode)
                config.MIMode = "gdb";
            if (!config.miDebuggerPath)
                config.miDebuggerPath = "gdb";

            let c = {
                ...config,
                "type": "cppdbg",
                "request": "launch",
            };
            return c;
        }
    }
}
