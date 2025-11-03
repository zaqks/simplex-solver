
// FRACTION CLASS
class Fraction {
    constructor(numerator, denominator = 1) {
        if (denominator === 0) throw new Error("Division by zero");

        if (denominator < 0) {
            numerator = -numerator;
            denominator = -denominator;
        }

        const g = this.gcd(Math.abs(numerator), Math.abs(denominator));
        this.num = numerator / g;
        this.den = denominator / g;
    }

    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    add(other) {
        return new Fraction(
            this.num * other.den + other.num * this.den,
            this.den * other.den
        );
    }

    subtract(other) {
        return new Fraction(
            this.num * other.den - other.num * this.den,
            this.den * other.den
        );
    }

    multiply(other) {
        return new Fraction(this.num * other.num, this.den * other.den);
    }

    divide(other) {
        if (other.num === 0) throw new Error("Division by zero");
        return new Fraction(this.num * other.den, this.den * other.num);
    }

    isPositive() {
        return this.num > 0;
    }

    isZero() {
        return this.num === 0;
    }

    toNumber() {
        return this.num / this.den;
    }

    toString() {
        if (this.den === 1) return this.num.toString();
        return `${this.num}/${this.den}`;
    }

    toHTML() {
        if (this.den === 1) return this.num.toString();
        return `<span class="fraction"><span class="numerator">${this.num}</span><span class="denominator">${this.den}</span></span>`;
    }

    compareTo(other) {
        return this.num * other.den - other.num * this.den;
    }
}

// PARSING FUNCTIONS
function parseSystem(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const constraints = [];
    let objectiveFunc = null;
    let numVars = 0;

    for (let line of lines) {
        if (line.includes('≥ 0') || line.includes('>= 0')) continue;

        if (line.startsWith('Z =') || line.startsWith('Z=')) {
            const expr = line.split('=')[1].trim();
            objectiveFunc = parseExpression(expr);
            numVars = Math.max(numVars, ...objectiveFunc.map(t => t.varIndex + 1));
        } else if (line.includes('≤') || line.includes('<=')) {
            const parts = line.split(/≤|<=/);
            const lhs = parseExpression(parts[0].trim());
            const rhs = parseFloat(parts[1].trim());
            constraints.push({ lhs, rhs });
            numVars = Math.max(numVars, ...lhs.map(t => t.varIndex + 1));
        }
    }

    return { constraints, objectiveFunc, numVars };
}

function parseExpression(expr) {
    const terms = [];
    const regex = /([+-]?\s*\d*\.?\d*)\s*x(\d+)/g;
    let match;

    while ((match = regex.exec(expr)) !== null) {
        let coef = match[1].replace(/\s/g, '');
        if (coef === '' || coef === '+') coef = '1';
        if (coef === '-') coef = '-1';
        terms.push({
            coef: parseFloat(coef),
            varIndex: parseInt(match[2]) - 1
        });
    }

    return terms;
}

function createStandardForm(parsed) {
    const { constraints, objectiveFunc, numVars } = parsed;
    const numSlack = constraints.length;
    const totalVars = numVars + numSlack;

    const tableau = [];

    for (let i = 0; i < constraints.length; i++) {
        const row = [];
        for (let j = 0; j < totalVars; j++) {
            row.push(new Fraction(0));
        }
        for (let term of constraints[i].lhs) {
            row[term.varIndex] = new Fraction(term.coef);
        }
        row[numVars + i] = new Fraction(1);
        row.push(new Fraction(constraints[i].rhs));
        tableau.push(row);
    }

    const objRow = [];
    for (let j = 0; j < totalVars; j++) {
        objRow.push(new Fraction(0));
    }
    for (let term of objectiveFunc) {
        objRow[term.varIndex] = new Fraction(term.coef);
    }
    objRow.push(new Fraction(0));
    tableau.push(objRow);

    return { tableau, numVars, numSlack, totalVars };
}

// DISPLAY FUNCTIONS
function addAIMessage(content) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.innerHTML = `
                <div class="avatar ai">AI</div>
                <div class="message-content">${content}</div>
            `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addUserMessage(content) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
                <div class="avatar user">U</div>
                <div class="message-content">${content.replace(/\n/g, '<br>')}</div>
            `;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function displayOriginalProblem(parsed) {
    const { constraints, objectiveFunc, numVars } = parsed;

    let content = '<div class="section-title">📋 Problème Original</div>';

    content += '<strong>Contraintes:</strong><br>';
    for (let c of constraints) {
        let expr = c.lhs.map(t => {
            const sign = t.coef >= 0 ? '+' : '';
            const coef = Math.abs(t.coef) === 1 ? '' : Math.abs(t.coef);
            return `${sign}${t.coef < 0 ? '-' : ''}${coef}x${t.varIndex + 1}`;
        }).join(' ');
        if (expr.startsWith('+')) expr = expr.substring(1);
        content += `<div class="equation">${expr} ≤ ${c.rhs}</div>`;
    }

    content += '<strong>Fonction objectif:</strong>';
    let objExpr = objectiveFunc.map(t => {
        const sign = t.coef >= 0 ? '+' : '';
        const coef = Math.abs(t.coef) === 1 ? '' : Math.abs(t.coef);
        return `${sign}${t.coef < 0 ? '-' : ''}${coef}x${t.varIndex + 1}`;
    }).join(' ');
    if (objExpr.startsWith('+')) objExpr = objExpr.substring(1);
    content += `<div class="equation">Z = ${objExpr}</div>`;

    addAIMessage(content);
}

function displayStandardForm(standard, parsed) {
    const { tableau, numVars, numSlack } = standard;

    let content = '<div class="section-title">📐 Forme Standard</div>';
    content += '<div class="info-badge">Variables d\'écart ajoutées</div>';

    for (let i = 0; i < numSlack; i++) {
        let expr = '';
        for (let j = 0; j < numVars; j++) {
            if (!tableau[i][j].isZero()) {
                const sign = tableau[i][j].isPositive() && expr ? '+' : '';
                const absVal = Math.abs(tableau[i][j].num);
                const coef = absVal === 1 && tableau[i][j].den === 1 ? '' : tableau[i][j].toString();
                expr += `${sign}${tableau[i][j].num < 0 ? '-' : ''}${coef}x${j + 1} `;
            }
        }
        expr += `+ x${numVars + i + 1} = ${tableau[i][tableau[i].length - 1].toString()}`;
        content += `<div class="equation">${expr}</div>`;
    }

    addAIMessage(content);
}

function displayTableau(tableau, numVars, numSlack, basis, enteringCol = -1, leavingRow = -1) {
    const totalVars = numVars + numSlack;
    let html = '<table>';

    html += '<tr><th>Base</th>';
    for (let j = 0; j < totalVars; j++) {
        const className = j === enteringCol ? 'entering-var' : '';
        html += `<th class="${className}">x${j + 1}</th>`;
    }
    html += '<th>RHS</th></tr>';

    for (let i = 0; i < tableau.length - 1; i++) {
        const className = i === leavingRow ? 'leaving-var' : '';
        html += `<tr class="${className}"><td class="vdb-col">x${basis[i] + 1}</td>`;
        for (let j = 0; j < totalVars; j++) {
            const pivotClass = (i === leavingRow && j === enteringCol) ? 'pivot' : '';
            html += `<td class="${pivotClass}">${tableau[i][j].toHTML()}</td>`;
        }
        html += `<td>${tableau[i][totalVars].toHTML()}</td></tr>`;
    }

    html += '<tr><td class="vdb-col">Z</td>';
    for (let j = 0; j < totalVars; j++) {
        html += `<td>${tableau[tableau.length - 1][j].toHTML()}</td>`;
    }
    html += `<td>${tableau[tableau.length - 1][totalVars].toHTML()}</td></tr>`;

    html += '</table>';
    return html;
}

function solveSimplex(standard, parsed) {
    let { tableau, numVars, numSlack, totalVars } = standard;
    tableau = tableau.map(row => row.map(f => new Fraction(f.num, f.den)));

    let basis = Array.from({ length: numSlack }, (_, i) => numVars + i);

    let content = '<div class="section-title">🔄 Tableau Initial</div>';
    content += displayTableau(tableau, numVars, numSlack, basis);
    addAIMessage(content);

    let iteration = 1;
    const maxIterations = 20;

    while (iteration <= maxIterations) {
        const zRow = tableau[tableau.length - 1];
        let enteringCol = -1;
        let maxCoef = new Fraction(0);

        for (let j = 0; j < totalVars; j++) {
            if (!basis.includes(j) && zRow[j].compareTo(maxCoef) > 0) {
                maxCoef = zRow[j];
                enteringCol = j;
            }
        }

        if (enteringCol === -1) {
            addAIMessage('<div class="info-badge">✅ Solution optimale atteinte!</div>');
            break;
        }

        let leavingRow = -1;
        let minRatio = null;

        for (let i = 0; i < numSlack; i++) {
            const coef = tableau[i][enteringCol];
            const constant = tableau[i][totalVars];

            if (coef.isPositive()) {
                const ratio = constant.divide(coef);

                if (minRatio === null || ratio.compareTo(minRatio) < 0) {
                    minRatio = ratio;
                    leavingRow = i;
                }
            }
        }

        if (leavingRow === -1) {
            addAIMessage('<div class="info-badge">❌ Problème non borné!</div>');
            break;
        }

        let iterContent = `<div class="section-title">Itération ${iteration}<span class="tag">PIVOT</span></div>`;
        iterContent += `<div class="info-badge">Entrante: <span class="highlight">x${enteringCol + 1}</span> • Sortante: <span class="highlight">x${basis[leavingRow] + 1}</span></div>`;

        const pivot = tableau[leavingRow][enteringCol];

        for (let j = 0; j <= totalVars; j++) {
            tableau[leavingRow][j] = tableau[leavingRow][j].divide(pivot);
        }

        for (let i = 0; i < tableau.length; i++) {
            if (i !== leavingRow) {
                const factor = tableau[i][enteringCol];
                for (let j = 0; j <= totalVars; j++) {
                    tableau[i][j] = tableau[i][j].subtract(factor.multiply(tableau[leavingRow][j]));
                }
            }
        }

        basis[leavingRow] = enteringCol;

        iterContent += displayTableau(tableau, numVars, numSlack, basis, enteringCol, leavingRow);
        addAIMessage(iterContent);

        iteration++;
    }

    const finalZ = tableau[tableau.length - 1][totalVars].multiply(new Fraction(-1));
    let finalContent = '<div class="final-box">';
    finalContent += '<h3>🎉 Solution Optimale</h3>';

    for (let i = 0; i < numVars; i++) {
        const basisIndex = basis.indexOf(i);
        const value = basisIndex >= 0 ? tableau[basisIndex][totalVars] : new Fraction(0);
        finalContent += `<p><strong>x${i + 1}</strong> = ${value.toHTML()}</p>`;
    }

    finalContent += `<p style="font-size: 18px; margin-top: 12px;"><strong>Z<sub>max</sub></strong> = ${finalZ.toHTML()}</p>`;
    finalContent += '</div>';

    addAIMessage(finalContent);
}

// EVENT HANDLERS
function handleSend() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();

    if (!text) return;

    addUserMessage(text);
    input.value = '';
    input.style.height = 'auto';

    setTimeout(() => {
        try {
            const parsed = parseSystem(text);
            displayOriginalProblem(parsed);

            setTimeout(() => {
                const standard = createStandardForm(parsed);
                displayStandardForm(standard, parsed);

                setTimeout(() => {
                    solveSimplex(standard, parsed);
                }, 300);
            }, 300);
        } catch (e) {
            addAIMessage(`<div class="info-badge" style="border-color: #ff4d6a;">❌ Erreur: ${e.message}</div>`);
        }
    }, 300);
}

document.getElementById('sendBtn').addEventListener('click', handleSend);

const textarea = document.getElementById('userInput');
textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

textarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
