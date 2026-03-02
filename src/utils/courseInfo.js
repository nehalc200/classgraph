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

    // notes: array of { text, severity }
    // severity: 'high' | 'medium' | 'low' | 'info'
    const notes = [];

    if (lower.includes('upper')) {
        notes.push({ text: 'Upper Division Standing', severity: 'medium' });
    }
    if (lower.includes('consent')) {
        if (/\bor\s+consent\b/.test(lower)) {
            notes.push({ text: 'Consent of Instructor (alternative)', severity: 'info' });
        } else {
            notes.push({ text: 'Consent of Instructor required', severity: 'high' });
        }
    }
    if (lower.includes('restricted')) {
        notes.push({ text: 'Restricted Enrollment', severity: 'high' });
    }
    if (lower.includes('transfer')) {
        notes.push({ text: 'Transfer Credit Only', severity: 'info' });
    }
    if (lower.includes('standing')) {
        if (lower.includes('senior')) {
            notes.push({ text: 'Senior Standing required', severity: 'medium' });
        }
        if (lower.includes('junior')) {
            notes.push({ text: 'Junior Standing required', severity: 'medium' });
        }
        if (lower.includes('sophomore')) {
            notes.push({ text: 'Sophomore Standing required', severity: 'low' });
        }
        if (lower.includes('freshman')) {
            notes.push({ text: 'Freshman Standing required', severity: 'low' });
        }
    }

    const apRegex = /\bap\s+(?<subject>.*?)\s+(?:score|subscore|exam)\s+(?:of\s+)?(?<value>\d+(?:\s+or\s+\d+)?)/gi;
    const matches = [...lower.matchAll(apRegex)];
    matches.forEach(match => {
        const { subject, value } = match.groups;
        notes.push({ text: `AP ${subject.toUpperCase()}: score ${value} (alternative)`, severity: 'info' });
    });

    return {
        title,
        notes,
        // kept for any callers that still check truthiness
        specialReq: notes.map(n => n.text).join('<br>'),
    };
}

/**
 * Pre-load the lookup map.  Call this once at startup or before rendering.
 */
export async function loadCourseInfo() {
    return buildLookup();
}
