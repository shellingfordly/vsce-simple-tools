import * as vscode from "vscode";

const ClassReg = /class\s+([\w\d_]+)(?:\s+extends\s+([\w\d_]+))?/;
const FuncReg = /function\s+([\w\d_]+)\s*\(/;
const VarReg = /(const|var|let)\s+([\w\d_]+)(?=\s*=?[^=])/;
const EnumReg = /enum\s+([\w\d_]+)\s*\{/;
const TypeReg = /(interface|type)\s+([\w\d_]+)/;
const AttrReg = /^\s*(?:(private|public|static|readonly)\s+)*\s*([\w]+)\s*[:=]\s*[^;]/;
const ClassFuncReg = /\s*(private|public|static)?\s*(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+)\s*{/;

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
    let bracketCount = 0;
    const stack: NodeTreeItem[] = [];

    for (let index = 0; index < document.lineCount; index++) {
      const text = document.lineAt(index).text;
      const item = createNodeTreeItem(text, index);
      if (item) {
        if (item.type === NodeType.Var || item.type === NodeType.Attr) {
          if (stack.length > 0) {
            stack[stack.length - 1]?.addChild(item);
          } else {
            itemList.push(item);
          }
        } else {
          if (stack.length > 0) {
            stack[stack.length - 1]?.addChild(item);
          } else {
            itemList.push(item);
          }
          stack.push(item);
        }
      }

      console.log("===========", index);
      console.log(`name: ${item?.name}`);
      console.log(`type: ${item?.type}`);
      console.log(`text: ${text}`);
      console.log(`stack: ${stack}`);
      console.log("===========");

      if (stack.length > 0) {
        for (let j = 0; j < text.length; j++) {
          if (text[j] === "{") {
            bracketCount++;
          } else if (text[j] === "}") {
            bracketCount--;
          }
        }
      }

      if (bracketCount === 0 && stack.length > 0) {
        stack.pop();
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
  Empty = "empty",
  Func = "symbol-method",
  Var = "symbol-variable",
  Enum = "symbol-enum",
  Type = "symbol-value",
  Class = "symbol-module",
  Attr = "symbol-key",
  Event = "symbol-event",
}

interface NodeItem {
  name: string;
  type: NodeType;
  charIndex: number;
  lineNumber: number;
  children?: NodeTreeItem[];
}

function createNodeTreeItem(text: string, lineNumber: number) {
  const type = ClassReg.test(text)
    ? NodeType.Class
    : FuncReg.test(text) || ClassFuncReg.test(text)
    ? NodeType.Func
    : VarReg.test(text)
    ? NodeType.Var
    : EnumReg.test(text)
    ? NodeType.Enum
    : TypeReg.test(text)
    ? NodeType.Type
    : AttrReg.test(text)
    ? NodeType.Attr
    : NodeType.Empty;

  console.log(`***** ${lineNumber}, text : ${text}, type: ${type}`);

  if (type === NodeType.Empty) return null;

  let name = "";
  switch (type) {
    case NodeType.Class:
      name = ClassReg.exec(text)![1];
      break;
    case NodeType.Func:
      const funcMatch = FuncReg.exec(text);
      const cFuncMatch = ClassFuncReg.exec(text);

      name = funcMatch?.[1] || cFuncMatch?.[2] || "";
      break;
    case NodeType.Var:
      name = VarReg.exec(text)![2];
      break;
    case NodeType.Attr:
      name = AttrReg.exec(text)![2];
      break;
    case NodeType.Enum:
      name = EnumReg.exec(text)![1];
      break;
    case NodeType.Type:
      name = TypeReg.exec(text)![2];
      break;
  }
  if (!name) return null;
  return new NodeTreeItem({
    name,
    lineNumber,
    charIndex: 1,
    type,
  });
}

class NodeTreeItem extends vscode.TreeItem {
  name: string;
  lineNumber: number = Math.floor(Math.random() * 100);
  children: NodeTreeItem[] = [];
  type: NodeType = NodeType.Empty;

  constructor(config: NodeItem) {
    super(config.name);
    if (config.type === NodeType.Func || config.type === NodeType.Class) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }

    this.name = config.name;
    this.lineNumber = config.lineNumber;
    this.type = config.type;
    this.children = [];
    this.iconPath = new vscode.ThemeIcon(config.type);

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
