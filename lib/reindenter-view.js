'use babel';

import { SelectListView} from "atom-space-pen-views";

export default class ReindenterView extends SelectListView {

  constructor(callback, type) {
    super(...arguments);
    this.callback = callback;
    this.type = type;
    this.setItems(this.getCommands());
    this.show();
  }

  initialize() {
    super.initialize(...arguments);
    this.addClass("reindenter");
  }

  show() {
    this.panel = atom.workspace.addModalPanel({ item: this });
    this.panel.show();
    this.focusFilterEditor();
  }

  hide() {
    this.panel.hide();
  }

  cancelled() {
    this.hide();
  }

  confirmed(item) {
    this.callback(item);
    this.hide();
  }

  viewForItem(item) {
    let element = document.createElement("li");
    element.innerHTML = item;
    return element;
  }

  getCommands() {
    let cmds = [];
    let prefix = "";
    if(this.type === "from") prefix = "From ";
    else if(this.type === "to") prefix = "To ";

    if(prefix === "") return [];
    for(let a = 0;a < 10;a++) {
      cmds.push(prefix + (a+1).toString());
    }
    return cmds;
  }

}
