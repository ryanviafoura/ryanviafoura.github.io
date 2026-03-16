"use strict";
(() => {
  // src/validator.ts
  var VALID_TYPES = [
    "color",
    "number",
    "string",
    "boolean",
    "dimension",
    "duration",
    "fontWeight",
    "fontFamily",
    "lineHeight",
    "letterSpacing",
    "opacity",
    "border",
    "shadow",
    "gradient",
    "typography"
  ];
  function validateFigmaVariables(data) {
    const errors = [];
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      errors.push({
        path: [],
        message: "Root must be a JSON object",
        type: "invalid_structure"
      });
      return errors;
    }
    if (data.collections && Array.isArray(data.collections)) {
      data.collections.forEach((collection, index) => {
        validateCollection(collection, ["collections", index.toString()], errors);
      });
    } else {
      validateGroup(data, [], errors);
    }
    return errors;
  }
  function validateCollection(collection, path, errors) {
    if (typeof collection !== "object" || collection === null) {
      errors.push({ path, message: "Collection must be an object", type: "invalid_structure" });
      return;
    }
    if (!collection.name) {
      errors.push({ path, message: "Collection is missing a name", type: "missing_field" });
    }
    if (collection.modes && typeof collection.modes === "object") {
      Object.entries(collection.modes).forEach(([modeName, modeData]) => {
        const modePath = [...path, "modes", modeName];
        if (modeData.variables && typeof modeData.variables === "object") {
          validateGroup(modeData.variables, [...modePath, "variables"], errors);
        }
      });
    } else if (collection.variables && typeof collection.variables === "object") {
      validateGroup(collection.variables, [...path, "variables"], errors);
    }
  }
  function validateGroup(group, path, errors) {
    const keys = Object.keys(group);
    const seenKeys = /* @__PURE__ */ new Map();
    for (const key of keys) {
      if (key.startsWith("$")) continue;
      const lowerKey = key.toLowerCase();
      if (seenKeys.has(lowerKey)) {
        errors.push({
          path: [...path, key],
          message: `Duplicate variable name (case-insensitive): "${key}" conflicts with "${seenKeys.get(lowerKey)}"`,
          type: "duplicate"
        });
      } else {
        seenKeys.set(lowerKey, key);
      }
      const value = group[key];
      const currentPath = [...path, key];
      if (typeof value !== "object" || value === null) {
        errors.push({
          path: currentPath,
          message: `Value at "${currentPath.join(".")}" must be an object`,
          type: "invalid_structure"
        });
        continue;
      }
      const childKeys = Object.keys(value);
      const hasValue = "$value" in value;
      const hasType = "$type" in value;
      const hasOtherNonReservedKeys = childKeys.some((k) => !k.startsWith("$"));
      if (hasValue || hasType && !hasOtherNonReservedKeys) {
        validateToken(value, currentPath, errors);
      } else {
        validateGroup(value, currentPath, errors);
      }
    }
  }
  function validateToken(token, path, errors) {
    if (token.$value === void 0) {
      errors.push({
        path,
        message: `Token at "${path.join(".")}" is missing required "$value"`,
        type: "missing_field"
      });
    }
    if (token.$type && !VALID_TYPES.includes(token.$type)) {
      errors.push({
        path: [...path, "$type"],
        message: `Invalid token type "${token.$type}" at "${path.join(".")}"`,
        type: "invalid_type"
      });
    }
  }

  // src/web.ts
  var jsonInput = document.getElementById("jsonInput");
  var validateBtn = document.getElementById("validateBtn");
  var fileInput = document.getElementById("fileInput");
  var resultsDiv = document.getElementById("results");
  validateBtn.addEventListener("click", () => {
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
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      jsonInput.value = content;
      validateBtn.click();
    };
    reader.readAsText(file);
  });
  function renderResults(errors) {
    if (errors.length === 0) {
      resultsDiv.innerHTML = '<div class="success">\u2705 No structural problems found!</div>';
      return;
    }
    resultsDiv.innerHTML = "";
    const h3 = document.createElement("h3");
    h3.textContent = `Found ${errors.length} problems:`;
    resultsDiv.appendChild(h3);
    errors.forEach((err, index) => {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error";
      const title = document.createElement("div");
      title.className = "error-title";
      title.textContent = `[${index + 1}] ${err.message}`;
      const path = document.createElement("div");
      path.className = "error-path";
      path.textContent = `Path: ${err.path.join(" > ")}`;
      const type = document.createElement("div");
      type.className = "error-path";
      type.textContent = `Type: ${err.type}`;
      errorDiv.appendChild(title);
      errorDiv.appendChild(path);
      errorDiv.appendChild(type);
      resultsDiv.appendChild(errorDiv);
    });
  }
})();
