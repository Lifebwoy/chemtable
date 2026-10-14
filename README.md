# ChemTable Interactive Suite

> **Interactive High-School Chemistry Learning Suite & Virtual Laboratory**  
> Aligned with the **Indian CBSE & NCERT Chemistry Curriculum (Classes 9, 10, 11, and 12)**.

---

## 🌟 Live Online Demo

Once deployed on GitHub Pages, access the platform from any web browser or mobile phone:
```
https://<YOUR-GITHUB-USERNAME>.github.io/<YOUR-REPOSITORY-NAME>/
```

---

## 🔬 Core Learning Workbenches

1. **Interactive Periodic Table (118 Elements)**
   - IUPAC-standard color categorization for all 10 chemical families.
   - Standard physical states filter at 25°C (Solid, Liquid, Gas, Unknown).
   - Dynamic heatmaps for Pauling Electronegativity and Atomic Radius ($pm$).
   - Quick element modal cards with verified physical properties and Wikipedia references.

2. **CBSE / NCERT Curriculum Paths Navigator**
   - Structured curriculum explorer mapping directly to Indian textbooks for **Classes 9, 10, 11, and 12**.
   - Comprehensive NCERT Core Concepts and Board / NEET / JEE examination focus notes.
   - One-click launcher buttons connecting theory directly to interactive simulators.

3. **Mole Concept & Stoichiometry Laboratory**
   - Quantitative mole, mass, molecule count ($N_A = 6.022 \times 10^{23}$), and STP gas volume ($22.414\text{ L}$) interconversions.
   - Limiting Reagent Workbench for $2\text{H}_2 + \text{O}_2 \to 2\text{H}_2\text{O}$ with full stoichiometric ratio derivations and theoretical water yield.

4. **3D Bohr Atomic Structure & Aufbau Principle**
   - Real-time 3D WebGL electron orbital shells and nucleus cluster rendering.
   - Explicitly handles **Class 11 NCERT Aufbau exceptions** for Chromium ($Z=24$, $[Ar]\ 3d^5 4s^1$) and Copper ($Z=29$, $[Ar]\ 3d^{10} 4s^1$) with exchange-energy stability callouts.

5. **3D Molecular Geometry (VSEPR Theory)**
   - Interactive 3D molecular structures (Water, Carbon Dioxide, Methane, Ammonia, Sulfur Hexafluoride, etc.).
   - Visual bonds, lone pairs, bond angles, and overall molecular dipole moments.

6. **Gas Laws & Molecular Kinetics Simulator**
   - Real-time elastic particle collisions inside an adjustable piston chamber.
   - Covers Ideal Gas Law ($PV = nRT$), Boyle's Law ($T$ constant), Charles's Law ($P$ constant), and Gay-Lussac's Law ($V$ constant).
   - Digital gauges for Pressure, Volume, Temperature, and Molar Quantity.

7. **Virtual Acid-Base Titration Laboratory**
   - Simulates strong acid / strong base and weak acid / strong base titrations.
   - Live Chart.js titration curve with Henderson-Hasselbalch buffer calculations.
   - Realistic beaker fluid color change matching phenolphthalein indicator endpoint ($pH \ge 8.2$).

8. **Chemical Reaction Types & Equation Balancer**
   - NCERT Class 10 reaction classifications: Combination, Decomposition, Displacement, Double Displacement, Neutralization, and Redox.
   - Matrix-based equation balancer with Gaussian elimination for complex chemical equations.

9. **Smart Chemistry Quiz (10-Question Non-Repeating Deck)**
   - 120+ curated chemistry questions covering all high-school syllabus topics.
   - Fisher-Yates smart cycling deck: every 10-question round features brand new questions until the entire deck has cycled.
   - Immediate feedback with NCERT-aligned pedagogical explanations.

---

## 🛠️ Technology Stack

- **Frontend**: Pure Vanilla HTML5 & Modern Semantic CSS3
- **Scripting**: Vanilla JavaScript (ES6+, zero build step or npm dependencies)
- **3D Graphics**: Three.js r128 & OrbitControls.js
- **Data Visualization**: Chart.js 3.9
- **Design System**: Light Scientific theme (default) & Dark Laboratory theme toggle (WCAG 2.2 AA compliant)

---

## 🚀 How to Deploy on GitHub Pages (Step-by-Step)

1. Log in to [GitHub](https://github.com/) and click **New Repository**.
2. Name the repository `chemtable` (or any name you prefer), set it to **Public**, and click **Create repository**.
3. Click **Upload an existing file** and drag the following files from this folder into GitHub:
   - `index.html`
   - `style.css`
   - `script.js`
   - `elements.js`
   - `README.md`
4. Click **Commit changes**.
5. Go to repository **Settings** > **Pages** (on the left menu).
6. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
7. In about 60 seconds, your site is live worldwide!

---

## 📄 License
Educational Open-Source Project. Created for chemistry students, educators, and science enthusiasts.
