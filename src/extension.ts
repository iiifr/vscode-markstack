// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const L = console.log;
const echo = vscode.window.showInformationMessage;

class MarkStack {
	private ms = new Array<{}>();
	private ms_ptr = -1;
	private push_ms(uri: vscode.Uri, pos: vscode.Position, name: string, text: vscode.TextLine){
		this.ms.push({uri: uri, pos: pos, name: name, text: text});
	}
	private pop_ms() { return this.ms.pop(); }
	private set_ms_pointer(val: number) { this.ms_ptr = val; }
	private get_ms_pointer() { return this.ms_ptr; }
	private del_ms() { this.ms = new Array<{}>(); this.ms_ptr = -1; }
	private ms_exist() { return (this.ms.length != 0); }
	private ms_empty() { return (this.ms.length == 0); }
	private get_ms_len() { return this.ms.length; }

	push(){
		let editor = vscode.window.activeTextEditor;
		let wsfolder = vscode.workspace.workspaceFolders;
		if (editor && wsfolder){
			let s = editor.selection;
			let wsf_uri = wsfolder[0].uri;
			let doc_uri = editor.document.uri;
			let docname = doc_uri.toString().replace(wsf_uri.toString()+"/", "");
			let text = editor.document.lineAt(s.start);
			this.push_ms(doc_uri, s.start, docname, text);
			let l = this.get_ms_len();
			this.set_ms_pointer(l-1);
			echo(`MarkStack: ${docname} L${s.start.line+1} C${s.start.character+1} pushed, len=${l}`);
			//L("WS URI: " + wsf_uri.toString());
			//L("DOC URI: " + editor.document.uri.toString());
			//L("DOC TXT: " + text);
		}
	}
	pop(){
		let entry: any = this.pop_ms();
		if (entry){
			let sel = new vscode.Range(entry.pos, entry.pos);
			vscode.window.showTextDocument(
				entry.uri,
				{preserveFocus: false, preview: false, selection: sel}
			);
			let l = this.get_ms_len();
			this.set_ms_pointer(l-1);
			echo("MarkStack: popped out, len=" + l);
		}
		else {
			echo("MarkStack: no mark");
		}
	}
	current(){
		if (!this.ms_exist()) {
			echo("MarkStack: no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1) {
			echo("MarkStack: no mark");
			return;
		}
		let entry:any = this.ms[pointer];
		let topidx = this.ms.length - 1;
		let sel = new vscode.Range(entry.pos, entry.pos);
		vscode.window.showTextDocument(
			entry.uri,
			{preserveFocus: false, preview: false, selection: sel}
		);
		echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
		//markstack_print();
	}
	next(){
		if (!this.ms_exist()) {
			echo("MarkStack: no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1) {
			echo("MarkStack: no mark");
			return;
		}
		let topidx = this.get_ms_len() - 1;
		if (pointer == topidx){
			this.current();
			return;
		}
		pointer += 1;
		let entry:any = this.ms[pointer];
		let sel = new vscode.Range(entry.pos, entry.pos);
		vscode.window.showTextDocument(
			entry.uri,
			{preserveFocus: false, preview: false, selection: sel}
		);
		echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
		this.set_ms_pointer(pointer);
		//markstack_print();
	}
	prev(){
		if (!this.ms_exist()){
			echo("MarkStack: no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1){
			echo("MarkStack: no mark");
			return;
		}
		let topidx = this.get_ms_len() - 1;
		if (pointer == 0){
			this.current();
			return;
		}
		pointer -= 1;
		let entry:any = this.ms[pointer];
		let sel = new vscode.Range(entry.pos, entry.pos);
		vscode.window.showTextDocument(
			entry.uri,
			{preserveFocus: false, preview: false, selection: sel}
		);
		echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
		this.set_ms_pointer(pointer);
		//markstack_print();
	}
	print(){
		if (!this.ms_exist()){
			echo("MarkStack: no mark");
			return;
		}
		let stack:Array<any> = this.ms;
		let pointer = this.ms_ptr;
		let s = "";
		s += "MarkStack:\n";
		s += " idx : line : col : file : text\n";
		for (let i=0; i<stack.length; ++i) {
			let pos:vscode.Position = stack[i].pos;
			let s_ptr = (i==pointer ? '*' : ' ');
			let tline:vscode.TextLine = stack[i].text;
			let s_text = tline.text.substr(tline.firstNonWhitespaceCharacterIndex);
			if (s_text.length > 50){
				s_text = s_text.substr(0, 50) + "...";
			}
			s += `${s_ptr}${i} : ${pos.line+1} : ${pos.character+1} : ${stack[i].name} : ${s_text}\n`;
		}
		s += " (TOP)";
		echo(s, {modal: true});
	}
	clear(){
		this.del_ms();
		echo("MarkStack: stack cleared");
	}
	status(item:vscode.StatusBarItem){
		item.text = `[MS] LEN:${this.get_ms_len()} IDX:${this.get_ms_pointer()}`;
	}
}

class GroupMarkStack {
	private viewColToMs:MarkStack[] = [];
	private statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 500);
	private create = () => {
		return new MarkStack();
	};
	private checkId = (viewColumn:number) => {
		if (this.viewColToMs[viewColumn] === undefined) {
			this.viewColToMs[viewColumn] = this.create();
		}
	};

	private windowChangedAtMiddle = (editors: vscode.TextEditor[]) => {
		//return value
		//+n: new window is at viewColumn n
		//-n: window at viewColumn n is removed
		let rec = Array(editors.length + 1).fill(0);
		editors.forEach((editor, index, array) => {
			if (editor.viewColumn !== undefined) {
				rec[editor.viewColumn] += 1;
			}
		});
		for (let i = 1; i <= editors.length; ++i) {
			if(rec[i] == 0) { return -i;}
			if(rec[i] > 1) { return i;}
		}
		return 0;
	};
	private debugPrint = () => {
		L("[viewColYoId][start]");
		for(let i=1; i<this.viewColToMs.length; ++i) {
			L(`viewCol=${i} id=${this.viewColToMs[i]}`);
		}
		L("[viewColYoId][end]");
	};

	constructor() {
		vscode.window.visibleTextEditors.forEach((editor, idx, arr) => {
			let viewcol = editor?.viewColumn;
			if (viewcol !== undefined) {
				this.viewColToMs[viewcol] = this.create();
			}
		});
		vscode.window.onDidChangeActiveTextEditor((editor)=> {
			let viewcol = editor?.viewColumn;
			if (viewcol !== undefined) {
				this.checkId(viewcol);
			}
			//this.debugPrint();
			this.status();
		})
		vscode.window.onDidChangeVisibleTextEditors((editors) => {
			let viewcol = this.windowChangedAtMiddle(editors);
			if (viewcol > 0) {
				for (let i=editors.length-1; i>=viewcol; --i){
					this.viewColToMs[i+1] = this.viewColToMs[i];
				}
				this.viewColToMs[viewcol] = this.create();
			}
			else if (viewcol < 0) {
				for (let i=(-viewcol); i<=editors.length; ++i){
					this.viewColToMs[i] = this.viewColToMs[i+1];
				}
				this.viewColToMs.length = editors.length + 1;
			}
			//this.debugPrint();
		});
		//this.debugPrint();
		this.status();
		this.statusItem.show();
	}
	getItem(viewColumn:number) {
		return this.viewColToMs[viewColumn];
	}

	// ----------------------------------------------------------------------------

	private getMs() {
		let vc = vscode.window.activeTextEditor?.viewColumn;
		if (vc === undefined) { return undefined; }
		else { return this.viewColToMs[vc]; }
	}
	private status(){
		let ms = this.getMs();
		if (ms !== undefined) { ms.status(this.statusItem); }
	}
	push = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.push();
			ms.status(this.statusItem);
		}
	}
	pop = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.pop();
			ms.status(this.statusItem);
		}
	}
	current = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.current();
			ms.status(this.statusItem);
	 	}
	}
	next = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.next();
			ms.status(this.statusItem);
		}
	}
	prev = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.prev();
			ms.status(this.statusItem);
		}
	}
	print = () => {
		let ms = this.getMs();
		if (ms !== undefined) { ms.print(); }
	}
	clear = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.clear();
			ms.status(this.statusItem);
		}
	}
}

/*
class EditorGroupId {
	private nextValidId = 1;
	private viewColToId:{}[] = [];
	private createId = () => { return this.nextValidId++; };
	private createObj:Function;
	private create = () => {
		return {'id': this.createId(), 'obj': this.createObj()};
	};
	private checkId = (viewColumn:number) => {
		if (this.viewColToId[viewColumn] === undefined) {
			this.viewColToId[viewColumn] = this.create();
		}
	};

	private windowChangedAtMiddle = (editors: vscode.TextEditor[]) => {
		//return value
		//+n: new window is at viewColumn n
		//-n: window at viewColumn n is removed
		let rec = Array(editors.length + 1).fill(0);
		editors.forEach((editor, index, array) => {
			if (editor.viewColumn !== undefined) {
				rec[editor.viewColumn] += 1;
			}
		});
		for (let i = 1; i <= editors.length; ++i) {
			if(rec[i] == 0) { return -i;}
			if(rec[i] > 1) { return i;}
		}
		return 0;
	};
	private print = () => {
		L("[viewColYoId][start]");
		for(let i=1; i<this.viewColToId.length; ++i) {
			L(`viewCol=${i} id=${this.viewColToId[i]}`);
		}
		L("[viewColYoId][end]");
	};

	constructor(createObjFunc = function():any { return undefined }) {
		this.createObj = createObjFunc;
		vscode.window.visibleTextEditors.forEach((editor, idx, arr) => {
			let viewcol = editor?.viewColumn;
			if (viewcol !== undefined) {
				this.viewColToId[viewcol] = this.create();
			}
		});
		vscode.window.onDidChangeActiveTextEditor((editor)=> {
			let viewcol = editor?.viewColumn;
			if (viewcol !== undefined) {
				this.checkId(viewcol);
			}
			//this.print();
		})
		vscode.window.onDidChangeVisibleTextEditors((editors) => {
			let viewcol = this.windowChangedAtMiddle(editors);
			if (viewcol > 0) {
				for (let i=editors.length-1; i>=viewcol; --i){
					this.viewColToId[i+1] = this.viewColToId[i];
				}
				this.viewColToId[viewcol] = this.create();
			}
			else if (viewcol < 0) {
				for (let i=(-viewcol); i<=editors.length; ++i){
					this.viewColToId[i] = this.viewColToId[i+1];
				}
				this.viewColToId.length = editors.length + 1;
			}
			//this.print();
		});
		//this.print();
	}
	getItem(viewColumn:number) {
		return this.viewColToId[viewColumn];
	}
}
*/

/*
class OnCursorLineIdle{
	private uri;
	private line;
	private timeoutHandle;
	private callback;
	private idle_ms;
	private update1 = () => {
		clearTimeout(this.timeoutHandle);
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let uri = editor.document.uri.toString();
			let line = editor.selection.end.line;
			if (this.uri != uri || this.line != line) {
				this.uri = uri;
				this.line = line;
				this.timeoutHandle = setTimeout(this.update2, this.idle_ms);
			}
			//echo(`${this.uri} L${this.line}`);
		}
		else {
			this.uri = '';
			this.line = -1;
		}
	}
	private update2 = () => {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			if (editor.document.uri.toString() == this.uri && editor.selection.end.line == this.line) {
				this.callback();
			}
		}
	}

	constructor(callback: () => void, idle_ms: number) {
		this.callback = callback;
		this.idle_ms = idle_ms;
		this.uri = '';
		this.line = -1;
		this.timeoutHandle = setTimeout(()=>{}, 0);

		vscode.window.onDidChangeTextEditorSelection(this.update1);
	}
}
*/


function markstack_status(){

}

class OnCursorLineIdle{
	private uri;
	private line;
	private timeoutHandle;
	private callback;
	private idle_ms;
	private update1 = () => {
		clearTimeout(this.timeoutHandle);
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let uri = editor.document.uri.toString();
			let line = editor.selection.end.line;
			if (this.uri != uri || this.line != line) {
				this.uri = uri;
				this.line = line;
				this.timeoutHandle = setTimeout(this.update2, this.idle_ms);
			}
			//echo(`${this.uri} L${this.line}`);
		}
		else {
			this.uri = '';
			this.line = -1;
		}
	}
	private update2 = () => {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			if (editor.document.uri.toString() == this.uri && editor.selection.end.line == this.line) {
				this.callback();
			}
		}
	}

	constructor(callback: () => void, idle_ms: number) {
		this.callback = callback;
		this.idle_ms = idle_ms;
		this.uri = '';
		this.line = -1;
		this.timeoutHandle = setTimeout(()=>{}, 0);

		vscode.window.onDidChangeTextEditorSelection(this.update1);
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "markstack" is now active!');


	var groupMarkStack = new GroupMarkStack();
	context.subscriptions.push(vscode.commands.registerCommand('markstack.push', groupMarkStack.push));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.pop', groupMarkStack.pop));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.currentEntry', groupMarkStack.current));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.nextEntry', groupMarkStack.next));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.prevEntry', groupMarkStack.prev));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.print', groupMarkStack.print));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.clear', groupMarkStack.clear));
}

// this method is called when your extension is deactivated
export function deactivate() {}
