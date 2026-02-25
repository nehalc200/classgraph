import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getDepartments, loadDepartment } from '../utils/loadAstData';
import { getAllCourses } from '../utils/astGraphUtils';

/**
 * Searchable course selector — type to search departments and courses.
 * As you type a department prefix, the courses for that department are
 * loaded lazily and shown in the dropdown.
 */
export const CourseSearch = ({ onSelect, onQueryChange, onSubmit }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const [courseList, setCourseList] = useState([]); // currently loaded courses
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);
    const normalize = (s) => (s || '').toUpperCase().replace(/\s+/g, ''); // remove spaces
    const deptPrefixFromQuery = (q) => {
        const m = (q || '').trim().toUpperCase().match(/^[A-Z]+/); // leading letters
        return m ? m[0] : '';
    };

    const departments = useMemo(() => getDepartments(), []);

    // When the query changes, figure out which department(s) to load
    const loadCoursesForQuery = useCallback(async (q) => {
        const trimmed = q.trim().toUpperCase();
        if (!trimmed) {
            setCourseList([]);
            return;
        }

        // Find matching departments by prefix
        const deptPrefix = deptPrefixFromQuery(q);
        const matchingDepts = departments.filter((d) => d.startsWith(deptPrefix));

        if (matchingDepts.length === 0) {
            setCourseList([]);
            return;
        }

        // Load at most the first 5 matching departments to avoid loading too much
        const deptsToLoad = matchingDepts.slice(0, 5);
        setLoading(true);

        try {
            const allCourses = [];
            for (const dept of deptsToLoad) {
                const data = await loadDepartment(dept);
                allCourses.push(...getAllCourses(data));
            }
            setCourseList(allCourses);
        } catch (e) {
            console.error('Failed to load courses:', e);
        } finally {
            setLoading(false);
        }
    }, [departments]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            loadCoursesForQuery(query);
        }, 200);
        return () => clearTimeout(debounceRef.current);
    }, [query, loadCoursesForQuery]);

    const filtered = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.trim().toUpperCase();
        return courseList
            .filter((c) => normalize(c).includes(normalize(query)))
            .sort((a, b) => {
                // Split "CSE 100A" into dept="CSE", num=100, suffix="A"
                const parse = (code) => {
                    const m = code.match(/^([A-Z]+)\s+(\d+)(.*)$/i);
                    return m ? [m[1].toUpperCase(), parseInt(m[2], 10), m[3].toUpperCase()] : [code.toUpperCase(), 0, ''];
                };
                const [dA, nA, sA] = parse(a);
                const [dB, nB, sB] = parse(b);
                if (dA !== dB) return dA < dB ? -1 : 1;
                if (nA !== nB) return nA - nB;
                return sA < sB ? -1 : sA > sB ? 1 : 0;
            })
            .slice(0, 30);
    }, [query, courseList]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => { setHighlightIdx(0); }, [filtered]);

    function handleKeyDown(e) {
        if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && filtered[highlightIdx]) {
                pick(filtered[highlightIdx]);
            } else {
                // Dropdown closed or no highlight — submit whatever is typed
                setIsOpen(false);
                onSubmit?.();
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }

    function pick(code) {
        setQuery(code);
        setIsOpen(false);
        onSelect(code);
        onSubmit?.();
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <input
                type="text"
                value={query}
                placeholder="Search for a course (e.g. MATH 180A)…"
                onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onQueryChange?.(e.target.value); }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    border: '2px solid #1e1e1e',
                    borderRadius: 10,
                    background: '#fff',
                    outline: 'none',
                    color: '#1e1e1e',
                    boxSizing: 'border-box',
                }}
            />
            {isOpen && (filtered.length > 0 || loading) && (
                <ul
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        background: '#fff',
                        border: '2px solid #1e1e1e',
                        borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        maxHeight: 240,
                        overflowY: 'auto',
                        zIndex: 100,
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    {loading && (
                        <li style={{ padding: '10px 16px', fontSize: 14, color: '#888' }}>
                            Loading…
                        </li>
                    )}
                    {filtered.map((code, i) => (
                        <li
                            key={code}
                            onClick={() => pick(code)}
                            onMouseEnter={() => setHighlightIdx(i)}
                            style={{
                                padding: '10px 16px',
                                fontSize: 14,
                                fontWeight: i === highlightIdx ? 600 : 400,
                                cursor: 'pointer',
                                background: i === highlightIdx ? '#f0eef9' : 'transparent',
                                color: '#1e1e1e',
                                transition: 'background 0.1s',
                            }}
                        >
                            {code}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
