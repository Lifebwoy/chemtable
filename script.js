document.addEventListener('DOMContentLoaded', () => {
    const tableContainer = document.getElementById('periodic-table');
    const modal = document.getElementById('element-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const searchInput = document.getElementById('search-input');
    const legendContainer = document.getElementById('category-legend');

    // Global Animation Lifecycle Resumes
    let resumeBohrAnimation = null;
    let resumeMolAnimation = null;
    let resumeGasAnimation = null;

    // Theme Management (Light Scientific Default with Dark Laboratory Toggle)
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('chemtable-theme', theme);
        } catch(e) {}
        if (theme === 'dark') {
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light Theme';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark Theme';
        }
    }

    // Initialize theme from localStorage or system preference
    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem('chemtable-theme');
    } catch(e) {}
    if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        savedTheme = 'dark';
    }
    applyTheme(savedTheme || 'light');

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }

    // Tabs & Navigation Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let propertyChart = null;
    let titrationChart = null;

    function switchTab(target) {
        if (!target) return;
        tabBtns.forEach(b => {
            if (b.getAttribute('data-tab') === target) {
                b.classList.add('active');
                b.setAttribute('aria-selected', 'true');
            } else {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            }
        });
        tabContents.forEach(c => {
            if (c.id === target) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });

        // Lifecycle management for 3D & canvas engines
        if (target === 'tab-analytics' && propertyChart) {
            propertyChart.resize();
        }
        if (target === 'tab-lab') {
            if (!titrationChart && typeof initTitrationChart === 'function') {
                initTitrationChart();
            } else if (titrationChart) {
                titrationChart.resize();
            }
        }
        if (target === 'tab-molecules') {
            if (typeof initMoleculeViewer === 'function') {
                initMoleculeViewer();
            }
            if (typeof resumeMolAnimation === 'function') {
                resumeMolAnimation();
            }
        }
        if (target === 'tab-gas') {
            if (typeof initGasSimulator === 'function') {
                initGasSimulator();
            }
            if (typeof resumeGasAnimation === 'function') {
                resumeGasAnimation();
            }
        }
        if (target === 'tab-bohr') {
            if (typeof resumeBohrAnimation === 'function') {
                resumeBohrAnimation();
            }
        }
        if (target === 'tab-compare' && typeof initElementComparison === 'function') {
            initElementComparison();
        }
        if (target === 'tab-curriculum' && typeof renderCurriculumCards === 'function') {
            renderCurriculumCards();
        }
        if (target === 'tab-rxn-types' && typeof renderReactionTypes === 'function') {
            renderReactionTypes();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.switchTab = switchTab;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            switchTab(target);
        });
    });

    // Populate element datalist for smart suggestions
    const elementSuggestions = document.getElementById('element-suggestions');
    if (elementSuggestions) {
        elementsData.forEach(el => {
            const option = document.createElement('option');
            option.value = el.name; // User will see element names as suggestions
            elementSuggestions.appendChild(option);
        });
    }

    // Common compounds dictionary for unified searching
    const commonCompounds = {
        "water": "H2O",
        "salt": "NaCl",
        "carbon dioxide": "CO2",
        "glucose": "C6H12O6",
        "methane": "CH4",
        "ammonia": "NH3",
        "rust": "Fe2O3",
        "quartz": "SiO2",
        "baking soda": "NaHCO3",
        "sugar": "C12H22O11"
    };

    const elementNodes = []; // Store references for filtering
    let activeCategory = null;
    let activeState = null;

    // Periodic Trends Data (Sampled for heatmaps)
    const trendsData = {
        1: [2.20, 53], 2: [null, 31], 3: [0.98, 167], 4: [1.57, 112], 5: [2.04, 87], 6: [2.55, 67], 7: [3.04, 56], 8: [3.44, 48], 9: [3.98, 42], 10: [null, 38],
        11: [0.93, 190], 12: [1.31, 145], 13: [1.61, 118], 14: [1.90, 111], 15: [2.19, 98], 16: [2.58, 88], 17: [3.16, 79], 18: [null, 71],
        19: [0.82, 243], 20: [1.00, 194], 21: [1.36, 184], 22: [1.54, 176], 23: [1.63, 171], 24: [1.66, 166], 25: [1.55, 161], 26: [1.83, 156], 27: [1.88, 152], 28: [1.91, 149], 29: [1.90, 145], 30: [1.65, 142], 31: [1.81, 136], 32: [2.01, 125], 33: [2.18, 114], 34: [2.55, 103], 35: [2.96, 94], 36: [3.00, 88],
        37: [0.82, 265], 38: [0.95, 219], 53: [2.66, 115], 54: [2.60, 108]
    };

    const trendSelect = document.getElementById('trend-select');
    if (trendSelect) {
        trendSelect.addEventListener('change', () => applyFilters());
    }

    // Generate Periodic Table
    elementsData.forEach(element => {
        const elDiv = document.createElement('div');
        elDiv.classList.add('element');
        
        // Data attributes for filtering
        elDiv.dataset.name = element.name.toLowerCase();
        elDiv.dataset.symbol = element.s.toLowerCase();
        elDiv.dataset.number = element.n;
        elDiv.dataset.cat = element.cat;
        elDiv.dataset.state = element.state;

        // Positioning
        elDiv.style.gridColumn = element.c;
        elDiv.style.gridRow = element.r;
        
        // Category styling via CSS Variable mapped to the root variables in CSS
        elDiv.style.setProperty('--cat-color', `var(--${element.cat})`);

        // HTML structure for the element card
        elDiv.innerHTML = `
            <div class="el-number">${element.n}</div>
            <div class="el-symbol">${element.s}</div>
            <div class="el-name">${element.name}</div>
        `;

        // Click Event to open Modal
        elDiv.addEventListener('click', () => {
            openModal(element);
        });

        tableContainer.appendChild(elDiv);
        elementNodes.push(elDiv);
    });

    // Initialize VanillaTilt for 3D hover effects if available
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".element"), {
            max: 25,
            speed: 400,
            glare: true,
            "max-glare": 0.5,
            scale: 1.05
        });
    }

    // Generate Category Legend
    const categories = [...new Set(elementsData.map(e => e.cat))];
    categories.forEach(cat => {
        const legendItem = document.createElement('div');
        legendItem.classList.add('legend-item');
        legendItem.dataset.cat = cat;

        const catFormatted = cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        legendItem.innerHTML = `
            <div class="legend-color" style="--leg-color: var(--${cat})"></div>
            <span>${catFormatted}</span>
        `;

        legendItem.addEventListener('click', () => {
            // Toggle active category
            if (activeCategory === cat) {
                activeCategory = null;
                document.querySelectorAll('.legend-item').forEach(item => item.classList.remove('active'));
            } else {
                activeCategory = cat;
                document.querySelectorAll('.legend-item').forEach(item => item.classList.remove('active'));
                legendItem.classList.add('active');
            }
            applyFilters();
        });

        legendContainer.appendChild(legendItem);
    });

    // State Filter Logic
    const stateBtns = document.querySelectorAll('.state-btn');
    stateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const state = btn.dataset.state;
            if (activeState === state) {
                activeState = null;
                stateBtns.forEach(b => b.classList.remove('active'));
            } else {
                activeState = state;
                stateBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            applyFilters();
        });
    });

    // Search Logic
    searchInput.addEventListener('input', () => {
        applyFilters();
    });

    function applyFilters() {
        let searchTerm = searchInput.value.trim();
        let queryLower = searchTerm.toLowerCase();

        // Check if query is a common compound
        if (commonCompounds[queryLower]) {
            searchTerm = commonCompounds[queryLower];
        }

        let compoundSymbols = [];
        if (searchTerm) {
            try {
                // Try parsing the search term to see if it's a valid formula
                const res = calculateMolarMass(searchTerm);
                if (res && res.composition) {
                    compoundSymbols = Object.keys(res.composition).map(s => s.toLowerCase());
                }
            } catch (e) {
                // Not a valid formula, ignore
            }
        }

        elementNodes.forEach(node => {
            let matchesSearch = false;
            
            if (!searchTerm) {
                matchesSearch = true;
            } else if (compoundSymbols.length > 0) {
                // If it's a compound, highlight all constituent elements
                matchesSearch = compoundSymbols.includes(node.dataset.symbol);
            } else {
                // Standard element search
                matchesSearch = 
                    node.dataset.name.includes(queryLower) || 
                    node.dataset.symbol.includes(queryLower) || 
                    node.dataset.number === queryLower;
            }
            
            const matchesCategory = activeCategory ? node.dataset.cat === activeCategory : true;
            const matchesState = activeState ? node.dataset.state === activeState : true;

            if (matchesSearch && matchesCategory && matchesState) {
                node.classList.remove('dimmed');
            } else {
                node.classList.add('dimmed');
            }
            
            // Heatmap coloring
            const colorMode = trendSelect ? trendSelect.value : 'category';
            const n = parseInt(node.dataset.number);
            const data = trendsData[n] || [1.5, 150]; // Fallback
            
            if (colorMode === 'category') {
                node.style.setProperty('--cat-color', `var(--${node.dataset.cat})`);
            } else if (colorMode === 'electronegativity') {
                let en = data[0];
                if (en === null) node.style.setProperty('--cat-color', `#555`);
                else {
                    let pct = Math.max(0, Math.min(1, (en - 0.7) / (4.0 - 0.7)));
                    node.style.setProperty('--cat-color', `hsl(${240 - (pct * 240)}, 100%, 60%)`);
                }
            } else if (colorMode === 'radius') {
                let r = data[1];
                if (r === null) node.style.setProperty('--cat-color', `#555`);
                else {
                    let pct = Math.max(0, Math.min(1, (r - 30) / (300 - 30)));
                    node.style.setProperty('--cat-color', `hsl(${120 - (pct * 120)}, 100%, 50%)`);
                }
            }
        });
    }

    // Function to populate and open modal
    function openModal(element) {
        document.getElementById('modal-symbol').textContent = element.s;
        document.getElementById('modal-name').textContent = element.name;
        document.getElementById('modal-number').textContent = element.n;
        document.getElementById('modal-weight').textContent = element.w;
        document.getElementById('modal-state').textContent = element.state;
        document.getElementById('modal-fact').textContent = element.fact;
        document.getElementById('modal-wiki').href = `https://en.wikipedia.org/wiki/${element.name}`;

        // Formatting category string
        const catFormatted = element.cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        document.getElementById('modal-category').textContent = catFormatted;

        // Apply color theme to modal
        const modalContent = document.querySelector('.modal-content');
        modalContent.style.setProperty('--modal-cat-color', `var(--${element.cat})`);

        // Show Modal
        modal.classList.remove('hidden');
    }

    // Function to close modal
    function closeModal() {
        modal.classList.add('hidden');
    }

    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside the content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // --- Advanced Features: Molar Mass Calculator ---
    const formulaInput = document.getElementById('formula-input');
    const calcBtn = document.getElementById('calc-btn');
    const calcResult = document.getElementById('calc-result');
    const breakdownContainer = document.getElementById('composition-breakdown');

    const atomicWeights = {};
    elementsData.forEach(el => {
        let weightStr = el.w.toString().replace('[', '').replace(']', '');
        atomicWeights[el.s] = parseFloat(weightStr);
    });

    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            let formula = formulaInput.value.trim();
            if (!formula) {
                calcResult.textContent = 'Please enter a formula.';
                breakdownContainer.innerHTML = '';
                return;
            }
            
            // Check dictionary first
            if (commonCompounds[formula.toLowerCase()]) {
                formula = commonCompounds[formula.toLowerCase()];
            }

            try {
                const result = calculateMolarMass(formula);
                if (isNaN(result.totalMass)) {
                     calcResult.textContent = 'Invalid formula or unknown element.';
                     breakdownContainer.innerHTML = '';
                } else {
                     calcResult.innerHTML = `Molar Mass: <strong style="color: #48dbfb;">${result.totalMass.toFixed(3)} g/mol</strong>`;
                     
                     // Render breakdown
                     breakdownContainer.innerHTML = '';
                     for (const [sym, data] of Object.entries(result.composition)) {
                         const percentage = ((data.mass / result.totalMass) * 100).toFixed(2);
                         const item = document.createElement('div');
                         item.className = 'comp-item';
                         item.innerHTML = `
                             <div class="comp-item-bar" style="width: ${percentage}%;"></div>
                             <div class="comp-item-content">
                                <span><strong>${sym}</strong> (${data.count} atoms)</span>
                                <span>${percentage}%</span>
                             </div>
                         `;
                         breakdownContainer.appendChild(item);
                     }
                }
                 
                 // Sync with Bohr Model
                 const bohrSearch = document.getElementById('bohr-search-input');
                 const bohrBtn = document.getElementById('view-bohr-btn');
                 if (bohrSearch && bohrBtn && bohrSearch.value !== formulaInput.value) {
                     bohrSearch.value = formulaInput.value;
                     bohrBtn.click();
                 }
            } catch (e) {
                // If it failed, maybe it's an element name like "Oxygen"
                const query = formulaInput.value.trim().toLowerCase();
                let found = elementsData.find(el => el.name.toLowerCase() === query || el.s.toLowerCase() === query);
                if (found) {
                    const mass = parseFloat(found.w.toString().replace(/\[|\]/g, ''));
                    calcResult.innerHTML = `Molar Mass: <strong style="color: #48dbfb;">${mass.toFixed(3)} g/mol</strong>`;
                    breakdownContainer.innerHTML = `
                         <div class="comp-item">
                             <div class="comp-item-bar" style="width: 100%;"></div>
                             <div class="comp-item-content">
                                <span><strong>${found.s}</strong> (1 atom)</span>
                                <span>100%</span>
                             </div>
                         </div>
                    `;
                    // Sync with Bohr Model
                    const bohrSearch = document.getElementById('bohr-search-input');
                    const bohrBtn = document.getElementById('view-bohr-btn');
                    if (bohrSearch && bohrBtn && bohrSearch.value !== found.name) {
                        bohrSearch.value = found.name;
                        bohrBtn.click();
                    }
                } else {
                    calcResult.textContent = e.message;
                    breakdownContainer.innerHTML = '';
                }
            }
        });
        
        // Allow Enter key
        formulaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calcBtn.click();
        });
    }

    function calculateMolarMass(formula) {
        function parseFormula(f) {
            const stack = [{}];
            let i = 0;
            
            while (i < f.length) {
                if (f[i] === '(') {
                    stack.push({});
                    i++;
                } else if (f[i] === ')') {
                    const top = stack.pop();
                    i++;
                    let count = '';
                    while (i < f.length && /[0-9]/.test(f[i])) {
                        count += f[i];
                        i++;
                    }
                    count = count ? parseInt(count, 10) : 1;
                    
                    const target = stack[stack.length - 1];
                    for (const [sym, num] of Object.entries(top)) {
                        target[sym] = (target[sym] || 0) + num * count;
                    }
                } else if (/[A-Z]/.test(f[i])) {
                    let sym = f[i];
                    i++;
                    if (i < f.length && /[a-z]/.test(f[i])) {
                        sym += f[i];
                        i++;
                    }
                    let count = '';
                    while (i < f.length && /[0-9]/.test(f[i])) {
                        count += f[i];
                        i++;
                    }
                    count = count ? parseInt(count, 10) : 1;
                    
                    const target = stack[stack.length - 1];
                    target[sym] = (target[sym] || 0) + count;
                } else {
                    i++; // Ignore spaces or invalid chars
                }
            }
            
            if (stack.length !== 1) {
                throw new Error("Unmatched parentheses in formula.");
            }
            
            let mass = 0;
            const composition = {};
            for (const [sym, count] of Object.entries(stack[0])) {
                if (!atomicWeights[sym]) {
                    throw new Error("Unknown element: " + sym);
                }
                const elementMass = atomicWeights[sym] * count;
                mass += elementMass;
                composition[sym] = { count: count, mass: elementMass };
            }
            return { totalMass: mass, composition: composition };
        }
        
        return parseFormula(formula);
    }

    // --- Advanced Features: Analytics Chart ---
    const ctx = document.getElementById('propertyChart');
    if (ctx && typeof Chart !== 'undefined') {
        const labels = elementsData.map(e => e.s);
        const fullNames = elementsData.map(e => e.name);
        const data = elementsData.map(e => {
             let weightStr = e.w.toString().replace('[', '').replace(']', '');
             return parseFloat(weightStr);
        });
        
        propertyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Atomic Weight (g/mol)',
                    data: data,
                    backgroundColor: 'rgba(72, 219, 251, 0.2)',
                    borderColor: 'rgba(72, 219, 251, 1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e, activeEls) => {
                    if (activeEls.length > 0) {
                        const index = activeEls[0].index;
                        openModal(elementsData[index]);
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                return fullNames[context[0].dataIndex] + ' (' + labels[context[0].dataIndex] + ')';
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,0.7)', maxTicksLimit: 20 } },
                    y: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
    }

    // --- Advanced Features: 3D Bohr Model (WebGL) & Electron Config ---
    const bohrSearch = document.getElementById('bohr-search-input');
    const bohrBtn = document.getElementById('view-bohr-btn');
    const bohrContainer = document.getElementById('bohr-canvas-container');
    const configDisplay = document.getElementById('electron-config-display');

    if (bohrSearch && typeof THREE !== 'undefined') {
        // Allow enter key
        bohrSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') bohrBtn.click();
        });

        let bohrScene, bohrCamera, bohrRenderer, animationId, bohrControls;
        let electrons = [];
        
        // Setup ResizeObserver to fix canvas sizing when tab becomes visible
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                const height = entry.contentRect.height;
                if (width > 0 && height > 0 && bohrRenderer && bohrCamera) {
                    bohrRenderer.setSize(width, height);
                    bohrCamera.aspect = width / height;
                    bohrCamera.updateProjectionMatrix();
                }
            }
        });
        resizeObserver.observe(bohrContainer);
        
        // Electron configuration generator (Aufbau principle with NCERT Class 11 Anomalies)
        function getElectronConfig(z) {
            const anomalies = {
                24: {
                    config: "1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup> 3s<sup>2</sup> 3p<sup>6</sup> 3d<sup>5</sup> 4s<sup>1</sup>",
                    note: "NCERT Class 11 Exception: Symmetrical half-filled 3d⁵ subshell provides maximum exchange energy and extra stability."
                },
                29: {
                    config: "1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>6</sup> 3s<sup>2</sup> 3p<sup>6</sup> 3d<sup>10</sup> 4s<sup>1</sup>",
                    note: "NCERT Class 11 Exception: Completely filled 3d¹⁰ subshell provides maximum symmetry and exchange stabilization energy."
                },
                42: {
                    config: "[Kr] 4d<sup>5</sup> 5s<sup>1</sup>",
                    note: "Molybdenum anomaly: Half-filled 4d⁵ subshell stability."
                },
                47: {
                    config: "[Kr] 4d<sup>10</sup> 5s<sup>1</sup>",
                    note: "Silver anomaly: Completely filled 4d¹⁰ subshell stability."
                },
                78: {
                    config: "[Xe] 4f<sup>14</sup> 5d<sup>9</sup> 6s<sup>1</sup>",
                    note: "Platinum: Relativistic effect and subshell stabilization."
                },
                79: {
                    config: "[Xe] 4f<sup>14</sup> 5d<sup>10</sup> 6s<sup>1</sup>",
                    note: "Gold anomaly: Completely filled 5d¹⁰ subshell stability."
                }
            };

            if (anomalies[z]) {
                return `${anomalies[z].config} <div class="callout callout-info" style="margin-top:8px; font-size:var(--font-xs); text-align:left;"><strong>CBSE Exam Focus:</strong> ${anomalies[z].note}</div>`;
            }

            const orbitals = [
                { l: '1s', c: 2 }, { l: '2s', c: 2 }, { l: '2p', c: 6 },
                { l: '3s', c: 2 }, { l: '3p', c: 6 }, { l: '4s', c: 2 },
                { l: '3d', c: 10 }, { l: '4p', c: 6 }, { l: '5s', c: 2 },
                { l: '4d', c: 10 }, { l: '5p', c: 6 }, { l: '6s', c: 2 },
                { l: '4f', c: 14 }, { l: '5d', c: 10 }, { l: '6p', c: 6 },
                { l: '7s', c: 2 }, { l: '5f', c: 14 }, { l: '6d', c: 10 }, { l: '7p', c: 6 }
            ];
            let remaining = z;
            let config = [];
            for (let orb of orbitals) {
                if (remaining <= 0) break;
                let electronsInOrbital = Math.min(remaining, orb.c);
                config.push(`${orb.l}<sup>${electronsInOrbital}</sup>`);
                remaining -= electronsInOrbital;
            }
            return config.join(' ');
        }

        function initBohrModel(atomicNumbersArray, labelsArray) {
            // Update Config Display (only if single atom, else show list of elements)
            if (configDisplay) {
                if (atomicNumbersArray.length === 1) {
                    configDisplay.innerHTML = `${labelsArray[0]} Config: ` + getElectronConfig(atomicNumbersArray[0]);
                } else {
                    configDisplay.innerHTML = `Molecule Elements: ${labelsArray.join(', ')}`;
                }
            }

            // Clear previous
            if (bohrRenderer) {
                bohrContainer.removeChild(bohrRenderer.domElement);
                cancelAnimationFrame(animationId);
            }

            bohrScene = new THREE.Scene();
            const width = bohrContainer.clientWidth;
            const height = bohrContainer.clientHeight;
            bohrCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            
            // Adjust camera Z based on max atomic number and number of atoms
            const maxZ = Math.max(...atomicNumbersArray) * 0.3;
            bohrCamera.position.z = Math.min(30 + maxZ + (atomicNumbersArray.length * 10), 100); 

            bohrRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            bohrRenderer.setSize(width, height);
            bohrRenderer.setPixelRatio(window.devicePixelRatio);
            bohrContainer.appendChild(bohrRenderer.domElement);

            // Setup OrbitControls
            if (typeof THREE.OrbitControls !== 'undefined') {
                bohrControls = new THREE.OrbitControls(bohrCamera, bohrRenderer.domElement);
                bohrControls.enableDamping = true;
                bohrControls.dampingFactor = 0.05;
                bohrControls.enablePan = false;
            }

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            bohrScene.add(ambientLight);
            const pointLight = new THREE.PointLight(0xffffff, 1);
            pointLight.position.set(20, 20, 20);
            bohrScene.add(pointLight);

            electrons = [];
            const protonMat = new THREE.MeshPhysicalMaterial({ color: 0xff3333, metalness: 0.1, roughness: 0.5, clearcoat: 1.0 });
            const neutronMat = new THREE.MeshPhysicalMaterial({ color: 0x3333ff, metalness: 0.1, roughness: 0.5, clearcoat: 1.0 });
            const electronGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const electronMat = new THREE.MeshPhysicalMaterial({ 
                color: 0x48dbfb, 
                emissive: 0x48dbfb, 
                emissiveIntensity: 0.5,
                clearcoat: 1.0
            });
            const particleGeo = new THREE.SphereGeometry(0.4, 16, 16);
            const shellColors = [0xffffff, 0x1dd1a1, 0xfeca57, 0xff9ff3, 0x48dbfb, 0xff6b6b, 0xc8d6e5];

            // Space atoms apart
            const spacing = 20;
            const startX = -((atomicNumbersArray.length - 1) * spacing) / 2;

            atomicNumbersArray.forEach((atomicNumber, index) => {
                const atomGroup = new THREE.Group();
                atomGroup.position.x = startX + (index * spacing);
                bohrScene.add(atomGroup);

                // Nucleus - Cluster of protons/neutrons
                const nucleusGroup = new THREE.Group();
                const visualParticles = Math.min(atomicNumber * 2, 80); 
                for(let i=0; i<visualParticles; i++) {
                    const isProton = i % 2 === 0;
                    const particle = new THREE.Mesh(particleGeo, isProton ? protonMat : neutronMat);
                    const phi = Math.acos( -1 + ( 2 * i ) / visualParticles );
                    const theta = Math.sqrt( visualParticles * Math.PI ) * phi;
                    const radius = 0.5 + Math.random() * 1.5;
                    particle.position.setFromSphericalCoords(radius, phi, theta);
                    nucleusGroup.add(particle);
                }
                atomGroup.add(nucleusGroup);

                // Shells
                const shells = [];
                let remaining = atomicNumber;
                let n = 1;
                while(remaining > 0) {
                    const maxInShell = 2 * n * n;
                    const inThisShell = Math.min(remaining, maxInShell);
                    shells.push(inThisShell);
                    remaining -= inThisShell;
                    n++;
                }

                shells.forEach((count, shellIndex) => {
                    const radius = 4 + shellIndex * 3;
                    const shellColor = shellColors[shellIndex % shellColors.length];
                    const orbitMat = new THREE.LineBasicMaterial({ color: shellColor, transparent: true, opacity: 0.3 });

                    // Orbit path
                    const orbitGeo = new THREE.BufferGeometry();
                    const orbitPoints = [];
                    for(let i=0; i<=64; i++) {
                        const angle = (i / 64) * Math.PI * 2;
                        orbitPoints.push(new THREE.Vector3(Math.cos(angle)*radius, Math.sin(angle)*radius, 0));
                    }
                    orbitGeo.setFromPoints(orbitPoints);
                    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
                    
                    orbitLine.rotation.x = (Math.PI / 4) * (shellIndex % 3) + Math.random() * 0.5;
                    orbitLine.rotation.y = (Math.PI / 4) * (shellIndex % 2) + Math.random() * 0.5;
                    atomGroup.add(orbitLine);

                    // Electrons
                    for(let i=0; i<count; i++) {
                        const electron = new THREE.Mesh(electronGeo, electronMat);
                        const angle = (i / count) * Math.PI * 2;
                        atomGroup.add(electron);
                        electrons.push({
                            mesh: electron,
                            angle: angle,
                            radius: radius,
                            speed: 0.03 / (shellIndex + 1),
                            orbitGroup: orbitLine,
                            atomGroup: atomGroup
                        });
                    }
                });
            });

            animateBohr();
        }

        function animateBohr() {
            const tabBohr = document.getElementById('tab-bohr');
            if (!tabBohr || !tabBohr.classList.contains('active')) {
                animationId = null;
                return;
            }
            animationId = requestAnimationFrame(animateBohr);
            
            // Rotate electrons
            electrons.forEach(e => {
                e.angle += e.speed;
                const localX = Math.cos(e.angle) * e.radius;
                const localY = Math.sin(e.angle) * e.radius;
                
                const pos = new THREE.Vector3(localX, localY, 0);
                pos.applyEuler(e.orbitGroup.rotation);
                e.mesh.position.copy(pos);
            });

            // Update controls or rotate slowly
            if (bohrControls) {
                bohrControls.update();
            } else {
                bohrScene.children.forEach(child => {
                    if(child instanceof THREE.Group && child.children.length > 0) {
                        child.rotation.y += 0.002;
                        child.rotation.x += 0.001;
                    }
                });
            }

            bohrRenderer.render(bohrScene, bohrCamera);
        }

        resumeBohrAnimation = function() {
            if (!animationId && bohrRenderer) {
                animateBohr();
            }
        };

        bohrBtn.addEventListener('click', () => {
            let query = bohrSearch.value.trim();
            if (!query) return;
            
            // Check dictionary
            if (commonCompounds[query.toLowerCase()]) {
                query = commonCompounds[query.toLowerCase()];
            }
            
            // Direct element search by name or symbol
            let foundSingleElement = elementsData.find(e => e.name.toLowerCase() === query.toLowerCase() || e.s.toLowerCase() === query.toLowerCase() || e.n.toString() === query);
            
            if (foundSingleElement) {
                initBohrModel([foundSingleElement.n], [foundSingleElement.name]);
                const fInput = document.getElementById('formula-input');
                const fBtn = document.getElementById('calc-btn');
                if (fInput && fBtn && fInput.value !== foundSingleElement.name && fInput.value !== query) {
                    fInput.value = foundSingleElement.name;
                    fBtn.click();
                }
                return;
            }
            
            // Attempt to parse as formula
            try {
                const res = calculateMolarMass(query);
                if (res && res.composition) {
                    const atomicNumbers = [];
                    const labels = [];
                    for (const sym of Object.keys(res.composition)) {
                        const el = elementsData.find(e => e.s === sym);
                        if (el) {
                            atomicNumbers.push(el.n);
                            labels.push(el.name);
                        }
                    }
                    if (atomicNumbers.length > 0) {
                        initBohrModel(atomicNumbers, labels);
                        
                        const fInput = document.getElementById('formula-input');
                        const fBtn = document.getElementById('calc-btn');
                        if (fInput && fBtn && fInput.value !== query) {
                            fInput.value = query;
                            fBtn.click();
                        }
                        
                        configDisplay.innerHTML += `<br><span style="color: #feca57; font-size: 0.9em;">Total Molar Mass: ${res.totalMass.toFixed(2)} g/mol</span>`;
                    } else {
                        configDisplay.innerHTML = "Could not parse compound.";
                    }
                }
            } catch(e) {
                configDisplay.innerHTML = "Element or compound not found.";
            }
        });
        
        initBohrModel([1], ["Hydrogen"]);
    }

    // --- Advanced Features: Equation Balancer ---
    const reactionInput = document.getElementById('reaction-input');
    const balanceBtn = document.getElementById('balance-btn');
    const reactionResult = document.getElementById('reaction-result');

    if (balanceBtn) {
        balanceBtn.addEventListener('click', () => {
            const eq = reactionInput.value.trim();
            if (!eq) return;
            try {
                reactionResult.innerHTML = balanceEquation(eq);
            } catch (e) {
                reactionResult.innerHTML = `<span style="color: #e74c3c;">Error: ${e.message}</span>`;
            }
        });
    }

    function balanceEquation(eq) {
        eq = eq.replace(/\s+/g, '');
        let sides = eq.split(/=|->/);
        if (sides.length !== 2) throw new Error("Use '=' or '->' to separate sides.");
        
        const leftParts = sides[0].split('+');
        const rightParts = sides[1].split('+');
        
        function parsePart(part) {
            let res = calculateMolarMass(part); 
            return res.composition;
        }
        
        let leftMols = leftParts.map(parsePart);
        let rightMols = rightParts.map(parsePart);
        
        let allElements = new Set();
        leftMols.forEach(m => Object.keys(m).forEach(el => allElements.add(el)));
        rightMols.forEach(m => Object.keys(m).forEach(el => allElements.add(el)));
        
        let numVars = leftParts.length + rightParts.length;
        if (numVars > 6) throw new Error("Equation too complex.");
        
        let coefs = new Array(numVars).fill(1);
        let solved = false;
        
        function check() {
            for (let el of allElements) {
                let leftCount = 0;
                for (let i=0; i<leftMols.length; i++) leftCount += (leftMols[i][el] ? leftMols[i][el].count : 0) * coefs[i];
                let rightCount = 0;
                for (let i=0; i<rightMols.length; i++) rightCount += (rightMols[i][el] ? rightMols[i][el].count : 0) * coefs[leftMols.length + i];
                if (leftCount !== rightCount) return false;
            }
            return true;
        }
        
        function increment(idx) {
            if (idx >= numVars) return false;
            coefs[idx]++;
            if (coefs[idx] > 15) {
                coefs[idx] = 1;
                return increment(idx + 1);
            }
            return true;
        }
        
        while (!solved) {
            if (check()) { solved = true; break; }
            if (!increment(0)) break;
        }
        
        if (!solved) throw new Error("Could not balance. Coefficients may be > 15.");
        
        let resStr = "";
        for (let i=0; i<leftParts.length; i++) resStr += (coefs[i]===1?"":coefs[i]) + leftParts[i] + (i===leftParts.length-1 ? " = " : " + ");
        for (let i=0; i<rightParts.length; i++) resStr += (coefs[leftMols.length+i]===1?"":coefs[leftMols.length+i]) + rightParts[i] + (i===rightParts.length-1 ? "" : " + ");
        
        return resStr;
    }

    // --- Advanced Features: Virtual Titration Lab ---
    const acidSelect = document.getElementById('lab-acid-select');
    const baseSelect = document.getElementById('lab-base-select');
    const buretSlider = document.getElementById('buret-slider');
    const volDisplay = document.getElementById('volume-added-display');
    const phDisplay = document.getElementById('ph-value-display');
    const beakerLiquid = document.getElementById('beaker-liquid');
    const resetLabBtn = document.getElementById('reset-lab-btn');

    window.initTitrationChart = function() {
        const ctxTitration = document.getElementById('titrationChart');
        if (!ctxTitration || typeof Chart === 'undefined') return;
        
        const dataPoints = [];
        const originalValue = buretSlider.value;
        for(let v = 0; v <= 100; v += 1) {
            buretSlider.value = v;
            dataPoints.push(updateTitration(true));
        }
        buretSlider.value = originalValue;
        updateTitration(); 
        
        if (titrationChart) titrationChart.destroy();
        
        titrationChart = new Chart(ctxTitration, {
            type: 'line',
            data: {
                labels: Array.from({length: 101}, (_, i) => i),
                datasets: [{
                    label: 'pH',
                    data: dataPoints,
                    borderColor: '#ff9ff3',
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 14 } } }
        });
    }

    function updateTitration(silent = false) {
        const vBase = parseFloat(buretSlider.value); 
        if(!silent) volDisplay.textContent = vBase.toFixed(1);
        
        const isStrongAcid = acidSelect.value === 'strong';
        const vAcid = 50.0, cAcid = 0.1, cBase = 0.1;
        
        let ph = 0;
        const molesAcid = vAcid * cAcid;
        const molesBase = vBase * cBase;
        const totalVol = vAcid + vBase;
        
        if (isStrongAcid) {
            if (molesAcid > molesBase) {
                ph = -Math.log10((molesAcid - molesBase) / totalVol);
            } else if (molesAcid === molesBase) ph = 7.0;
            else ph = 14 + Math.log10((molesBase - molesAcid) / totalVol);
        } else {
            const pKa = 4.76;
            const ka = Math.pow(10, -pKa);
            if (vBase === 0) ph = 0.5 * (pKa - Math.log10(cAcid));
            else if (molesBase < molesAcid) ph = pKa + Math.log10(molesBase / (molesAcid - molesBase));
            else if (molesBase === molesAcid) ph = 14 + Math.log10(Math.sqrt((1e-14 / ka) * (molesAcid / totalVol)));
            else ph = 14 + Math.log10((molesBase - molesAcid) / totalVol);
        }
        
        if(!silent) {
            phDisplay.textContent = ph.toFixed(2);
            if (ph < 8.2) beakerLiquid.style.backgroundColor = 'rgba(200, 214, 229, 0.3)';
            else if (ph < 10) beakerLiquid.style.backgroundColor = `rgba(255, 105, 180, ${0.3 + ((ph - 8.2)/1.8) * 0.5})`;
            else beakerLiquid.style.backgroundColor = 'rgba(255, 20, 147, 0.8)';
            beakerLiquid.style.height = `${33 + (vBase / 100) * 60}%`;
        }
        return ph;
    }

    if (buretSlider) {
        buretSlider.addEventListener('input', () => updateTitration());
        resetLabBtn.addEventListener('click', () => {
            buretSlider.value = 0;
            if(titrationChart) window.initTitrationChart();
            updateTitration();
        });
        acidSelect.addEventListener('change', () => {
            if(titrationChart) window.initTitrationChart();
            updateTitration();
        });
    }

    // =========================================================================
    // --- Advanced Features: 10-Question Smart Cycling Quiz Engine ---
    // =========================================================================
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const quizSetup = document.getElementById('quiz-setup');
    const quizContainer = document.getElementById('quiz-container');
    const quizResults = document.getElementById('quiz-results');
    const quizQuestion = document.getElementById('quiz-question');
    const quizOptionsContainer = document.getElementById('quiz-options');
    const quizExplanation = document.getElementById('quiz-explanation');
    const nextQuizBtn = document.getElementById('next-quiz-btn');
    const quizScore = document.getElementById('quiz-score');
    const quizTracker = document.getElementById('quiz-tracker');
    const quizCycleStatus = document.getElementById('quiz-cycle-status');
    const quizProgressFill = document.getElementById('quiz-progress-fill');
    const quizTag = document.getElementById('quiz-tag');
    const cyclePill = document.getElementById('cycle-pill');
    const poolPill = document.getElementById('pool-pill');
    const difficultySelect = document.getElementById('quiz-difficulty');

    // Helper: Fisher-Yates array shuffler
    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Comprehensive Master Question Pool Generator (120+ Curated Chemistry Questions)
    function buildMasterQuestionPool() {
        const pool = [];

        // 1. Famous Element Symbols (Name -> Symbol)
        const symbolPairs = [
            { n: "Gold", s: "Au", f: "from Latin 'Aurum'" },
            { n: "Silver", s: "Ag", f: "from Latin 'Argentum'" },
            { n: "Iron", s: "Fe", f: "from Latin 'Ferrum'" },
            { n: "Lead", s: "Pb", f: "from Latin 'Plumbum'" },
            { n: "Tin", s: "Sn", f: "from Latin 'Stannum'" },
            { n: "Tungsten", s: "W", f: "from German 'Wolfram'" },
            { n: "Potassium", s: "K", f: "from Neo-Latin 'Kalium'" },
            { n: "Sodium", s: "Na", f: "from Neo-Latin 'Natrium'" },
            { n: "Mercury", s: "Hg", f: "from Greek 'Hydrargyrum' (liquid silver)" },
            { n: "Antimony", s: "Sb", f: "from Latin 'Stibium'" },
            { n: "Copper", s: "Cu", f: "from Latin 'Cuprum'" },
            { n: "Platinum", s: "Pt", f: "from Spanish 'Platina' (little silver)" },
            { n: "Uranium", s: "U", f: "named after planet Uranus" },
            { n: "Titanium", s: "Ti", f: "named after Titans of Greek mythology" },
            { n: "Helium", s: "He", f: "from Greek 'Helios' meaning Sun" },
            { n: "Radon", s: "Rn", f: "radioactive decay product of radium" },
            { n: "Phosphorus", s: "P", f: "from Greek for 'light-bearer'" },
            { n: "Cobalt", s: "Co", f: "from German 'Kobold' (goblin ore)" }
        ];

        symbolPairs.forEach(pair => {
            const wrongs = symbolPairs.filter(p => p.s !== pair.s).map(p => p.s);
            const wrongChoices = shuffleArray(wrongs).slice(0, 3);
            pool.push({
                tag: "Element Symbols",
                difficulty: "easy",
                question: `What is the chemical symbol for ${pair.n}?`,
                options: shuffleArray([pair.s, ...wrongChoices]),
                answer: pair.s,
                explanation: `The chemical symbol for ${pair.n} is ${pair.s} (${pair.f}).`
            });

            const wrongNames = symbolPairs.filter(p => p.n !== pair.n).map(p => p.n);
            const wrongNameChoices = shuffleArray(wrongNames).slice(0, 3);
            pool.push({
                tag: "Element Symbols",
                difficulty: "easy",
                question: `Which chemical element is represented by the symbol '${pair.s}'?`,
                options: shuffleArray([pair.n, ...wrongNameChoices]),
                answer: pair.n,
                explanation: `'${pair.s}' stands for ${pair.n} (${pair.f}).`
            });
        });

        // 2. Atomic Numbers & Protons
        const protonElements = [
            { n: "Hydrogen", num: 1 }, { n: "Helium", num: 2 }, { n: "Lithium", num: 3 },
            { n: "Carbon", num: 6 }, { n: "Nitrogen", num: 7 }, { n: "Oxygen", num: 8 },
            { n: "Fluorine", num: 9 }, { n: "Neon", num: 10 }, { n: "Sodium", num: 11 },
            { n: "Magnesium", num: 12 }, { n: "Silicon", num: 14 }, { n: "Chlorine", num: 17 },
            { n: "Argon", num: 18 }, { n: "Potassium", num: 19 }, { n: "Calcium", num: 20 },
            { n: "Iron", num: 26 }, { n: "Copper", num: 29 }, { n: "Gold", num: 79 },
            { n: "Lead", num: 82 }, { n: "Uranium", num: 92 }
        ];

        protonElements.forEach(item => {
            const wrongNumbers = [item.num + 1, Math.max(1, item.num - 1), item.num + 2];
            pool.push({
                tag: "Atomic Structure",
                difficulty: "medium",
                question: `How many protons are present in the nucleus of a single ${item.n} atom?`,
                options: shuffleArray([item.num.toString(), ...wrongNumbers.map(w => w.toString())]),
                answer: item.num.toString(),
                explanation: `${item.n} has an atomic number of ${item.num}, meaning every neutral atom has exactly ${item.num} protons.`
            });
        });

        // 3. Category & Group Classifications
        const categoryQuestions = [
            {
                q: "Which group of elements on the periodic table is famously inert due to a complete valence shell?",
                a: "Noble Gases",
                w: ["Alkali Metals", "Halogens", "Transition Metals"],
                exp: "Noble gases (Group 18) possess fully filled valence shells, making them exceptionally stable and chemically unreactive.",
                diff: "easy"
            },
            {
                q: "Which group of elements reacts vigorously with water to produce hydrogen gas and alkaline hydroxides?",
                a: "Alkali Metals",
                w: ["Halogens", "Noble Gases", "Alkaline Earth Metals"],
                exp: "Alkali metals (Group 1, such as Li, Na, K) react exothermically with water to form caustic alkaline solutions and release H₂ gas.",
                diff: "easy"
            },
            {
                q: "What category does Silicon (Si) belong to, giving it crucial semiconductor properties?",
                a: "Metalloid",
                w: ["Alkali Metal", "Post-transition Metal", "Halogen"],
                exp: "Silicon is a metalloid, possessing intermediate electrical conductivity that can be precisely modulated by doping for microchips.",
                diff: "easy"
            },
            {
                q: "Which periodic family forms diatomic salts when reacting directly with alkali metals (e.g., NaCl)?",
                a: "Halogens",
                w: ["Noble Gases", "Lanthanides", "Actinides"],
                exp: "Halogens (Group 17) have 7 valence electrons and readily accept 1 electron from metals to form halide salts.",
                diff: "easy"
            },
            {
                q: "Uranium (U) and Plutonium (Pu) belong to which f-block series of radioactive elements?",
                a: "Actinides",
                w: ["Lanthanides", "Alkali Metals", "Metalloids"],
                exp: "Actinides are the radioactive series of 15 elements from Actinium (89) to Lawrencium (103) with filling 5f orbitals.",
                diff: "medium"
            }
        ];

        categoryQuestions.forEach(item => {
            pool.push({
                tag: "Periodic Families",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 4. Physical States & Phase Changes
        const stateQuestions = [
            {
                q: "Which metal is the ONLY metallic element that exists in liquid form at standard room temperature and pressure?",
                a: "Mercury (Hg)",
                w: ["Gallium (Ga)", "Lead (Pb)", "Cesium (Cs)"],
                exp: "Mercury has weak metallic bonding due to relativistic contraction of its 6s valence electrons, making it liquid at 25°C.",
                diff: "easy"
            },
            {
                q: "Which non-metallic halogen exists as a reddish-brown liquid at standard room temperature?",
                a: "Bromine (Br)",
                w: ["Chlorine (Cl)", "Iodine (I)", "Fluorine (F)"],
                exp: "Bromine is one of only two liquid elements on the periodic table at standard temperature and pressure (alongside Mercury).",
                diff: "easy"
            },
            {
                q: "What is the physical state of Iodine (I₂) at standard room temperature (25°C)?",
                a: "Solid",
                w: ["Gas", "Liquid", "Plasma"],
                exp: "Due to strong London dispersion forces among its large electron clouds, pure Iodine forms dark purple-black lustrous crystals at room temperature.",
                diff: "medium"
            }
        ];

        stateQuestions.forEach(item => {
            pool.push({
                tag: "States of Matter",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 5. Periodic Trends (Electronegativity, Radius, Ionization)
        const trendQuestions = [
            {
                q: "Which element holds the highest electronegativity value on the Pauling scale (3.98)?",
                a: "Fluorine (F)",
                w: ["Oxygen (O)", "Chlorine (Cl)", "Cesium (Cs)"],
                exp: "Fluorine has the highest nuclear charge relative to its small n=2 valence shell, giving it the strongest pull on shared bonding electrons.",
                diff: "medium"
            },
            {
                q: "As you move from left to right across a period in the periodic table, what generally happens to atomic radius?",
                a: "Decreases",
                w: ["Increases", "Remains Constant", "Doubles"],
                exp: "Atomic radius decreases across a period because the increasing effective nuclear charge (Z_eff) pulls electron clouds closer to the nucleus.",
                diff: "medium"
            },
            {
                q: "Which alkali metal has the largest atomic radius and lowest first ionization energy?",
                a: "Francium / Cesium",
                w: ["Lithium", "Sodium", "Potassium"],
                exp: "Cesium and Francium have the most electron shielding shells, placing their valence electron farthest from nuclear pull.",
                diff: "medium"
            },
            {
                q: "The first ionization energy represents the energy required to:",
                a: "Remove the most loosely bound valence electron from a gaseous atom",
                w: ["Add an electron to form a negative anion", "Split the nucleus into protons and neutrons", "Boil a mole of liquid element"],
                exp: "First ionization energy is defined as the minimum energy needed to detach one electron from a neutral atom in its ground gaseous state.",
                diff: "hard"
            }
        ];

        trendQuestions.forEach(item => {
            pool.push({
                tag: "Periodic Trends",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 6. Element Trivia & Discoveries (Extracted from elementsData)
        const triviaQuestions = [
            {
                q: "Which metal possesses the highest melting point of all pure elements (3,422 °C)?",
                a: "Tungsten (W)",
                w: ["Titanium (Ti)", "Iron (Fe)", "Osmium (Os)"],
                exp: "Tungsten's half-filled 5d orbitals create exceptionally strong covalent metallic bonds, yielding the highest melting point of any metal.",
                diff: "medium"
            },
            {
                q: "Which post-transition metal will famously melt in the palm of your hand due to its low melting point of 29.76 °C?",
                a: "Gallium (Ga)",
                w: ["Indium (In)", "Bismuth (Bi)", "Aluminum (Al)"],
                exp: "Gallium's melting point is just below human body temperature (37°C), allowing solid gallium spoons to melt in warm water or hands.",
                diff: "easy"
            },
            {
                q: "Which element was named in honor of Dmitri Mendeleev, the father of the periodic table?",
                a: "Mendelevium (Md)",
                w: ["Rutherfordium (Rf)", "Bohrium (Bh)", "Einsteinium (Es)"],
                exp: "Element 101 was synthesized in 1955 and named Mendelevium to honor Dmitri Mendeleev's periodic arrangement of elements.",
                diff: "easy"
            },
            {
                q: "Which synthetic actinide (Z=95) is commonly used inside commercial residential smoke detectors?",
                a: "Americium (Am)",
                w: ["Curium (Cm)", "Californium (Cf)", "Uranium (U)"],
                exp: "Americium-241 emits alpha particles that ionize air molecules inside the detection chamber, sensing smoke particles.",
                diff: "hard"
            },
            {
                q: "What is the densest naturally occurring element on Earth, with a density of 22.59 g/cm³?",
                a: "Osmium (Os)",
                w: ["Lead (Pb)", "Gold (Au)", "Platinum (Pt)"],
                exp: "Osmium is denser than lead and gold due to the lanthanide contraction packing its 5d electrons tightly around the nucleus.",
                diff: "hard"
            },
            {
                q: "Which gas makes up approximately 78% of Earth's breathable atmosphere by volume?",
                a: "Nitrogen (N₂)",
                w: ["Oxygen (O₂)", "Argon (Ar)", "Carbon Dioxide (CO₂)"],
                exp: "Nitrogen gas (N₂) constitutes roughly 78% of Earth's atmosphere, followed by Oxygen (~21%) and Argon (~0.93%).",
                diff: "easy"
            }
        ];

        triviaQuestions.forEach(item => {
            pool.push({
                tag: "Element Trivia",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 7. Valence Electrons & Chemical Bonding
        const bondingQuestions = [
            {
                q: "How many valence electrons does a neutral Carbon atom possess in its outermost shell?",
                a: "4",
                w: ["2", "6", "8"],
                exp: "Carbon is in Group 14 with electron configuration 1s² 2s² 2p², providing 4 valence electrons capable of forming 4 covalent bonds.",
                diff: "medium"
            },
            {
                q: "According to the Octet Rule, most main-group atoms achieve chemical stability when their valence shell contains:",
                a: "8 electrons",
                w: ["2 electrons", "6 electrons", "10 electrons"],
                exp: "The octet rule reflects the stable s²p⁶ configuration of noble gases, conferring energetic minimums upon bonding atoms.",
                diff: "easy"
            },
            {
                q: "What type of chemical bond is formed when one atom transfers an electron completely to another (e.g., Na and Cl)?",
                a: "Ionic Bond",
                w: ["Covalent Bond", "Hydrogen Bond", "Metallic Bond"],
                exp: "An ionic bond results from the electrostatic attraction between oppositely charged ions formed by complete electron transfer.",
                diff: "easy"
            },
            {
                q: "What molecular geometry does Methane (CH₄) adopt according to VSEPR theory?",
                a: "Tetrahedral (109.5°)",
                w: ["Linear (180°)", "Trigonal Planar (120°)", "Square Planar (90°)"],
                exp: "With 4 bonding pairs and 0 lone pairs on carbon (steric number 4), CH₄ maximizes repulsion angles into a symmetrical tetrahedron.",
                diff: "hard"
            }
        ];

        bondingQuestions.forEach(item => {
            pool.push({
                tag: "Bonding & VSEPR",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 8. Stoichiometry, Molar Mass & Reactions
        const stoichiometryQuestions = [
            {
                q: "What is the approximate molar mass of pure Water (H₂O)?",
                a: "18.02 g/mol",
                w: ["16.00 g/mol", "20.02 g/mol", "32.00 g/mol"],
                exp: "Molar mass of H₂O = (2 × 1.008) + (1 × 15.999) = 18.015 g/mol.",
                diff: "easy"
            },
            {
                q: "What is the molar mass of Carbon Dioxide (CO₂)?",
                a: "44.01 g/mol",
                w: ["28.01 g/mol", "32.00 g/mol", "56.00 g/mol"],
                exp: "Molar mass of CO₂ = 12.011 + (2 × 15.999) = 44.009 g/mol.",
                diff: "medium"
            },
            {
                q: "In the combustion of methane: CH₄ + 2O₂ → CO₂ + 2H₂O, how many moles of O₂ are consumed per 1 mole of CH₄?",
                a: "2 moles",
                w: ["1 mole", "3 moles", "4 moles"],
                exp: "Stoichiometry dictates that 1 mole of CH₄ requires 2 moles of O₂ to yield 1 mole of CO₂ and 2 moles of H₂O.",
                diff: "medium"
            },
            {
                q: "What is the value of Avogadro's constant, representing particles in one mole of substance?",
                a: "6.022 × 10²³",
                w: ["3.00 × 10⁸", "1.602 × 10⁻¹⁹", "9.81 × 10²"],
                exp: "Avogadro's constant (N_A ≈ 6.022 × 10²³ mol⁻¹) defines the exact number of constituent particles per mole.",
                diff: "easy"
            }
        ];

        stoichiometryQuestions.forEach(item => {
            pool.push({
                tag: "Stoichiometry",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 9. Acids, Bases & Gas Laws
        const labQuestions = [
            {
                q: "What is the pH of a neutral pure water solution at 25°C?",
                a: "7.0",
                w: ["0.0", "1.0", "14.0"],
                exp: "At 25°C, autoionization of water produces [H⁺] = 10⁻⁷ M, corresponding to pH = -log(10⁻⁷) = 7.0.",
                diff: "easy"
            },
            {
                q: "Phenolphthalein indicator changes from clear/colorless to vibrant magenta-pink in what type of solution?",
                a: "Basic (pH > 8.2)",
                w: ["Acidic (pH < 7)", "Neutral (pH = 7)", "Supercooled Liquid"],
                exp: "Phenolphthalein's molecular structure deprotonates above pH 8.2, producing a conjugated pink quinoid dianion.",
                diff: "medium"
            },
            {
                q: "According to Boyle's Law, when the volume of an ideal gas is halved at constant temperature, the pressure:",
                a: "Doubles",
                w: ["Is Halved", "Remains Unchanged", "Drops to Zero"],
                exp: "Boyle's law states P₁V₁ = P₂V₂, meaning pressure and volume are inversely proportional at constant temperature.",
                diff: "medium"
            },
            {
                q: "In the Ideal Gas equation PV = nRT, what is the value of the gas constant 'R' in units of L·atm/(mol·K)?",
                a: "0.0821",
                w: ["8.314", "62.36", "1.987"],
                exp: "The universal gas constant R = 0.082057 L·atm/(mol·K) (or 8.314 J/(mol·K) in SI units).",
                diff: "hard"
            }
        ];

        labQuestions.forEach(item => {
            pool.push({
                tag: "Lab & Gas Laws",
                difficulty: item.diff,
                question: item.q,
                options: shuffleArray([item.a, ...item.w]),
                answer: item.a,
                explanation: item.exp
            });
        });

        // 10. Sampled Element Facts from Periodic Table Dataset
        const sampledFactNumbers = [
            4, 5, 12, 13, 20, 22, 24, 30, 31, 32, 33, 34, 38, 47, 56, 74, 76, 79, 83, 84, 88, 90, 92, 94, 96, 99, 101, 102, 107, 118
        ];

        sampledFactNumbers.forEach(atomicNum => {
            const el = elementsData.find(e => e.n === atomicNum);
            if (!el || !el.fact) return;

            const categoryWrongs = elementsData.filter(e => e.n !== el.n && e.cat === el.cat).map(e => e.name);
            const fallbackWrongs = elementsData.filter(e => e.n !== el.n).map(e => e.name);
            const wrongOptions = shuffleArray([...new Set([...categoryWrongs, ...fallbackWrongs])]).slice(0, 3);

            pool.push({
                tag: "Element Discoveries",
                difficulty: "medium",
                question: `Which chemical element is characterized by this property: "${el.fact}"?`,
                options: shuffleArray([el.name, ...wrongOptions]),
                answer: el.name,
                explanation: `${el.name} (${el.s}, Atomic # ${el.n}): ${el.fact}`
            });
        });

        return pool;
    }

    // Question Deck Cycle State Manager
    let quizCycleNumber = 1;
    let masterPool = buildMasterQuestionPool();
    let unaskedQuestionDeck = shuffleArray(masterPool);
    let activeQuizQuestions = [];
    let currentQuizIndex = 0;
    let quizScoreVal = 0;
    const QUIZ_ROUND_SIZE = 10;

    function updateCyclePills() {
        if (cyclePill) cyclePill.textContent = `Cycle ${quizCycleNumber} • Non-Repeating Deck`;
        if (poolPill) poolPill.textContent = `${unaskedQuestionDeck.length} Questions Remaining in Cycle`;
    }
    updateCyclePills();

    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', () => {
            const diff = difficultySelect ? difficultySelect.value : 'mixed';
            
            // Filter unasked deck based on difficulty or use mixed
            let candidateDeck = unaskedQuestionDeck;
            if (diff !== 'mixed') {
                candidateDeck = unaskedQuestionDeck.filter(q => q.difficulty === diff);
                // If fewer than 10 match this difficulty, fall back to mixed from the deck
                if (candidateDeck.length < QUIZ_ROUND_SIZE) {
                    candidateDeck = unaskedQuestionDeck;
                }
            }

            // Check if deck needs replenishment to guarantee 10 brand-new questions
            if (unaskedQuestionDeck.length < QUIZ_ROUND_SIZE) {
                quizCycleNumber++;
                unaskedQuestionDeck = shuffleArray(masterPool);
                candidateDeck = unaskedQuestionDeck;
            }

            // Pop exactly 10 unique questions from the cycle deck
            activeQuizQuestions = [];
            for (let i = 0; i < QUIZ_ROUND_SIZE; i++) {
                // Find a question from candidate deck that is in unaskedQuestionDeck
                const q = candidateDeck.find(cand => unaskedQuestionDeck.includes(cand)) || unaskedQuestionDeck[0];
                activeQuizQuestions.push(q);
                // Remove from the master unasked deck so it CANNOT repeat in this cycle
                const idx = unaskedQuestionDeck.indexOf(q);
                if (idx > -1) unaskedQuestionDeck.splice(idx, 1);
                const candIdx = candidateDeck.indexOf(q);
                if (candIdx > -1) candidateDeck.splice(candIdx, 1);
            }

            currentQuizIndex = 0;
            quizScoreVal = 0;
            updateCyclePills();

            quizSetup.classList.add('hidden');
            if (quizResults) quizResults.classList.add('hidden');
            quizContainer.classList.remove('hidden');

            renderQuizQuestion();
        });

        function renderQuizQuestion() {
            nextQuizBtn.style.display = 'none';
            quizExplanation.classList.add('hidden');
            quizExplanation.innerHTML = '';
            quizOptionsContainer.innerHTML = '';

            const total = activeQuizQuestions.length;
            if (currentQuizIndex >= total) {
                showQuizResults();
                return;
            }

            const currentQ = activeQuizQuestions[currentQuizIndex];
            quizTracker.textContent = `Question ${currentQuizIndex + 1} of ${total}`;
            if (quizCycleStatus) quizCycleStatus.textContent = `Cycle ${quizCycleNumber}`;
            if (quizProgressFill) {
                quizProgressFill.style.width = `${((currentQuizIndex + 1) / total) * 100}%`;
            }
            if (quizTag) quizTag.textContent = currentQ.tag;
            quizQuestion.textContent = currentQ.question;

            currentQ.options.forEach(opt => {
                const optBtn = document.createElement('div');
                optBtn.className = 'quiz-option';
                optBtn.textContent = opt;
                optBtn.addEventListener('click', () => handleOptionSelection(optBtn, opt, currentQ));
                quizOptionsContainer.appendChild(optBtn);
            });

            quizScore.textContent = `Score: ${quizScoreVal} / ${total}`;
        }

        function handleOptionSelection(selectedBtn, selectedText, questionObj) {
            const allOptions = quizOptionsContainer.querySelectorAll('.quiz-option');
            allOptions.forEach(opt => opt.style.pointerEvents = 'none');

            const isCorrect = (selectedText === questionObj.answer);
            if (isCorrect) {
                selectedBtn.classList.add('correct');
                quizScoreVal++;
            } else {
                selectedBtn.classList.add('incorrect');
                allOptions.forEach(opt => {
                    if (opt.textContent === questionObj.answer) {
                        opt.classList.add('correct');
                    }
                });
            }

            quizScore.textContent = `Score: ${quizScoreVal} / ${activeQuizQuestions.length}`;
            quizExplanation.innerHTML = `<strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${questionObj.explanation}`;
            quizExplanation.classList.remove('hidden');

            nextQuizBtn.style.display = 'inline-block';
        }

        nextQuizBtn.addEventListener('click', () => {
            currentQuizIndex++;
            renderQuizQuestion();
        });

        function showQuizResults() {
            quizContainer.classList.add('hidden');
            quizResults.classList.remove('hidden');

            const total = activeQuizQuestions.length;
            const pct = Math.round((quizScoreVal / total) * 100);

            let rankTitle = "📚 Chemistry Student";
            if (pct === 100) rankTitle = "🏆 Nobel Laureate in Chemistry";
            else if (pct >= 80) rankTitle = "⚗️ Master Chemist";
            else if (pct >= 60) rankTitle = "🔬 Senior Lab Scientist";
            else if (pct >= 40) rankTitle = "🧪 Chemistry Apprentice";

            quizResults.innerHTML = `
                <div class="result-score-circle">
                    <span class="result-pct">${pct}%</span>
                    <span class="result-fraction">${quizScoreVal} / ${total} Correct</span>
                </div>
                <div class="result-rank">${rankTitle}</div>
                <div class="result-cycle-msg">
                    <strong>Cycle ${quizCycleNumber} Active:</strong> All 10 questions in this quiz were completely unique!
                    <br>${unaskedQuestionDeck.length} new questions remain in this cycle before questions repeat.
                </div>
                <div class="result-actions">
                    <button id="restart-quiz-btn" class="action-btn">Next 10 Questions (Cycle ${quizCycleNumber})</button>
                    <button id="reset-deck-btn" class="action-btn" style="background: rgba(255,255,255,0.1); color:#fff; border:1px solid rgba(255,255,255,0.3);">Reset Cycle Deck</button>
                </div>
            `;

            document.getElementById('restart-quiz-btn').addEventListener('click', () => {
                quizResults.classList.add('hidden');
                quizSetup.classList.remove('hidden');
                startQuizBtn.click();
            });

            document.getElementById('reset-deck-btn').addEventListener('click', () => {
                quizCycleNumber = 1;
                unaskedQuestionDeck = shuffleArray(masterPool);
                updateCyclePills();
                quizResults.classList.add('hidden');
                quizSetup.classList.remove('hidden');
            });
        }
    }

    // =========================================================================
    // --- Advanced Feature 2: 3D Molecular Geometry & VSEPR Explorer ---
    // =========================================================================
    let molScene, molCamera, molRenderer, molControls, molGroup;
    let molAutoRotate = true;
    let molAnimId = null;

    const moleculeLibrary = {
        "H2O": {
            name: "Water",
            formula: "H₂O",
            shape: "Bent",
            electronGeom: "Tetrahedral",
            angle: "104.5°",
            hybrid: "sp³",
            polarity: "Polar (μ = 1.85 D)",
            steric: "4 (2 bonds, 2 lone pairs)",
            desc: "Water has a bent geometry caused by the two non-bonding lone pairs on oxygen exerting strong repulsion against the O-H bonding pairs, squeezing the ideal tetrahedral angle from 109.5° down to 104.5°.",
            atoms: [
                { el: "O", pos: [0, 0, 0], r: 0.5, c: 0xe74c3c },
                { el: "H", pos: [0.76, 0.58, 0], r: 0.28, c: 0xffffff },
                { el: "H", pos: [-0.76, 0.58, 0], r: 0.28, c: 0xffffff }
            ],
            bonds: [[0, 1], [0, 2]]
        },
        "CO2": {
            name: "Carbon Dioxide",
            formula: "CO₂",
            shape: "Linear",
            electronGeom: "Linear",
            angle: "180°",
            hybrid: "sp",
            polarity: "Non-polar (μ = 0 D)",
            steric: "2 (2 double bonds, 0 lone pairs)",
            desc: "Carbon forms two double bonds with terminal oxygen atoms. With zero lone pairs on the central carbon, the two electron domains repel to opposite sides at 180°, creating an entirely non-polar symmetrical molecule.",
            atoms: [
                { el: "C", pos: [0, 0, 0], r: 0.48, c: 0x555555 },
                { el: "O", pos: [1.2, 0, 0], r: 0.5, c: 0xe74c3c },
                { el: "O", pos: [-1.2, 0, 0], r: 0.5, c: 0xe74c3c }
            ],
            bonds: [[0, 1], [0, 2]]
        },
        "CH4": {
            name: "Methane",
            formula: "CH₄",
            shape: "Tetrahedral",
            electronGeom: "Tetrahedral",
            angle: "109.5°",
            hybrid: "sp³",
            polarity: "Non-polar (μ = 0 D)",
            steric: "4 (4 single bonds, 0 lone pairs)",
            desc: "The central carbon forms four equivalent sp³ hybridized bonds with hydrogen. Equal repulsion among all 4 domains forms a symmetrical 3D tetrahedron with bond angles of exactly 109.5°.",
            atoms: [
                { el: "C", pos: [0, 0, 0], r: 0.48, c: 0x555555 },
                { el: "H", pos: [0.65, 0.65, 0.65], r: 0.28, c: 0xffffff },
                { el: "H", pos: [-0.65, -0.65, 0.65], r: 0.28, c: 0xffffff },
                { el: "H", pos: [-0.65, 0.65, -0.65], r: 0.28, c: 0xffffff },
                { el: "H", pos: [0.65, -0.65, -0.65], r: 0.28, c: 0xffffff }
            ],
            bonds: [[0, 1], [0, 2], [0, 3], [0, 4]]
        },
        "NH3": {
            name: "Ammonia",
            formula: "NH₃",
            shape: "Trigonal Pyramidal",
            electronGeom: "Tetrahedral",
            angle: "107.0°",
            hybrid: "sp³",
            polarity: "Polar (μ = 1.47 D)",
            steric: "4 (3 bonds, 1 lone pair)",
            desc: "Nitrogen has one lone pair of electrons occupying one vertex of a tetrahedral electron geometry. Lone-pair-bonding-pair repulsion compresses the H-N-H bond angles to 107.0°.",
            atoms: [
                { el: "N", pos: [0, 0.2, 0], r: 0.5, c: 0x3498db },
                { el: "H", pos: [0.94, -0.25, 0], r: 0.28, c: 0xffffff },
                { el: "H", pos: [-0.47, -0.25, 0.81], r: 0.28, c: 0xffffff },
                { el: "H", pos: [-0.47, -0.25, -0.81], r: 0.28, c: 0xffffff }
            ],
            bonds: [[0, 1], [0, 2], [0, 3]]
        },
        "BF3": {
            name: "Boron Trifluoride",
            formula: "BF₃",
            shape: "Trigonal Planar",
            electronGeom: "Trigonal Planar",
            angle: "120.0°",
            hybrid: "sp²",
            polarity: "Non-polar (μ = 0 D)",
            steric: "3 (3 bonds, 0 lone pairs)",
            desc: "Boron has an incomplete octet with 6 valence electrons distributed in an sp² hybridized plane. The 3 B-F bonds repel equally at 120°, cancelling all dipole vectors.",
            atoms: [
                { el: "B", pos: [0, 0, 0], r: 0.45, c: 0xff9ff3 },
                { el: "F", pos: [0, 1.25, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [1.08, -0.62, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [-1.08, -0.62, 0], r: 0.42, c: 0x2ecc71 }
            ],
            bonds: [[0, 1], [0, 2], [0, 3]]
        },
        "SF6": {
            name: "Sulfur Hexafluoride",
            formula: "SF₆",
            shape: "Octahedral",
            electronGeom: "Octahedral",
            angle: "90° & 180°",
            hybrid: "sp³d²",
            polarity: "Non-polar (μ = 0 D)",
            steric: "6 (6 bonds, 0 lone pairs)",
            desc: "Sulfur exhibits an expanded octet (12 valence electrons) with sp³d² hybridization. The 6 Fluorine atoms occupy the vertices of a regular octahedron with 90° bond angles.",
            atoms: [
                { el: "S", pos: [0, 0, 0], r: 0.55, c: 0xf1c40f },
                { el: "F", pos: [1.2, 0, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [-1.2, 0, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [0, 1.2, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [0, -1.2, 0], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [0, 0, 1.2], r: 0.42, c: 0x2ecc71 },
                { el: "F", pos: [0, 0, -1.2], r: 0.42, c: 0x2ecc71 }
            ],
            bonds: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]]
        },
        "PCl5": {
            name: "Phosphorus Pentachloride",
            formula: "PCl₅",
            shape: "Trigonal Bipyramidal",
            electronGeom: "Trigonal Bipyramidal",
            angle: "90° (axial) & 120° (equatorial)",
            hybrid: "sp³d",
            polarity: "Non-polar (μ = 0 D)",
            steric: "5 (5 bonds, 0 lone pairs)",
            desc: "Expanded octet with 5 domains: 3 equatorial chlorine atoms arranged in a flat triangle at 120° angles, and 2 axial chlorine atoms positioned along the z-axis at 90°.",
            atoms: [
                { el: "P", pos: [0, 0, 0], r: 0.52, c: 0xe67e22 },
                { el: "Cl", pos: [1.2, 0, 0], r: 0.45, c: 0x2ecc71 },
                { el: "Cl", pos: [-0.6, 1.04, 0], r: 0.45, c: 0x2ecc71 },
                { el: "Cl", pos: [-0.6, -1.04, 0], r: 0.45, c: 0x2ecc71 },
                { el: "Cl", pos: [0, 0, 1.35], r: 0.45, c: 0x2ecc71 },
                { el: "Cl", pos: [0, 0, -1.35], r: 0.45, c: 0x2ecc71 }
            ],
            bonds: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]
        },
        "O3": {
            name: "Ozone",
            formula: "O₃",
            shape: "Bent Resonance",
            electronGeom: "Trigonal Planar",
            angle: "116.8°",
            hybrid: "sp²",
            polarity: "Polar (μ = 0.53 D)",
            steric: "3 (2 bonds, 1 lone pair)",
            desc: "Central oxygen has 1 lone pair and resonance between single and double bonds with terminal oxygens. The lone pair compresses the ideal 120° angle down to 116.8°.",
            atoms: [
                { el: "O", pos: [0, 0.3, 0], r: 0.5, c: 0xe74c3c },
                { el: "O", pos: [1.1, -0.3, 0], r: 0.5, c: 0xe74c3c },
                { el: "O", pos: [-1.1, -0.3, 0], r: 0.5, c: 0xe74c3c }
            ],
            bonds: [[0, 1], [0, 2]]
        },
        "HCN": {
            name: "Hydrogen Cyanide",
            formula: "HCN",
            shape: "Linear",
            electronGeom: "Linear",
            angle: "180°",
            hybrid: "sp",
            polarity: "Polar (μ = 2.98 D)",
            steric: "2 (1 single, 1 triple bond)",
            desc: "Carbon forms a single bond to hydrogen and a triple bond to nitrogen. Because nitrogen is much more electronegative than carbon and hydrogen, HCN possesses a strong net dipole.",
            atoms: [
                { el: "C", pos: [0, 0, 0], r: 0.48, c: 0x555555 },
                { el: "H", pos: [-1.06, 0, 0], r: 0.28, c: 0xffffff },
                { el: "N", pos: [1.15, 0, 0], r: 0.5, c: 0x3498db }
            ],
            bonds: [[0, 1], [0, 2]]
        },
        "C2H5OH": {
            name: "Ethanol",
            formula: "C₂H₅OH",
            shape: "Organic Alcohol",
            electronGeom: "Tetrahedral & Bent",
            angle: "109.5° (C) & 104.5° (O)",
            hybrid: "sp³",
            polarity: "Polar (μ = 1.69 D)",
            steric: "Multiple Carbon & Oxygen Centers",
            desc: "Contains a hydrophobic ethyl group (CH₃-CH₂-) attached to a hydrophilic polar hydroxyl (-OH) group capable of hydrogen bonding, explaining its water miscibility.",
            atoms: [
                { el: "C", pos: [-0.7, 0, 0], r: 0.45, c: 0x555555 },
                { el: "C", pos: [0.65, 0.4, 0], r: 0.45, c: 0x555555 },
                { el: "O", pos: [1.45, -0.6, 0], r: 0.48, c: 0xe74c3c },
                { el: "H", pos: [2.25, -0.3, 0], r: 0.26, c: 0xffffff },
                { el: "H", pos: [-1.2, 0.8, 0.4], r: 0.26, c: 0xffffff },
                { el: "H", pos: [-0.8, -0.7, 0.7], r: 0.26, c: 0xffffff },
                { el: "H", pos: [-1.0, -0.4, -0.8], r: 0.26, c: 0xffffff },
                { el: "H", pos: [0.8, 0.9, 0.8], r: 0.26, c: 0xffffff },
                { el: "H", pos: [0.7, 1.1, -0.7], r: 0.26, c: 0xffffff }
            ],
            bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]]
        }
    };

    window.initMoleculeViewer = function() {
        const container = document.getElementById('molecule-3d-container');
        if (!container || typeof THREE === 'undefined') return;

        if (!molRenderer) {
            molScene = new THREE.Scene();
            const w = container.clientWidth || 500;
            const h = container.clientHeight || 420;

            molCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
            molCamera.position.set(0, 0, 4.5);

            molRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            molRenderer.setSize(w, h);
            molRenderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(molRenderer.domElement);

            if (typeof THREE.OrbitControls !== 'undefined') {
                molControls = new THREE.OrbitControls(molCamera, molRenderer.domElement);
                molControls.enableDamping = true;
                molControls.dampingFactor = 0.05;
            }

            const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
            molScene.add(ambLight);
            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
            dirLight1.position.set(5, 5, 5);
            molScene.add(dirLight1);
            const dirLight2 = new THREE.DirectionalLight(0x48dbfb, 0.4);
            dirLight2.position.set(-5, -5, -5);
            molScene.add(dirLight2);

            molGroup = new THREE.Group();
            molScene.add(molGroup);

            // Responsive resize observer
            const resizeObs = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const width = entry.contentRect.width;
                    const height = entry.contentRect.height;
                    if (width > 0 && height > 0 && molRenderer && molCamera) {
                        molRenderer.setSize(width, height);
                        molCamera.aspect = width / height;
                        molCamera.updateProjectionMatrix();
                    }
                }
            });
            resizeObs.observe(container);

            function animateMol() {
                const tabMol = document.getElementById('tab-molecules');
                if (!tabMol || !tabMol.classList.contains('active')) {
                    molAnimId = null;
                    return;
                }
                molAnimId = requestAnimationFrame(animateMol);
                if (molAutoRotate && molGroup) {
                    molGroup.rotation.y += 0.006;
                    molGroup.rotation.x += 0.003;
                }
                if (molControls) molControls.update();
                molRenderer.render(molScene, molCamera);
            }
            animateMol();

            resumeMolAnimation = function() {
                if (!molAnimId && molRenderer) {
                    animateMol();
                }
            };

            const selectEl = document.getElementById('molecule-select');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => loadMoleculeData(e.target.value));
            }

            const spinBtn = document.getElementById('toggle-molecule-spin-btn');
            if (spinBtn) {
                spinBtn.addEventListener('click', () => {
                    molAutoRotate = !molAutoRotate;
                    spinBtn.textContent = molAutoRotate ? 'Pause Auto-Rotate' : 'Resume Auto-Rotate';
                });
            }

            loadMoleculeData('H2O');
        } else {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                molRenderer.setSize(w, h);
                molCamera.aspect = w / h;
                molCamera.updateProjectionMatrix();
            }
            if (!molAnimId && typeof resumeMolAnimation === 'function') {
                resumeMolAnimation();
            }
        }
    };

    function loadMoleculeData(molKey) {
        const mol = moleculeLibrary[molKey];
        if (!mol || !molGroup) return;

        // Clear existing atoms & bonds
        while (molGroup.children.length > 0) {
            molGroup.remove(molGroup.children[0]);
        }

        // Add atoms
        const atomSpheres = [];
        mol.atoms.forEach(a => {
            const geom = new THREE.SphereGeometry(a.r, 32, 32);
            const mat = new THREE.MeshPhongMaterial({
                color: a.c,
                shininess: 90,
                specular: 0x444444
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(a.pos[0], a.pos[1], a.pos[2]);
            molGroup.add(mesh);
            atomSpheres.push(mesh.position);
        });

        // Add bonds
        mol.bonds.forEach(pair => {
            const p1 = atomSpheres[pair[0]];
            const p2 = atomSpheres[pair[1]];
            const dist = p1.distanceTo(p2);

            const cylinderGeom = new THREE.CylinderGeometry(0.08, 0.08, dist, 16);
            const cylinderMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
            const cylinderMesh = new THREE.Mesh(cylinderGeom, cylinderMat);

            const mid = p1.clone().add(p2).multiplyScalar(0.5);
            cylinderMesh.position.copy(mid);

            const orientation = new THREE.Matrix4();
            orientation.lookAt(p1, p2, new THREE.Vector3(0, 1, 0));
            orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
            cylinderMesh.applyMatrix4(orientation);

            molGroup.add(cylinderMesh);
        });

        // Update UI Panel
        document.getElementById('mol-name').textContent = mol.name;
        document.getElementById('mol-formula').textContent = mol.formula;
        document.getElementById('mol-shape').textContent = mol.shape;
        document.getElementById('mol-e-geom').textContent = mol.electronGeom;
        document.getElementById('mol-angle').textContent = mol.angle;
        document.getElementById('mol-hybrid').textContent = mol.hybrid;
        document.getElementById('mol-polarity').textContent = mol.polarity;
        document.getElementById('mol-steric').textContent = mol.steric;
        document.getElementById('mol-desc').textContent = mol.desc;
    }

    // =========================================================================
    // --- Advanced Feature 3: Gas Laws & Molecular Kinetics Simulator ---
    // =========================================================================
    let gasCanvas, gasCtx;
    let gasParticles = [];
    let gasAnimId = null;
    let gasT = 273.15; // Kelvin
    let gasV = 22.4;   // Liters
    let gasN = 1.0;    // Moles
    let gasMolarMass = 28.0; // Nitrogen default (g/mol)
    let currentGasMode = 'ideal';

    const gasMolarMasses = {
        "He": 4.0,
        "Ne": 20.2,
        "N2": 28.0,
        "O2": 32.0,
        "CO2": 44.0
    };

    window.initGasSimulator = function() {
        gasCanvas = document.getElementById('gas-canvas');
        if (!gasCanvas) return;
        gasCtx = gasCanvas.getContext('2d');

        const tempSlider = document.getElementById('gas-temp-slider');
        const volSlider = document.getElementById('gas-vol-slider');
        const molSlider = document.getElementById('gas-mol-slider');
        const typeSelect = document.getElementById('gas-type-select');
        const modeBtns = document.querySelectorAll('.gas-mode-btn');
        const burnerFlame = document.getElementById('burner-flame');

        function calculatePressure() {
            // P = nRT / V  (R = 0.08206 L*atm / mol*K)
            const P = (gasN * 0.08206 * gasT) / gasV;
            const P_kpa = P * 101.325;

            document.getElementById('gas-p-val').innerHTML = `${P.toFixed(2)} <small>atm</small>`;
            document.getElementById('gas-p-kpa').textContent = `${P_kpa.toFixed(1)} kPa`;
            document.getElementById('gas-v-val').innerHTML = `${gasV.toFixed(1)} <small>L</small>`;
            document.getElementById('gas-t-val').innerHTML = `${gasT.toFixed(1)} <small>K</small>`;
            document.getElementById('gas-t-c').textContent = `${(gasT - 273.15).toFixed(1)} °C`;
            document.getElementById('gas-n-val').innerHTML = `${gasN.toFixed(2)} <small>mol</small>`;

            document.getElementById('temp-label').textContent = `${Math.round(gasT)} K`;
            document.getElementById('vol-label').textContent = `${gasV.toFixed(1)} L`;
            document.getElementById('mol-label').textContent = `${gasN.toFixed(2)} mol`;

            // Flame visual adjustments
            if (burnerFlame) {
                if (gasT > 320) {
                    burnerFlame.style.display = 'block';
                    const scale = Math.min(2.0, (gasT - 300) / 150);
                    burnerFlame.style.transform = `scale(${scale})`;
                } else {
                    burnerFlame.style.display = 'none';
                }
            }
        }

        function createParticles() {
            const count = Math.min(100, Math.max(15, Math.round(gasN * 45)));
            gasParticles = [];
            const speed = Math.sqrt(gasT / gasMolarMass) * 1.6;

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                gasParticles.push({
                    x: 40 + Math.random() * 320,
                    y: 100 + Math.random() * 220,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    r: 4
                });
            }
        }

        // Sliders event listeners
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                gasT = parseFloat(e.target.value);
                if (currentGasMode === 'charles') {
                    // Charles: P is constant -> V = (nRT) / P_fixed
                    const P_fixed = 1.0;
                    gasV = Math.min(40, Math.max(5, (gasN * 0.08206 * gasT) / P_fixed));
                    volSlider.value = gasV;
                }
                calculatePressure();
                updateParticleVelocities();
            });
        }

        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                gasV = parseFloat(e.target.value);
                calculatePressure();
            });
        }

        if (molSlider) {
            molSlider.addEventListener('input', (e) => {
                gasN = parseFloat(e.target.value);
                createParticles();
                calculatePressure();
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                gasMolarMass = gasMolarMasses[e.target.value] || 28.0;
                updateParticleVelocities();
            });
        }

        // Cool and Heat buttons
        const coolBtn = document.getElementById('cool-gas-btn');
        const heatBtn = document.getElementById('heat-gas-btn');
        if (coolBtn) {
            coolBtn.addEventListener('click', () => {
                gasT = Math.max(100, gasT - 25);
                tempSlider.value = gasT;
                tempSlider.dispatchEvent(new Event('input'));
            });
        }
        if (heatBtn) {
            heatBtn.addEventListener('click', () => {
                gasT = Math.min(700, gasT + 25);
                tempSlider.value = gasT;
                tempSlider.dispatchEvent(new Event('input'));
            });
        }

        // Gas Law Mode Buttons
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentGasMode = btn.dataset.mode;

                const expBox = document.getElementById('gas-law-explanation');
                if (currentGasMode === 'boyle') {
                    volSlider.disabled = false;
                    tempSlider.disabled = true;
                    expBox.textContent = "Boyle's Law (T & n constant): Pressure and Volume are inversely proportional (P ∝ 1/V). Compressing volume doubles particle collisions.";
                } else if (currentGasMode === 'charles') {
                    volSlider.disabled = true;
                    tempSlider.disabled = false;
                    expBox.textContent = "Charles's Law (P & n constant): Volume is directly proportional to absolute Temperature (V ∝ T). Heating gas drives the piston upward to maintain constant pressure.";
                } else if (currentGasMode === 'gay-lussac') {
                    volSlider.disabled = true;
                    tempSlider.disabled = false;
                    expBox.textContent = "Gay-Lussac's Law (V & n constant): Pressure is directly proportional to Temperature (P ∝ T). Fast-moving particles impart higher momentum on the rigid walls.";
                } else {
                    volSlider.disabled = false;
                    tempSlider.disabled = false;
                    expBox.textContent = "Ideal Gas Law: P = (n · R · T) / V. Freely adjust any parameter and observe the thermodynamic response in real time.";
                }
            });
        });

        function updateParticleVelocities() {
            const targetSpeed = Math.sqrt(gasT / gasMolarMass) * 1.6;
            gasParticles.forEach(p => {
                const currentAngle = Math.atan2(p.vy, p.vx);
                p.vx = Math.cos(currentAngle) * targetSpeed;
                p.vy = Math.sin(currentAngle) * targetSpeed;
            });
        }

        // Animation Loop
        function renderGas() {
            const tabGas = document.getElementById('tab-gas');
            if (!tabGas || !tabGas.classList.contains('active')) {
                gasAnimId = null;
                return;
            }
            gasAnimId = requestAnimationFrame(renderGas);
            if (!gasCtx) return;

            const w = gasCanvas.width;
            const h = gasCanvas.height;
            gasCtx.clearRect(0, 0, w, h);

            // Calculate movable piston position based on Volume V (5 to 40 L)
            const minPistonY = 40;
            const maxPistonY = 280;
            const pistonY = maxPistonY - ((gasV - 5) / (40 - 5)) * (maxPistonY - minPistonY);

            // Draw Glass Chamber Walls
            gasCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            gasCtx.lineWidth = 4;
            gasCtx.beginPath();
            gasCtx.moveTo(30, 20);
            gasCtx.lineTo(30, 350);
            gasCtx.lineTo(370, 350);
            gasCtx.lineTo(370, 20);
            gasCtx.stroke();

            // Draw Piston
            const pistonGrad = gasCtx.createLinearGradient(32, pistonY, 368, pistonY + 16);
            pistonGrad.addColorStop(0, "#747d8c");
            pistonGrad.addColorStop(0.5, "#ced6e0");
            pistonGrad.addColorStop(1, "#2f3542");

            gasCtx.fillStyle = pistonGrad;
            gasCtx.fillRect(32, pistonY, 336, 16);
            gasCtx.strokeStyle = "#48dbfb";
            gasCtx.lineWidth = 1;
            gasCtx.strokeRect(32, pistonY, 336, 16);

            // Piston rod
            gasCtx.fillStyle = "#a4b0be";
            gasCtx.fillRect(190, 0, 20, pistonY);

            // Draw and update gas particles
            gasCtx.fillStyle = (gasT > 400) ? "#ff7675" : "#48dbfb";
            gasParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                // Collide with left & right walls
                if (p.x - p.r <= 32) {
                    p.x = 32 + p.r;
                    p.vx = -p.vx;
                } else if (p.x + p.r >= 368) {
                    p.x = 368 - p.r;
                    p.vx = -p.vx;
                }

                // Collide with bottom cylinder floor
                if (p.y + p.r >= 348) {
                    p.y = 348 - p.r;
                    p.vy = -p.vy;
                }

                // Collide with movable piston ceiling
                if (p.y - p.r <= pistonY + 16) {
                    p.y = pistonY + 16 + p.r;
                    p.vy = Math.abs(p.vy);
                }

                gasCtx.beginPath();
                gasCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                gasCtx.fill();
            });
        }

        resumeGasAnimation = function() {
            if (!gasAnimId && gasCanvas) {
                renderGas();
            }
        };

        createParticles();
        calculatePressure();
        if (!gasAnimId) renderGas();
    };

    // =========================================================================
    // --- Advanced Feature 4: Element Comparison Inspector ---
    // =========================================================================
    window.initElementComparison = function() {
        const selectA = document.getElementById('compare-el-a');
        const selectB = document.getElementById('compare-el-b');
        if (!selectA || !selectB) return;

        // Populate dropdowns if empty
        if (selectA.children.length === 0) {
            elementsData.forEach(el => {
                const optA = document.createElement('option');
                optA.value = el.n;
                optA.textContent = `${el.n}. ${el.name} (${el.s})`;
                selectA.appendChild(optA);

                const optB = document.createElement('option');
                optB.value = el.n;
                optB.textContent = `${el.n}. ${el.name} (${el.s})`;
                selectB.appendChild(optB);
            });

            // Default selections: Carbon vs Silicon
            selectA.value = "6";  // Carbon
            selectB.value = "14"; // Silicon
        }

        function renderComparison() {
            const numA = parseInt(selectA.value);
            const numB = parseInt(selectB.value);

            const elA = elementsData.find(e => e.n === numA);
            const elB = elementsData.find(e => e.n === numB);
            if (!elA || !elB) return;

            // Trend metrics data dictionary (Electronegativity, Radius, Ionization Energy, Melting Point, Density)
            const extendedData = {
                1:  { en: 2.20, rad: 53,  ie: 1312, mp: -259.1, dens: 0.000089 },
                2:  { en: null, rad: 31,  ie: 2372, mp: -272.2, dens: 0.000178 },
                3:  { en: 0.98, rad: 167, ie: 520,  mp: 180.5,  dens: 0.534 },
                4:  { en: 1.57, rad: 112, ie: 899,  mp: 1287,   dens: 1.85 },
                5:  { en: 2.04, rad: 87,  ie: 801,  mp: 2076,   dens: 2.34 },
                6:  { en: 2.55, rad: 67,  ie: 1086, mp: 3550,   dens: 2.26 },
                7:  { en: 3.04, rad: 56,  ie: 1402, mp: -210.0, dens: 0.00125 },
                8:  { en: 3.44, rad: 48,  ie: 1314, mp: -218.8, dens: 0.00143 },
                9:  { en: 3.98, rad: 42,  ie: 1681, mp: -219.6, dens: 0.0017 },
                10: { en: null, rad: 38,  ie: 2080, mp: -248.6, dens: 0.0009 },
                11: { en: 0.93, rad: 190, ie: 496,  mp: 97.8,   dens: 0.97 },
                12: { en: 1.31, rad: 145, ie: 738,  mp: 650.0,  dens: 1.74 },
                13: { en: 1.61, rad: 118, ie: 578,  mp: 660.3,  dens: 2.70 },
                14: { en: 1.90, rad: 111, ie: 786,  mp: 1414,   dens: 2.33 },
                15: { en: 2.19, rad: 98,  ie: 1012, mp: 44.1,   dens: 1.82 },
                16: { en: 2.58, rad: 88,  ie: 1000, mp: 115.2,  dens: 2.07 },
                17: { en: 3.16, rad: 79,  ie: 1251, mp: -101.5, dens: 0.0032 },
                18: { en: null, rad: 71,  ie: 1520, mp: -189.3, dens: 0.00178 },
                19: { en: 0.82, rad: 243, ie: 419,  mp: 63.5,   dens: 0.86 },
                20: { en: 1.00, rad: 194, ie: 590,  mp: 842.0,  dens: 1.54 },
                26: { en: 1.83, rad: 156, ie: 762,  mp: 1538,   dens: 7.87 },
                29: { en: 1.90, rad: 145, ie: 745,  mp: 1085,   dens: 8.96 },
                74: { en: 2.36, rad: 139, ie: 770,  mp: 3422,   dens: 19.3 },
                79: { en: 2.54, rad: 144, ie: 890,  mp: 1064,   dens: 19.3 },
                80: { en: 2.00, rad: 151, ie: 1007, mp: -38.8,  dens: 13.53 },
                92: { en: 1.38, rad: 175, ie: 598,  mp: 1132,   dens: 19.1 }
            };

            const dataA = extendedData[numA] || { en: 1.5, rad: 140, ie: 750, mp: 500, dens: 5.0 };
            const dataB = extendedData[numB] || { en: 1.5, rad: 140, ie: 750, mp: 500, dens: 5.0 };

            // Render Card A
            document.getElementById('card-el-a').innerHTML = `
                <div class="compare-el-symbol" style="--el-color: var(--${elA.cat});">${elA.s}</div>
                <div class="compare-el-name">${elA.name}</div>
                <div class="compare-el-cat" style="--el-color: var(--${elA.cat});">${elA.cat.toUpperCase()}</div>
                <div class="compare-props-list">
                    <div class="compare-prop-item"><span>Atomic Number:</span> <strong>${elA.n}</strong></div>
                    <div class="compare-prop-item"><span>Atomic Weight:</span> <strong>${elA.w}</strong></div>
                    <div class="compare-prop-item"><span>State at 25°C:</span> <strong>${elA.state}</strong></div>
                    <div class="compare-prop-item"><span>Grid Pos:</span> <strong>Col ${elA.c}, Row ${elA.r}</strong></div>
                </div>
            `;

            // Render Card B
            document.getElementById('card-el-b').innerHTML = `
                <div class="compare-el-symbol" style="--el-color: var(--${elB.cat});">${elB.s}</div>
                <div class="compare-el-name">${elB.name}</div>
                <div class="compare-el-cat" style="--el-color: var(--${elB.cat});">${elB.cat.toUpperCase()}</div>
                <div class="compare-props-list">
                    <div class="compare-prop-item"><span>Atomic Number:</span> <strong>${elB.n}</strong></div>
                    <div class="compare-prop-item"><span>Atomic Weight:</span> <strong>${elB.w}</strong></div>
                    <div class="compare-prop-item"><span>State at 25°C:</span> <strong>${elB.state}</strong></div>
                    <div class="compare-prop-item"><span>Grid Pos:</span> <strong>Col ${elB.c}, Row ${elB.r}</strong></div>
                </div>
            `;

            // Comparison Metrics Panel
            const maxRad = 300;
            const maxEN = 4.0;
            const maxIE = 2500;
            const maxMP = 3600;

            const enA = dataA.en !== null ? dataA.en : 0;
            const enB = dataB.en !== null ? dataB.en : 0;

            const radPctA = Math.min(100, (dataA.rad / maxRad) * 100);
            const radPctB = Math.min(100, (dataB.rad / maxRad) * 100);
            const enPctA = Math.min(100, (enA / maxEN) * 100);
            const enPctB = Math.min(100, (enB / maxEN) * 100);
            const iePctA = Math.min(100, (dataA.ie / maxIE) * 100);
            const iePctB = Math.min(100, (dataB.ie / maxIE) * 100);
            const mpPctA = Math.min(100, (Math.max(0, dataA.mp + 273) / maxMP) * 100);
            const mpPctB = Math.min(100, (Math.max(0, dataB.mp + 273) / maxMP) * 100);

            let analysis = "";
            if (enA > enB) {
                analysis = `<strong>${elA.name}</strong> is more electronegative (${enA} vs ${enB}), pulling electron density more strongly in chemical bonds. `;
            } else if (enB > enA) {
                analysis = `<strong>${elB.name}</strong> is more electronegative (${enB} vs ${enA}), making it more likely to attract bonding electrons. `;
            } else {
                analysis = `Both elements share equivalent electronegativities (${enA}). `;
            }

            if (dataA.rad > dataB.rad) {
                analysis += `<strong>${elA.name}</strong> has a larger atomic radius (${dataA.rad} pm vs ${dataB.rad} pm) due to greater electronic shielding.`;
            } else {
                analysis += `<strong>${elB.name}</strong> has a larger atomic radius (${dataB.rad} pm vs ${dataA.rad} pm).`;
            }

            document.getElementById('compare-metrics').innerHTML = `
                <div class="metric-bar-group">
                    <div class="metric-title-row">
                        <span style="color:#48dbfb;">${elA.s}: ${enA || 'N/A'}</span>
                        <span>Electronegativity (Pauling)</span>
                        <span style="color:#ff9ff3;">${elB.s}: ${enB || 'N/A'}</span>
                    </div>
                    <div class="metric-dual-bar">
                        <div class="metric-fill-a" style="width: ${enPctA}%;"></div>
                        <div class="metric-fill-b" style="width: ${enPctB}%;"></div>
                    </div>
                </div>

                <div class="metric-bar-group">
                    <div class="metric-title-row">
                        <span style="color:#48dbfb;">${elA.s}: ${dataA.rad} pm</span>
                        <span>Atomic Radius</span>
                        <span style="color:#ff9ff3;">${elB.s}: ${dataB.rad} pm</span>
                    </div>
                    <div class="metric-dual-bar">
                        <div class="metric-fill-a" style="width: ${radPctA}%;"></div>
                        <div class="metric-fill-b" style="width: ${radPctB}%;"></div>
                    </div>
                </div>

                <div class="metric-bar-group">
                    <div class="metric-title-row">
                        <span style="color:#48dbfb;">${elA.s}: ${dataA.ie} kJ/mol</span>
                        <span>1st Ionization Energy</span>
                        <span style="color:#ff9ff3;">${elB.s}: ${dataB.ie} kJ/mol</span>
                    </div>
                    <div class="metric-dual-bar">
                        <div class="metric-fill-a" style="width: ${iePctA}%;"></div>
                        <div class="metric-fill-b" style="width: ${iePctB}%;"></div>
                    </div>
                </div>

                <div class="metric-bar-group">
                    <div class="metric-title-row">
                        <span style="color:#48dbfb;">${elA.s}: ${dataA.mp}°C</span>
                        <span>Melting Point</span>
                        <span style="color:#ff9ff3;">${elB.s}: ${dataB.mp}°C</span>
                    </div>
                    <div class="metric-dual-bar">
                        <div class="metric-fill-a" style="width: ${mpPctA}%;"></div>
                        <div class="metric-fill-b" style="width: ${mpPctB}%;"></div>
                    </div>
                </div>

                <div class="head-to-head-summary">
                    ${analysis}
                </div>
            `;
        }

        selectA.addEventListener('change', renderComparison);
        selectB.addEventListener('change', renderComparison);
        renderComparison();
    };

    // =========================================================================
    // --- NCERT Indian Chemistry Curriculum Navigator ---
    // =========================================================================
    const ncertCurriculumData = [
        // Class 9
        {
            classLevel: "class9",
            grade: "Class 9",
            unit: "Chapter 1",
            title: "Matter in Our Surroundings",
            coreTopics: "Physical nature of matter, states of matter (solid, liquid, gas), kinetic theory, effect of temperature and pressure, latent heat of fusion & vaporization, evaporation.",
            examPoints: "Interconversion of states, Kelvin vs Celsius scales (K = °C + 273.15), cooling effect of evaporation.",
            targetTab: "tab-gas",
            toolName: "Open Gas Laws & Kinetics Simulator"
        },
        {
            classLevel: "class9",
            grade: "Class 9",
            unit: "Chapter 2",
            title: "Is Matter Around Us Pure?",
            coreTopics: "Mixtures vs pure substances, homogeneous and heterogeneous mixtures, true solutions, suspensions, colloidal systems (Tyndall effect), separation techniques.",
            examPoints: "Mass percentage of solution, Tyndall effect conditions, physical vs chemical changes.",
            targetTab: "tab-calculator",
            toolName: "Open Solution & Composition Tool"
        },
        {
            classLevel: "class9",
            grade: "Class 9",
            unit: "Chapter 3",
            title: "Atoms and Molecules",
            coreTopics: "Laws of chemical combination (Law of Conservation of Mass, Law of Constant Proportions), Dalton's atomic theory, atomic mass unit (u), molecular mass, mole concept, Avogadro's constant (6.022 × 10²³).",
            examPoints: "Mole-particle-mass interconversions, chemical formula writing by criss-cross valency method.",
            targetTab: "tab-stoichiometry",
            toolName: "Launch Mole Concept & Stoichiometry Lab"
        },
        {
            classLevel: "class9",
            grade: "Class 9",
            unit: "Chapter 4",
            title: "Structure of the Atom",
            coreTopics: "Charged particles in matter, Thomson's model, Rutherford's α-scattering gold foil experiment, Bohr's model of atom, subatomic particles, electron distribution in shells (2n² rule), valency, isotopes and isobars.",
            examPoints: "Bohr-Bury scheme, electronic structures, fractional atomic mass of Chlorine (35.5 u).",
            targetTab: "tab-bohr",
            toolName: "Launch 3D Bohr Model & Electron Shells"
        },
        // Class 10
        {
            classLevel: "class10",
            grade: "Class 10",
            unit: "Chapter 1",
            title: "Chemical Reactions and Equations",
            coreTopics: "Characteristics of chemical reactions, writing and balancing chemical equations, types of reactions: combination, decomposition, displacement, double displacement, oxidation and reduction (redox), corrosion, rancidity.",
            examPoints: "Balancing by hit-and-trial method, identifying oxidizing and reducing agents, exothermic vs endothermic reactions.",
            targetTab: "tab-rxn-types",
            toolName: "Explore NCERT Reaction Types"
        },
        {
            classLevel: "class10",
            grade: "Class 10",
            unit: "Chapter 2",
            title: "Acids, Bases and Salts",
            coreTopics: "Chemical properties of acids and bases, reaction with metals, metal carbonates, pH scale (-log[H⁺]), universal indicators, importance of pH in everyday life, chemicals from common salt (NaOH, bleaching powder, baking soda, washing soda, Plaster of Paris).",
            examPoints: "Acid-base neutralization, indicator color changes (phenolphthalein, litmus, methyl orange), water of crystallization.",
            targetTab: "tab-lab",
            toolName: "Launch Virtual Titration & pH Lab"
        },
        {
            classLevel: "class10",
            grade: "Class 10",
            unit: "Chapter 3",
            title: "Metals and Non-metals",
            coreTopics: "Physical and chemical properties of metals and non-metals, reactivity series, formation and properties of ionic compounds, basic metallurgical principles, extraction of metals, refining, corrosion prevention.",
            examPoints: "Electron dot structures of NaCl and MgCl₂, reactivity series displacement, roasting vs calcination.",
            targetTab: "tab-compare",
            toolName: "Launch Element Comparison Inspector"
        },
        {
            classLevel: "class10",
            grade: "Class 10",
            unit: "Chapter 4",
            title: "Carbon and Its Compounds",
            coreTopics: "Covalent bonding in carbon compounds, versatile nature of carbon (catenation, tetravalency), saturated and unsaturated hydrocarbons, homologous series, functional groups, chemical properties of carbon compounds.",
            examPoints: "Nomenclature, combustion, oxidation, addition and substitution reactions, soap and micelle mechanism.",
            targetTab: "tab-molecules",
            toolName: "Launch 3D VSEPR Molecular Geometry"
        },
        // Class 11
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 1",
            title: "Some Basic Concepts of Chemistry",
            coreTopics: "Nature of matter, laws of chemical combination, Dalton's atomic theory, atomic and molecular mass, mole concept and molar mass, percentage composition, empirical and molecular formula, stoichiometric calculations, limiting reagent, concentration terms (molarity, molality, mole fraction).",
            examPoints: "Limiting reagent quantitative derivations, empirical formula calculation steps, mass-volume relationships.",
            targetTab: "tab-stoichiometry",
            toolName: "Launch Stoichiometry & Limiting Reagents"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 2",
            title: "Structure of Atom",
            coreTopics: "Dual nature of matter and radiation, de Broglie relation (λ = h/p), Heisenberg's uncertainty principle, quantum mechanical model, quantum numbers (n, l, m_l, m_s), shapes of s, p, d orbitals, Aufbau principle, Pauli exclusion principle, Hund's rule, anomalous electronic configs of Cr (Z=24) and Cu (Z=29).",
            examPoints: "Extra stability of half-filled (d⁵) and fully-filled (d¹⁰) subshells, node calculations (n-l-1 radial, l angular).",
            targetTab: "tab-bohr",
            toolName: "Inspect 3D Atomic Structure & Aufbau"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 3",
            title: "Classification of Elements & Periodicity",
            coreTopics: "Modern periodic law and present form of the periodic table, s, p, d, f blocks, periodic trends in properties of elements: atomic and ionic radii, ionization enthalpy, electron gain enthalpy, electronegativity (Pauling scale), anomalous properties of second period elements.",
            examPoints: "Ionization enthalpy exceptions (Be > B, N > O due to stable subshells), diagonal relationships.",
            targetTab: "tab-analytics",
            toolName: "Launch Periodic Trends & Analytics"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 4",
            title: "Chemical Bonding & Molecular Structure",
            coreTopics: "Valence electrons, ionic bond, covalent bond, Lewis dot symbols, VSEPR theory and prediction of molecular geometries, valence bond theory, hybridization (sp, sp², sp³, sp³d, sp³d²), dipole moments, molecular orbital theory (MOT) for homonuclear diatomic molecules, hydrogen bonding.",
            examPoints: "Shapes of H₂O, NH₃, SF₆, PCl₅, BF₃, CH₄, bond order and magnetic behavior (O₂ paramagnetism).",
            targetTab: "tab-molecules",
            toolName: "Launch 3D VSEPR Molecular Geometry"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 5",
            title: "Thermodynamics & States of Matter",
            coreTopics: "Three states of matter, intermolecular forces, gas laws (Boyle's law, Charles's law, Gay-Lussac's law, Avogadro's law), ideal gas equation (PV = nRT), kinetic molecular theory of gases, deviation from ideal behavior, van der Waals equation.",
            examPoints: "Derivation of PV=nRT, graphical representations of isotherms and isobars, real gas compressibility factor Z.",
            targetTab: "tab-gas",
            toolName: "Launch Gas Laws (PV=nRT) Simulator"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 6",
            title: "Equilibrium",
            coreTopics: "Equilibrium in physical and chemical processes, dynamic nature of equilibrium, Law of Chemical Equilibrium and equilibrium constant (Kc, Kp), Le Chatelier's principle, ionic equilibrium, ionization of acids and bases, pH scale, ionization constant of water (Kw), hydrolysis of salts, buffer solutions, solubility product (Ksp).",
            examPoints: "Common ion effect, Henderson-Hasselbalch equation, acid-base titration curves and indicator equivalence points.",
            targetTab: "tab-lab",
            toolName: "Launch Titration Lab & pH Curves"
        },
        {
            classLevel: "class11",
            grade: "Class 11",
            unit: "Unit 7",
            title: "Redox Reactions",
            coreTopics: "Concept of oxidation and reduction, redox reactions, oxidation number calculation rules, balancing redox equations (oxidation number method and half-reaction / ion-electron method), redox titrations, standard electrode potentials.",
            examPoints: "Disproportionation reactions, balancing equations in acidic and basic media.",
            targetTab: "tab-reactions",
            toolName: "Launch Chemical Equation Balancer"
        },
        // Class 12
        {
            classLevel: "class12",
            grade: "Class 12",
            unit: "Unit 1",
            title: "Solutions",
            coreTopics: "Types of solutions, expression of concentration of solutions of solids in liquids, solubility of gases in liquids (Henry's law), solid solutions, Raoult's law, ideal and non-ideal solutions, colligative properties, determination of molecular mass, abnormal molecular mass, van 't Hoff factor.",
            examPoints: "Azeotropes, van 't Hoff factor calculations for association and dissociation.",
            targetTab: "tab-calculator",
            toolName: "Open Molar Mass & Concentration Workbench"
        },
        {
            classLevel: "class12",
            grade: "Class 12",
            unit: "Unit 3",
            title: "The d- and f-Block Elements",
            coreTopics: "General introduction, electronic configuration, occurrence and characteristics of transition metals, general trends in properties of first-row transition elements: metallic character, ionization enthalpy, oxidation states, ionic radii, color, catalytic property, magnetic properties, alloy formation, lanthanoid contraction.",
            examPoints: "Variable oxidation states, reason for colored ions (d-d transition), calculation of spin-only magnetic moment μ = √(n(n+2)) BM.",
            targetTab: "tab-table",
            toolName: "Inspect Transition Metals in Periodic Table"
        },
        {
            classLevel: "class12",
            grade: "Class 12",
            unit: "Unit 4",
            title: "Coordination Compounds",
            coreTopics: "Werner's theory, ligands, coordination number, coordination sphere, IUPAC nomenclature of mononuclear coordination compounds, isomerism, bonding in coordination compounds: Valence Bond Theory (VBT) and Crystal Field Theory (CFT), magnetic properties and shapes of complexes.",
            examPoints: "Inner vs outer orbital complexes, crystal field splitting in octahedral and tetrahedral complexes, spectrochemical series.",
            targetTab: "tab-molecules",
            toolName: "Inspect 3D Octahedral & Tetrahedral Geometries"
        }
    ];

    function renderCurriculumCards(filterClass = 'all') {
        const container = document.getElementById('curriculum-chapters-container');
        if (!container) return;
        container.innerHTML = '';

        const filtered = ncertCurriculumData.filter(item => {
            if (filterClass === 'all') return true;
            if (filterClass === '9-10') return item.classLevel === 'class9' || item.classLevel === 'class10';
            if (filterClass === '11-12') return item.classLevel === 'class11' || item.classLevel === 'class12';
            return item.classLevel === filterClass;
        });

        filtered.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'chapter-card';
            card.innerHTML = `
                <div>
                    <div class="chapter-badge-header">
                        <span class="chapter-class-badge">${ch.grade}</span>
                        <span class="chapter-unit-code">${ch.unit}</span>
                    </div>
                    <h3 class="chapter-title">${ch.title}</h3>
                    <ul class="chapter-topics-list">
                        <li><strong>NCERT Core:</strong> ${ch.coreTopics}</li>
                        <li style="margin-top: 6px;"><strong>CBSE/Exam Focus:</strong> ${ch.examPoints}</li>
                    </ul>
                </div>
                <div class="chapter-tools-action">
                    <button class="action-btn" style="width: 100%; display: flex; justify-content: space-between; align-items: center;" data-target="${ch.targetTab}">
                        <span>${ch.toolName}</span>
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('button[data-target]').forEach(b => {
            b.addEventListener('click', () => {
                const target = b.getAttribute('data-target');
                if (target && typeof switchTab === 'function') {
                    switchTab(target);
                }
            });
        });
    }

    const classPillBtns = document.querySelectorAll('.class-pill-btn');
    classPillBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            classPillBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const classFilter = btn.getAttribute('data-class');
            renderCurriculumCards(classFilter);
        });
    });

    const curriculumFilterSelect = document.getElementById('curriculum-filter');
    if (curriculumFilterSelect) {
        curriculumFilterSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            classPillBtns.forEach(b => {
                const bClass = b.getAttribute('data-class');
                if (val === 'all' && bClass === 'all') b.classList.add('active');
                else b.classList.remove('active');
            });
            renderCurriculumCards(val);
        });
    }

    // =========================================================================
    // --- Mole Concept & Stoichiometry Laboratory ---
    // =========================================================================
    const AVOGADRO_NUM = 6.02214076e23;
    const MOLAR_VOLUME_STP = 22.414; // L/mol at standard temperature and pressure

    const stoichCompoundSelect = document.getElementById('stoich-compound-select');
    const stoichInputValue = document.getElementById('stoich-input-value');
    const stoichInputType = document.getElementById('stoich-input-type');
    const calcStoichBtn = document.getElementById('calc-stoich-btn');
    const stoichDerivationOutput = document.getElementById('stoich-derivation-output');

    const limitReagH2 = document.getElementById('limit-reag-h2');
    const limitReagO2 = document.getElementById('limit-reag-o2');
    const calcLimitingBtn = document.getElementById('calc-limiting-btn');
    const limitingDerivationOutput = document.getElementById('limiting-derivation-output');

    const knownMolarMasses = {
        'H2O': { mass: 18.015, name: 'Water (H₂O)' },
        'CO2': { mass: 44.010, name: 'Carbon Dioxide (CO₂)' },
        'NaCl': { mass: 58.443, name: 'Sodium Chloride (NaCl)' },
        'O2': { mass: 31.999, name: 'Oxygen Gas (O₂)' },
        'C6H12O6': { mass: 180.156, name: 'Glucose (C₆H₁₂O₆)' }
    };

    function formatNumberSci(num) {
        if (num === 0) return "0";
        if (Math.abs(num) >= 0.001 && Math.abs(num) < 10000) {
            return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
        }
        return num.toExponential(4).replace('e+', ' × 10<sup>').replace('e-', ' × 10<sup>-') + '</sup>';
    }

    if (calcStoichBtn) {
        calcStoichBtn.addEventListener('click', () => {
            const compKey = stoichCompoundSelect.value;
            const compInfo = knownMolarMasses[compKey] || { mass: 18.015, name: compKey };
            const M = compInfo.mass;
            const inputVal = parseFloat(stoichInputValue.value);
            const inputType = stoichInputType.value;

            if (isNaN(inputVal) || inputVal <= 0) {
                stoichDerivationOutput.innerHTML = `<span style="color: var(--error);">Please enter a valid positive numerical quantity.</span>`;
                return;
            }

            let moles = 0, mass = 0, particles = 0, volumeSTP = 0;
            let steps = '';

            if (inputType === 'moles') {
                moles = inputVal;
                mass = moles * M;
                particles = moles * AVOGADRO_NUM;
                volumeSTP = moles * MOLAR_VOLUME_STP;
                steps = `
                    <div style="margin-bottom: 8px;"><strong>Step 1: Given Moles</strong> (n = ${inputVal} mol)</div>
                    <div style="margin-bottom: 8px;"><strong>Step 2: Calculate Mass</strong><br>m = n × M = ${inputVal} mol × ${M} g/mol = <strong>${mass.toFixed(4)} g</strong></div>
                    <div style="margin-bottom: 8px;"><strong>Step 3: Calculate Particle Count</strong><br>N = n × N<sub>A</sub> = ${inputVal} mol × (6.022 × 10²³) = <strong>${formatNumberSci(particles)} molecules</strong></div>
                    <div><strong>Step 4: Calculate Gas Volume at STP</strong><br>V = n × 22.414 L/mol = ${inputVal} mol × 22.414 L/mol = <strong>${volumeSTP.toFixed(3)} Liters</strong></div>
                `;
            } else if (inputType === 'mass') {
                mass = inputVal;
                moles = mass / M;
                particles = moles * AVOGADRO_NUM;
                volumeSTP = moles * MOLAR_VOLUME_STP;
                steps = `
                    <div style="margin-bottom: 8px;"><strong>Step 1: Given Mass</strong> (m = ${inputVal} g, M = ${M} g/mol)</div>
                    <div style="margin-bottom: 8px;"><strong>Step 2: Compute Moles</strong><br>n = m / M = ${inputVal} g / ${M} g/mol = <strong>${moles.toFixed(5)} mol</strong></div>
                    <div style="margin-bottom: 8px;"><strong>Step 3: Compute Number of Molecules</strong><br>N = n × N<sub>A</sub> = ${moles.toFixed(5)} × (6.022 × 10²³) = <strong>${formatNumberSci(particles)} molecules</strong></div>
                    <div><strong>Step 4: Compute Gas Volume at STP</strong><br>V = n × 22.414 L = <strong>${volumeSTP.toFixed(3)} Liters</strong></div>
                `;
            } else if (inputType === 'particles') {
                particles = inputVal;
                moles = particles / AVOGADRO_NUM;
                mass = moles * M;
                volumeSTP = moles * MOLAR_VOLUME_STP;
                steps = `
                    <div style="margin-bottom: 8px;"><strong>Step 1: Given Particles</strong> (N = ${inputVal})</div>
                    <div style="margin-bottom: 8px;"><strong>Step 2: Compute Moles</strong><br>n = N / N<sub>A</sub> = ${inputVal} / (6.022 × 10²³) = <strong>${moles.toExponential(4)} mol</strong></div>
                    <div style="margin-bottom: 8px;"><strong>Step 3: Compute Mass</strong><br>m = n × M = <strong>${mass.toFixed(4)} g</strong></div>
                    <div><strong>Step 4: Compute Volume at STP</strong><br>V = n × 22.414 L = <strong>${volumeSTP.toFixed(4)} Liters</strong></div>
                `;
            } else if (inputType === 'volume') {
                volumeSTP = inputVal;
                moles = volumeSTP / MOLAR_VOLUME_STP;
                mass = moles * M;
                particles = moles * AVOGADRO_NUM;
                steps = `
                    <div style="margin-bottom: 8px;"><strong>Step 1: Given STP Volume</strong> (V = ${inputVal} L)</div>
                    <div style="margin-bottom: 8px;"><strong>Step 2: Compute Moles via Molar Volume</strong><br>n = V / 22.414 L = ${inputVal} / 22.414 = <strong>${moles.toFixed(5)} mol</strong></div>
                    <div style="margin-bottom: 8px;"><strong>Step 3: Compute Mass</strong><br>m = n × M = ${moles.toFixed(5)} × ${M} = <strong>${mass.toFixed(4)} g</strong></div>
                    <div><strong>Step 4: Compute Particle Count</strong><br>N = n × N<sub>A</sub> = <strong>${formatNumberSci(particles)} molecules</strong></div>
                `;
            }

            stoichDerivationOutput.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; font-weight: 600;">
                    <div style="background: var(--bg-surface-subtle); padding: 8px; border-radius: 4px;">Moles (n): <span style="color: var(--primary);">${moles.toFixed(4)} mol</span></div>
                    <div style="background: var(--bg-surface-subtle); padding: 8px; border-radius: 4px;">Mass (m): <span style="color: var(--primary);">${mass.toFixed(4)} g</span></div>
                    <div style="background: var(--bg-surface-subtle); padding: 8px; border-radius: 4px;">Molecules (N): <span style="color: var(--primary);">${formatNumberSci(particles)}</span></div>
                    <div style="background: var(--bg-surface-subtle); padding: 8px; border-radius: 4px;">STP Volume: <span style="color: var(--primary);">${volumeSTP.toFixed(3)} L</span></div>
                </div>
                <div style="font-size: var(--font-xs); color: var(--text-secondary); line-height: 1.6; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
                    ${steps}
                </div>
            `;
        });
    }

    if (calcLimitingBtn) {
        calcLimitingBtn.addEventListener('click', () => {
            const h2 = parseFloat(limitReagH2.value);
            const o2 = parseFloat(limitReagO2.value);

            if (isNaN(h2) || isNaN(o2) || h2 <= 0 || o2 <= 0) {
                limitingDerivationOutput.innerHTML = `<span style="color: var(--error);">Please enter valid positive mole quantities for both H₂ and O₂.</span>`;
                return;
            }

            // Reaction: 2 H2 + 1 O2 -> 2 H2O
            // Ratio H2 / 2 vs O2 / 1
            const rH2 = h2 / 2.0;
            const rO2 = o2 / 1.0;

            let limiting = '';
            let excess = '';
            let excessConsumed = 0;
            let excessRemaining = 0;
            let excessRemainingMass = 0;
            let waterMoles = 0;
            let waterMass = 0;

            if (rH2 < rO2) {
                limiting = 'Hydrogen (H₂)';
                excess = 'Oxygen (O₂)';
                excessConsumed = h2 / 2.0;
                excessRemaining = o2 - excessConsumed;
                excessRemainingMass = excessRemaining * 31.999;
                waterMoles = h2;
                waterMass = waterMoles * 18.015;
            } else if (rO2 < rH2) {
                limiting = 'Oxygen (O₂)';
                excess = 'Hydrogen (H₂)';
                excessConsumed = o2 * 2.0;
                excessRemaining = h2 - excessConsumed;
                excessRemainingMass = excessRemaining * 2.016;
                waterMoles = o2 * 2.0;
                waterMass = waterMoles * 18.015;
            } else {
                limiting = 'None (Stoichiometrically Balanced Equivalence)';
                excess = 'None';
                excessConsumed = o2;
                excessRemaining = 0;
                excessRemainingMass = 0;
                waterMoles = h2;
                waterMass = waterMoles * 18.015;
            }

            limitingDerivationOutput.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>Limiting Reagent:</strong> <span class="badge" style="background: var(--primary); color: var(--text-inverse);">${limiting}</span>
                </div>
                <div style="font-size: var(--font-xs); line-height: 1.6; color: var(--text-secondary);">
                    <p><strong>1. Stoichiometric Ratio Analysis:</strong><br>
                    • H₂ ratio: ${h2} mol / 2 = <strong>${rH2.toFixed(3)}</strong><br>
                    • O₂ ratio: ${o2} mol / 1 = <strong>${rO2.toFixed(3)}</strong><br>
                    ${rH2 !== rO2 ? `The reactant with the lower stoichiometric ratio is completely consumed first, governing the extent of reaction.` : `Both reactants are present in exact stoichiometric proportions.`}
                    </p>
                    <p style="margin-top: 8px;"><strong>2. Theoretical Product Yield:</strong><br>
                    • Moles of H₂O formed: <strong>${waterMoles.toFixed(3)} mol</strong><br>
                    • Mass of H₂O formed: ${waterMoles.toFixed(3)} mol × 18.015 g/mol = <strong>${waterMass.toFixed(2)} g</strong>
                    </p>
                    ${excess !== 'None' ? `
                    <p style="margin-top: 8px;"><strong>3. Unreacted Excess Reactant:</strong><br>
                    • Excess ${excess} remaining: <strong>${excessRemaining.toFixed(3)} mol</strong> (${excessRemainingMass.toFixed(2)} g)
                    </p>` : ''}
                </div>
            `;
        });
    }

    // =========================================================================
    // --- NCERT Class 10 Reaction Types Explorer ---
    // =========================================================================
    const ncertReactionTypes = [
        {
            type: "Combination Reaction (Synthesis)",
            equation: "2Mg(s) + O₂(g) → 2MgO(s)",
            unbalanced: "Mg + O2 -> MgO",
            desc: "Two or more substances combine to form a single product.",
            obs: "Magnesium ribbon burns with a dazzling white flame to form white powder of Magnesium Oxide (MgO). Highly exothermic.",
            ncertRef: "NCERT Class 10, Chapter 1, Activity 1.1"
        },
        {
            type: "Decomposition Reaction (Thermal)",
            equation: "2FeSO₄(s) → Fe₂O₃(s) + SO₂(g) + SO₃(g)",
            unbalanced: "FeSO4 -> Fe2O3 + SO2 + SO3",
            desc: "A single reactant breaks down upon heating into simpler products.",
            obs: "Green ferrous sulfate crystals lose water of crystallization, turning brown (Fe₂O₃) with characteristic pungent burning sulfur smell (SO₂/SO₃).",
            ncertRef: "NCERT Class 10, Chapter 1, Activity 1.5"
        },
        {
            type: "Displacement Reaction (Single Replacement)",
            equation: "Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)",
            unbalanced: "Fe + CuSO4 -> FeSO4 + Cu",
            desc: "A more reactive element displaces a less reactive element from its aqueous salt solution according to the Reactivity Series (Fe > Cu).",
            obs: "Blue copper sulfate solution fades to light green; a reddish-brown coating of metallic copper forms on the iron nail.",
            ncertRef: "NCERT Class 10, Chapter 1, Activity 1.9"
        },
        {
            type: "Double Displacement (Precipitation)",
            equation: "Na₂SO₄(aq) + BaCl₂(aq) → BaSO₄(s)↓ + 2NaCl(aq)",
            unbalanced: "Na2SO4 + BaCl2 -> BaSO4 + NaCl",
            desc: "An exchange of ions between two aqueous compounds occurs, forming an insoluble solid precipitate.",
            obs: "An instantaneous opaque white precipitate of Barium Sulfate (BaSO₄) separates out from the colorless solution.",
            ncertRef: "NCERT Class 10, Chapter 1, Activity 1.10"
        },
        {
            type: "Neutralization Reaction",
            equation: "HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)",
            unbalanced: "HCl + NaOH -> NaCl + H2O",
            desc: "An acid and base react stoichiometrically to produce salt, water, and enthalpy of neutralization.",
            obs: "Exothermic temperature rise; phenolphthalein indicator changes from pink (basic) to colorless at exact equivalence pH 7.0.",
            ncertRef: "NCERT Class 10, Chapter 2"
        },
        {
            type: "Redox Reaction (Oxidation-Reduction)",
            equation: "CuO(s) + H₂(g) → Cu(s) + H₂O(l)",
            unbalanced: "CuO + H2 -> Cu + H2O",
            desc: "Simultaneous oxidation and reduction: CuO loses oxygen (reduced; oxidizing agent); H₂ gains oxygen (oxidized; reducing agent).",
            obs: "Black Copper(II) Oxide powder is reduced to reddish-brown elemental copper when hot hydrogen gas passes over it.",
            ncertRef: "NCERT Class 10, Chapter 1"
        }
    ];

    function renderReactionTypes() {
        const container = document.getElementById('reaction-types-container');
        if (!container) return;
        container.innerHTML = '';

        ncertReactionTypes.forEach(rxn => {
            const card = document.createElement('div');
            card.className = 'rxn-type-card';
            card.innerHTML = `
                <div style="font-size: var(--font-xs); color: var(--primary); font-weight: 700;">${rxn.ncertRef}</div>
                <div class="rxn-type-title">${rxn.type}</div>
                <div class="rxn-type-example">${rxn.equation}</div>
                <div style="font-size: var(--font-xs); color: var(--text-secondary); line-height: 1.5;">${rxn.desc}</div>
                <div class="callout callout-info" style="font-size: var(--font-xs); margin: 0; padding: 8px;">
                    <strong>Laboratory Observation:</strong> ${rxn.obs}
                </div>
                <button class="btn-secondary" style="margin-top: var(--space-2); font-size: var(--font-xs); width: 100%;" data-eq="${rxn.unbalanced}">
                    ⚖️ Load into Equation Balancer
                </button>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('button[data-eq]').forEach(btn => {
            btn.addEventListener('click', () => {
                const eq = btn.getAttribute('data-eq');
                if (eq && typeof switchTab === 'function') {
                    switchTab('tab-reactions');
                    const rInput = document.getElementById('reaction-input');
                    const bBtn = document.getElementById('balance-btn');
                    if (rInput && bBtn) {
                        rInput.value = eq;
                        bBtn.click();
                    }
                }
            });
        });
    }

    // Initial setup on DOM ready
    renderCurriculumCards('all');
    renderReactionTypes();
});

