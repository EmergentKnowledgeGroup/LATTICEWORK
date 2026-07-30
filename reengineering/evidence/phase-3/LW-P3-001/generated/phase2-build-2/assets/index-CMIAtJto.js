(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`idle`,`starting`,`ready`,`stopping`,`stopped`,`failed`],t=`A lifecycle start operation failed.`,n=`A lifecycle stop operation failed.`,r=class extends Error{code;constructor(e){super(e===`kernel.lifecycle.start.failed`?t:n),this.name=`KernelLifecycleError`,this.code=e}},i=class{#e=`idle`;#t=[];#n=new Set;#r=[];#i=[];register(e){if(this.#e!==`idle`)throw Error(`Lifecycle participants may only be registered while the kernel is idle.`);if(this.#n.has(e.id))throw Error(`A lifecycle participant with id "${e.id}" is already registered.`);this.#t.push(e),this.#n.add(e.id)}async start(){if(this.#e!==`idle`)throw Error(`The kernel cannot start while ${this.#e}.`);this.#e=`starting`;for(let e of this.#t)try{await e.start(),this.#r.push(e)}catch{throw this.#s(`start`),await this.#a(),this.#e=`failed`,new r(`kernel.lifecycle.start.failed`)}return this.#e=`ready`,this.snapshot()}async stop(){if(this.#e===`stopped`)return this.snapshot();if(this.#e===`idle`)return this.#e=`stopped`,this.snapshot();if(this.#e===`starting`||this.#e===`stopping`)throw Error(`The kernel cannot stop while ${this.#e}.`);this.#e=`stopping`;let e=await this.#o();if(this.#r=[],e)throw this.#e=`failed`,new r(`kernel.lifecycle.stop.failed`);return this.#e=`stopped`,this.snapshot()}snapshot(){let e=this.#t.map(e=>e.id),t=this.#r.map(e=>e.id),n=this.#i.map(e=>({...e})),r={kernel:{state:this.#e,registeredCount:e.length},lifecycle:{state:this.#e,startedIds:[...t]},diagnostics:{count:n.length}};return{state:this.#e,registeredIds:e,startedIds:t,diagnostics:n,status:r}}async#a(){await this.#o(),this.#r=[]}async#o(){let e=!1;for(let t of[...this.#r].reverse())try{await t.stop()}catch{e=!0,this.#s(`stop`)}return e}#s(e){this.#i.push({code:e===`start`?`kernel.lifecycle.start.failed`:`kernel.lifecycle.stop.failed`,severity:`error`,phase:e,message:e===`start`?t:n})}},a=globalThis,o=a.ShadowRoot&&(a.ShadyCSS===void 0||a.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,s=Symbol(),c=new WeakMap,l=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(o&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=c.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&c.set(t,e))}return e}toString(){return this.cssText}},u=e=>new l(typeof e==`string`?e:e+``,void 0,s),d=(e,...t)=>new l(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,s),ee=(e,t)=>{if(o)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),r=a.litNonce;r!==void 0&&t.setAttribute(`nonce`,r),t.textContent=n.cssText,e.appendChild(t)}},f=o?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return u(t)})(e):e,{is:te,defineProperty:ne,getOwnPropertyDescriptor:p,getOwnPropertyNames:re,getOwnPropertySymbols:ie,getPrototypeOf:m}=Object,h=globalThis,g=h.trustedTypes,ae=g?g.emptyScript:``,_=h.reactiveElementPolyfillSupport,v=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?ae:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},b=(e,t)=>!te(e,t),x={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:b};Symbol.metadata??=Symbol(`metadata`),h.litPropertyMetadata??=new WeakMap;var S=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=x){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&ne(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=p(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??x}static _$Ei(){if(this.hasOwnProperty(v(`elementProperties`)))return;let e=m(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(v(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v(`properties`))){let e=this.properties,t=[...re(e),...ie(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(f(e))}else e!==void 0&&t.push(f(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ee(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?y:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?y:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??b)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};S.elementStyles=[],S.shadowRootOptions={mode:`open`},S[v(`elementProperties`)]=new Map,S[v(`finalized`)]=new Map,_?.({ReactiveElement:S}),(h.reactiveElementVersions??=[]).push(`2.1.2`);var C=globalThis,w=e=>e,T=C.trustedTypes,E=T?T.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,D=`$lit$`,O=`lit$${Math.random().toFixed(9).slice(2)}$`,k=`?`+O,oe=`<${k}>`,A=document,j=()=>A.createComment(``),M=e=>e===null||typeof e!=`object`&&typeof e!=`function`,N=Array.isArray,se=e=>N(e)||typeof e?.[Symbol.iterator]==`function`,P=`[ 	
\f\r]`,F=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,I=/-->/g,L=/>/g,R=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),z=/'/g,B=/"/g,V=/^(?:script|style|textarea|title)$/i,ce=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),H=Symbol.for(`lit-noChange`),U=Symbol.for(`lit-nothing`),W=new WeakMap,G=A.createTreeWalker(A,129);function K(e,t){if(!N(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return E===void 0?t:E.createHTML(t)}var le=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=F;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===F?c[1]===`!--`?o=I:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=R):(V.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=R):o=L:o===R?c[0]===`>`?(o=i??F,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?R:c[3]===`"`?B:z):o===B||o===z?o=R:o===I||o===L?o=F:(o=R,i=void 0);let d=o===R&&e[t+1].startsWith(`/>`)?` `:``;a+=o===F?n+oe:l>=0?(r.push(s),n.slice(0,l)+D+n.slice(l)+O+d):n+O+(l===-2?t:d)}return[K(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},q=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=le(t,n);if(this.el=e.createElement(l,r),G.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=G.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(D)){let t=u[o++],n=i.getAttribute(e).split(O),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?de:r[1]===`?`?fe:r[1]===`@`?pe:X}),i.removeAttribute(e)}else e.startsWith(O)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(V.test(i.tagName)){let e=i.textContent.split(O),t=e.length-1;if(t>0){i.textContent=T?T.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],j()),G.nextNode(),c.push({type:2,index:++a});i.append(e[t],j())}}}else if(i.nodeType===8)if(i.data===k)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(O,e+1))!==-1;)c.push({type:7,index:a}),e+=O.length-1}a++}}static createElement(e,t){let n=A.createElement(`template`);return n.innerHTML=e,n}};function J(e,t,n=e,r){if(t===H)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=M(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=J(e,i._$AS(e,t.values),i,r)),t}var ue=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??A).importNode(t,!0);G.currentNode=r;let i=G.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new Y(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new me(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=G.nextNode(),a++)}return G.currentNode=A,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},Y=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=U,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=J(this,e,t),M(e)?e===U||e==null||e===``?(this._$AH!==U&&this._$AR(),this._$AH=U):e!==this._$AH&&e!==H&&this._(e):e._$litType$===void 0?e.nodeType===void 0?se(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==U&&M(this._$AH)?this._$AA.nextSibling.data=e:this.T(A.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=q.createElement(K(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new ue(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=W.get(e.strings);return t===void 0&&W.set(e.strings,t=new q(e)),t}k(t){N(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(j()),this.O(j()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=w(e).nextSibling;w(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},X=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=U,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=U}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=J(this,e,t,0),a=!M(e)||e!==this._$AH&&e!==H,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=J(this,r[n+o],t,o),s===H&&(s=this._$AH[o]),a||=!M(s)||s!==this._$AH[o],s===U?e=U:e!==U&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===U?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},de=class extends X{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===U?void 0:e}},fe=class extends X{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==U)}},pe=class extends X{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=J(this,e,t,0)??U)===H)return;let n=this._$AH,r=e===U&&n!==U||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==U&&(n===U||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},me=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){J(this,e)}},he=C.litHtmlPolyfillSupport;he?.(q,Y),(C.litHtmlVersions??=[]).push(`3.3.3`);var ge=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new Y(t.insertBefore(j(),e),e,void 0,n??{})}return i._$AI(e),i},Z=globalThis,Q=class extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ge(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return H}};Q._$litElement$=!0,Q.finalized=!0,Z.litElementHydrateSupport?.({LitElement:Q});var _e=Z.litElementPolyfillSupport;_e?.({LitElement:Q}),(Z.litElementVersions??=[]).push(`4.2.2`);var ve=class extends Q{static properties={diagnosticsCount:{type:Number},kernelState:{type:String},lifecycleState:{type:String},ready:{type:Boolean,reflect:!0}};constructor(){super(),this.diagnosticsCount=0,this.kernelState=`Pending`,this.lifecycleState=`Pending`,this.ready=!1}static styles=d`
    :host {
      display: block;
      min-block-size: 100vh;
      background:
        linear-gradient(150deg, rgb(225 238 232 / 85%), transparent 44rem),
        #f2f5f1;
      color: #17221f;
    }

    main {
      display: grid;
      gap: 1.5rem;
      width: min(100% - 2rem, 72rem);
      margin-inline: auto;
      padding-block: clamp(2rem, 7vw, 6rem);
    }

    header {
      max-inline-size: 48rem;
    }

    .eyebrow {
      margin: 0 0 0.65rem;
      color: #286359;
      font-size: 0.875rem;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #10251f;
      font-size: clamp(2.1rem, 8vw, 4.5rem);
      letter-spacing: -0.045em;
      line-height: 0.98;
    }

    .summary {
      max-inline-size: 62ch;
      margin: 1.25rem 0 0;
      color: #41534d;
      font-size: 1.0625rem;
    }

    .boundary {
      border-inline-start: 0.3rem solid #37766a;
      padding-inline-start: 1rem;
      color: #29423a;
      font-weight: 650;
    }

    dl {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }

    .status {
      min-block-size: 7.5rem;
      border: 1px solid #b8c8be;
      border-radius: 0.85rem;
      background: rgb(255 255 255 / 72%);
      padding: 1rem;
    }

    dt {
      color: #52665e;
      font-size: 0.8125rem;
      font-weight: 750;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    dd {
      margin: 0.65rem 0 0;
      color: #12372d;
      font-size: 1.25rem;
      font-weight: 700;
    }

    a {
      align-self: start;
      display: inline-flex;
      align-items: center;
      min-block-size: 2.75rem;
      color: #005f56;
      font-weight: 700;
      text-underline-offset: 0.2em;
    }

    a:hover {
      color: #003f3a;
    }

    a:focus-visible {
      outline: 0.2rem solid #005f56;
      outline-offset: 0.2rem;
    }

    .details {
      max-inline-size: 62ch;
      border-block-start: 1px solid #b8c8be;
      padding-block-start: 1rem;
      color: #41534d;
    }

    @media (min-width: 48rem) {
      dl {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (forced-colors: active) {
      :host {
        background: Canvas;
        color: CanvasText;
      }

      .status,
      .details {
        border-color: CanvasText;
        background: Canvas;
      }

      h1,
      .eyebrow,
      .summary,
      .boundary,
      dt,
      dd,
      .details,
      a {
        color: CanvasText;
      }

      a:focus-visible {
        outline-color: CanvasText;
      }
    }
  `;render(){return ce`
      <main
        aria-busy=${String(!this.ready)}
        aria-labelledby="candidate-title"
        data-ready=${this.ready?`true`:`false`}
        data-testid="candidate-ready"
      >
        <header>
          <p class="eyebrow">LATTICEWORK / candidate boundary</p>
          <h1 id="candidate-title">Candidate status shell</h1>
          <p class="summary">
            This local-only view is a candidate architecture seam, not a replacement application.
          </p>
          <p class="boundary">Candidate only. No migrated features are available in this shell.</p>
        </header>

        <dl aria-label="Candidate boot status">
          <div class="status">
            <dt>Kernel</dt>
            <dd>${this.kernelState}</dd>
          </div>
          <div class="status">
            <dt>Lifecycle</dt>
            <dd>${this.lifecycleState}</dd>
          </div>
          <div class="status">
            <dt>Diagnostics</dt>
            <dd>${this.diagnosticsCount} recorded</dd>
          </div>
        </dl>

        <a href="#candidate-details">Read the candidate boundary</a>
        <p class="details" id="candidate-details">
          The preserved legacy runtime remains authoritative. This shell does not access storage,
          network services, providers, service workers, or migrated routes.
        </p>
      </main>
    `}setCandidateStatus(e){this.diagnosticsCount=e.diagnosticsCount,this.kernelState=e.kernelState,this.lifecycleState=e.lifecycleState,this.ready=!0}setBootFailure(){this.kernelState=`Blocked`,this.lifecycleState=`Failed`,this.ready=!1}};customElements.define(`lw-empty-status-shell`,ve);function $(e){return`${e.slice(0,1).toUpperCase()}${e.slice(1)}`}function ye(t){if(!e.includes(t.kernel.state))throw Error(`Candidate kernel returned an unknown lifecycle state.`);return{diagnosticsCount:t.diagnostics.count,kernelState:$(t.kernel.state),lifecycleState:$(t.lifecycle.state)}}async function be(){let e=document.querySelector(`lw-empty-status-shell`);if(e===null)throw Error(`Candidate status-shell host was not found.`);let t=await new i().start();e.setCandidateStatus(ye(t.status))}be().catch(e=>{document.querySelector(`lw-empty-status-shell`)?.setBootFailure(),console.error(`Candidate shell boot failed.`,e)});