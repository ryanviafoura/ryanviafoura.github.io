import { validateFigmaVariables } from './validator.js';

const jsonInput = document.getElementById('jsonInput') as HTMLTextAreaElement;
const validateBtn = document.getElementById('validateBtn') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const resultsDiv = document.getElementById('results') as HTMLDivElement;

validateBtn.addEventListener('click', () => {
    const rawValue = jsonInput.value.trim();
    if (!rawValue) {
        resultsDiv.innerHTML = '<div class="error">Please enter some JSON.</div>';
        return;
    }

    try {
        const data = JSON.parse(rawValue);
        const errors = validateFigmaVariables(data);
        renderResults(errors);
    } catch (e) {
        resultsDiv.innerHTML = `<div class="error">
            <div class="error-title">Invalid JSON format</div>
            <div class="error-path">${e instanceof Error ? e.message : String(e)}</div>
        </div>`;
    }
});

fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        jsonInput.value = content;
        validateBtn.click();
    };
    reader.readAsText(file);
});

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderResults(errors: any[]) {
    if (errors.length === 0) {
        resultsDiv.innerHTML = '<div class="success">✅ No structural problems found!</div>';
        return;
    }

    resultsDiv.innerHTML = '';
    const h3 = document.createElement('h3');
    h3.textContent = `Found ${errors.length} problems:`;
    resultsDiv.appendChild(h3);

    errors.forEach((err, index) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';

        const title = document.createElement('div');
        title.className = 'error-title';
        title.textContent = `[${index + 1}] ${err.message}`;

        const path = document.createElement('div');
        path.className = 'error-path';
        path.textContent = `Path: ${err.path.join(' > ')}`;

        const type = document.createElement('div');
        type.className = 'error-path';
        type.textContent = `Type: ${err.type}`;

        errorDiv.appendChild(title);
        errorDiv.appendChild(path);
        errorDiv.appendChild(type);
        resultsDiv.appendChild(errorDiv);
    });
}
