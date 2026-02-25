import React, { useState, useCallback } from "react";
import { Button } from "../../components/Button";
import { D3Graph } from "../../components/D3Graph";
import { GraphTabs } from "../../components/GraphTabs";
import { CourseSearch } from "../../components/CourseSearch";
import { findRootNode } from "../../utils/astGraphUtils";
import { loadDepartmentForCourse } from "../../utils/loadAstData";
import graphBg from "./graphbackground.webp";

export const Desktop = () => {
  // State
  const [selectedCourse, setSelectedCourse] = useState("");
  const [tabs, setTabs] = useState([]);           // [{ courseCode, astNode }]
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  // When the user selects a course from search
  const handleCourseSelect = useCallback((courseCode) => {
    setSelectedCourse(courseCode);
  }, []);

  // When the user clicks "Go" — lazy-load the department and open in a new tab
  const handleGenerate = useCallback(async () => {
    if (!selectedCourse || generating) return;
    setGenerating(true);
    try {
      const deptData = await loadDepartmentForCourse(selectedCourse);
      const rootNode = findRootNode(selectedCourse, deptData);
      if (!rootNode) {
        setGenerating(false);
        return;
      }

      // Avoid duplicate tabs
      setTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.courseCode === rootNode.code);
        if (existingIndex >= 0) {
          setActiveTabIndex(existingIndex);
          return prev;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { courseCode: rootNode.code, astNode: rootNode }];
      });
    } catch (e) {
      console.error('Failed to load course data:', e);
    } finally {
      setGenerating(false);
    }
  }, [selectedCourse, generating]);

  // When the user clicks an expandable node inside the graph
  const handleNodeExpand = useCallback(
    async (courseCode) => {
      const deptData = await loadDepartmentForCourse(courseCode);
      const rootNode = findRootNode(courseCode, deptData);
      if (!rootNode) return;

      setTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.courseCode === rootNode.code);
        if (existingIndex >= 0) {
          setActiveTabIndex(existingIndex);
          return prev;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { courseCode: rootNode.code, astNode: rootNode }];
      });
    },
    [],
  );

  // Tab interactions
  const handleTabSelect = useCallback((index) => setActiveTabIndex(index), []);
  const handleTabClose = useCallback(
    (index) => {
      setTabs((prev) => prev.filter((_, i) => i !== index));
      setActiveTabIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
    },
    [],
  );

  // Currently active AST node
  const activeAstNode = tabs.length > 0 ? tabs[activeTabIndex]?.astNode : null;

  return (
    <div className="min-h-screen w-full font-['Inter'] pb-20 bg-[#FAF6F4]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="relative w-full h-[314px] bg-cover bg-center flex flex-col items-center justify-center"
        style={{ backgroundImage: `url(${graphBg})` }}
      >
        <h1 className="text-5xl md:text-[65px] font-black text-black tracking-[-0.33px] text-center px-4">
          UCSD ClassGraph
        </h1>
        <div className="mt-8">
          <Button onClick={() => {
            const section = document.getElementById('graph-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}>
            Let's go!
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black" />
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="w-full flex justify-center mt-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Description */}
          <p className="text-center text-xl md:text-[25px] font-medium text-black tracking-[-0.12px] leading-snug md:leading-[36.3px] mb-12 max-w-5xl mx-auto">
            Many courses at UCSD have a variety of ways to take the necessary
            prerequisites, making scheduling, course dependencies, and academic
            planning difficult for students. ClassGraph helps our students
            understand and plan their complex course requirements for their major
            and graduation.
          </p>

          <div id="graph-section" className="w-full flex justify-center">
            <div className="w-full max-w-6xl flex flex-col" style={{ minHeight: 700 }}>
              <div className="mb-4 w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <CourseSearch onSelect={handleCourseSelect} onQueryChange={setSelectedCourse} onSubmit={handleGenerate} />
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? '…' : 'Go'}
                </Button>
              </div>

              {tabs.length > 0 ? (
                <>
                  <GraphTabs
                    tabs={tabs}
                    activeIndex={activeTabIndex}
                    onSelect={handleTabSelect}
                    onClose={handleTabClose}
                  />
                  <div className="flex-1" style={{ minHeight: 600 }}>
                    <D3Graph
                      rootAstNode={activeAstNode}
                      onNodeExpand={handleNodeExpand}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="w-full flex-1 bg-[#FAF6F4] rounded-xl relative flex items-center justify-center"
                  style={{ minHeight: 600, border: '2px solid #1e1e1e' }}
                >
                  <span className="text-gray-500 font-medium text-base sm:text-lg text-center px-4">
                    Search for a course and click "Go" to see its prerequisites
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
