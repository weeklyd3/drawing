const editor = CodeMirror.fromTextArea(document.querySelector('textarea'), {
    lineNumbers: true,
    mode: 'javascript',
    viewportMargin: Infinity,
    extraKeys: {
        Enter: enterPressed
    },
    lineWrapping: true,
    matchBrackets: true,
    autoCloseBrackets: true
});
window.hist = [];
window.removedHist = [];
function undo() {
    if (!window.hist.length) return;
    const element = window.hist.pop();
    element.remove();
    window.removedHist.push(element);
}
function redo() {
    if (!window.removedHist.length) return;
    const element = window.removedHist.pop();
    element.addTo(document.querySelector('svg'));
    window.hist.push(element);
}
// Let's see how many digits of Pi I can pull off the Internet
const pi = 3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679
window.drawing = SVG().addTo('#drawing').size('100%', '100%');
window.$eval = eval;
const con = document.querySelector('#consoleWrapper');

function enterPressed(ev) {
    if (!editor.getValue()) return CodeMirror.Pass;
    logInputRaw(highlightString(editor.getValue()));
    const bottom = con.scrollHeight - con.scrollTop - con.clientHeight < 1;
    execute(editor.getValue());
    editor.setValue("");
    editor.clearHistory();
    if (bottom) document.querySelector('label').scrollIntoView();
}

function execute(code) {
    try {
        var output = window.$eval(code);
        if (typeof output === 'function') {
            output = output.toString();
            window.isFunction = true;
        }
        var text = JSON.stringify(output, refReplacer(), 4);
        if (window.isFunction) text = output;
        window.isFunction = false;
        if (typeof text === 'undefined') text = 'undefined';
        text = highlightString(text);
        logOutputRaw(text);
    } catch (e) {
        logError(e.toString());
    }
}
window.onmessage = function(ev) {
    logOutputRaw(`Message: ${highlightString(JSON.stringify(ev.data, refReplacer(), 4))}`);
}

function logInput(text) {
    const input = document.createElement('span');
    input.classList.add('input-line');
    input.textContent = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}

function logInputRaw(text) {
    const input = document.createElement('span');
    input.classList.add('input-line');
    input.innerHTML = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}

function logOutput(text) {
    const input = document.createElement('span');
    input.classList.add('output-line');
    input.textContent = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}

function logOutputRaw(text) {
    const input = document.createElement('span');
    input.classList.add('output-line');
    input.innerHTML = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}

function logWarn(text) {
    const input = document.createElement('span');
    input.classList.add('output-warning');
    input.textContent = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}

function logError(text) {
    const input = document.createElement('span');
    input.classList.add('output-error');
    input.textContent = text;
    document.querySelector('#console').appendChild(input);
    input.scrollIntoView();
}
// From https://stackoverflow.com/a/61749783/15578194
function refReplacer() {
    let m = new Map(),
        v = new Map(),
        init = null;

    return function(field, value) {
        let p = m.get(this) + (Array.isArray(this) ? `[${field}]` : '.' + field);
        let isComplex = value === Object(value)

        if (isComplex) m.set(value, p);

        let pp = v.get(value) || '';
        let path = p.replace(/undefined\.\.?/, '');
        let val = pp ? `#REF:${pp[0]=='[' ? '$':'$.'}${pp}` : value;

        !init ? (init = value) : (val === init ? val = "#REF:$" : 0);
        if (!pp && isComplex) v.set(value, path);

        return val;
    }
}
var oldlog = console.log;
var olderror = console.error;
var oldwarn = console.warn;
console.log = function(text) {
    oldlog(text);
    logOutput(text);
}
console.warn = function(text) {
    oldwarn(text);
    logWarn(text);
}
console.error = function(text) {
    olderror(text);
    logError(text);
}

function moveTo(x, y) {
    const x0 = currentPos[0];
    const y0 = currentPos[1];
    currentPos[0] = x;
    currentPos[1] = y;
    document.querySelector('#cursor').style.left = `${x}px`;
    document.querySelector('#cursor').style.top = `calc(19.3333333px + ${y}px)`;
    if (drawWhenMoving) {
        hist.push(drawing.line(x0, y0, x, y).stroke({ width: 1, color: backColor }));
    }
    return `Moved to [${x}, ${y}]`;
}
function fwd(units) {
    const degrees = currentPos[2] - 90;
    const rad = degrees / 180 * Math.PI;
    moveTo(currentPos[0] + units * (Math.cos(rad)), currentPos[1] + units * Math.sin(rad));
}
function bwd(units) {
    return fwd(-units);
}
function rotateTo(degrees) {
    document.querySelector('#cursor').style.transform = `rotate(${degrees}${rotateUnits})`;
    currentPos[2] = degrees;
    return `Rotated to ${degrees}${rotateUnits}`;
}
function rotate(degrees) {
    currentPos[2] += degrees;
    document.querySelector('#cursor').style.transform = `rotate(${currentPos[2]}${rotateUnits})`;
    return `Rotated to ${currentPos[2]}${rotateUnits}`;
}
function highlightString(text) {
    return hljs.highlight(text, {language: 'javascript'}).value;
}
const penUp = () => drawWhenMoving = false;
const penDown = () => drawWhenMoving = true;