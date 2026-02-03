package courses

type Department struct {
	Code      string `json:"code"`
	Expansion string `json:"value"`
}

// Course represents the top-level course data.
type Course struct {
	Code      string      `json:"code"`
	Title     string      `json:"title"`
	PrereqRaw string      `json:"raw_prereq"`
	Parseable bool        `json:"parseable"`
	PrereqAST *PrereqNode `json:"prereq"`
}

// PrereqNode represents a single node in the prerequisite tree.
// It uses omitempty so that irrelevant fields are omitted when
// encoding back to JSON.
type PrereqNode struct {
	Type     string        `json:"type"`                // "AND", "OR", or "COURSE"
	CourseID string        `json:"course_id,omitempty"` // Populated only for "COURSE" types
	Items    []*PrereqNode `json:"items,omitempty"`     // Populated only for "AND"/"OR" types
}

type Metadata struct {
	Version     string `json:"version"`
	GeneratedAt string `json:"generated_at"`
}
type CourseWritable struct {
	Meta   Metadata `json:"meta"`
	Course *Course   `json:"course"`
}
