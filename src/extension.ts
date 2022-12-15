import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext)
{
	console.log('Congratulations, your extension "vmtools" is now active!');
	let disposable = vscode.commands.registerCommand('vmtools.helloWorld', () =>
	{
		vscode.window.showInformationMessage('Hello World from VirtualMetal!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate()
{
}
