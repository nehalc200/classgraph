
import { transformDataToGraph } from './src/utils/graphUtils.js';

const mockData = [
    {
        course: { // Shared dependency example
            code: 'SHARED_DEP',
            title: 'Shared',
            prereq: null
        }
    },
    {
        course: {
            code: 'COURSE_A',
            title: 'Course A',
            prereq: {
                type: 'AND',
                items: [
                    { type: 'COURSE', course_id: 'SHARED_DEP' }
                ]
            }
        }
    },
    {
        course: {
            code: 'COURSE_B',
            title: 'Course B',
            prereq: {
                type: 'AND',
                items: [
                    { type: 'COURSE', course_id: 'SHARED_DEP' }
                ]
            }
        }
    },
    {
        course: {
            code: 'TARGET',
            title: 'Target',
            prereq: {
                type: 'AND',
                items: [
                    { type: 'COURSE', course_id: 'COURSE_A' },
                    { type: 'COURSE', course_id: 'COURSE_B' }
                ]
            }
        }
    }
];

try {
    console.log("Testing Node Deduplication...");

    const graph = transformDataToGraph('TARGET', mockData);

    // Nodes should be: TARGET, A, B, SHARED_DEP. Total 4 course nodes.
    // Plus we might have implicit logic, but let's count named nodes.

    const nodeNames = graph.nodes.map(n => n.name);
    console.log("Nodes found:", nodeNames);

    const sharedCount = nodeNames.filter(n => n === 'SHARED_DEP').length;
    if (sharedCount !== 1) throw new Error(`SHARED_DEP found ${sharedCount} times (should be 1)`);

    if (nodeNames.filter(n => n === 'COURSE_A').length !== 1) throw new Error("Duplicate COURSE_A");

    console.log("Nodes are unique.");
    console.log("ALL DEDUPLICATION TESTS PASSED");

} catch (e) {
    console.error("TEST FAILED:", e.message);
    process.exit(1);
}
