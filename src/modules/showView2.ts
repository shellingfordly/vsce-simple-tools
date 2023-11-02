const vscode = require("vscode");

class MyTreeDataProvider {
  getTreeItem(element: any) {
    return element;
  }

  getChildren() {
    const activeTextEditor = vscode.window.activeTextEditor;

    if (activeTextEditor) {
      const document = activeTextEditor.document;
      const methodNames = findMethodNames(document);

      const treeItems = methodNames.map((methodName) => {
        const treeItem = new vscode.TreeItem(methodName);
        treeItem.iconPath = new vscode.ThemeIcon("symbol-method"); // 可选的图标
        return treeItem;
      });

      return treeItems;
    }

    return [];
  }
}

function findMethodNames(document: any) {
  const text = document.getText();
  const methodRegex = /function\s+(\w+)/g; // 此正则表达式匹配函数名，您可以根据需要调整

  const methodNames = [];
  let match;
  while ((match = methodRegex.exec(text))) {
    methodNames.push(match[1]);
  }

  return methodNames;
}

export const myTreeView = vscode.window.createTreeView("myTreeView", {
  treeDataProvider: new MyTreeDataProvider(),
});

vscode.commands.registerCommand(
  "extension.goToMethod",
  (lineNumber: number, charIndex: number) => {
    if (vscode.window.activeTextEditor) {
      const position = new vscode.Position(lineNumber, charIndex);
      vscode.window.activeTextEditor.selection = new vscode.Selection(
        position,
        position
      );
      vscode.window.activeTextEditor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
    }
  }
);
