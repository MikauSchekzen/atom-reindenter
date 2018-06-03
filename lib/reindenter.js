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
    this.last = {
      from: {
        value: 1,
        type: "soft"
      },
      to: {
        value: 1,
        type: "soft"
      }
    };
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

  setFromReindentMenuResult(result, obj) {
    let value;
    if(result.match(/FROM[ ](.*)/i)) {
      value = RegExp.$1;
    }
    else if(result.match(/TO[ ](.*)/i)) {
      value = RegExp.$1;
    }
    if(value != null) {
      if(value.match(/[0-9]+/)) {
        obj.value = parseInt(value);
        obj.type = "soft";
        return true;
      }
      else if(value.match(/(?:HARD)/i)) {
        obj.value = 1;
        obj.type = "hard";
        return true;
      }
    }
    return false;
  },

  showToMenu(item) {
    let followUp = false;
    if(this.setFromReindentMenuResult(item, this.last.from)) {
      this.reindenterView = new ReindenterView(this.doFollowUp.bind(this), "to");
    }
  },

  doFollowUp(item) {
    let doReindent = false;
    if(this.setFromReindentMenuResult(item, this.last.to)) {
      this.reindent();
    }
  },

  quickReindent() {
    let editor;
    if(editor = atom.workspace.getActiveTextEditor()) {
      let text = editor.getText();
      let indent = detectIndent(text);
      this.last.from.value = indent.amount;
      this.last.from.type = indent.type === "space" ? "soft" : "hard";
      this.last.to.value = atom.config.get("editor.tabLength");
      this.last.to.type = atom.config.get("editor.tabType");
      if(this.last.to.type === "auto") this.last.to.type = "soft";
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
    if(this.last.from.type === "hard" && this.last.to.type === "hard") return match;
    let indentLen = Math.floor(p1.length / this.last.from.value);
    if(this.last.from.type === "hard") indentLen = p1.length;

    if(this.last.to.type === "soft") {
      return "".padStart(indentLen * this.last.to.value, " ") + p2;
    }
    else {
      return "".padStart(indentLen, "\t") + p2;
    }
  }

};
