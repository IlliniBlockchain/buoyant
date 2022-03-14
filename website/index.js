// Script for changing background color based on scroll position & speed

// Since eventListener can fire very fast, it's recommended to use animation frame to control
// the FPS, ie. update the window just enough to have minimal delay & stay efficient
const requestAnimationFrame = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.msRequestAnimationFrame
    || window.oRequestAnimationFrame
    || function(callback){ setTimeout(callback, 0) };

// starting RGB
const [sr, sg, sb] = [4, 113, 166]; // alt [88, 209, 251]

// ending RGB
const [er, eg, eb] = [0, 30, 44]; // alt [0, 0, 0]

// duration RGB (how much to change in total from current scroll position)
const [dr, dg, db] = [er - sr, eg - sg, eb - sb];

// global variables
let ticking = false; // for controlling requestAnimationFrame (MUST INITIALIZE to `false`)

function getScrollPercent(scrollPos) {
    const { documentElement: h, body: b } = document;
    const perc = (scrollPos || b.scrollTop) / ((h.scrollHeight || b.scrollHeight ) - h.clientHeight);
    return Math.sqrt(perc); // makes the scroll darkness get darker faster
}

function updateBgColor(scrollPos) {
    const perc = Math.min(Math.max(0.0001, getScrollPercent(scrollPos)), 1); // total scrolled %
    // new RGB
    const [r, g, b] = [sr + dr * perc, sg + dg * perc, sb + db * perc].map(Math.round);
    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

// listen to scroll
document.addEventListener('scroll', function(e) {
    if (ticking) return;
    window.requestAnimationFrame(() => {
        updateBgColor(window.scrollY);
        ticking = false;
    });
    ticking = true;
});

// initial call
updateBgColor(window.scrollY);