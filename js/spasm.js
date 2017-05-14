
class Option{

  constructor(item){
    this._item = item;
  }

  static of(item){
    return new Option(item);
  }

  static empty(){
    return new Option();
  }

  map(f){
    if(this.exists()){
      return Option.of(f(this._item));
    }
    return Option.empty();
  }

  foreach(f){
    if(this.exists()){
      f(this._item);
    }
  }

  getOrElse(item){
    if(this.exists()){
      return this._item;
    }
    return item;
  }

  orElse(f){
    if(this.exists()){
      return this;
    }
    return Option.of(f());
  }

  exists(){
    return this._item !== undefined && this._item !== null;
  }
}



class MetaData{

  constructor(){
    this._head = document.getElementsByTagName("head")[0];
  }

  update(meta){
    if(meta !== undefined){

      this._updateTitle(meta.title);
      this._updateCanonical(meta.canonical);
      this._updateRobots(meta.index, meta.follow);
      this._updateHreflang(meta.hreflang);

    }
  }

  _updateHreflang(obj){

    // FIXME: Removing then remaking is probably inefficient
    let elms = this._head.querySelectorAll('link[rel="alternate"]');
    for(let elm of elms){
      this._head.removeChild(elm);
    }

    (Option.of(obj))
      .foreach((hreflang) => {
        for(let href in hreflang){
          if(hreflang.hasOwnProperty(href)){
            let elm = document.createElement("link");
            elm.setAttribute("rel", "alternate");
            elm.setAttribute("hreflang", MetaData._camelToDash(href));
            elm.setAttribute("href", hreflang[href]);
            this._head.appendChild(elm);
          }
        }
      });
  }

  static _camelToDash(str){
    return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
  }

  _updateTitle(value){
    (Option.of(value))
      .foreach((title) => {
        (Option.of(this._head.getElementsByTagName("title")[0]))
          .orElse(() => {
            return this._createElement("title")
          }).foreach((titleElm) => {
            titleElm.innerHTML = title
        })
      });
  }

  _updateCanonical(value){
    (Option.of(value))
      .foreach((canonical) => {
        (Option.of(this._head.querySelector('link[rel="canonical"]')))
          .orElse(() => {
            let elm = this._createElement("link");
            elm.setAttribute("rel", "canonical");
            return elm;
          }).foreach((canonElm) => {
          canonElm.setAttribute("href",canonical);
        });
      });
  }

  _updateRobots(indexValue, followValue){
    // FIXME: this could probably be implemented cleaner
    (Option.of(this._head.querySelector('meta[name="robots"]')))
      .map((elm) =>{
        if(followValue && indexValue){
          this._head.removeChild(elm);
        } else if (followValue) {
          elm.setAttribute("content", "noindex")
        } else if (indexValue){
          elm.setAttribute("content", "nofollow")
        } else {
          elm.setAttribute("content", "noindex, nofollow")
        }
        return elm;
      }).orElse(() => {
      if(indexValue && followValue) {
        return
      }
      let elm = this._createElement("meta");
      elm.setAttribute("name", "robots");
      if(indexValue){
        elm.setAttribute("content", "nofollow")
      } else if (followValue) {
        elm.setAttribute("content", "noindex")
      } else {
        elm.setAttribute("content", "noindex, nofollow")
      }
    });
  }

  _createElement(element){
    let elm = document.createElement(element);
    this._head.appendChild(elm);
    return elm;
  }
}


class DataBinding {

  constructor(elm, binder){
    this._elm = elm.querySelector('[data-bind="' + binder +'"]')
  }

  bind(url){
    fetch(url)
      .then(result => result.json())
      .then(obj => this.bindObject(obj));
  }

  bindObject(obj){
    let scope = this._elm.innerHTML;
    let regex = /{{\s*((\w|\.|\[|])+)\s*}}/g;
    let arr;
    let results = new Set();
    while((arr = regex.exec(scope)) !== null){
      results.add(arr[1]);
    }

    for(let result of results){
      let replace = new RegExp('{{\\s*(' + DataBinding._escape(result) + ')\\s*}}','g');
      let evaluation = eval('obj.' + result);
      scope = scope.replace(replace,"" + evaluation);
    }
    this._elm.innerHTML = scope.replace(regex, "");
  }

  static _escape(str){
    return str.replace(".", "\\.")
      .replace("[","\\[")
      .replace("]", "\\]");
  }
}


class Controller {

  constructor(func){
    this._func = func;
  }

  init(elm){
    this._func(elm);
  }
}

class State{

  constructor(url, template, meta){
    this._url = url;
    this._template = template;
    this._meta = meta
  }

  get meta(){
    return this._meta;
  }

  get template(){
    return this._template;
  }

  get url(){
    return this._url;
  }

  init(controllers){
    this._elms = document.querySelectorAll('[data-controller]');
    for(let elm of this._elms){
      let controllerKey = elm.dataset.controller;
      let controller = controllers.get(controllerKey);
      if(controller !== undefined){
        controller.init(elm);
      }
    }
  }

}

class StateMachine {

  constructor(elm, states){
    this._states = states;
    this._elm = document.querySelector('[data-app="' + elm + '"]');
    this._meta = new MetaData();
  }

  change(state,controllers, action){
    let newState = Option.of(this._states.get(state))
      .getOrElse(this._states.get("**"));
    let beforeStateChanged = new Event('beforestatechanged', {"bubbles":false, "cancelable":true});
    this._elm.dispatchEvent(beforeStateChanged);
    if(!beforeStateChanged.defaultPrevented){
      fetch(newState.template)
        .then(response => {
          response.text()
          .then(text => {
            this._meta.update(newState.meta);
            let newUrl = newState.url;
            if(newState.url === "**"){
              newUrl = location.pathname;
            }
            if(!!action && action === 'push') {
              history.pushState({}, "", newUrl);
            } else if (action === 'replace') {
              history.replaceState({}, "", newUrl);
            }
            this._elm.innerHTML = text;
            newState.init(controllers);
            this._elm.dispatchEvent(new Event('afterstatechanged', {"bubbles":false, "cancelable":false}));
          });
        },() =>{
          this._elm.dispatchEvent(new Event('statechangefailed', {"bubbles":false, "cancelable":false}))
        })
    }
  }
}

class App{

  constructor(){
    this._controllers = new Map();
  }

  controller(key, value){
    this._controllers.set(key, value);
  }

  init(elm, statesObj){
    let states = new Map();
    for(let state of statesObj){
      states.set(state.url, new State(state.url, state.template, state.meta))
    }
    this._stateMachine = new StateMachine(elm, states);
    this._changeState(location.pathname, 'replace');
    this._listenAnchor();
    this._listenPopState();
  }

  _listenAnchor() {
    document.addEventListener("click", (e) => {
      if (e.srcElement.tagName === 'A') {
        let path = e.srcElement.href;

        if (path === location.href ||
          path === location.pathname) {
          App._preventDefault(e);
          return;
        }

        this._changeState(path, 'push', e);
      }
    });
  }

  _listenPopState(){
    window.addEventListener("popstate", (e) => {
      this._changeState(location.pathname);
    });
  }

  _changeState(path, action, e) {
    if(path === undefined){
      return
    }

    if (/^(http(s)?:\/\/|\/)(.*)/.test(path)) {

      path = path.replace("https://", "")
        .replace("http://", "");

      if (path[0] !== "/") {
        let domain = path.split("/")[0];
        if (domain === window.location.host) {
          App._preventDefault(e);
          path = path.replace(domain, "");
          this._stateMachine.change(path, this._controllers, action);
        }
      } else {
        App._preventDefault(e);
        this._stateMachine.change(path, this._controllers,action);
      }
    }
  }

  static _preventDefault(e){
    if(e !== undefined && e){
      e.preventDefault();
    }
  }

}

window.spasm = new App();
