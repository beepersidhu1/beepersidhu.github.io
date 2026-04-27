/* ============================================================
   ZOOL 401 – Invertebrate Zoology
   script.js
   ============================================================ */

/* ============================================================
   Header & Title System — How It Works
   ============================================================
   Here's a clear breakdown of how the header and title system
   works, so you can replicate it for another class:

   HTML Structure
   ──────────────
   There are three pieces working together:
   • <header> — the fixed bar that starts full-screen and
     shrinks as you scroll
   • .header-titles — a flex column inside the header holding
     <h1> (course name) and <h2> (course code)
   • #header-toggle — a small circular button (▲/▼) in the
     top-right corner to manually collapse the header once
     it's been scrolled to compact size

   CSS
   ───
   The header starts at height: 100vh (full viewport height),
   centered both ways. The JS then overrides this height inline
   as you scroll. There's also a .header-hidden class that
   forces height: 0 when the user clicks the toggle button to
   fully hide the header.

   Both font sizes are responsive via clamp()/min(), but JS
   overrides them dynamically as you scroll.

   JavaScript (initShrinkingHeader)
   ─────────────────────────────────
   This is the core mechanism — it's a scroll-driven lerp
   (linear interpolation). Here's what happens:

   • On page load, it reads the natural font sizes from CSS
     as h1Max and h2Max
   • It also sets hard minimums: H1_MIN = 20px and H2_MIN = 12px
   • On every scroll event, it calculates progress — a value
     from 0 (at the top, full-height hero) to 1 (scrolled down,
     compact 64px bar)
   • It uses lerp(a, b, t) to smoothly interpolate the height,
     font sizes, letter-spacing, gap, background opacity, blur,
     and border color between their hero and compact values
   • Light mode and dark mode each have their own background
     color targets in the lerp
   • The toggle button adds a manual hide on top: it only
     becomes visible once you've scrolled to the compact state
     (atTop = true), and clicking it collapses the header to
     height: 0 via header-hidden.
   ============================================================ */

// ── Mode Toggle ──────────────────────────────────────────────

const modeToggle    = document.getElementById('mode-toggle');
const body          = document.body;
const modeIndicator = document.getElementById('mode-indicator');
const labelLearning = document.getElementById('label-learning');
const labelTesting  = document.getElementById('label-testing');

let isTestingMode    = false;
let answersChecked   = false;

function applyMode(isTesting) {
  isTestingMode  = isTesting;
  answersChecked = false;

  // Reset check-answer button
  const checkBtn = document.getElementById('check-answer-btn');
  if (checkBtn) {
    checkBtn.classList.remove('checked');
    checkBtn.disabled = false;
  }

  if (isTesting) {
    body.classList.remove('learning-mode');
    body.classList.add('testing-mode');
    modeIndicator.textContent = 'Testing Mode';
    labelLearning.classList.remove('active');
    labelTesting.classList.add('active');
  } else {
    body.classList.remove('testing-mode');
    body.classList.add('learning-mode');
    modeIndicator.textContent = 'Learning Mode';
    labelLearning.classList.add('active');
    labelTesting.classList.remove('active');
  }

  // Re-render the tree, section subtrees, and summary table for the new mode
  renderTree();
  renderAllSectionTrees();
  renderSummaryTable();
  renderPlatyhelminthesContent();
  renderNematodaContent();
  renderSymbiosisContent();

  // Refresh header colours for the new mode
  if (typeof window._updateHeader === 'function') window._updateHeader();
}

modeToggle.addEventListener('change', () => {
  applyMode(modeToggle.checked);
});

// ── Check Answer ─────────────────────────────────────────────

function checkAnswers() {
  if (answersChecked) return;
  answersChecked = true;

  const checkBtn = document.getElementById('check-answer-btn');
  if (checkBtn) {
    checkBtn.classList.add('checked');
    checkBtn.disabled = true;
  }

  document.querySelectorAll('.clade-input').forEach(input => {
    const wrapper  = input.closest('.clade-test-node');
    const answer   = input.dataset.answer || '';
    const userVal  = input.value.trim();

    // Disable the input
    input.disabled = true;

    // Skip peeked nodes – they were revealed via right-click, don't grade them
    if (wrapper.classList.contains('peeked')) return;

    // Grade only non-blank answers
    if (userVal !== '') {
      if (userVal.toLowerCase() === answer.toLowerCase()) {
        wrapper.classList.add('correct');
      } else {
        wrapper.classList.add('wrong');
        // Show the correct answer beneath the wrong input
        const reveal = wrapper.querySelector('.clade-reveal-label');
        if (reveal) reveal.style.display = 'block';
      }
    }

    // Always reveal common name (if present)
    const commonNameEl = wrapper.querySelector('.clade-common-name');
    if (commonNameEl) commonNameEl.classList.remove('hidden-until-checked');
  });

  // ── Grade classification table selects ───────────────────────
  document.querySelectorAll('.class-info-select').forEach(select => {
    const answer  = select.dataset.answer || '';
    const userVal = select.value;
    const tdInfo  = select.closest('.class-info');

    // Disable the select
    select.disabled = true;

    const isCorrect = answer !== '' && userVal.toLowerCase() === answer.toLowerCase();
    const isWrong   = !isCorrect; // blank or wrong

    if (isCorrect) {
      tdInfo.classList.add('info-correct');
    } else {
      tdInfo.classList.add('info-wrong');
      // Show the reveal label so they can see the right answer
      const reveal = tdInfo.querySelector('.class-reveal-answer');
      if (reveal) reveal.classList.add('visible');
    }
  });

  // ── Grade cloze selects (testable text paragraphs) ──────────
  document.querySelectorAll('.cloze-select').forEach(select => {
    const answer  = select.dataset.answer || '';
    const userVal = select.value;
    const item    = select.closest('.cloze-item');

    select.disabled = true;

    if (userVal === '') {
      // Blank – reveal the correct answer so the student isn't left hanging
      const reveal = item ? item.querySelector('.cloze-reveal') : null;
      if (reveal) reveal.classList.add('visible');
      return;
    }

    if (userVal === answer) {
      select.classList.add('cloze-correct');
    } else {
      select.classList.add('cloze-wrong');
      const reveal = item ? item.querySelector('.cloze-reveal') : null;
      if (reveal) reveal.classList.add('visible');
    }
  });

  // ── Grade topic table inputs (anatomy structure fill-in, image labels) ───
  document.querySelectorAll('.topic-table-input').forEach(input => {
    const answer  = input.dataset.answer || '';
    const userVal = input.value.trim();
    const cell    = input.closest('.table-structure-cell, .image-label');

    input.disabled = true;

    if (userVal === '') return; // blank – leave neutral

    if (userVal.toLowerCase() === answer.toLowerCase()) {
      if (cell) cell.classList.add('table-cell-correct');
    } else {
      if (cell) cell.classList.add('table-cell-wrong');
      const reveal = cell ? cell.querySelector('.topic-table-reveal') : null;
      if (reveal) reveal.classList.add('visible');
    }
  });
}

document.getElementById('check-answer-btn').addEventListener('click', checkAnswers);

// applyMode is called after DOM sections exist (see bottom of file)


// ── Cladistics Tree ──────────────────────────────────────────
//
// The tree is defined as a nested data structure.
// Each node has:
//   id       – matches the id of a <section class="topic-section"> (if it exists)
//   label    – text shown on the node
//   children – array of child nodes (empty = leaf)
//
// Add nodes here as content sections are created.

// ── Cladistics Tree Data ─────────────────────────────────────
//
// Each node has:
//   id             – matches the id of a <section class="topic-section"> (if it exists)
//   label          – text shown in the node box
//   phylumOrHigher – true  → phylum rank or above; parent starts EXPANDED by default
//                    false → below phylum; parent starts COLLAPSED, node hidden until toggled
//   unimportant    – true → lighter italic style; default false
//   children       – array of child nodes

const CLADE_TREE = {
  id: null, label: 'Animalia', phylumOrHigher: true,
  children: [
    { id: null, label: 'Porifera',   phylumOrHigher: true, children: [] },
    { id: null, label: 'Ctenophora', phylumOrHigher: true, children: [] },
    {
      id: null, label: 'Parahoxzoa', phylumOrHigher: true,
      children: [
        { id: null, label: 'Cnidaria', phylumOrHigher: true, children: [] },
        {
          id: null, label: 'Bilateria', phylumOrHigher: true,
          children: [
        {
          id: null, label: 'Nephrozoa', phylumOrHigher: true,
          children: [
            {
              id: null, label: 'Deuterostomia', phylumOrHigher: true,
              children: [
                {
                  id: null, label: 'Ambulacraria', phylumOrHigher: true,
                  children: [
                    {
                      id: 'echinodermata', label: 'Echinodermata', phylumOrHigher: true,
                      children: [
                        { id: null, label: 'Crinoidea', commonName: 'Feather Stars, Sea Lilies', phylumOrHigher: false, children: [] },
                        {
                          id: null, label: 'Eleutherozoa', unimportant: true, phylumOrHigher: false,
                          children: [
                            {
                              id: null, label: 'Echinozoa', phylumOrHigher: false,
                              children: [
                                { id: null, label: 'Holothuroidea', commonName: 'Sea Cucumbers',       phylumOrHigher: false, children: [] },
                                { id: null, label: 'Echinoidea',    commonName: 'Sea Urchins',         phylumOrHigher: false, children: [] }
                              ]
                            },
                            {
                              id: null, label: 'Asterozoa', phylumOrHigher: false,
                              children: [
                                { id: null, label: 'Ophiuroidea', commonName: 'Brittle & Basket Stars', phylumOrHigher: false, children: [] },
                                { id: null, label: 'Asteroidea',  commonName: 'Sea Stars',              phylumOrHigher: false, children: [] }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    { id: null,            label: 'Hemichordata',  phylumOrHigher: true, children: [] }
                  ]
                },
                {
                  id: 'chordata', label: 'Chordata', phylumOrHigher: true,
                  children: [
                    { id: null, label: 'Cephalochordata', commonName: 'Lancelets',  phylumOrHigher: true, children: [] },
                    {
                      id: null, label: 'Olfactores', unimportant: true, phylumOrHigher: true,
                      children: [
                        { id: null, label: 'Urochordata', commonName: 'Tunicates', phylumOrHigher: true, children: [] },
                        { id: null, label: 'Vertebrata',  phylumOrHigher: true, children: [] }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              id: null, label: 'Protostomia', phylumOrHigher: true,
              children: [
                {
                  id: null, label: 'Ecdysozoa', phylumOrHigher: true,
                  children: [
                    {
                      id: null, label: 'Nematoida', phylumOrHigher: true,
                      children: [
                        { id: 'nematoda', label: 'Nematoda',     phylumOrHigher: true, children: [] },
                        { id: null,       label: 'Nematomorpha', phylumOrHigher: true, children: [] }
                      ]
                    },
                    {
                      id: 'panarthropoda', label: 'Panarthropoda', phylumOrHigher: true,
                      children: [
                        {
                          id: null, label: 'Antennopoda', unimportant: true, phylumOrHigher: true,
                          children: [
                            {
                              id: null, label: 'Arthropoda', phylumOrHigher: true,
                              children: [
                                {
                                id: null, label: 'Chelicerata', phylumOrHigher: false,
                                children: [
                                  { id: null, label: 'Pycnogonia', commonName: 'Sea Spiders', phylumOrHigher: false, children: [] },
                                  {
                                    id: null, label: 'Euchelicerata', phylumOrHigher: false,
                                    children: [
                                      { id: null, label: 'Xiphosura', commonName: 'Horseshoe Crabs', phylumOrHigher: false, children: [] },
                                      {
                                        id: null, label: 'Arachnida', phylumOrHigher: false,
                                        children: [
                                          { id: null, label: 'Araneae', commonName: 'Spiders', phylumOrHigher: false, children: [] },
                                          {
                                            id: null, label: 'Arachnopulmonata', unimportant: true, phylumOrHigher: false,
                                            children: [
                                              { id: null, label: 'Scorpiones', commonName: 'Scorpions',     phylumOrHigher: false, children: [] },
                                              { id: null, label: 'Acari',      commonName: 'Mites, Ticks',  phylumOrHigher: false, children: [] }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              },
                                {
                                  id: null, label: 'Mandibulata', phylumOrHigher: false,
                                  children: [
                                    {
                                      id: null, label: 'Myriapoda', phylumOrHigher: false,
                                      children: [
                                        { id: null, label: 'Chilopoda',  commonName: 'Centipedes', phylumOrHigher: false, children: [] },
                                        { id: null, label: 'Diplopoda',  commonName: 'Millipedes', phylumOrHigher: false, children: [] }
                                      ]
                                    },
                                    {
                                      id: null, label: 'Pancrustaea', phylumOrHigher: true,
                                      children: [
                                        {
                                          id: null, label: 'Altocrustacea', phylumOrHigher: false,
                                          children: [
                                            {
                                              id: null, label: 'Allotriocarida', phylumOrHigher: false,
                                              children: [
                                                { id: null, label: 'Branchiopoda', phylumOrHigher: false, children: [] },
                                                {
                                                  id: null, label: 'Labiocarida', unimportant: true, phylumOrHigher: false,
                                                  children: [
                                                    {
                                                      id: null, label: 'Hexapoda', phylumOrHigher: false,
                                                      children: [
                                                        { id: null, label: 'Insecta', commonName: 'Insects', phylumOrHigher: false, children: [] }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              id: null, label: 'Multicrustacea', phylumOrHigher: false,
                                              children: [
                                                { id: null, label: 'Copepoda', phylumOrHigher: false, children: [] },
                                                {
                                                  id: null, label: 'Malacostraca', phylumOrHigher: false,
                                                  children: [
                                                    {
                                                      id: null, label: 'Eumalacostraca', phylumOrHigher: false,
                                                      children: [
                                                        {
                                                          id: null, label: 'Peracardia', phylumOrHigher: false,
                                                          children: [
                                                            { id: null, label: 'Isopoda',   phylumOrHigher: false, children: [] },
                                                            { id: null, label: 'Amphipoda', phylumOrHigher: false, children: [] }
                                                          ]
                                                        },
                                                        {
                                                          id: null, label: 'Eucarida', phylumOrHigher: false,
                                                          children: [
                                                            { id: null, label: 'Decapoda',     phylumOrHigher: false, children: [] },
                                                            { id: null, label: 'Euphausiacea', commonName: 'Krill', phylumOrHigher: false, children: [] }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    { id: null, label: 'Stomatopoda', commonName: 'Mantis Shrimp', phylumOrHigher: false, children: [] }
                                                  ]
                                                },
                                                {
                                                  id: null, label: 'Thecostraca', unimportant: true, phylumOrHigher: false,
                                                  children: [
                                                    { id: null, label: 'Cirripedia', commonName: 'Barnacles', phylumOrHigher: false, children: [] }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          id: null, label: 'Oligostraca', phylumOrHigher: false,
                                          children: [
                                            { id: null, label: 'Ostracoda', phylumOrHigher: false, children: [] }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            { id: null, label: 'Onychophora', phylumOrHigher: true, children: [] }
                          ]
                        },
                        { id: null, label: 'Tardigrada', phylumOrHigher: true, children: [] }
                      ]
                    },
                    {
                      id: null, label: 'Scalidophora', phylumOrHigher: true,
                      children: [
                        { id: null, label: 'Kinorhyncha', phylumOrHigher: true, children: [] },
                        { id: null, label: 'Loricifera',  phylumOrHigher: true, children: [] },
                        { id: null, label: 'Priapulida',  phylumOrHigher: true, children: [] }
                      ]
                    }
                  ]
                },
                {
                  id: null, label: 'Spiralia', phylumOrHigher: true,
                  children: [
                    {
                      id: null, label: 'Chaetognathifera', unimportant: true, phylumOrHigher: true,
                      children: [
                        { id: null, label: 'Chaetognatha', phylumOrHigher: true, children: [] },
                        {
                          id: null, label: 'Gnathifera', phylumOrHigher: true,
                          children: [
                            { id: null, label: 'Gnathostomulida', phylumOrHigher: true, children: [] },
                            { id: null, label: 'Micrognathozoa',  phylumOrHigher: true, children: [] },
                            { id: null, label: 'Rotifera',        phylumOrHigher: true, children: [] }
                          ]
                        }
                      ]
                    },
                    { id: null, label: 'Dicyemida', phylumOrHigher: true, children: [] },
                    {
                      id: null, label: 'Platytrochozoa', phylumOrHigher: true,
                      children: [
                        {
                          id: null, label: 'Lophotrochozoa', phylumOrHigher: true,
                          children: [
                            {
                              id: 'annelida', label: 'Annelida', phylumOrHigher: true,
                              children: [
                                { id: null, label: 'Polychaeta', phylumOrHigher: false, children: [] },
                                {
                                  id: null, label: 'Clitellata', phylumOrHigher: false,
                                  children: [
                                    { id: null, label: 'Oligochaeta', phylumOrHigher: false, children: [] },
                                    { id: null, label: 'Hirudinea', commonName: 'Leeches', phylumOrHigher: false, children: [] }
                                  ]
                                }
                              ]
                            },
                            {
                              id: null, label: 'Lophophorata', phylumOrHigher: true,
                              children: [
                                { id: 'brachiopoda', label: 'Brachiopoda', phylumOrHigher: true, children: [] },
                                { id: 'bryozoa',     label: 'Bryozoa',     phylumOrHigher: true, children: [] },
                                { id: null,          label: 'Phoronida',   phylumOrHigher: true, children: [] }
                              ]
                            },
                            { id: null,       label: 'Mollusca',  phylumOrHigher: true, children: [] },
                            { id: 'nemertea', label: 'Nemertea',  phylumOrHigher: true, children: [] }
                          ]
                        },
                        {
                          id: null, label: 'Rouphozoa', phylumOrHigher: true,
                          children: [
                            { id: null,              label: 'Gastrotrichia',  phylumOrHigher: true, children: [] },
                            {
                              id: 'platyhelminthes', label: 'Platyhelminthes', commonName: 'Flat Worms', phylumOrHigher: true,
                              children: [
                                { id: null, label: 'Turbellaria', phylumOrHigher: false, children: [] },
                                { id: null, label: 'Trematoda',   phylumOrHigher: false, children: [] },
                                { id: null, label: 'Monogenea',   phylumOrHigher: false, children: [] },
                                { id: null, label: 'Cestoda',     phylumOrHigher: false, children: [] }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: null, label: 'Xenacoelomorpha', phylumOrHigher: true,
          children: []
        }
          ]
        }
      ]
    }
  ]
};

// ── Basal Clade Visibility ────────────────────────────────────
//
// basalHidden  – when true, hides Porifera, Ctenophora, and Cnidaria (via
//                Parahoxzoa) and draws a dashed bypass line from Animalia
//                directly to Bilateria.  The bypass line and the connector
//                above Bilateria are both clickable to toggle.
//
// isFullscreenTree – when true the main tree renders with allExpanded = true:
//                    no bypass, no sub-phylum collapsing.  Set/cleared by the
//                    fullscreen button and the Escape key.

let basalHidden      = true;
let isFullscreenTree = false;

// Walk the CLADE_TREE and return the first node whose label matches.
function findNodeByLabel(node, label) {
  if (node.label === label) return node;
  for (const child of (node.children || [])) {
    const found = findNodeByLabel(child, label);
    if (found) return found;
  }
  return null;
}

// allExpanded = true → skip the collapse-by-default behaviour (used in section subtrees)
// isRoot     = true → treat this node as a pre-filled root (used for section subtree roots)
function buildTree(node, testMode, allExpanded = false, isRoot = false) {
  const li = document.createElement('li');
  let nodeEl;

  if (testMode) {
    // ── Testing Mode ──────────────────────────────────────────

    if (node.label === 'Animalia' || isRoot) {
      // Root is always pre-filled and labelled
      nodeEl = document.createElement('div');
      nodeEl.classList.add('clade-node');
      nodeEl.textContent = node.label;

    } else if (node.unimportant) {
      // Unimportant clades: show a "-" placeholder, not tested
      nodeEl = document.createElement('div');
      nodeEl.classList.add('clade-node', 'unimportant', 'test-dash');
      nodeEl.textContent = '-';

    } else {
      // Regular testable node: text input box
      nodeEl = document.createElement('div');
      nodeEl.classList.add('clade-test-node');

      const input = document.createElement('input');
      input.type = 'text';
      input.classList.add('clade-input');
      input.dataset.answer = node.label;
      input.placeholder = '?';
      input.autocomplete = 'off';
      input.spellcheck = false;
      nodeEl.appendChild(input);

      // Reveal label (shown after check for wrong answers, or on right-click peek)
      const revealLabel = document.createElement('div');
      revealLabel.classList.add('clade-reveal-label');
      revealLabel.textContent = node.label;
      nodeEl.appendChild(revealLabel);

      // Right-click → peek: reveal the clade name without grading it
      nodeEl.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (answersChecked) return;
        nodeEl.classList.add('peeked');
        revealLabel.style.display = 'block';
      });
    }

  } else {
    // ── Learning Mode ─────────────────────────────────────────
    nodeEl = document.createElement('div');
    nodeEl.classList.add('clade-node');
    if (node.unimportant) nodeEl.classList.add('unimportant');
    nodeEl.textContent = node.label;

    const targetSection = node.id ? document.getElementById(node.id) : null;
    if (targetSection) {
      nodeEl.classList.add('clickable');
      nodeEl.setAttribute('title', `Go to ${node.label}`);
      nodeEl.addEventListener('click', () => {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ── Bilateria bypass trigger ──────────────────────────────────
  // An invisible clickable overlay that sits on top of the ::after
  // connector line above the Bilateria node.  Clicking it toggles
  // basalHidden in both bypass-mode (expand) and full-tree mode (collapse).
  // Only added in the main tree, not in section subtrees or fullscreen.
  if (!allExpanded && !isRoot && node.label === 'Bilateria') {
    const trigger = document.createElement('div');
    trigger.classList.add('bilateria-basal-trigger');
    trigger.title = basalHidden
      ? 'Click to show basal clades'
      : 'Click to hide basal clades';
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      basalHidden = !basalHidden;
      renderTree();
    });
    li.appendChild(trigger);
  }

  li.appendChild(nodeEl);

  // Common name label – learning mode only, rendered below the node box
  if (!testMode && node.commonName) {
    const cn = document.createElement('div');
    cn.classList.add('clade-common-name');
    cn.innerHTML = `Common Name &rarr; ${node.commonName}`;
    li.appendChild(cn);
  }

  if (node.children && node.children.length > 0) {

    // ── Animalia: basal bypass vs full-tree ──────────────────────
    if (!allExpanded && node.label === 'Animalia') {

      if (basalHidden) {
        // Draw a dashed bypass line and render only Bilateria beneath Animalia
        const bypassToggle = document.createElement('div');
        bypassToggle.classList.add('basal-bypass-toggle');
        bypassToggle.title = 'Click to show basal clades (Porifera, Ctenophora, Cnidaria…)';
        bypassToggle.addEventListener('click', () => {
          basalHidden = false;
          renderTree();
        });
        li.appendChild(bypassToggle);

        const ul = document.createElement('ul');
        const bilateriaNode = findNodeByLabel(node, 'Bilateria');
        if (bilateriaNode) {
          ul.appendChild(buildTree(bilateriaNode, testMode, allExpanded));
        }
        li.appendChild(ul);

      } else {
        // Full tree: repurpose the Animalia toggle to re-hide basal clades
        const toggle = document.createElement('div');
        toggle.classList.add('tree-toggle', 'basal-expand-toggle');
        toggle.title = 'Click to hide basal clades';
        toggle.addEventListener('click', () => {
          basalHidden = true;
          renderTree();
        });
        li.appendChild(toggle);

        const ul = document.createElement('ul');
        node.children.forEach(child => ul.appendChild(buildTree(child, testMode, allExpanded)));
        li.appendChild(ul);
      }

    } else {
      // ── Normal collapse / expand ────────────────────────────────
      const hasSubPhylumChild = node.children.some(c => c.phylumOrHigher === false);
      if (hasSubPhylumChild && !allExpanded) li.classList.add('collapsed');

      const toggle = document.createElement('div');
      toggle.classList.add('tree-toggle');
      toggle.setAttribute('title', 'Click to collapse / expand');
      toggle.addEventListener('click', () => li.classList.toggle('collapsed'));
      li.appendChild(toggle);

      const ul = document.createElement('ul');
      node.children.forEach(child => ul.appendChild(buildTree(child, testMode, allExpanded)));
      li.appendChild(ul);
    }
  }

  return li;
}

function renderTree() {
  const container = document.getElementById('cladistics-tree');
  if (!container) return;
  container.innerHTML = '';

  const ul = document.createElement('ul');
  ul.classList.add('clade-tree-root');
  // allExpanded = true in fullscreen → no basal bypass, no sub-phylum collapsing
  ul.appendChild(buildTree(CLADE_TREE, isTestingMode, isFullscreenTree));
  container.appendChild(ul);
}

// ── Section Subtrees ─────────────────────────────────────────
//
// Each topic section with a matching node in CLADE_TREE gets
// its own mini cladistic tree. All clades are expanded by default.

function findNodeById(node, targetId) {
  if (!targetId) return null;
  if (node.id === targetId) return node;
  for (const child of (node.children || [])) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}

function renderAllSectionTrees() {
  TOPICS.forEach(topic => {
    const container = document.getElementById(`section-tree-${topic.id}`);
    if (!container) return;

    const cladeNode = findNodeById(CLADE_TREE, topic.id);
    if (!cladeNode) return;

    container.innerHTML = '';
    const ul = document.createElement('ul');
    ul.classList.add('clade-tree-root', 'section-tree-root');
    // allExpanded = true → all children visible, none collapsed by default
    // isRoot = true → section root node is pre-filled in testing mode
    ul.appendChild(buildTree(cladeNode, isTestingMode, true, true));
    container.appendChild(ul);
  });
}

// ── Summary Table ────────────────────────────────────────────
//
// SUMMARY_COLUMNS defines the four data columns.
//   id         – unique key used for DOM data attributes
//   title      – header text
//   categories – ordered list of Classification-table row labels.
//                Every row in the column shares the same category list.
//                Leave empty until categories are specified.
//
// SUMMARY_ROWS defines the clade rows.
//   clade      – display name
//   sectionId  – id of the corresponding <section>; if it exists the
//                clade name becomes a clickable link that scrolls to it.

const SUMMARY_COLUMNS = [
  { id: 'circulation',  title: 'Circulation',  categories: ['Open or Closed'] },
  { id: 'respiration',  title: 'Respiration',  categories: [] },
  { id: 'reproduction', title: 'Reproduction', categories: ['Sex System'] },
  { id: 'feeding',      title: 'Feeding',      categories: [] },
  { id: 'excretion',    title: 'Excretion',    categories: [] },
];

const SUMMARY_ROWS = [
  { clade: 'Annelida',        sectionId: 'annelida'        },
  { clade: 'Platyhelminthes', sectionId: 'platyhelminthes' },
  { clade: 'Nematoda',        sectionId: 'nematoda'        },
  { clade: 'Panarthropoda',   sectionId: 'panarthropoda'   },
  { clade: 'Echinodermata',   sectionId: 'echinodermata'   },
  { clade: 'Chordata',        sectionId: 'chordata'        },
];

// All columns start collapsed
const collapsedCols = new Set(SUMMARY_COLUMNS.map(c => c.id));

// ── Cell Data ────────────────────────────────────────────────
//
// Stores per-clade values for each column × category intersection.
// Each entry is an array of { value, subclade? } objects.
// A single-element array = plain row (no subclade label).
// A multi-element array = subclade rows: the category cell gets
// rowspan="n" and each info cell shows a small subclade label.

const CELL_DATA = {
  reproduction: {
    Platyhelminthes: {
      'Sex System': [{ value: 'Hermaphroditic' }]
    },
    Nematoda: {
      'Sex System': [{ value: 'Gonochoristic' }]
    },
    Panarthropoda: {
      'Sex System': [{ value: 'Gonochoristic' }]
    },
    Annelida: {
      'Sex System': [
        { subclade: 'Clitellata', value: 'Hermaphroditic' },
        { subclade: 'Polychaeta', value: 'Gonochoristic' }
      ]
    },
    Echinodermata: {
      'Sex System': [
        { subclade: 'Asteroids',   value: 'Gonochoristic' },
        { subclade: 'Echinoidea',  value: 'Gonochoristic' },
        { subclade: 'Ophiuroids',  value: 'Hermaphroditic' }
      ]
    },
    Chordata: {
      'Sex System': [
        { subclade: 'Tunicates',       value: 'Hermaphroditic' },
        { subclade: 'Cephalochordata', value: 'Gonochoristic' }
      ]
    }
  }
};

// Collect all unique values for a given column × category across all clades.
// Used to populate the testing-mode select dropdowns.
function getAllValues(colId, category) {
  const colData = CELL_DATA[colId];
  if (!colData) return [];
  const values = new Set();
  Object.values(colData).forEach(cladeData => {
    const entries = cladeData[category];
    if (entries) {
      entries.forEach(e => { if (e.value) values.add(e.value); });
    }
  });
  return Array.from(values).sort();
}

// Build the Classification mini-table for a given column + clade.
// Returns a <table> element, or null if the column has no categories yet.
function buildClassificationTable(col, cladeName, testMode) {
  if (!col.categories || col.categories.length === 0) return null;

  const table = document.createElement('table');
  table.classList.add('classification-table');

  const tbody = document.createElement('tbody');

  col.categories.forEach(cat => {
    // Resolve per-clade entries (fall back to a single blank entry)
    const colData   = CELL_DATA[col.id];
    const cladeData = colData && colData[cladeName];
    const entries   = (cladeData && cladeData[cat]) ? cladeData[cat] : [{ value: '' }];

    entries.forEach((entry, i) => {
      const tr = document.createElement('tr');

      // Category cell: only on the first row; use rowspan for multi-entry
      if (i === 0) {
        const tdCat = document.createElement('td');
        tdCat.classList.add('class-category');
        tdCat.textContent = cat;
        if (entries.length > 1) tdCat.rowSpan = entries.length;
        tr.appendChild(tdCat);
      }

      // Info cell
      const tdInfo = document.createElement('td');
      tdInfo.classList.add('class-info');

      // Subclade label – always visible in both modes
      if (entry.subclade) {
        const subLabel = document.createElement('div');
        subLabel.classList.add('subclade-label');
        subLabel.textContent = entry.subclade;
        tdInfo.appendChild(subLabel);
      }

      if (testMode) {
        // ── Testing mode: show a select dropdown ──────────────────
        const allValues = getAllValues(col.id, cat);

        const select = document.createElement('select');
        select.classList.add('class-info-select');
        select.dataset.answer = entry.value;

        // Blank / prompt option
        const blankOpt = document.createElement('option');
        blankOpt.value = '';
        blankOpt.textContent = '—';
        select.appendChild(blankOpt);

        // One option per possible value
        allValues.forEach(val => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          select.appendChild(opt);
        });

        tdInfo.appendChild(select);

        // Reveal label – shown after Check Answer on wrong / blank cells
        const revealSpan = document.createElement('span');
        revealSpan.classList.add('class-reveal-answer');
        revealSpan.textContent = entry.value;
        tdInfo.appendChild(revealSpan);

      } else {
        // ── Learning mode: plain text ─────────────────────────────
        const valueSpan = document.createElement('span');
        valueSpan.classList.add('info-value');
        valueSpan.textContent = entry.value;
        tdInfo.appendChild(valueSpan);
      }

      tr.appendChild(tdInfo);
      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  return table;
}

// Build the full cell content wrapper (classification table + optional text)
function buildCellContent(col, cladeName, testMode) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('cell-content');

  const classTable = buildClassificationTable(col, cladeName, testMode);
  if (classTable) wrapper.appendChild(classTable);

  // General text section – hidden via CSS until populated (never shown in testing mode)
  const textDiv = document.createElement('div');
  textDiv.classList.add('cell-text');
  wrapper.appendChild(textDiv);

  return wrapper;
}

// Toggle a column between expanded and collapsed
function toggleSummaryColumn(colId) {
  if (collapsedCols.has(colId)) {
    collapsedCols.delete(colId);
  } else {
    collapsedCols.add(colId);
  }
  const isCollapsed = collapsedCols.has(colId);

  // Update header
  const th = document.querySelector(`#summary-table th[data-col-id="${colId}"]`);
  if (th) th.classList.toggle('col-collapsed', isCollapsed);

  // Update every data cell in this column
  document.querySelectorAll(`#summary-table td[data-col-id="${colId}"]`).forEach(td => {
    td.classList.toggle('col-collapsed', isCollapsed);
  });
}

function renderSummaryTable() {
  const container = document.getElementById('summary-table-container');
  if (!container) return;
  container.innerHTML = '';

  const table = document.createElement('table');
  table.id = 'summary-table';

  // ── thead ──
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // First cell: clade column label
  const thClade = document.createElement('th');
  thClade.classList.add('summary-th-clade');
  thClade.textContent = 'Clade';
  headerRow.appendChild(thClade);

  // One <th> per data column
  SUMMARY_COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.classList.add('summary-col-header');
    th.dataset.colId = col.id;
    if (collapsedCols.has(col.id)) th.classList.add('col-collapsed');
    th.setAttribute('title', 'Click to expand / collapse');

    const titleSpan = document.createElement('span');
    titleSpan.textContent = col.title;

    const chevron = document.createElement('span');
    chevron.classList.add('col-chevron');

    th.appendChild(titleSpan);
    th.appendChild(chevron);
    th.addEventListener('click', () => toggleSummaryColumn(col.id));
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ── tbody ──
  const tbody = document.createElement('tbody');

  SUMMARY_ROWS.forEach(row => {
    const tr = document.createElement('tr');

    // Clade cell
    const tdClade = document.createElement('td');
    tdClade.classList.add('summary-clade-cell');

    const targetSection = document.getElementById(row.sectionId);
    if (targetSection) {
      const link = document.createElement('span');
      link.classList.add('clade-row-link');
      link.textContent = row.clade;
      link.addEventListener('click', () => {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tdClade.appendChild(link);
    } else {
      tdClade.textContent = row.clade;
    }

    tr.appendChild(tdClade);

    // Data cells – one per column
    SUMMARY_COLUMNS.forEach(col => {
      const td = document.createElement('td');
      td.classList.add('summary-data-cell');
      td.dataset.colId = col.id;
      if (collapsedCols.has(col.id)) td.classList.add('col-collapsed');

      td.appendChild(buildCellContent(col, row.clade, isTestingMode));
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// ── Topic Sections ───────────────────────────────────────────
//
// Topic sections are added here as an array.
// Each entry will generate a <section> with a heading.
// Leave empty until content is specified.

const TOPICS = [
  { id: 'annelida',                 title: 'Annelida' },
  { id: 'nemertea',                 title: 'Nemertea' },
  { id: 'brachiopoda',              title: 'Brachiopoda' },
  { id: 'bryozoa',                  title: 'Bryozoa' },
  { id: 'platyhelminthes',          title: 'Platyhelminthes' },
  { id: 'nematoda',                 title: 'Nematoda' },
  { id: 'panarthropoda',            title: 'Panarthropoda' },
  { id: 'echinodermata',            title: 'Echinodermata' },
  { id: 'chordata',                 title: 'Chordata' },
  { id: 'symbiosis',                title: 'Symbiosis' },
  { id: 'body-plans',               title: 'Body Plans' },
  { id: 'environmental-physiology', title: 'Environmental Physiology' },
];

function renderTopics() {
  const container = document.getElementById('topics-container');
  const placeholder = document.getElementById('topics-placeholder');
  if (!container) return;

  if (TOPICS.length === 0) {
    if (placeholder) placeholder.style.display = 'block';
    return;
  }

  if (placeholder) placeholder.style.display = 'none';

  TOPICS.forEach(topic => {
    const existing = document.getElementById(topic.id);
    if (existing) return; // don't duplicate

    const section = document.createElement('section');
    section.classList.add('topic-section');
    section.id = topic.id;

    const heading = document.createElement('h3');
    heading.textContent = topic.title;
    section.appendChild(heading);

    // Section cladistic subtree – only for topics with a matching clade node
    if (findNodeById(CLADE_TREE, topic.id)) {
      const treeLabel = document.createElement('div');
      treeLabel.classList.add('section-tree-label');
      treeLabel.textContent = 'Cladistic Overview';
      section.appendChild(treeLabel);

      const treeContainer = document.createElement('div');
      treeContainer.classList.add('section-tree-container');
      treeContainer.id = `section-tree-${topic.id}`;
      section.appendChild(treeContainer);
    }

    // Content placeholder
    const p = document.createElement('p');
    p.classList.add('placeholder-text');
    p.textContent = 'Content coming soon.';
    section.appendChild(p);

    container.appendChild(section);
  });
}

// ── Platyhelminthes Content ──────────────────────────────────
//
// TESTING TABLE – Anatomy
// ───────────────────────
// Each entry: { structure: 'Name', description: 'Description text' }
// Separate description lines with \n for multi-line display.
// Learning mode : rows sorted A→Z by structure; both columns plain text.
// Testing mode  : rows shuffled; Structure becomes a text fill-in input.

const PLATYHELMINTHES_ANATOMY = [
  {
    structure:   'Auricle',
    description: 'Location → Anterior End\nAppearance → Rounded Triangular Projections\nFunction → Chemoreception'
  },
  {
    structure:   'Ocelli',
    description: 'Location → Near Anterior End on Dorsal Side\nAppearance → Circular Dark Spots\nFunction → Photoreception'
  }
];

// TESTABLE IMAGE – Excretion
// ──────────────────────────
// Set PLATY_EXCRETION_IMAGE_SRC to the image file path (e.g. 'images/excretion.png').
// Add label objects to PLATYHELMINTHES_EXCRETION_LABELS to overlay testable boxes.
//   Each label: { id: 'unique-id', text: 'Label Text', x: px_from_left, y: px_from_top }
// Learning mode : label boxes show their text.
// Testing mode  : label boxes become blank input fields (user fills in the text).

const PLATY_EXCRETION_IMAGE_SRC = 'Images/ProtonephridiaDiagram.png'; // ← set image path here when ready

// Rectangle labels: { id, text, x, y, width, height }
// x/y = top-left corner in pixels from the image's top-left.
// width/height define the obscuring box size.
const PLATYHELMINTHES_EXCRETION_LABELS = [
  { id: 'ciliary-flame', text: 'Ciliary Flame', x: 48, y: 117, width: 62, height: 44 },
];

// ─────────────────────────────────────────────────────────────

// ── Testable Text (Cloze) ────────────────────────────────────
//
// Parses a string containing {Cloze: Options: opt1, opt2: Answer: ans} tokens.
// Returns an array of DOM nodes ready to be appended to a <p> or similar.
//
// Learning mode : each token becomes a highlighted <span class="cloze-answer">
// Testing mode  : each token becomes an inline <select class="cloze-select">
//                 plus a hidden reveal <span> shown after Check Answer on wrong answers.

function parseClozeText(text, testMode) {
  const nodes = [];
  // Regex: {Cloze: Options: <options>: Answer: <answer>}
  const clozeRegex = /\{Cloze:\s*Options:\s*(.*?):\s*Answer:\s*(.*?)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = clozeRegex.exec(text)) !== null) {
    // Plain text before this token
    if (match.index > lastIndex) {
      nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const optionsRaw = match[1];
    const answer     = match[2].trim();
    const options    = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);

    if (testMode) {
      // Wrapper span so we can apply correct/wrong styles and reveal
      const item = document.createElement('span');
      item.classList.add('cloze-item');

      const select = document.createElement('select');
      select.classList.add('cloze-select');
      select.dataset.answer = answer;

      // Blank prompt option
      const blankOpt = document.createElement('option');
      blankOpt.value       = '';
      blankOpt.textContent = '—';
      select.appendChild(blankOpt);

      options.forEach(opt => {
        const optEl       = document.createElement('option');
        optEl.value       = opt;
        optEl.textContent = opt;
        select.appendChild(optEl);
      });

      item.appendChild(select);

      // Reveal label – shown after Check Answer on wrong / blank
      const reveal = document.createElement('span');
      reveal.classList.add('cloze-reveal');
      reveal.textContent = answer;
      item.appendChild(reveal);

      nodes.push(item);
    } else {
      // Learning mode: show the answer highlighted
      const span       = document.createElement('span');
      span.classList.add('cloze-answer');
      span.textContent = answer;
      nodes.push(span);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push(document.createTextNode(text.slice(lastIndex)));
  }

  return nodes;
}

// Build a <p class="testable-text"> from a cloze string.
function buildTestableTextParagraph(text, testMode) {
  const p = document.createElement('p');
  p.classList.add('testable-text');
  parseClozeText(text, testMode).forEach(node => p.appendChild(node));
  return p;
}

// ─────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSubsectionHeading(text) {
  const h4 = document.createElement('h4');
  h4.classList.add('subsection-heading');
  h4.textContent = text;
  return h4;
}

// Build the Anatomy testing table
function buildAnatomySubsection(testMode) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('subsection');
  wrapper.appendChild(buildSubsectionHeading('Anatomy'));

  const table = document.createElement('table');
  table.classList.add('topic-table');

  // ── Header ──
  const thead      = document.createElement('thead');
  const headerRow  = document.createElement('tr');
  ['Structure', 'Description'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ── Body ──
  // Learning: alphabetical A→Z by structure.  Testing: shuffled.
  const rows = testMode
    ? shuffleArray(PLATYHELMINTHES_ANATOMY)
    : [...PLATYHELMINTHES_ANATOMY].sort((a, b) => a.structure.localeCompare(b.structure));

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');

    // Structure cell
    const tdStruct = document.createElement('td');
    tdStruct.classList.add('table-structure-cell');

    if (testMode) {
      const input = document.createElement('input');
      input.type          = 'text';
      input.classList.add('topic-table-input');
      input.dataset.answer = row.structure;
      input.placeholder   = '?';
      input.autocomplete  = 'off';
      input.spellcheck    = false;
      tdStruct.appendChild(input);

      const reveal = document.createElement('div');
      reveal.classList.add('topic-table-reveal');
      reveal.textContent = row.structure;
      tdStruct.appendChild(reveal);
    } else {
      tdStruct.textContent = row.structure;
    }
    tr.appendChild(tdStruct);

    // Description cell
    const tdDesc = document.createElement('td');
    tdDesc.classList.add('table-description-cell');
    tdDesc.innerHTML = row.description.replace(/\n/g, '<br>');
    tr.appendChild(tdDesc);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

// Build the Excretion subsection with a testable image
function buildExcretionSubsection(testMode) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('subsection');
  wrapper.appendChild(buildSubsectionHeading('Excretion'));

  const imgContainer = document.createElement('div');
  imgContainer.classList.add('testable-image-container');

  if (PLATY_EXCRETION_IMAGE_SRC) {
    const img = document.createElement('img');
    img.src   = PLATY_EXCRETION_IMAGE_SRC;
    img.alt   = 'Platyhelminthes Excretion Diagram';
    img.classList.add('testable-image');
    imgContainer.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.classList.add('image-placeholder');
    ph.textContent = 'Image coming soon — set PLATY_EXCRETION_IMAGE_SRC in script.js';
    imgContainer.appendChild(ph);
  }

  // Overlay testable labels
  PLATYHELMINTHES_EXCRETION_LABELS.forEach(label => {
    const labelEl = document.createElement('div');
    labelEl.classList.add('image-label');
    labelEl.style.left   = label.x      + 'px';
    labelEl.style.top    = label.y      + 'px';
    labelEl.style.width  = label.width  + 'px';
    labelEl.style.height = label.height + 'px';

    if (testMode) {
      // Blank rectangle – user types the label
      labelEl.classList.add('image-label-blank');
      const input = document.createElement('input');
      input.type           = 'text';
      input.classList.add('topic-table-input', 'image-label-input');
      input.dataset.answer = label.text;
      input.placeholder    = '?';
      input.id             = `img-label-${label.id}`;
      input.autocomplete   = 'off';
      input.spellcheck     = false;
      labelEl.appendChild(input);

      const reveal = document.createElement('div');
      reveal.classList.add('topic-table-reveal');
      reveal.textContent = label.text;
      labelEl.appendChild(reveal);
    } else {
      // Learning mode – show the text inside the box
      labelEl.classList.add('image-label-text');
      const span = document.createElement('span');
      span.textContent = label.text;
      labelEl.appendChild(span);
    }

    imgContainer.appendChild(labelEl);
  });

  wrapper.appendChild(imgContainer);
  return wrapper;
}

// Re-render all Platyhelminthes subsections (called on mode change)
function renderPlatyhelminthesContent() {
  const section = document.getElementById('platyhelminthes');
  if (!section) return;

  // Remove existing subsections and placeholders; preserve heading + clade tree elements
  section.querySelectorAll('.placeholder-text, .subsection').forEach(el => el.remove());

  // Subsections in alphabetical order: Anatomy → Excretion
  section.appendChild(buildAnatomySubsection(isTestingMode));
  section.appendChild(buildExcretionSubsection(isTestingMode));
}

// ── Nematoda Content ─────────────────────────────────────────
//
// ANATOMY – Testable Text
// ───────────────────────
// Each entry is a cloze string.  Plain text is shown as-is.
// Tokens: {Cloze: Options: opt1, opt2, …: Answer: correct_answer}
//   Learning mode → answer shown highlighted in-line.
//   Testing mode  → replaced by a dropdown of the given options.

const NEMATODA_ANATOMY_TEXT = [
  'Nematodes have {Cloze: Options: Neither Longitudinal nor Horizontal, Only Longitudinal, Only Horizontal, Longitudinal & Horizontal: Answer: Only Longitudinal} Muscles.',
];

const NEMATODA_LOCOMOTION_TEXT = [
];

function buildNematodaTextSubsection(heading, lines, testMode) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('subsection');
  wrapper.appendChild(buildSubsectionHeading(heading));

  const textSection = document.createElement('div');
  textSection.classList.add('testable-text-section');

  lines.forEach(line => {
    textSection.appendChild(buildTestableTextParagraph(line, testMode));
  });

  wrapper.appendChild(textSection);
  return wrapper;
}

function renderNematodaContent() {
  const section = document.getElementById('nematoda');
  if (!section) return;

  // Remove existing subsections and placeholders; preserve heading + clade tree
  section.querySelectorAll('.placeholder-text, .subsection').forEach(el => el.remove());

  section.appendChild(buildNematodaTextSubsection('Anatomy',    NEMATODA_ANATOMY_TEXT,     isTestingMode));
  section.appendChild(buildNematodaTextSubsection('Locomotion', NEMATODA_LOCOMOTION_TEXT,  isTestingMode));
}

// ── Symbiosis Content ────────────────────────────────────────
//
// Each row: { type, speciesA, speciesB }
// speciesA / speciesB values: '+', '0', or '-'
//
// Learning mode : type shown as plain text; species cells coloured.
// Testing mode  : type becomes a text fill-in; species cells still coloured.

const SYMBIOSIS_DATA = [
  { type: 'Mutualism',    speciesA: '+', speciesB: '+' },
  { type: 'Commensalism', speciesA: '+', speciesB: '0' },
  { type: 'Neutralism',   speciesA: '0', speciesB: '0' },
  { type: 'Amensalism',   speciesA: '0', speciesB: '-' },
  { type: 'Competition',  speciesA: '-', speciesB: '-' },
];

function getSymbiosisClass(symbol) {
  if (symbol === '+') return 'symbiosis-cell-positive';
  if (symbol === '0') return 'symbiosis-cell-neutral';
  return 'symbiosis-cell-negative';
}

function buildSymbiosisSubsection(testMode) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('subsection');

  const table = document.createElement('table');
  table.classList.add('symbiosis-table');

  // Hidden semantic thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Symbiosis Type', 'Species A', 'Species B'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // tbody – shuffled in testing mode
  const tbody = document.createElement('tbody');
  const rows = testMode ? shuffleArray(SYMBIOSIS_DATA) : SYMBIOSIS_DATA;

  rows.forEach(row => {
    const tr = document.createElement('tr');

    // ── Symbiosis Type cell ──
    const tdType = document.createElement('td');
    // Also use table-structure-cell so checkAnswers() grades it automatically
    tdType.classList.add('symbiosis-type-cell', 'table-structure-cell');

    if (testMode) {
      const input = document.createElement('input');
      input.type          = 'text';
      input.classList.add('topic-table-input');
      input.dataset.answer = row.type;
      input.placeholder   = '?';
      input.autocomplete  = 'off';
      input.spellcheck    = false;
      tdType.appendChild(input);

      const reveal = document.createElement('div');
      reveal.classList.add('topic-table-reveal');
      reveal.textContent = row.type;
      tdType.appendChild(reveal);
    } else {
      tdType.textContent = row.type;
    }
    tr.appendChild(tdType);

    // ── Species A & B cells ──
    [row.speciesA, row.speciesB].forEach(symbol => {
      const td = document.createElement('td');
      td.classList.add('symbiosis-species-cell', getSymbiosisClass(symbol));
      td.textContent = symbol;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  // ── Legend ──
  const legend = document.createElement('div');
  legend.classList.add('symbiosis-legend');

  [
    { symbol: '+', label: 'Benefit',    cls: 'badge-positive' },
    { symbol: '0', label: 'No effect',  cls: 'badge-neutral'  },
    { symbol: '−', label: 'Harm',       cls: 'badge-negative' },
  ].forEach(({ symbol, label, cls }) => {
    const item = document.createElement('span');
    item.classList.add('symbiosis-legend-item');

    const badge = document.createElement('span');
    badge.classList.add('symbiosis-legend-badge', cls);
    badge.textContent = symbol;

    item.appendChild(badge);
    item.appendChild(document.createTextNode(' → ' + label));
    legend.appendChild(item);
  });

  wrapper.appendChild(legend);
  return wrapper;
}

function renderSymbiosisContent() {
  const section = document.getElementById('symbiosis');
  if (!section) return;

  section.querySelectorAll('.placeholder-text, .subsection').forEach(el => el.remove());
  section.appendChild(buildSymbiosisSubsection(isTestingMode));
}

// ── Shrinking Hero Header ────────────────────────────────────
//
// Scroll-driven lerp: hero (100vh) → compact (64px) over SCROLL_RANGE px.
// Font sizes, letter-spacing, gap, background opacity, backdrop blur,
// and border colour are all interpolated on every scroll event.
// The #header-toggle button (fixed, top-right) appears once compact and
// lets the user fully collapse (height → 0) or restore the header.

(function initShrinkingHeader() {
  const header    = document.getElementById('site-header');
  const titles    = header.querySelector('.header-titles');
  const h1El      = header.querySelector('h1');
  const h2El      = header.querySelector('h2');
  const indicator = document.getElementById('mode-indicator');
  const toggle    = document.getElementById('header-toggle');
  const mainEl    = document.querySelector('main');

  const COMPACT_H    = 64;    // px – compact bar height
  const SCROLL_RANGE = 300;   // px of scroll to reach fully compact
  const H1_MIN       = 20;    // px – smallest h1 font size
  const H2_MIN       = 12;    // px – smallest h2 font size

  // Read natural font sizes from CSS (before any JS override)
  const h1Max = parseFloat(getComputedStyle(h1El).fontSize);
  const h2Max = parseFloat(getComputedStyle(h2El).fontSize);

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  let isHidden = false; // true when user has manually collapsed the header

  function update() {
    if (isHidden) return;

    const heroH    = window.innerHeight;
    const progress = clamp(window.scrollY / SCROLL_RANGE, 0, 1);
    const isCompact = progress >= 0.99;

    // ── Height ──────────────────────────────────────────────────
    const currentH = lerp(heroH, COMPACT_H, progress);
    header.style.height = currentH + 'px';

    // Push main content below the header — keep content pinned just below header bottom
    mainEl.style.marginTop = (currentH + Math.min(window.scrollY, SCROLL_RANGE)) + 'px';

    // ── Font sizes ───────────────────────────────────────────────
    h1El.style.fontSize = lerp(h1Max, H1_MIN, progress) + 'px';
    h2El.style.fontSize = lerp(h2Max, H2_MIN, progress) + 'px';

    // ── Letter-spacing & gap ─────────────────────────────────────
    h1El.style.letterSpacing  = lerp(0.05, 0.01, progress) + 'em';
    titles.style.gap           = lerp(12, 3, progress) + 'px';

    // ── Background colour (learning vs testing) + blur ───────────
    const isTesting = document.body.classList.contains('testing-mode');
    const bgR = isTesting ? 18  : 22;
    const bgG = isTesting ? 18  : 27;
    const bgB = isTesting ? 31  : 34;
    const bgA = lerp(0.75, 0.97, progress);
    header.style.backgroundColor = `rgba(${bgR},${bgG},${bgB},${bgA})`;
    header.style.backdropFilter  = `blur(${lerp(0, 14, progress)}px)`;

    // ── Border opacity ───────────────────────────────────────────
    const borderA = lerp(0, 1, progress);
    header.style.borderBottomColor = isTesting
      ? `rgba(45,43,85,${borderA})`
      : `rgba(48,54,61,${borderA})`;

    // ── Mode indicator: fade out quickly as header compacts ───────
    if (indicator) {
      indicator.style.opacity = String(clamp(lerp(1, 0, progress * 3), 0, 1));
    }

    // ── Toggle button: appear when fully compact ──────────────────
    toggle.style.display = isCompact ? 'flex' : 'none';
    if (isCompact) toggle.textContent = '▲'; // ▲ = "click to collapse"
  }

  // ── Toggle: collapse ↔ restore ──────────────────────────────
  toggle.addEventListener('click', () => {
    isHidden = !isHidden;
    if (isHidden) {
      header.classList.add('header-hidden');
      mainEl.style.marginTop = (COMPACT_H + Math.min(window.scrollY, SCROLL_RANGE)) + 'px';
      toggle.textContent = '▼';
      toggle.title = 'Expand header';
    } else {
      header.classList.remove('header-hidden');
      toggle.textContent = '▲';
      toggle.title = 'Collapse header';
      update();
    }
  });

  // Restore automatically when user scrolls back to the very top
  window.addEventListener('scroll', () => {
    if (isHidden && window.scrollY < 10) {
      isHidden = false;
      header.classList.remove('header-hidden');
      toggle.textContent = '▲';
      toggle.title = 'Collapse header';
    }
    update();
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });

  // Expose update so applyMode() can refresh header colours on mode switch
  window._updateHeader = update;

  update(); // initial render
})();


// Build static sections first so tree can resolve clickable section links
renderTopics();
renderAllSectionTrees();
renderSummaryTable();
// Initialise in learning mode (also renders the tree + section trees)
applyMode(false);
renderNematodaContent();
renderSymbiosisContent();

// ── Cladistics Tree Fullscreen ───────────────────────────────

const treeFsBtn = document.getElementById('tree-fullscreen-btn');
const treeSection = document.getElementById('cladistics-section');

treeFsBtn.addEventListener('click', () => {
  const isNowFullscreen = treeSection.classList.toggle('fullscreen');
  treeFsBtn.innerHTML   = isNowFullscreen ? '&#x2715;' : '&#x26F6;';
  treeFsBtn.title       = isNowFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  // Prevent body scroll while fullscreen tree is open
  document.body.style.overflow = isNowFullscreen ? 'hidden' : '';
  // Fullscreen: expand all clades (no bypass, no collapsing); exit: restore
  isFullscreenTree = isNowFullscreen;
  renderTree();
});

// Also close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && treeSection.classList.contains('fullscreen')) {
    treeSection.classList.remove('fullscreen');
    treeFsBtn.innerHTML = '&#x26F6;';
    treeFsBtn.title     = 'Enter fullscreen';
    document.body.style.overflow = '';
    isFullscreenTree = false;
    renderTree();
  }
});
