import * as vscode from "vscode";

const MethodReg = /function\s+([\w\d_]+)\s*\(/;
const EnumReg = /enum\s+([\w\d_]+)\s*\{/;
const TypeReg = /(interface|type)\s+([\w\d_]+)/;
const ModuleReg = /class\s+([\w\d_]+)(?:\s+extends\s+([\w\d_]+))?/;
const VariableReg = /^\s*(?:(const|var|let|private|public|static|readonly)\s+)*\s*([\w]+)\?*\s*[:=]\s*[^;]/;
const InMethodReg = /\s*(private|public|static)?\s*(\w+)\(([^)]*)\):*\s*([^;]*)\s{/;

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
    const itemList: NodeTreeItem[] = [];
    const spaceCount: number[] = [];
    const itemStack: NodeTreeItem[] = [];

    for (let index = 0; index < document.lineCount; index++) {
      const text = document.lineAt(index).text;
      const item = createNodeTreeItem(text, index);
      if (item) {
        if (itemStack.length > 0) {
          itemStack[itemStack.length - 1]?.addChild(item);
        } else {
          itemList.push(item);
        }
        
        if (item.type !== NodeType.Variable) {
          const count = text.match(/\S/)?.index || 0;
          spaceCount.push(count);
          itemStack.push(item);
        }
      }

      if (text.includes("}")) {
        const count = text.match(/\S/)?.index || 0;
        if (count === spaceCount[spaceCount.length - 1]) {
          itemStack.pop();
          spaceCount.pop();
        }
      }
    }

    return itemList.map((item) => {
      if (item.children.length > 0) {
        item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      }
      return item;
    });
  }

  private onActiveTextEditorChanged(editor: vscode.TextEditor | undefined) {
    this.activeTextEditor = editor;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

enum NodeType {
  Empty = "empty",
  Variable = "symbol-variable",
  Method = "symbol-method",
  Enum = "symbol-enum",
  Type = "symbol-value",
  Module = "symbol-module",
  InMethod = "symbol-method",
}

interface NodeItem {
  name: string;
  type: NodeType;
  charIndex: number;
  lineNumber: number;
  children?: NodeTreeItem[];
}

function createNodeTreeItem(text: string, lineNumber: number) {
  const type = ModuleReg.test(text)
    ? NodeType.Module
    : MethodReg.test(text)
    ? NodeType.Method
    : InMethodReg.test(text)
    ? NodeType.InMethod
    : VariableReg.test(text)
    ? NodeType.Variable
    : EnumReg.test(text)
    ? NodeType.Enum
    : TypeReg.test(text)
    ? NodeType.Type
    : NodeType.Empty;

  if (type === NodeType.Empty) return null;

  let name = "";
  let charIndex = 0;
  let match = null;
  switch (type) {
    case NodeType.Module:
      name = ModuleReg.exec(text)![1];
      break;
    case NodeType.Method:
      const funcMatch = MethodReg.exec(text);
      const cFuncMatch = InMethodReg.exec(text);

      name = funcMatch?.[1] || cFuncMatch?.[2] || "";
      charIndex = funcMatch?.index || cFuncMatch?.index || 0;
      break;
    case NodeType.Variable:
      match = VariableReg.exec(text);
      if (match) {
        name = match[2];
        charIndex = match.index;
      }
      break;
    case NodeType.Enum:
      match = EnumReg.exec(text);
      if (match) {
        name = match[1];
        charIndex = match.index;
      }
      break;
    case NodeType.Type:
      match = TypeReg.exec(text);
      if (match) {
        name = match[2];
        charIndex = match.index;
      }
      break;
  }
  if (!name) return null;
  return new NodeTreeItem({
    name,
    lineNumber,
    charIndex,
    type,
  });
}

class NodeTreeItem extends vscode.TreeItem {
  name: string = "";
  lineNumber: number = 0;
  children: NodeTreeItem[] = [];
  type: NodeType = NodeType.Empty;

  constructor(config: NodeItem) {
    super(config.name);
    this.name = config.name;
    this.lineNumber = config.lineNumber;
    this.type = config.type;
    this.iconPath = new vscode.ThemeIcon(config.type);

    this.command = {
      title: "Go to method",
      command: "extension.goToMethod",
      arguments: [config.lineNumber, config.charIndex],
    };
  }

  addChild(item: NodeTreeItem) {
    if (this.children.findIndex((child) => child.name === item.name) === -1) {
      this.children.push(item);
    }
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
