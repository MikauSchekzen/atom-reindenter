'use babel';

import ReindenterView from './reindenter-view';
import { CompositeDisposable } from 'atom';
const detectIndent = require("detect-indent");

const LFRegExp = /(\A|[^\r])\n/g
const CRLFRegExp = /\r\n/g

export default {

  reindenterView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.last = { from: 1, to: 1, fromType: "soft", toType: "soft" };
    this.reindenterView = null;

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'reindenter:quickReindent': () => this.quickReindent(),
      'reindenter:manualReindent': () => this.manualReindent()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.reindenterView.destroy();
  },

  manualReindent() {
    let editor;
    if(editor = atom.workspace.getActiveTextEditor()) {
      this.reindenterView = new ReindenterView(this.showToMenu.bind(this), "from");
    }
  },

  showToMenu(item) {
    let followUp = false;
    if(item.match(/FROM[ ]([0-9]+)/i)) {
      this.last.from = parseInt(RegExp.$1);
      followUp = true;
    }
    if(followUp) {
      this.reindenterView = new ReindenterView(this.doFollowUp.bind(this), "to");
    }
  },

  doFollowUp(item) {
    let doReindent = false;
    if(item.match(/TO[ ]([0-9]+)/i)) {
      this.last.to = parseInt(RegExp.$1);
      doReindent = true;
    }
    if(doReindent) {
      this.reindent();
    }
  },

  quickReindent() {
    let editor;
    if(editor = atom.workspace.getActiveTextEditor()) {
      let text = editor.getText();
      let indent = detectIndent(text);
      this.last.from = indent.amount;
      this.last.fromType = indent.type === "space" ? "soft" : "hard";
      this.last.to = atom.config.get("editor.tabLength");
      this.last.toType = atom.config.get("editor.tabType");
      if(this.last.toType === "auto") this.last.toType = "soft";
      this.reindent();
    }
  },

  reindent() {
    let editor = atom.workspace.getActiveTextEditor();
    if(editor == null) return;
    let lineEnding = this.getLineEndingType(editor) === "CRLF" ? "\r\n" : "\n";
    let lines = editor.getText().split(lineEnding);
    let re = new RegExp("^(\\s+)(.*)");
    for(let a = 0;a < lines.length;a++) {
      let line = lines[a];
      line = line.replace(re, this.reindentReplace.bind(this));
      lines[a] = line;
    }

    // Apply result
    let cursorPoint = editor.getCursorBufferPosition();
    editor.setText(lines.join(lineEnding));
    editor.setCursorBufferPosition(cursorPoint);
  },

  getLineEndingType(editor) {
    let text = editor.getText();
    let type = "LF";
    if(text.search(CRLFRegExp) !== -1) type = "CRLF";
    return type;
  },

  reindentReplace(match, p1, p2) {
    if(this.last.fromType === "hard" && this.last.toType === "hard") return match;
    let indentLen = Math.floor(p1.length / this.last.from);
    if(this.last.fromType === "hard") indentLen = 1;

    if(this.last.toType === "soft") {
      return "".padStart(indentLen * this.last.to, " ") + p2;
    }
    else {
      return "".padStart(indentLen, "\t") + p2;
    }
  }

};
