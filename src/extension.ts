import * as vscode from "vscode";
import { showNowTimeCommand } from "./modules/showNowTime";
import { myTreeView } from "./modules/showView";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-extension" is now active!'
  );
  context.subscriptions.push(showNowTimeCommand);

  context.subscriptions.push(myTreeView);
}
