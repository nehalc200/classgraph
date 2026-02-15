import React, { useState, useCallback, useMemo } from "react";
import { InputGroup } from "../../components/InputGroup";
import { SelectGroup } from "../../components/SelectGroup";
import { Button } from "../../components/Button";
import { CheckboxGroup } from "../../components/CheckboxGroup";
import { SigmaGraph } from "../../components/SigmaGraph";
import { GraphTabs } from "../../components/GraphTabs";
import { getAllCourses, findRootNode } from "../../utils/astGraphUtils";
import majorsData from "../../../data/majors.json";
import astData from "../../../data/MATH_ast.json";
import graphBg from "./graphbackground.webp";

export const Desktop = () => {
  // Derive course list from the AST data
  const courseOptions = useMemo(() => getAllCourses(astData), []);

  // Original form data
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);
  const collegeOptions = ["Revelle", "Muir", "Marshall", "Roosevelt", "Warren", "Sixth", "Seventh", "Eighth"];
  const majorOptions = majorsData
    .map((major) => ({ label: major.name, value: major.code }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // State
  const [selectedCourse, setSelectedCourse] = useState("");
  const [tabs, setTabs] = useState([]);           // [{ courseCode, astNode }]
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // When the user clicks "Generate graph"
  const handleGenerate = useCallback(() => {
    if (!selectedCourse) return;
    const rootNode = findRootNode(selectedCourse, astData);
    if (!rootNode) return;
    setTabs([{ courseCode: rootNode.code, astNode: rootNode }]);
    setActiveTabIndex(0);
  }, [selectedCourse]);

  // When the user clicks an expandable node inside the graph
  const handleNodeExpand = useCallback(
    (courseCode) => {
      // Find this course as a ROOT in the AST so we can show its subtree
      const rootNode = findRootNode(courseCode, astData);
      if (!rootNode) return;

      // Avoid duplicate tabs
      const existingIndex = tabs.findIndex(
        (t) => t.courseCode === rootNode.code,
      );
      if (existingIndex >= 0) {
        setActiveTabIndex(existingIndex);
        return;
      }

      setTabs((prev) => [...prev, { courseCode: rootNode.code, astNode: rootNode }]);
      setActiveTabIndex(tabs.length); // new tab at end
    },
    [tabs],
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

          <div id="graph-section" className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-center">
            {/* ── Left Column: Controls ──────────────────────────────────── */}
            <div className="w-full lg:w-[400px] flex flex-col gap-8 flex-shrink-0">
              <SelectGroup label="Major" id="major" options={majorOptions} />
              <SelectGroup label="Graduating year" id="year" options={yearOptions} />
              <SelectGroup label="College" id="college" options={collegeOptions} />
              <CheckboxGroup label="Transfer" id="transfer" />
              <InputGroup label="Additional majors/minors" id="additional" />

              <SelectGroup
                label="Course"
                id="course"
                options={courseOptions}
                onChange={(e) => setSelectedCourse(e.target.value)}
              />

              <div className="mt-4 flex justify-center">
                <Button onClick={handleGenerate}>Generate graph</Button>
              </div>
            </div>

            {/* ── Right Column: Graph Visualization ──────────────────────── */}
            <div className="w-full lg:flex-1 flex flex-col flex-shrink-0" style={{ minHeight: 550 }}>
              {tabs.length > 0 ? (
                <>
                  <GraphTabs
                    tabs={tabs}
                    activeIndex={activeTabIndex}
                    onSelect={handleTabSelect}
                    onClose={handleTabClose}
                  />
                  <div className="flex-1" style={{ minHeight: 480 }}>
                    <SigmaGraph
                      rootAstNode={activeAstNode}
                      onNodeExpand={handleNodeExpand}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="w-full flex-1 bg-[#d9d9d9] rounded-xl relative shadow-inner flex items-center justify-center"
                  style={{ minHeight: 480 }}
                >
                  <span className="text-gray-500 font-medium text-lg">
                    Select a course and click "Generate graph"
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
