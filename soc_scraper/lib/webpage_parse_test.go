package lib

import (
	"strings"
	"testing"
)

func TestFormatCourseCode(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"CSE100", "CSE 100"},
		{"MATH31A", "MATH 31A"},
		{"ECE35", "ECE 35"},
		{"PHYS4A", "PHYS 4A"},
		{"ECE-35", "ECE 35"},
		{"COGS118A", "COGS 118A"},
		{"already split", "already split"},
	}

	for _, tt := range tests {
		got := formatCourseCode(tt.input)
		if got != tt.expected {
			t.Errorf("formatCourseCode(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}

func TestCleanCourseTitle(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			"Data Structures (4 Units)",
			"Data Structures",
		},
		{
			"Algorithms  &  Complexity\n(4 Units)",
			"Algorithms & Complexity",
		},
		{
			"  Linear Algebra  \t(4\n  Units)  ",
			"Linear Algebra",
		},
		{
			"No Units Here",
			"No Units Here",
		},
		{
			"Signals (\n3\nUnits\n)",
			"Signals",
		},
	}

	for _, tt := range tests {
		got := cleanCourseTitle(tt.input)
		if got != tt.expected {
			t.Errorf("cleanCourseTitle(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}

func TestParseSearchResults(t *testing.T) {
	html := `<html><body>
<h2>Computer Science and Engineering (CSE)</h2>
<table class="tbrdr">
  <tr>
    <td class="crsheader">Lec</td>
    <td class="crsheader">100</td>
    <td class="crsheader">Advanced Data Structures (4 Units)</td>
  </tr>
  <tr>
    <td class="crsheader">Lec</td>
    <td class="crsheader">101</td>
    <td class="crsheader">Design and Analysis of Algorithms (4 Units)</td>
  </tr>
</table>
<h2>Mathematics (MATH)</h2>
<table class="tbrdr">
  <tr>
    <td class="crsheader">Lec</td>
    <td class="crsheader">20A</td>
    <td class="crsheader">Calculus for Science and Engineering (4 Units)</td>
  </tr>
</table>
</body></html>`

	courses, err := parseSearchResults(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseSearchResults returned error: %v", err)
	}
	if len(courses) != 3 {
		t.Fatalf("expected 3 courses, got %d", len(courses))
	}

	byCode := make(map[string]string)
	for _, c := range courses {
		byCode[c.Code] = c.Title
	}

	if _, ok := byCode["CSE 100"]; !ok {
		t.Errorf("expected course CSE 100, not found in %v", byCode)
	}
	if _, ok := byCode["CSE 101"]; !ok {
		t.Errorf("expected course CSE 101, not found in %v", byCode)
	}
	if _, ok := byCode["MATH 20A"]; !ok {
		t.Errorf("expected course MATH 20A, not found in %v", byCode)
	}
	if title := byCode["CSE 100"]; title != "Advanced Data Structures" {
		t.Errorf("CSE 100 title = %q, want %q", title, "Advanced Data Structures")
	}
}

func TestParseSearchResultsEmpty(t *testing.T) {
	html := `<html><body><table class="tbrdr"></table></body></html>`
	courses, err := parseSearchResults(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseSearchResults returned error: %v", err)
	}
	if len(courses) != 0 {
		t.Errorf("expected 0 courses, got %d", len(courses))
	}
}

func TestParseSearchResultsNoDuplicates(t *testing.T) {
	html := `<html><body>
<h2>Mathematics (MATH)</h2>
<table class="tbrdr">
  <tr>
    <td class="crsheader">Lec</td>
    <td class="crsheader">20A</td>
    <td class="crsheader">Calculus (4 Units)</td>
  </tr>
  <tr>
    <td class="crsheader">Dis</td>
    <td class="crsheader">20A</td>
    <td class="crsheader">Calculus (4 Units)</td>
  </tr>
</table>
</body></html>`

	courses, err := parseSearchResults(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseSearchResults returned error: %v", err)
	}
	if len(courses) != 1 {
		t.Errorf("expected 1 course (deduped), got %d", len(courses))
	}
}

func TestParseClassRequirementsSingleCourse(t *testing.T) {
	html := `<html><body>
<table>
  <tr>
    <td>1.</td>
    <td>
      <span class="bold_text">CSE11</span>
    </td>
  </tr>
</table>
</body></html>`

	node, err := parseClassRequirements(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseClassRequirements returned error: %v", err)
	}
	if node.Type != "AND" {
		t.Errorf("root type = %q, want AND", node.Type)
	}
	if len(node.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(node.Items))
	}
	item := node.Items[0]
	if item.Type != "COURSE" {
		t.Errorf("item type = %q, want COURSE", item.Type)
	}
	if item.CourseID != "CSE 11" {
		t.Errorf("item CourseID = %q, want %q", item.CourseID, "CSE 11")
	}
}

func TestParseClassRequirementsOrGroup(t *testing.T) {
	html := `<html><body>
<table>
  <tr>
    <td>1.</td>
    <td>
      <span class="bold_text">MATH20A</span>
      <span class="ertext"> or </span>
      <span class="bold_text">MATH10A</span>
    </td>
  </tr>
</table>
</body></html>`

	node, err := parseClassRequirements(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseClassRequirements returned error: %v", err)
	}
	if len(node.Items) != 1 {
		t.Fatalf("root should have 1 OR item, got %d", len(node.Items))
	}
	orNode := node.Items[0]
	if orNode.Type != "OR" {
		t.Errorf("expected OR node, got %q", orNode.Type)
	}
	if len(orNode.Items) != 2 {
		t.Fatalf("OR node should have 2 children, got %d", len(orNode.Items))
	}
	if orNode.Items[0].CourseID != "MATH 20A" {
		t.Errorf("first OR child = %q, want MATH 20A", orNode.Items[0].CourseID)
	}
	if orNode.Items[1].CourseID != "MATH 10A" {
		t.Errorf("second OR child = %q, want MATH 10A", orNode.Items[1].CourseID)
	}
}

func TestParseClassRequirementsMultipleRows(t *testing.T) {
	html := `<html><body>
<table>
  <tr>
    <td>1.</td>
    <td><span class="bold_text">CSE11</span></td>
  </tr>
  <tr>
    <td>2.</td>
    <td><span class="bold_text">MATH20A</span></td>
  </tr>
</table>
</body></html>`

	node, err := parseClassRequirements(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseClassRequirements returned error: %v", err)
	}
	if len(node.Items) != 2 {
		t.Fatalf("expected 2 AND items, got %d", len(node.Items))
	}
	if node.Items[0].CourseID != "CSE 11" {
		t.Errorf("first child = %q, want CSE 11", node.Items[0].CourseID)
	}
	if node.Items[1].CourseID != "MATH 20A" {
		t.Errorf("second child = %q, want MATH 20A", node.Items[1].CourseID)
	}
}

func TestParseClassRequirementsEmpty(t *testing.T) {
	html := `<html><body><table></table></body></html>`
	node, err := parseClassRequirements(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parseClassRequirements returned error: %v", err)
	}
	if node.Type != "AND" {
		t.Errorf("root type = %q, want AND", node.Type)
	}
	if len(node.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(node.Items))
	}
}
