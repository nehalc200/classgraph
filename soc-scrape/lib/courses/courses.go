package courses

type Department struct {
	Code      string `json:"code"`
	Expansion string `json:"value"`
}

// Course represents the top-level course data.
type Course struct {
	Code        string      `json:"code"`
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Dept        string      `json:"dept"`
//	PrereqRaw   string      `json:"prereq_raw"`
	ParseStatus string      `json:"parse_status"`
	PrereqAST   *PrereqNode `json:"prereq_ast"`
}

// PrereqNode represents a single node in the prerequisite tree.
// It uses omitempty so that irrelevant fields are omitted when 
// encoding back to JSON.
type PrereqNode struct {
	Type     string        `json:"type"`               // "AND", "OR", or "COURSE"
	CourseID string        `json:"course_id,omitempty"` // Populated only for "COURSE" types
	Items    []*PrereqNode `json:"items,omitempty"`     // Populated only for "AND"/"OR" types
}

// CourseCatalog represents the root object containing the courses map.
type CourseCatalog struct {
	Courses map[string]Course `json:"courses"`
}
