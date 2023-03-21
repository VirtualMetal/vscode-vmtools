/**
 * @file extension.ts
 *
 * @copyright 2022 Bill Zissimopoulos
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

let extensionContext: vscode.ExtensionContext;
export function activate(context: vscode.ExtensionContext)
{
    extensionContext = context;

    context.subscriptions.push(
        vscode.commands.registerCommand("vmtools.reload_symbols", async () =>
        {
            if (vscode.debug.activeDebugSession &&
                vscode.debug.activeDebugSession.configuration.type === "cppdbg" &&
                vscode.debug.activeDebugSession.configuration.program)
            {
                const args = {
                    expression: "-exec -file-symbol-file \"" +
                        vscode.debug.activeDebugSession.configuration.program.replace(/\\/g, "/") +
                        "\"",
                    context: "repl",
                };
                const ret = await vscode.debug.activeDebugSession.customRequest("evaluate", args);
                if (ret.result.startsWith("result-class: done"))
                    vscode.window.showInformationMessage("Symbols reloaded");
                else
                    vscode.window.showErrorMessage("Cannot reload symbols: " + ret.result);
            }
        }));

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
            {
                config.vmconf = path.resolve(folder ? folder.uri.fsPath : ".", config.vmconf)
                config.cwd = path.dirname(config.vmconf)
            }
            else
            {
                config.cwd = path.resolve(folder ? folder.uri.fsPath : ".", config.cwd)
                config.vmconf = path.resolve(config.cwd, config.vmconf)
            }

            if (!config.program)
            {
                const text = fs.readFileSync(config.vmconf, "utf-8");
                for (const line of text.split(/[\r\n]+/))
                    if (line.startsWith("exec="))
                    {
                        const parts = line.split(",");
                        if (parts.length === 3)
                            config.program = path.resolve(config.cwd, parts[2]);
                    }
            }
            else
                config.program = path.resolve(config.cwd, config.program)

            if (!config.program)
                return null;

            config.vmconf = path.relative(config.cwd, config.vmconf)
            if (!config.vmconf.includes(path.sep))
                config.vmconf = "./" + config.vmconf;

            this.resolveDebugConfigurationForGdb(config);

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
                "targetArchitecture": os.arch(),
                "debugServerArgs": `-C "${config.cwd}" "${config.vmconf}" debug_host=:${port} debug_break=1`,
                "filterStderr": true,
                "serverStarted": "^vm: debug server listening on :",
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
            if (!config.program)
                return null;

            config.program = path.resolve(folder ? folder.uri.fsPath : ".", config.program);
            config.cwd = path.dirname(config.program)

            this.resolveDebugConfigurationForGdb(config);

            let c = {
                ...config,
                "type": "cppdbg",
                "request": "launch",
                "targetArchitecture": os.arch(),
            };
            return c;
        }
    }

    private resolveDebugConfigurationForGdb(
        config: vscode.DebugConfiguration)
    {
        if (!config.MIMode)
            config.MIMode = "gdb";
        if (!config.miDebuggerPath)
            switch (os.arch() + "-" + os.platform())
            {
            case "x64-win32":
                config.miDebuggerPath = extensionContext.asAbsolutePath(
                    "dist/assets/opt/VirtualMetal/vmtools/host.x86_64-mingw64/bin/x86_64-elf-gdb.exe");
                break;
            case "x64-linux":
                config.miDebuggerPath = extensionContext.asAbsolutePath(
                    "dist/assets/opt/VirtualMetal/vmtools/host.x86_64-linux-gnu/bin/x86_64-elf-gdb");
                break;
            default:
                config.miDebuggerPath = "gdb";
                break;
            }
        if (!config.miDebuggerArgs)
            config.miDebuggerArgs = config.MIMode === "gdb" ?
            `-cd="${path.dirname(config.program)}" "${path.basename(config.program)}"` :
            `"${config.program}"`;
    }
}
