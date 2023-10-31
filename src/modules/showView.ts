import * as vscode from "vscode";

class MyTreeDataProvider implements vscode.TreeDataProvider<NodeTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    NodeTreeItem | undefined
  > = new vscode.EventEmitter<NodeTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<NodeTreeItem | undefined> = this
    ._onDidChangeTreeData.event;

  private activeTextEditor: vscode.TextEditor | undefined;

  constructor() {
    vscode.window.onDidChangeActiveTextEditor(
      this.onActiveTextEditorChanged,
      this
    );
  }

  getTreeItem(element: NodeTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: NodeTreeItem): vscode.ProviderResult<NodeTreeItem[]> {
    if (!element) {
      return this.getNodes(); // 返回顶层元素
    } else {
      return element.children; // 返回指定项的子项列表
    }
  }

  private getNodes(): NodeTreeItem[] {
    if (this.activeTextEditor) {
      return this.parseDocument(this.activeTextEditor.document);
    }

    return [];
  }

  private parseDocument(document: vscode.TextDocument): NodeTreeItem[] {
    const text = document.getText();
    const itemList: NodeTreeItem[] = [];
    const methodStack: NodeTreeItem[] = [];
    let bracketCount = 0;
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const txtLine = lines[i];

      const funcReg = /function\s+(\w+)/g;
      const funcMatch = funcReg.exec(txtLine);

      const varReg = /(const|var|let)\s+(\w+)/g;
      const varMatch = varReg.exec(txtLine);

      var type = funcMatch ? NodeType.Func : NodeType.Var;

      const match = funcMatch || varMatch;
      if (match) {
        const name = funcMatch ? match[1] : match[2];

        const item = new NodeTreeItem({
          name,
          lineNumber: i,
          type,
          charIndex: 2,
        });
        item.iconPath = new vscode.ThemeIcon(type);

        if (funcMatch) {
          if (methodStack.length > 0) {
            methodStack[methodStack.length - 1]?.addChild(item);
          } else {
            itemList.push(item);
          }
          methodStack.push(item);
        } else {
          if (methodStack.length > 0) {
            methodStack[methodStack.length - 1]?.addChild(item);
          } else {
            itemList.push(item);
          }
        }
      }

      for (let j = 0; j < txtLine.length; j++) {
        if (txtLine[j] === "{") {
          bracketCount++;
        } else if (txtLine[j] === "}") {
          bracketCount--;
        }
      }

      if (bracketCount === 0 && methodStack.length > 0) {
        methodStack.pop();
      }
    }
    return itemList;
  }

  private onActiveTextEditorChanged(
    editor: vscode.TextEditor | undefined
  ): void {
    this.activeTextEditor = editor;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

enum NodeType {
  Func = "symbol-method",
  Var = "symbol-variable",
}

interface NodeItem {
  name: string;
  type: NodeType;
  charIndex: number;
  lineNumber: number;
  children?: NodeTreeItem[];
}

class NodeTreeItem extends vscode.TreeItem {
  name: string;
  lineNumber: number = Math.floor(Math.random() * 100);
  children: NodeTreeItem[] = [];

  constructor(config: NodeItem) {
    super(config.name);
    if (config.type === NodeType.Func) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }

    this.name = config.name;
    this.lineNumber = config.lineNumber;
    this.children = [];

    this.command = {
      title: "Go to method",
      command: "extension.goToMethod",
      arguments: [config.lineNumber, config.charIndex],
    };
  }

  addChild(item: NodeTreeItem) {
    this.children.push(item);
  }
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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(myTreeView);
}
