import * as vscode from "vscode";

export const showNowTimeCommand = vscode.commands.registerCommand(
  "extension.showNowTime",
  () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    const items = [
      `${date.replace(/\//g, "-")} ${time}`,
      `${date} ${time}`,
      date,
      date.replace(/\//g, "-"),
      time,
    ];

    vscode.window.showQuickPick(items).then((selectedItem) => {
      if (selectedItem) {
        // 处理用户选择的项目
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          // 将选项内容插入到文档中
          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, selectedItem);
          });
        } else {
          vscode.window.showErrorMessage("No active text editor.");
        }
      }
    });
  }
);
