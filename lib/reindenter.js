'use babel';

import ReindenterView from './reindenter-view';
import { CompositeDisposable } from 'atom';

export default {

  reindenterView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.last = { from: 1, to: 1 };
    this.reindenterView = null;

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
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

  reindent() {
    let editor = atom.workspace.getActiveTextEditor();
    let lines = editor.getText().split(/[\n\r]/);
    let re = new RegExp("^([ ]+)(.*)");
    for(let a = 0;a < lines.length;a++) {
      let line = lines[a];
      line = line.replace(re, this.reindentReplace.bind(this));
      lines[a] = line;
    }

    // Apply result
    let cursorPoint = editor.getCursorBufferPosition();
    editor.setText(lines.join("\n"));
    editor.setCursorBufferPosition(cursorPoint);
  },

  reindentReplace(match, p1, p2) {
    let indentLen = Math.floor(p1.length / this.last.from);
    return "".padStart(indentLen * this.last.to, " ") + p2;
  }

};
