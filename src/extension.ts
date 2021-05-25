// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const L = console.log;
const echo = vscode.window.showInformationMessage;

var mark_stack = {
	ms: new Array<{}>(),
	ms_ptr: -1,
	push_mark_stack: function(uri: vscode.Uri, pos: vscode.Position, name: string, text: vscode.TextLine){
		this.ms.push({uri: uri, pos: pos, name: name, text: text});
	},
	pop_mark_stack: function(){
		return this.ms.pop();
	},
	set_ms_pointer: function(val: number){
		this.ms_ptr = val;
	},
	get_ms_pointer: function(){
		return this.ms_ptr;
	},
	del_ms: function(){
		this.ms = new Array<{}>();
		this.ms_ptr = -1;
	},
	ms_exist: function(){
		return (this.ms.length != 0);
	},
	ms_empty: function(){
		return (this.ms.length == 0);
	},
	get_ms_len: function() { return this.ms.length; }
};

function markstack_push(){
	let editor = vscode.window.activeTextEditor;
	let wsfolder = vscode.workspace.workspaceFolders;
	if (editor && wsfolder){
		let s = editor.selection;
		let wsf_uri = wsfolder[0].uri;
		let doc_uri = editor.document.uri;
		let docname = doc_uri.toString().replace(wsf_uri.toString()+"/", "");
		let text = editor.document.lineAt(s.start);
		mark_stack.push_mark_stack(doc_uri, s.start, docname, text);
		let l = mark_stack.get_ms_len();
		mark_stack.set_ms_pointer(l-1);
		echo(`MarkStack: ${docname} L${s.start.line+1} C${s.start.character+1} pushed, len=${l}`);
		//L("WS URI: " + wsf_uri.toString());
		//L("DOC URI: " + editor.document.uri.toString());
		//L("DOC TXT: " + text);
	}
}

function markstack_pop(){
	let entry: any = mark_stack.pop_mark_stack();
	if (entry){
		let sel = new vscode.Range(entry.pos, entry.pos);
		vscode.window.showTextDocument(
			entry.uri,
			{preserveFocus: false, preview: false, selection: sel}
		);
		let l = mark_stack.get_ms_len();
		mark_stack.set_ms_pointer(l-1);
		echo("MarkStack: popped out, len=" + l);
	}
	else {
		echo("MarkStack: no mark");
	}
}

function markstack_current(){
	if (!mark_stack.ms_exist()) {
		echo("MarkStack: no mark");
		return;
	}
	let pointer = mark_stack.get_ms_pointer();
	if (pointer==-1) {
		echo("MarkStack: no mark");
		return;
	}
	let entry:any = mark_stack.ms[pointer];
	let topidx = mark_stack.ms.length - 1;
	let sel = new vscode.Range(entry.pos, entry.pos);
	vscode.window.showTextDocument(
		entry.uri,
		{preserveFocus: false, preview: false, selection: sel}
	);
	echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
	//markstack_print();
}

function markstack_next(){
	if (!mark_stack.ms_exist()) {
		echo("MarkStack: no mark");
		return;
	}
	let pointer = mark_stack.get_ms_pointer();
	if (pointer==-1) {
		echo("MarkStack: no mark");
		return;
	}
	let topidx = mark_stack.get_ms_len() - 1;
	let stack = mark_stack.ms;
	if (pointer == topidx){
		markstack_current();
		return;
	}
	pointer += 1;
	let entry:any = stack[pointer];
	let sel = new vscode.Range(entry.pos, entry.pos);
	vscode.window.showTextDocument(
		entry.uri,
		{preserveFocus: false, preview: false, selection: sel}
	);
	echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
	mark_stack.set_ms_pointer(pointer);
	//markstack_print();
}

function markstack_prev(){
	if (!mark_stack.ms_exist()){
		echo("MarkStack: no mark");
		return;
	}
	let pointer = mark_stack.get_ms_pointer();
	if (pointer==-1){
		echo("MarkStack: no mark");
		return;
	}
	let topidx = mark_stack.get_ms_len() - 1;
	let stack = mark_stack.ms;
	if (pointer == 0){
		markstack_current();
		return;
	}
	pointer -= 1;
	let entry:any = stack[pointer];
	let sel = new vscode.Range(entry.pos, entry.pos);
	vscode.window.showTextDocument(
		entry.uri,
		{preserveFocus: false, preview: false, selection: sel}
	);
	echo(`MarkStack: DEPTH:${topidx-pointer} INDEX:${pointer}`);
	mark_stack.set_ms_pointer(pointer);
	//markstack_print();
}

function markstack_print(){
	if (!mark_stack.ms_exist()){
		echo("MarkStack: no mark");
		return;
	}
	let stack:Array<any> = mark_stack.ms;
	let pointer = mark_stack.ms_ptr;
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

function markstack_clear(){
	mark_stack.del_ms();
	echo("MarkStack: stack cleared");
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "markstack" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('markstack.push', markstack_push));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.pop', markstack_pop));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.currentEntry', markstack_current));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.nextEntry', markstack_next));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.prevEntry', markstack_prev));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.print', markstack_print));
	context.subscriptions.push(vscode.commands.registerCommand('markstack.clear', markstack_clear));
}

// this method is called when your extension is deactivated
export function deactivate() {}
