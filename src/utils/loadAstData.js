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

// Lazy glob: returns a map of path → () => Promise<module>
const astModules = import.meta.glob('../../data/ast/*.json');

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
