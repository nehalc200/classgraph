
import { describe, it, expect } from 'vitest';
import { transformDataToGraph } from './graphUtils';

const mockData = [
    {
        course: {
            code: 'COURSE_A',
            title: 'Course A',
            prereq: {
                type: 'AND',
                items: [
                    { type: 'COURSE', course_id: 'COURSE_B' }
                ]
            }
        }
    },
    {
        course: {
            code: 'COURSE_B',
            title: 'Course B',
            prereq: null
        }
    },
    {
        course: {
            code: 'COURSE_C',
            title: 'Course C',
            prereq: {
                type: 'OR',
                items: [
                    { type: 'COURSE', course_id: 'COURSE_D' },
                    { type: 'COURSE', course_id: 'COURSE_E' }
                ]
            }
        }
    },
    {
        course: {
            code: 'COURSE_D', title: 'D', prereq: null
        }
    },
    {
        course: {
            code: 'COURSE_E', title: 'E', prereq: null
        }
    }
];

describe('transformDataToGraph', () => {
    it('should create a simple graph for single prerequisite', () => {
        const g = transformDataToGraph('COURSE_A', mockData);

        // Nodes: A, B
        expect(g.node('COURSE_A')).toBeDefined();
        expect(g.node('COURSE_B')).toBeDefined();

        // Edges: B -> A
        // My implementation adds edge from Prereq -> Dependent
        expect(g.hasEdge('COURSE_B', 'COURSE_A')).toBe(true);
    });

    it('should create a group node for OR prerequisites', () => {
        const g = transformDataToGraph('COURSE_C', mockData);

        expect(g.node('COURSE_C')).toBeDefined();
        expect(g.node('COURSE_D')).toBeDefined();
        expect(g.node('COURSE_E')).toBeDefined();

        // Check for group node
        const nodes = g.nodes();
        const groupNode = nodes.find(n => n.startsWith('OR_COURSE_C'));
        expect(groupNode).toBeDefined();
        expect(g.node(groupNode).type).toBe('group');

        // Check parenting
        expect(g.parent('COURSE_D')).toBe(groupNode);
        expect(g.parent('COURSE_E')).toBe(groupNode);

        // Check edges
        // D and E are children of Group.
        // Edge should be Group -> C (as per my logic implementation)
        expect(g.hasEdge(groupNode, 'COURSE_C')).toBe(true);
    });
});
