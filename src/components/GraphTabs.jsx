import React from 'react';

/**
 * Tab bar above the graph.  Each tab represents a course whose subtree the
 * user has drilled into.  The first (root) tab cannot be closed.
 */
export const GraphTabs = ({ tabs, activeIndex, onSelect, onClose }) => {
    if (!tabs || tabs.length === 0) return null;

    return (
        <div
            style={{
                display: 'flex',
                gap: 0,
                border: '2px solid #1e1e1e',
                borderBottom: 'none',
                background: '#FAF6F4',
                borderRadius: '12px 12px 0 0',
                overflow: 'hidden',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {tabs.map((tab, i) => {
                const isActive = i === activeIndex;
                return (
                    <button
                        key={`${tab.courseCode}-${i}`}
                        onClick={() => onSelect(i)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 18px',
                            border: 'none',
                            borderBottom: isActive ? '3px solid #1e1e1e' : '3px solid transparent',
                            background: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#1e1e1e' : '#888',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            fontFamily: 'inherit',
                        }}
                    >
                        <span>{tab.courseCode}</span>
                        {(
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(i);
                                }}
                                style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    lineHeight: 1,
                                    color: '#aaa',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    width: 18,
                                    height: 18,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.target.style.background = '#e5e5e5')}
                                onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                            >
                                ✕
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
