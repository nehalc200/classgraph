import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Searchable course selector — a text input that shows filtered suggestions
 * as you type. Selecting a suggestion calls `onSelect(courseCode)`.
 */
export const CourseSearch = ({ courses, onSelect }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const wrapperRef = useRef(null);

    const filtered = useMemo(() => {
        if (!query.trim()) return courses.slice(0, 30); // show first 30 when empty
        const q = query.trim().toUpperCase();
        return courses.filter((c) => c.toUpperCase().includes(q)).slice(0, 30);
    }, [query, courses]);

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

    // Reset highlight when filtered results change
    useEffect(() => { setHighlightIdx(0); }, [filtered]);

    function handleKeyDown(e) {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[highlightIdx]) {
                pick(filtered[highlightIdx]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }

    function pick(code) {
        setQuery(code);
        setIsOpen(false);
        onSelect(code);
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <input
                type="text"
                value={query}
                placeholder="Search for a course…"
                onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
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
            {isOpen && filtered.length > 0 && (
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
