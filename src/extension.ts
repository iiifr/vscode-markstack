// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

const L = console.log;
const echo = vscode.window.showInformationMessage;

class MarkStack {
	private ms = new Array<{}>();
	private ms_ptr = -1;
	private create_entry(){
		let editor = vscode.window.activeTextEditor;
		let wsfolder = vscode.workspace.workspaceFolders;
		if (editor && wsfolder){
			let s = editor.selection;
			let wsf_uri = wsfolder[0].uri;
			let doc_uri = editor.document.uri;
			let docname = doc_uri.toString().replace(wsf_uri.toString()+"/", "");
			let text = editor.document.lineAt(s.start);
			return {uri: doc_uri, pos: s.start, name: docname, text: text};
		}
		return undefined;
	}
	private push_ms(entry:{}) { this.ms.push(entry); }
	private pop_ms() { return this.ms.pop(); }
	private set_ms_pointer(val: number) { this.ms_ptr = val; }
	private get_ms_pointer() { return this.ms_ptr; }
	private del_ms() { this.ms = new Array<{}>(); this.ms_ptr = -1; }
	private ms_exist() { return (this.ms.length != 0); }
	private ms_empty() { return (this.ms.length == 0); }
	private get_ms_len() { return this.ms.length; }

	private static readonly statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 500);
	private static readonly decoration = vscode.window.createTextEditorDecorationType(
	{
		light: {
			gutterIconPath: path.join(__dirname, '..', 'resources', 'light', 'mark.svg'),
			gutterIconSize: '65%'
		},
		dark: {
			gutterIconPath: path.join(__dirname, '..', 'resources', 'dark', 'mark.svg'),
			gutterIconSize: '65%'
		}
	});
	private static readonly decorationCurrent = vscode.window.createTextEditorDecorationType(
	{
		light: {
			gutterIconPath: path.join(__dirname, '..', 'resources', 'light', 'mark_current.svg'),
			gutterIconSize: '65%'
		},
		dark: {
			gutterIconPath: path.join(__dirname, '..', 'resources', 'dark', 'mark_current.svg'),
			gutterIconSize: '65%'
		}
	});

	push(){
		let editor = vscode.window.activeTextEditor;
		let wsfolder = vscode.workspace.workspaceFolders;
		let entry = this.create_entry();
		if (entry !== undefined){
			this.push_ms(entry);
			let l = this.get_ms_len();
			this.set_ms_pointer(l-1);
			echo(`[MarkStack] pushed, LEN:${l}`);
			//echo(`[MarkStack] ${entry.name} Ln${entry.pos.line+1},Col${entry.pos.character+1} pushed, LEN:${l}`);
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
			echo(`[MarkStack] popped, LEN:${l}`);
		}
		else {
			echo("[MarkStack] no mark");
		}
	}
	insertBefore(){
		if (!this.ms_exist()) {
			this.push();
			return;
		}
		let entry = this.create_entry();
		if (entry !== undefined) {
			let index = this.ms_ptr;
			this.ms.splice(index, 0, entry);
			echo(`[MarkStack] insert before IDX:${index}, LEN:${this.ms.length}`);
		}
	}
	insertAfter(){
		if (this.ms_ptr == this.ms.length - 1) {
			this.push();
			return;
		}
		let entry = this.create_entry();
		if (entry !== undefined) {
			let index = this.ms_ptr;
			this.ms.splice(index + 1, 0, entry);
			this.ms_ptr = index + 1;
			echo(`[MarkStack] insert after IDX:${index}, LEN:${this.ms.length}`);
		}
	}
	replace(){
		if (!this.ms_exist()) {
			echo("[MarkStack] no mark");
			return;
		}
		let entry = this.create_entry();
		if (entry !== undefined) {
			this.ms[this.ms_ptr] = entry;
			echo(`[MarkStack] IDX:${this.ms_ptr} replaced, LEN:${this.ms.length}`);
		}
	}
	delete(){
		if (!this.ms_exist()) {
			echo("[MarkStack] no mark");
			return;
		}
		let index = this.ms_ptr;
		this.ms.splice(index, 1);
		if (this.ms_ptr >= this.ms.length) {
			this.ms_ptr = this.ms.length - 1;
		}
		echo(`[MarkStack] IDX:${index} deleted, LEN:${this.ms.length}`);
	}
	current(){
		if (!this.ms_exist()) {
			echo("[MarkStack] no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1) {
			echo("[MarkStack] no mark");
			return;
		}
		let entry:any = this.ms[pointer];
		let topidx = this.ms.length - 1;
		let sel = new vscode.Range(entry.pos, entry.pos);
		vscode.window.showTextDocument(
			entry.uri,
			{preserveFocus: false, preview: false, selection: sel}
		);
		echo(`[MarkStack] IDX:${pointer} DEPTH:${topidx-pointer}`);
		//markstack_print();
	}
	next(){
		if (!this.ms_exist()) {
			echo("[MarkStack] no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1) {
			echo("[MarkStack] no mark");
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
		echo(`[MarkStack] IDX:${pointer} DEPTH:${topidx-pointer}`);
		this.set_ms_pointer(pointer);
		//markstack_print();
	}
	prev(){
		if (!this.ms_exist()){
			echo("[MarkStack] no mark");
			return;
		}
		let pointer = this.get_ms_pointer();
		if (pointer==-1){
			echo("[MarkStack] no mark");
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
		echo(`[MarkStack] IDX:${pointer} DEPTH:${topidx-pointer}`);
		this.set_ms_pointer(pointer);
		//markstack_print();
	}
	nearby(){
		let editor = vscode.window.activeTextEditor;
		if (editor === undefined) {
			return;
		}
		let range = editor.visibleRanges[0];
		let cursor = editor.selection.start;
		let uri = editor.document.uri;
		if (uri !== undefined && range !== undefined && cursor !== undefined) {
			let pointer:any = undefined;
			let distance = 2*(range.end.line - range.start.line);
			for(let i =0; i < this.ms.length; ++i) {
				let entry:any = this.ms[i];
				if (entry.uri == uri && range.contains(entry.pos)) {
					if (Math.abs(entry.pos.line - cursor.line) < distance){
						pointer = i;
						distance = Math.abs(entry.pos.line - cursor.line);
					}
				}
			}

			if (pointer !== undefined) {
				this.set_ms_pointer(pointer);
				let entry:any = this.ms[pointer];
				editor.selection = new vscode.Selection(entry.pos, entry.pos);
				echo(`[MarkStack] IDX:${pointer} DEPTH:${(this.ms.length-1)-pointer}`);
			}
		}
	}
	print(){
		if (!this.ms_exist()){
			echo("[MarkStack] no mark");
			return;
		}
		let stack:Array<any> = this.ms;
		let pointer = this.ms_ptr;
		let s = "";
		s += "[MarkStack]\n";
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
		echo("[MarkStack] stack cleared");
	}
	status(){
		MarkStack.statusItem.text = `[MS] LEN:${this.get_ms_len()} IDX:${this.get_ms_pointer()}`;
		MarkStack.statusItem.show();

		let uri = vscode.window.activeTextEditor?.document.uri;
		if (uri !== undefined) {
			let markpos:vscode.Range[] = [];
			let current_markpos:vscode.Range[] = [];
			this.ms.forEach((entry:any, index, array) => {
				if (index != this.ms_ptr && entry.uri == uri) {
					markpos.push(new vscode.Range(entry.pos, entry.pos));
				}
			});
			if (this.ms_ptr >= 0) {
				let entry:any = this.ms[this.ms_ptr];
				if (entry.uri == uri) {
					current_markpos.push(new vscode.Range(entry.pos, entry.pos));
				}
			}
			vscode.window.activeTextEditor?.setDecorations(MarkStack.decoration, markpos);
			vscode.window.activeTextEditor?.setDecorations(MarkStack.decorationCurrent, current_markpos);
		}
	}
}

class GroupMarkStack {
	private viewColToMs:MarkStack[] = [];
	private create = () => {
		return new MarkStack();
	};
	private checkMs = (viewColumn:number) => {
		if (this.viewColToMs[viewColumn] === undefined) {
			this.viewColToMs[viewColumn] = this.create();
		}
	};
	private getMs = () => {
		let vc = vscode.window.activeTextEditor?.viewColumn;
		if (vc === undefined) { return undefined; }
		else { return this.viewColToMs[vc]; }
	}
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
				this.checkMs(viewcol);
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
	}
	getItem(viewColumn:number) {
		return this.viewColToMs[viewColumn];
	}

	// ----------------------------------------------------------------------------

	private status = () => {
		let ms = this.getMs();
		if (ms !== undefined) { ms.status(); }
	}
	push = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.push();
			ms.status();
		}
	}
	pop = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.pop();
			ms.status();
		}
	}
	insertBefore = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.insertBefore();
			ms.status();
		}
	}
	insertAfter = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.insertAfter();
			ms.status();
		}
	}
	replace = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.replace();
			ms.status();
	 	}
	}
	delete = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.delete();
			ms.status();
	 	}
	}
	current = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.current();
			ms.status();
	 	}
	}
	next = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.next();
			ms.status();
		}
	}
	prev = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.prev();
			ms.status();
		}
	}
	nearby = () => {
		let ms = this.getMs();
		if (ms !== undefined) {
			ms.nearby();
			ms.status();
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
			ms.status();
		}
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
	context.subscriptions.push(vscode.commands.registerCommand('markstack.insertBefore', groupMarkStack.insertBefore));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.insertAfter', groupMarkStack.insertAfter));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.deleteEntry', groupMarkStack.delete));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.replaceEntry', groupMarkStack.replace));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.currentEntry', groupMarkStack.current));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.nextEntry', groupMarkStack.next));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.prevEntry', groupMarkStack.prev));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.nearbyEntry', groupMarkStack.nearby));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.print', groupMarkStack.print));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.clear', groupMarkStack.clear));
}

// this method is called when your extension is deactivated
export function deactivate() {}


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
