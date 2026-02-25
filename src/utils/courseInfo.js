/**
 * Course metadata lookup from combined.json.
 *
 * Provides: course title and any "special" prerequisite text
 * (upper-division standing, consent of instructor, etc.).
 *
 * combined.json is ~2.6 MB — we load it once lazily and cache the lookup map.
 */

let _lookup = null; // Map: "CSE 100" → { title, rawPrereq }

async function buildLookup() {
    if (_lookup) return _lookup;
    const mod = await import('../../data/combined.json');
    const data = mod.default || mod;
    _lookup = {};
    for (const entry of data) {
        const c = entry?.course;
        if (c?.code) {
            const info = {
                title: c.title || '',
                rawPrereq: c.raw_prereq || '',
            };
            const canonical = c.code.trim();          // "CSE 11"
            const compact = canonical.replace(/\s+/g, ''); // "CSE11"
            _lookup[canonical] = info;
            _lookup[compact] = info; // also index without spaces
        }
    }
    return _lookup;
}

/**
 * Returns { title, specialReq } for a course code.
 * `specialReq` is non-empty only when the raw prereq text mentions
 * "upper-division" or "consent of instructor".
 *
 * Returns null if the lookup hasn't been loaded yet (call loadCourseInfo first).
 */
export function getCourseInfo(courseCode) {
    if (!_lookup) return null;
    const info = _lookup[courseCode?.trim()];
    if (!info) return null;
    const { title, rawPrereq } = info;
    const lower = rawPrereq.toLowerCase();
    const reqs = []
    if (lower.includes('upper')) {
        reqs.push("Upper Division Standing. ");
    }
    if (lower.includes('consent')) {
        // "or consent of instructor" → consent is an alternative to real prereqs
        // "by consent" / just "consent of instructor" → hard requirement
        if (/\bor\s+consent\b/.test(lower)) {
            reqs.push("Consent of Instructor (alternative)");
        } else {
            reqs.push("Consent of Instructor required");
        }
    }
    if (lower.includes('restricted')) {
        reqs.push("Restricted Enrollment");
    }
    if (lower.includes('transfer')) {
        reqs.push("Transfer Credit Only");
    }
    if (lower.includes('standing')) {
        if (lower.includes('senior')) {
            reqs.push("Senior Standing required");
        }
        if (lower.includes('junior')) {
            reqs.push("Junior Standing required");
        }
        if (lower.includes('sophomore')) {
            reqs.push("Sophomore Standing required");
        }
        if (lower.includes('freshman')) {
            reqs.push("Freshman Standing required");
        }
    }

    const apRegex = /\bap\s+(?<subject>.*?)\s+(?:score|subscore|exam)\s+(?:of\s+)?(?<value>\d+(?:\s+or\s+\d+)?)/gi;
    // what
    const matches = [...lower.matchAll(apRegex)];

    matches.forEach(match => {
        const { subject, value } = match.groups;

        reqs.push(`AP ${subject.toUpperCase()}: ${value}` + ` (alternative) \n`);
    });

    return {
        title,
        specialReq: reqs.join("<br>"), // what
    };
}

/**
 * Pre-load the lookup map.  Call this once at startup or before rendering.
 */
export async function loadCourseInfo() {
    return buildLookup();
}
