/**
 * Lazy-loads AST data from data/ast/*.
 *
 * Strategy:
 *   1. At import time, build a lightweight course→file mapping by scanning the
 *      glob keys (no actual JSON parsing yet).
 *   2. When a specific course is needed, dynamically import only the relevant
 *      department file.
 *
 * This avoids loading ~50 MB of JSON eagerly at startup.
 */

import { findRootNode } from './astGraphUtils';

// Lazy glob: returns a map of path → () => Promise<module>
const astModules = import.meta.glob('../../data/ast/*.json');

// ── Special-case courses that have their own dedicated AST file ────────────
// Format: "COURSE CODE" (uppercase, with space) → glob path
const SPECIAL_CASES = {
    'COGS 118A': '../../data/ast/cogs_118a_ast.json',
    'COGS 118B': '../../data/ast/cogs_118b_ast.json',
    'PHYS 4A': '../../data/ast/phys_4a_ast.json',
    'PHYS 4B': '../../data/ast/phys_4b_ast.json',
    'PHYS 4C': '../../data/ast/phys_4c_ast.json',
    'PHYS 4D': '../../data/ast/phys_4d_ast.json',
};

// Cache for special-case roots (keyed by course code)
const specialCache = {};

// Extract department prefixes from file names for the course list.
// File names look like "../../data/ast/math_ast.json" → prefix "MATH"
const departmentPrefixes = Object.keys(astModules).map((path) => {
    const filename = path.split('/').pop();                 // "math_ast.json"
    const prefix = filename.replace('_ast.json', '');       // "math"
    return prefix.toUpperCase();                            // "MATH"
});

// Map: uppercase department prefix → glob path
const prefixToPath = {};
Object.keys(astModules).forEach((path) => {
    const filename = path.split('/').pop();
    const prefix = filename.replace('_ast.json', '').toUpperCase();
    prefixToPath[prefix] = path;
});

// Cache: prefix → parsed array (so we only load each file once)
const cache = {};

/**
 * Return the list of department prefixes (e.g. ["MATH", "CSE", "PHYS", ...]).
 */
export function getDepartments() {
    return departmentPrefixes.sort();
}

/**
 * Load a single department's AST data.  Returns a Promise<Array>.
 */
export async function loadDepartment(prefix) {
    const upper = prefix.toUpperCase();
    if (cache[upper]) return cache[upper];

    const path = prefixToPath[upper];
    if (!path) return [];

    const mod = await astModules[path]();
    const data = mod.default || mod;
    cache[upper] = Array.isArray(data) ? data : [];
    return cache[upper];
}

/**
 * Given a course code like "MATH 100A", figure out its department prefix
 * and load the right file.  Returns the full department array.
 */
export async function loadDepartmentForCourse(courseCode) {
    // Course codes look like "CSE 100", "MATH 100A", "BIMM 140", etc.
    // The prefix is everything before the first space.
    const prefix = courseCode.trim().split(/\s+/)[0].toUpperCase();
    return loadDepartment(prefix);
}

/**
 * Load and return the root AST node for a course code.
 *
 * For courses in SPECIAL_CASES, loads the dedicated single-root AST file.
 * For all others, loads the department file and finds the root node within it.
 *
 * Returns the root node object, or null if not found.
 */
export async function loadAstNodeForCourse(courseCode) {
    const key = courseCode.trim().toUpperCase();

    // Normalise "COGS118A" → "COGS 118A" style (insert space before digits)
    const canonical = key.replace(/^([A-Z]+)(\d)/, '$1 $2');

    const specialPath = SPECIAL_CASES[canonical];
    if (specialPath) {
        if (specialCache[canonical]) return specialCache[canonical];
        const loader = astModules[specialPath];
        if (!loader) return null;
        const mod = await loader();
        const data = mod.default || mod;
        // Special AST files are a single root object (not an array)
        const root = Array.isArray(data) ? data[0] : data;
        specialCache[canonical] = root || null;
        return specialCache[canonical];
    }

    // Normal path: load department array and find the root node
    const deptData = await loadDepartmentForCourse(courseCode);
    return findRootNode(courseCode, deptData) || null;
}

/**
 * Load ALL departments (returns one merged array).
 * Only use this if you truly need every course — it's ~50 MB.
 */
export async function loadAllDepartments() {
    const allData = [];
    const paths = Object.keys(astModules);
    for (const path of paths) {
        const prefix = path.split('/').pop().replace('_ast.json', '').toUpperCase();
        if (!cache[prefix]) {
            const mod = await astModules[path]();
            const data = mod.default || mod;
            cache[prefix] = Array.isArray(data) ? data : [];
        }
        allData.push(...cache[prefix]);
    }
    return allData;
}
