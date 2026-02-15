
export const transformDataToGraph = (courseCode, allData) => {
    // Helper to find course by code
    const normalize = (code) => code ? code.trim().toUpperCase() : '';
    const findCourse = (code) => allData.find(c => normalize(c.course.code) === normalize(code));

    const nodes = new Map(); // Unique nodes by ID (name)
    const links = [];
    const visited = new Set();

    const addNode = (id, type) => {
        if (!nodes.has(id)) {
            nodes.set(id, { id, name: id, type, children: [] });
        }
        return nodes.get(id);
    };

    const processCourse = (currentCode) => {
        const normCode = normalize(currentCode);
        if (visited.has(normCode)) return normCode;
        visited.add(normCode);

        const courseData = findCourse(normCode);
        addNode(normCode, 'course');

        if (!courseData || !courseData.course.prereq) {
            return normCode;
        }

        processPrereqStructure(courseData.course.prereq, normCode);
        return normCode;
    };

    const processPrereqStructure = (prereqItem, targetId) => {
        if (!prereqItem) return;

        // AND: direct prerequisites locally to target
        if (prereqItem.type === 'AND') {
            (prereqItem.items || []).forEach(item => {
                const sourceId = processPrereqItem(item);
                if (sourceId) {
                    links.push({ source: sourceId, target: targetId });
                }
            });
        }
        // OR: Group logic
        else if (prereqItem.type === 'OR') {
            const groupId = `OR_${targetId}_${Math.random().toString(36).substr(2, 5)}`;
            const groupNode = addNode(groupId, 'OR');

            // Add children to group node (for bounding box calculation later)
            // AND link children to the group? No, in force graph typically:
            // Children -> Group -> Target? 
            // Or Children -> Target directly, and Group just visually contains them?
            // "One of these satisfies Target".
            // Let's link Children -> Target.
            // And use Group ONLY for visual clustering.

            (prereqItem.items || []).forEach(item => {
                const sourceId = processPrereqItem(item);
                if (sourceId) {
                    // Start with linking source to target (functional requirement)
                    // links.push({ source: sourceId, target: targetId }); // Valid

                    // Actually, if we want the group to "contain" them, we need to know who is in the group.
                    // The 'children' array on the group node can store IDs.
                    groupNode.children.push(sourceId);

                    // Visually, usually edges go from Source -> Target.
                    links.push({ source: sourceId, target: targetId });
                }
            });
        }
        // COURSE: Standard
        else if (prereqItem.type === 'COURSE') {
            const sourceId = processPrereqItem(prereqItem);
            if (sourceId) {
                links.push({ source: sourceId, target: targetId });
            }
        }
    };

    // Returns the ID of the node processed
    const processPrereqItem = (item) => {
        if (item.type === 'COURSE') {
            return processCourse(item.course_id);
        } else if (item.type === 'AND' || item.type === 'OR') {
            // Nested complex logic.
            // If we have nested AND/OR, we might need intermediate nodes or flattening.
            // For simplicity, let's treat nested structure by recursively calling processPrereqStructure
            // But processPrereqStructure needs a target.
            // If "AND" contains "OR", that OR satisfies the AND.
            // Validating nested logic in flat graph is tricky.
            // Let's simplify: A nested group is just processed with the same target.
            // e.g. Target requires (A AND (B OR C)).
            // A -> Target.
            // (B OR C) -> Target.
            processPrereqStructure(item, normalize(courseCode)); // Wait, target is the CURRENT context.
            // We need to pass the current targetId down.
            return null; // Logic handled internally
        }
        return null;
    };

    // We need to refactor slightly to pass targetId correctly for recursive structures.
    // Let's restart the recursive logic to be cleaner for flat graph.

    // RESTART LOGIC
    nodes.clear();
    links.length = 0;
    visited.clear();

    const traverse = (target) => {
        const targetId = normalize(target);
        if (!nodes.has(targetId)) {
            addNode(targetId, 'course');
            const data = findCourse(targetId);
            if (data && data.course.prereq) {
                parsePrereq(data.course.prereq, targetId);
            }
        }
        return targetId;
    };

    const parsePrereq = (item, targetId) => {
        if (!item) return;

        if (item.type === 'COURSE') {
            const sourceId = traverse(item.course_id);
            links.push({ source: sourceId, target: targetId });
        }
        else if (item.type === 'AND') {
            (item.items || []).forEach(sub => parsePrereq(sub, targetId));
        }
        else if (item.type === 'OR') {
            const groupId = `OR_${targetId}_${Math.random().toString(36).substr(2, 5)}`;
            const groupNode = addNode(groupId, 'OR');

            (item.items || []).forEach(sub => {
                // For OR items, we want to know they belong to this group
                // If 'sub' is a COURSE, we traverse it
                if (sub.type === 'COURSE') {
                    const sourceId = traverse(sub.course_id);
                    links.push({ source: sourceId, target: targetId });
                    groupNode.children.push(sourceId);
                }
                // Nested logic (e.g. OR inside OR? or AND inside OR?)
                // For styling, we might just ignore deep nesting visualization or flattening it.
                else {
                    parsePrereq(sub, targetId);
                }
            });
        }
    };

    if (courseCode) {
        traverse(courseCode);
    }

    return { nodes: Array.from(nodes.values()), links };
};
