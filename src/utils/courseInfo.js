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
    let specialReq = "";
    if (lower.includes('upper')) {
        specialReq += "Upper Division Standing. ";
    }
    if (lower.includes('consent')) {
        // "or consent of instructor" → consent is an alternative to real prereqs
        // "by consent" / just "consent of instructor" → hard requirement
        if (/\bor\s+consent\b/.test(lower)) {
            specialReq += "Consent of Instructor (alternative). ";
        } else {
            specialReq += "Consent of Instructor required. ";
        }
    }
    if (lower.includes('restricted')) {
        specialReq += "Restricted Enrollment. ";
    }
    if (lower.includes('transfer')) {
        specialReq += "Transfer Credit Only. ";
    }
    if (lower.includes('standing')) {
        if (lower.includes('senior')) {
            specialReq += "Senior Standing required. ";
        }
        if (lower.includes('junior')) {
            specialReq += "Junior Standing required. ";
        }
        if (lower.includes('sophomore')) {
            specialReq += "Sophomore Standing required. ";
        }
        if (lower.includes('freshman')) {
            specialReq += "Freshman Standing required. ";
        }
    }
    // Only match explicit AP score requirements (e.g. "AP score of 4")
    const apMatch = lower.match(/\bap\s+(?:score\s+(?:of\s+)?)(\d+)/i) ||
        lower.match(/\bap\s*exam.*?(\d+)/i);
    if (apMatch) {
        specialReq += `AP Score ${apMatch[1]}. `;
    }
    return {
        title,
        specialReq: specialReq.trim(),
    };
}

/**
 * Pre-load the lookup map.  Call this once at startup or before rendering.
 */
export async function loadCourseInfo() {
    return buildLookup();
}
