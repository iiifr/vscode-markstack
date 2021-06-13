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
	status(){

	}
}

class EditorGroupId {
	//multi MS
	//map: textEditor -> viewColumn, id
	//viewColumn:number; ID:number;
	//map: viewColumn -> innerIndex
	private idCount = 0;
	private editorIdSet = new WeakMap<vscode.TextEditor, {[name: string]: number}>();
	private viewColumnToId = new Map<number, number>();
	private update = (editor: vscode.TextEditor) => {
		if (!editor.viewColumn || editor.viewColumn <= 0) {
			return;
		}
		let viewColumn = editor.viewColumn.valueOf();
		let idset = this.editorIdSet.get(editor);
		if (idset !== undefined) {
			this.viewColumnToId.set(viewColumn, idset.id);
			idset.viewColumn = viewColumn;
			this.editorIdSet.set(editor, idset);
			L(`[groupId update][pin1] uri:${editor.document.uri.toString()} id:${idset.id} vcol:${idset.viewColumn}`);
		}
		else {
			let id = this.viewColumnToId.get(viewColumn);
			if (id !== undefined) {
				this.editorIdSet.set(editor, {'viewColumn': viewColumn, 'id': id});
				L(`[groupId update][pin2] uri:${editor.document.uri.toString()} id:${id} vcol:${viewColumn}`);
			}
			else {
				this.editorIdSet.set(editor, {'viewColumn': viewColumn, 'id': this.idCount});
				this.viewColumnToId.set(viewColumn, this.idCount);
				this.idCount += 1;
				L(`[groupId update][pin3] uri:${editor.document.uri.toString()} idCount:${this.idCount} vcol:${viewColumn}`);
			}
		}
		let printMapElements = (value: number, key: number, map: any) => {
			L(`vcol:${key} => id:${value}`)
		}
		L(`[groupId update] print viewColumnToId =============`);
		this.viewColumnToId.forEach(printMapElements);
		L(`[groupId update] ==================================`);
	};

	constructor() {
		vscode.window.onDidChangeTextEditorViewColumn((e:vscode.TextEditorViewColumnChangeEvent) => {
			this.update(e.textEditor);
		});
	}
	getId(editor:vscode.TextEditor) {
		let idset = this.editorIdSet.get(editor);
		if (!idset) {
			this.update(editor);
			idset = this.editorIdSet.get(editor);
		}
		return (idset ? idset.id : undefined);
	}
}

namespace ScopeMarkStack {

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

	//var cursor_idle = new OnCursorLineIdle(function() {echo("Cursor line stopped")}, 2000);
	//vscode.window.onDidChangeTextEditorSelection(function() {echo("Cursor changed")});
	var editor_group_id = new EditorGroupId();
	let disposable = vscode.commands.registerCommand('markstack.test', function(){
		let ed = vscode.window.activeTextEditor;
		if (ed) {
			echo(`id:${editor_group_id.getId(ed)} viewColumn:${ed.viewColumn}`);
		}

	});
	let f = (value:vscode.TextEditor, index: number, array: any) => {
		L(`[index]${index} [vcol]${value.viewColumn} [uri]${value.document.uri.toString()}`);
	}
	vscode.window.visibleTextEditors.forEach(f);
	//vscode.window.onDidChangeTextEditorViewColumn((e:vscode.TextEditorViewColumnChangeEvent) => {
	//	L(`in ed:${e.textEditor.viewColumn}, viewColumn:${e.viewColumn}`);
	//});

	//context.subscriptions.push(vscode.commands.registerCommand('markstack.push', markstack_push));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.pop', markstack_pop));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.currentEntry', markstack_current));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.nextEntry', markstack_next));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.prevEntry', markstack_prev));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.print', markstack_print));
	//context.subscriptions.push(vscode.commands.registerCommand('markstack.clear', markstack_clear));
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
