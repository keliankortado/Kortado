/* Kortado — mini moteur de rendu des pages (remplace le runtime de Claude Design).
   Lit le gabarit <template id="dc-tpl">, applique {{liaisons}}, <sc-if>, <sc-for>
   et les événements onClick / onInput / onSubmit, puis met à jour le DOM en place. */
(function () {
  'use strict';
  var root, tpl, comp, rendering = false, queued = false;

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    if (p) for (var k in p) this.state[k] = p[k];
    schedule();
  };
  window.DCLogic = DCLogic;

  function schedule() {
    if (!comp) return;
    if (rendering) { queued = true; return; }
    render();
  }

  var ONE = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/, ALL = /\{\{\s*([^{}]+?)\s*\}\}/g;
  function get(scope, path) {
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function raw(str, scope) {
    var m = ONE.exec(str);
    if (m) return get(scope, m[1]);
    return str.replace(ALL, function (_, p) { var v = get(scope, p); return v == null || v === false ? '' : String(v); });
  }

  function build(src, scope, out) {
    for (var n = src.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        var t = n.nodeValue;
        out.appendChild(document.createTextNode(t.indexOf('{{') < 0 ? t : raw(t, scope) == null ? '' : String(raw(t, scope))));
      } else if (n.nodeType === 1) {
        var tag = n.localName;
        if (tag === 'sc-if') {
          if (raw(n.getAttribute('value') || '', scope)) build(n, scope, out);
        } else if (tag === 'sc-for') {
          var list = raw(n.getAttribute('list') || '', scope) || [], as = n.getAttribute('as') || 'item';
          for (var i = 0; i < list.length; i++) {
            var sc = Object.create(scope); sc[as] = list[i]; sc.$index = i;
            build(n, sc, out);
          }
        } else {
          var el = n.namespaceURI === 'http://www.w3.org/1999/xhtml' ? document.createElement(tag) : document.createElementNS(n.namespaceURI, n.tagName);
          var ev = null, ta = [];
          for (var a = 0; a < n.attributes.length; a++) {
            var at = n.attributes[a], name = at.name, val = at.value;
            if (name.indexOf('hint-') === 0) continue;
            if (name.length > 2 && name.slice(0, 2) === 'on' && ONE.test(val)) {
              var fn = raw(val, scope);
              if (typeof fn === 'function') (ev || (ev = {}))[name.slice(2)] = fn;
              continue;
            }
            var v = val.indexOf('{{') < 0 ? val : raw(val, scope);
            if (v == null || v === false) continue;
            el.setAttribute(name, v === true ? '' : String(v));
            ta.push(name);
          }
          el.__ev = ev; el.__ta = ta;
          build(tag === 'template' ? n.content : n, scope, el);
          out.appendChild(el);
        }
      }
    }
  }

  function same(d, s) {
    return d.nodeType === s.nodeType && (d.nodeType !== 1 || (d.nodeName === s.nodeName && (d.id || '') === (s.id || '')));
  }
  function update(d, s) {
    if (d.nodeType !== 1) { if (d.nodeValue !== s.nodeValue) d.nodeValue = s.nodeValue; return; }
    var keep = {};
    for (var i = 0; i < s.attributes.length; i++) {
      var a = s.attributes[i]; keep[a.name] = 1;
      if (d.getAttribute(a.name) !== a.value) d.setAttribute(a.name, a.value);
    }
    var old = d.__ta || [];
    if (!d.__ta) { for (var j = d.attributes.length - 1; j >= 0; j--) if (!keep[d.attributes[j].name] && d.attributes[j].name !== 'aria-invalid') d.removeAttribute(d.attributes[j].name); }
    else for (var k = 0; k < old.length; k++) if (!keep[old[k]]) d.removeAttribute(old[k]);
    d.__ta = s.__ta; d.__ev = s.__ev;
    if (d.nodeName === 'INPUT' && s.hasAttribute('value') && document.activeElement !== d && d.value !== s.getAttribute('value')) d.value = s.getAttribute('value');
    morph(d, s);
  }
  function morph(dst, src) {
    var sn = Array.prototype.slice.call(src.childNodes);
    for (var i = 0; i < sn.length; i++) {
      var d = dst.childNodes[i], s = sn[i];
      if (!d) dst.appendChild(s);
      else if (d.nodeType === 8 || !same(d, s)) dst.replaceChild(s, d);
      else update(d, s);
    }
    while (dst.childNodes.length > sn.length) dst.removeChild(dst.lastChild);
  }

  function render() {
    rendering = true;
    try {
      do {
        queued = false;
        var vals = comp.renderVals() || {};
        var frag = document.createElement('div');
        build(tpl.content, vals, frag);
        morph(root, frag);
      } while (queued);
    } catch (e) { if (window.console) console.error(e); }
    rendering = false;
  }

  function dispatch(e) {
    for (var el = e.target; el && el !== root.parentNode; el = el.parentNode) {
      var fn = el.__ev && el.__ev[e.type];
      if (fn) { if (e.type === 'submit') e.preventDefault(); fn(e); }
    }
  }

  /* Envois vers Netlify Forms */
  window.kPost = function (name, data) {
    try {
      var b = new URLSearchParams(); b.append('form-name', name);
      for (var k in data) b.append(k, data[k] == null ? '' : data[k]);
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: b.toString() }).catch(function () {});
    } catch (e) {}
  };
  window.kRdv = function (presta) {
    function v(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
    var lab = { g: 'Google Ads', li: 'LinkedIn', idk: 'Je ne sais pas encore', both: 'Les deux' };
    window.kPost('rendez-vous', { prenom: v('f-prenom'), nom: v('f-nom'), email: v('f-mail'), interet: lab[presta] || presta || '', message: v('f-msg'), motivation: v('motiv'), page: location.pathname });
  };
  window.kLead = function (f) {
    var i = f.querySelector('input[type=email]');
    if (!i || !i.value) return false;
    window.kPost(f.getAttribute('name'), { email: i.value.trim(), page: location.pathname });
    f.innerHTML = '<p style="margin:0;font-weight:800;font-size:18px">C’est noté ! On vous l’envoie très vite par e-mail ☕</p>';
    return false;
  };

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('dc-root'); tpl = document.getElementById('dc-tpl');
    if (!root || !tpl || typeof Component !== 'function') return; // eslint-disable-line no-undef
    var props = {};
    try {
      var spec = JSON.parse((document.getElementById('dc-props') || {}).textContent || '{}');
      for (var k in spec) if (k.charAt(0) !== '$' && spec[k] && 'default' in spec[k]) props[k] = spec[k]['default'];
    } catch (e) {}
    comp = new Component(props); // eslint-disable-line no-undef
    if (!comp.state) comp.state = {};
    ['click', 'input', 'change', 'submit'].forEach(function (t) { root.addEventListener(t, dispatch); });
    render();
    if (location.hash) { var t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) setTimeout(function () { t.scrollIntoView(); }, 30); }
  });
})();
